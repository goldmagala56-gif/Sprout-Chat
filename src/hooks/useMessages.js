import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './useAuth.js';

const PAGE_SIZE = 50;

export function useMessages(conversationId, userId) {
  const { profile } = useAuth();
  const readReceiptsEnabled = profile?.settings?.readReceipts !== false;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [blockedError, setBlockedError] = useState(null);
  const channelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const readReceiptsEnabledRef = useRef(readReceiptsEnabled);
  useEffect(() => { readReceiptsEnabledRef.current = readReceiptsEnabled; }, [readReceiptsEnabled]);

  const buildReactionsMap = (reactionRows = []) => {
    const map = {};
    reactionRows.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r.user_id);
    });
    return map;
  };

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) return;
    setLoading(true);

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, text, type, file_url, file_name, file_size, duration, reply_to, mentions,
        starred_by, forwarded, deleted_at, edited_at, created_at,
        profiles:sender_id(id, name, initials, avatar_url),
        message_reads(user_id),
        message_reactions(user_id, emoji)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) { console.error('Fetch messages error:', error); setLoading(false); return; }

    let hiddenIds = new Set();
    if (userId && (data || []).length > 0) {
      const { data: hiddenRows, error: hiddenErr } = await supabase
        .from('message_hidden_for')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', data.map(m => m.id));
      if (hiddenErr) console.error('Fetch hidden messages error:', hiddenErr);
      hiddenIds = new Set((hiddenRows || []).map(r => r.message_id));
    }

    const idMap = {};
    (data || []).forEach(m => { idMap[m.id] = m; });

    const canSeeReadStatus = readReceiptsEnabledRef.current;

    const formatted = (data || [])
      .filter(m => !hiddenIds.has(m.id))
      .reverse()
      .map(msg => {
        const replyMsg = msg.reply_to ? idMap[msg.reply_to] : null;
        const hasBeenRead = canSeeReadStatus && (msg.message_reads?.length > 0);
        return {
          id: msg.id,
          from: msg.sender_id === userId ? 'me' : 'them',
          text: msg.deleted_at ? '' : msg.text,
          deletedAt: msg.deleted_at,
          editedAt: msg.edited_at,
          type: msg.type,
          file_url: msg.deleted_at ? null : msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size,
          duration: msg.duration,
          mentions: msg.mentions || [],
          starred: (msg.starred_by || []).includes(userId),
          forwarded: !!msg.forwarded,
          reactions: buildReactionsMap(msg.message_reactions),
          replyToId: msg.reply_to,
          replyPreview: replyMsg ? {
            text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.type === 'file' ? (replyMsg.file_name || 'File') : replyMsg.text,
            sender: replyMsg.sender_id === userId ? 'You' : (replyMsg.profiles?.name || 'them'),
          } : null,
          time: msg.created_at,
          senderName: msg.profiles?.name,
          senderAvatar: msg.profiles?.avatar_url,
          readBy: msg.message_reads?.map(r => r.user_id) || [],
          status: msg.sender_id === userId ? (hasBeenRead ? 'seen' : 'sent') : null,
        };
      });

    if (before) {
      setMessages(prev => [...formatted, ...prev]);
    } else {
      setMessages(formatted);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);

    if (userId && conversationId && readReceiptsEnabledRef.current) {
      await supabase.rpc('mark_messages_as_read', { conv_id: conversationId, reader_id: userId });
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    setBlockedError(null);
    fetchMessages();
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new;
        if (msg.sender_id === userId) return;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const replyMsg = msg.reply_to ? prev.find(m => m.id === msg.reply_to) : null;
          return [...prev, {
            id: msg.id,
            from: 'them',
            text: msg.deleted_at ? '' : msg.text,
            deletedAt: msg.deleted_at,
            editedAt: msg.edited_at,
            type: msg.type,
            file_url: msg.deleted_at ? null : msg.file_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            duration: msg.duration,
            mentions: msg.mentions || [],
            starred: (msg.starred_by || []).includes(userId),
            forwarded: !!msg.forwarded,
            reactions: {},
            replyToId: msg.reply_to,
            replyPreview: replyMsg ? { text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.type === 'file' ? (replyMsg.file_name || 'File') : replyMsg.text, sender: replyMsg.from === 'me' ? 'You' : (replyMsg.senderName || 'them') } : null,
            time: msg.created_at,
            status: null,
          }];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new;
        setMessages(prev => prev.map(m => m.id === msg.id
          ? { ...m, deletedAt: msg.deleted_at, editedAt: msg.edited_at, text: msg.deleted_at ? '' : msg.text, file_url: msg.deleted_at ? null : m.file_url, starred: (msg.starred_by || []).includes(userId) }
          : m));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
      }, () => { fetchMessages(); })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reads',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        if (readReceiptsEnabledRef.current) fetchMessages();
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [conversationId, userId, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    const channel = supabase.channel(`typing-${conversationId}`, { config: { presence: { key: userId } } });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = {};
      Object.entries(state).forEach(([uid, entries]) => {
        if (uid !== userId && entries[0]?.typing) others[uid] = entries[0].name;
      });
      setTypingUsers(others);
    });

    channel.subscribe();
    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); setTypingUsers({}); };
  }, [conversationId, userId]);

  const setTyping = useCallback((isTyping) => {
    typingChannelRef.current?.track({ typing: isTyping, name: profile?.name || 'Someone' });
  }, [profile?.name]);

  const getReplyPreview = useCallback((id) => {
    const m = messages.find(x => x.id === id);
    if (!m) return null;
    return { text: m.type === 'voice' ? 'Voice message' : m.type === 'image' ? 'Photo' : m.type === 'file' ? (m.file_name || 'File') : m.text, sender: m.from === 'me' ? 'You' : (m.senderName || 'them') };
  }, [messages]);

  const sendMessage = useCallback(async ({ text = '', type = 'text', file = null, duration = null, replyToId = null, mentions = [], forwarded = false }) => {
    if (!conversationId || !userId) return;
    if (!text.trim() && !file) return;

    setBlockedError(null);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, from: 'me', text: text.trim(), type, duration, replyToId, mentions,
      starred: false, forwarded, reactions: {},
      replyPreview: replyToId ? getReplyPreview(replyToId) : null,
      time: new Date().toISOString(), status: 'sending', deletedAt: null,
      file_name: file?.name || null, file_size: file?.size || null,
      file_url: file && type === 'image' ? URL.createObjectURL(file) : null,
    }]);

    let file_url = null;
    if (file) {
      const ext = (file.name?.split('.').pop() || (type === 'voice' ? 'webm' : 'bin')).toLowerCase();
      const path = `${conversationId}/${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, file);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        return;
      }
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
      file_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId, sender_id: userId, text: text.trim(), type, file_url,
        file_name: file?.name || null, file_size: file?.size || null,
        duration, reply_to: replyToId, mentions: mentions.length ? mentions : null, forwarded,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      const isBlocked = error.code === '42501' || /row-level security|policy/i.test(error.message || '');
      if (isBlocked) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setBlockedError("You can't message this contact.");
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      }
      return;
    }

    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, file_url: file_url || m.file_url, status: 'sent' } : m));
    return data;
  }, [conversationId, userId, getReplyPreview]);

  // Forwarding is just a send into a (possibly different) conversation, flagged.
  // targetConversationId is required since forwards can go to any chat, not just this one.
  const forwardMessage = useCallback(async (msg, targetConversationId) => {
    if (!targetConversationId || !userId) return;
    const payload = {
      text: msg.text || '', type: msg.type, duration: msg.duration, forwarded: true,
    };
    // Re-use existing file rather than re-uploading, by inserting directly with the same file_url.
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: targetConversationId, sender_id: userId, text: payload.text, type: payload.type,
        file_url: msg.file_url || null, file_name: msg.file_name || null, file_size: msg.file_size || null,
        duration: payload.duration, forwarded: true,
      })
      .select()
      .single();
    if (error) { console.error('Forward message error:', error); return null; }
    return data;
  }, [userId]);

  const editMessage = useCallback(async (messageId, newText) => {
    const prevMessages = messages;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, editedAt: new Date().toISOString() } : m));
    const { error } = await supabase
      .from('messages')
      .update({ text: newText, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) {
      console.error('Edit message error:', error);
      setMessages(prevMessages);
    }
  }, [messages]);

  const deleteMessage = useCallback(async (messageId, scope = 'everyone') => {
    if (scope === 'me') {
      const prevMessages = messages;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (!userId) return;
      const { error } = await supabase.from('message_hidden_for').insert({ message_id: messageId, user_id: userId });
      if (error) { console.error('Delete-for-me error:', error); setMessages(prevMessages); }
      return;
    }
    const { error } = await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
    if (error) { console.error('Delete message error:', error); return; }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), text: '', file_url: null } : m));
  }, [userId, messages]);

  // Reactions: one row per (message, user, emoji). Tapping the same emoji again removes it (toggle).
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!userId) return;
    const msg = messages.find(m => m.id === messageId);
    const alreadyReacted = msg?.reactions?.[emoji]?.includes(userId);

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...m.reactions };
      const current = reactions[emoji] || [];
      reactions[emoji] = alreadyReacted ? current.filter(id => id !== userId) : [...current, userId];
      if (reactions[emoji].length === 0) delete reactions[emoji];
      return { ...m, reactions };
    }));

    if (alreadyReacted) {
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
      if (error) console.error('Remove reaction error:', error);
    } else {
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
      if (error) console.error('Add reaction error:', error);
    }
  }, [userId, messages]);

  // Starring is personal — toggling adds/removes my own id from starred_by via an RPC
  // (array mutation needs to happen server-side to avoid overwriting concurrent stars from others).
  const toggleStar = useCallback(async (messageId) => {
    if (!userId) return;
    const wasStarred = messages.find(m => m.id === messageId)?.starred;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: !wasStarred } : m));
    const { error } = await supabase.rpc('toggle_message_star', { msg_id: messageId, uid: userId });
    if (error) {
      console.error('Toggle star error:', error);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: wasStarred } : m));
    }
  }, [userId, messages]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || messages.length === 0) return;
    fetchMessages(messages[0]?.time);
  }, [messages, hasMore, loading, fetchMessages]);

  return {
    messages, loading, hasMore, typingUsers, blockedError,
    sendMessage, editMessage, deleteMessage, toggleReaction, toggleStar, forwardMessage,
    setTyping, loadMore,
  };
}