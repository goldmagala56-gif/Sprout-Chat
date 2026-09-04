import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './useAuth.js';

const PAGE_SIZE = 50;

function buildReactions(rows, userId) {
  const reactions = {};
  (rows || []).forEach(r => {
    reactions[r.emoji] = [...(reactions[r.emoji] || []), r.user_id];
  });
  const myReaction = Object.entries(reactions).find(([, uids]) => uids.includes(userId))?.[0] || null;
  return { reactions, myReaction };
}

export function useMessages(conversationId, userId) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [blockedError, setBlockedError] = useState(null);
  const channelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) return;
    setLoading(true);

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, text, type, file_url, file_name, file_size, duration,
        reply_to, deleted_at, edited_at, forwarded, mentions, created_at,
        profiles:sender_id(id, name, initials, avatar_url),
        message_reads(user_id),
        message_reactions(user_id, emoji),
        starred_messages(user_id)
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

    const formatted = (data || [])
      .filter(m => !hiddenIds.has(m.id))
      .reverse()
      .map(msg => {
        const replyMsg = msg.reply_to ? idMap[msg.reply_to] : null;
        const { reactions, myReaction } = buildReactions(msg.message_reactions, userId);
        return {
          id: msg.id,
          from: msg.sender_id === userId ? 'me' : 'them',
          text: msg.deleted_at ? '' : msg.text,
          deletedAt: msg.deleted_at,
          editedAt: msg.edited_at,
          forwarded: !!msg.forwarded,
          type: msg.type,
          file_url: msg.deleted_at ? null : msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size,
          duration: msg.duration,
          mentions: msg.mentions || [],
          replyToId: msg.reply_to,
          replyPreview: replyMsg ? {
            text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.type === 'file' ? (replyMsg.file_name || 'File') : replyMsg.text,
            sender: replyMsg.sender_id === userId ? 'You' : (replyMsg.profiles?.name || 'them'),
          } : null,
          time: msg.created_at,
          senderName: msg.profiles?.name,
          senderAvatar: msg.profiles?.avatar_url,
          readBy: msg.message_reads?.map(r => r.user_id) || [],
          status: msg.sender_id === userId ? (msg.message_reads?.length > 0 ? 'seen' : 'sent') : null,
          reactions,
          myReaction,
          starred: (msg.starred_messages || []).length > 0,
        };
      });

    if (before) {
      setMessages(prev => [...formatted, ...prev]);
    } else {
      setMessages(formatted);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);

    // Respect the "Read Receipts" privacy toggle: skip marking as read
    // (and therefore never send a receipt back to the sender) when disabled.
    const receiptsEnabled = profileRef.current?.settings?.readReceipts !== false;
    if (userId && conversationId && receiptsEnabled) {
      await supabase.rpc('mark_messages_as_read', { conv_id: conversationId, reader_id: userId });
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    setBlockedError(null);
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Realtime: new + edited/deleted messages, reactions
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
        if (msg.sender_id === userId) return; // own sends handled optimistically in sendMessage
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const replyMsg = msg.reply_to ? prev.find(m => m.id === msg.reply_to) : null;
          return [...prev, {
            id: msg.id,
            from: 'them',
            text: msg.deleted_at ? '' : msg.text,
            deletedAt: msg.deleted_at,
            editedAt: msg.edited_at,
            forwarded: !!msg.forwarded,
            type: msg.type,
            file_url: msg.deleted_at ? null : msg.file_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            duration: msg.duration,
            mentions: msg.mentions || [],
            replyToId: msg.reply_to,
            replyPreview: replyMsg ? { text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.type === 'file' ? (replyMsg.file_name || 'File') : replyMsg.text, sender: replyMsg.from === 'me' ? 'You' : (replyMsg.senderName || 'them') } : null,
            time: msg.created_at,
            status: null,
            reactions: {},
            myReaction: null,
            starred: false,
          }];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new;
        setMessages(prev => prev.map(m => m.id === msg.id
          ? { ...m, deletedAt: msg.deleted_at, editedAt: msg.edited_at, text: msg.deleted_at ? '' : msg.text, file_url: msg.deleted_at ? null : m.file_url }
          : m));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reads',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => { fetchMessages(); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const messageId = row.message_id;
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          Object.keys(reactions).forEach(em => {
            reactions[em] = reactions[em].filter(uid => uid !== row.user_id);
            if (reactions[em].length === 0) delete reactions[em];
          });
          if (payload.eventType !== 'DELETE') {
            const emoji = payload.new.emoji;
            reactions[emoji] = [...(reactions[emoji] || []), row.user_id];
          }
          const myReaction = Object.entries(reactions).find(([, uids]) => uids.includes(userId))?.[0] || null;
          return { ...m, reactions, myReaction };
        }));
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [conversationId, userId, fetchMessages]);

  // Typing presence — separate lightweight channel per conversation
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
    const indicatorsEnabled = profileRef.current?.settings?.typingIndicators !== false;
    if (!indicatorsEnabled) return;
    typingChannelRef.current?.track({ typing: isTyping, name: profileRef.current?.name || 'Someone' });
  }, []);

  const getReplyPreview = useCallback((id) => {
    const m = messages.find(x => x.id === id);
    if (!m) return null;
    return { text: m.type === 'voice' ? 'Voice message' : m.type === 'image' ? 'Photo' : m.type === 'file' ? (m.file_name || 'File') : m.text, sender: m.from === 'me' ? 'You' : (m.senderName || 'them') };
  }, [messages]);

  const sendMessage = useCallback(async ({ text = '', type = 'text', file = null, duration = null, replyToId = null, mentions = [] }) => {
    if (!conversationId || !userId) return;
    if (!text.trim() && !file) return;

    setBlockedError(null);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, from: 'me', text: text.trim(), type, duration, replyToId,
      replyPreview: replyToId ? getReplyPreview(replyToId) : null,
      time: new Date().toISOString(), status: 'sending', deletedAt: null,
      file_url: file ? URL.createObjectURL(file) : null,
      file_name: file?.name || null, file_size: file?.size || null,
      reactions: {}, myReaction: null, starred: false, forwarded: false, mentions,
    }]);

    let file_url = null;
    if (file) {
      const ext = (file.name?.split('.').pop() || (type === 'voice' ? 'webm' : 'jpg')).toLowerCase();
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
        duration, reply_to: replyToId, mentions: mentions.length ? mentions : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      const isPolicyError = error.code === '42501' || /row-level security|policy/i.test(error.message || '');
      if (isPolicyError) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setBlockedError("This message couldn't be sent — you may not have permission to post here.");
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      }
      return;
    }

    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, file_url: file_url || m.file_url, status: 'sent' } : m));
  }, [conversationId, userId, getReplyPreview]);

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

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!userId) return;
    const msg = messages.find(m => m.id === messageId);
    const current = msg?.myReaction || null;

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      Object.keys(reactions).forEach(em => {
        reactions[em] = reactions[em].filter(uid => uid !== userId);
        if (reactions[em].length === 0) delete reactions[em];
      });
      let myReaction = null;
      if (current !== emoji) {
        reactions[emoji] = [...(reactions[emoji] || []), userId];
        myReaction = emoji;
      }
      return { ...m, reactions, myReaction };
    }));

    if (current === emoji) {
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
      if (error) console.error('Remove reaction error:', error);
    } else {
      const { error } = await supabase.from('message_reactions')
        .upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: 'message_id,user_id' });
      if (error) console.error('React error:', error);
    }
  }, [messages, userId]);

  const toggleStar = useCallback(async (messageId) => {
    if (!userId) return;
    const msg = messages.find(m => m.id === messageId);
    const isStarred = !!msg?.starred;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: !isStarred } : m));
    if (isStarred) {
      const { error } = await supabase.from('starred_messages').delete().eq('message_id', messageId).eq('user_id', userId);
      if (error) console.error('Unstar error:', error);
    } else {
      const { error } = await supabase.from('starred_messages').insert({ message_id: messageId, user_id: userId });
      if (error) console.error('Star error:', error);
    }
  }, [messages, userId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || messages.length === 0) return;
    fetchMessages(messages[0]?.time);
  }, [messages, hasMore, loading, fetchMessages]);

  return {
    messages, loading, hasMore, typingUsers, blockedError,
    sendMessage, editMessage, deleteMessage, toggleReaction, toggleStar,
    setTyping, loadMore,
  };
}