import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './useAuth.js';

const PAGE_SIZE = 50;

export function useMessages(conversationId, userId) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const channelRef = useRef(null);
  const typingChannelRef = useRef(null);

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) return;
    setLoading(true);

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, text, type, file_url, duration, reply_to, deleted_at, created_at,
        profiles:sender_id(id, name, initials, avatar_url),
        message_reads(user_id)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) { console.error('Fetch messages error:', error); setLoading(false); return; }

    const idMap = {};
    (data || []).forEach(m => { idMap[m.id] = m; });

    const formatted = (data || []).reverse().map(msg => {
      const replyMsg = msg.reply_to ? idMap[msg.reply_to] : null;
      return {
        id: msg.id,
        from: msg.sender_id === userId ? 'me' : 'them',
        text: msg.deleted_at ? '' : msg.text,
        deletedAt: msg.deleted_at,
        type: msg.type,
        file_url: msg.deleted_at ? null : msg.file_url,
        duration: msg.duration,
        replyToId: msg.reply_to,
        replyPreview: replyMsg ? {
          text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.text,
          sender: replyMsg.sender_id === userId ? 'You' : (replyMsg.profiles?.name || 'them'),
        } : null,
        time: msg.created_at,
        senderName: msg.profiles?.name,
        senderAvatar: msg.profiles?.avatar_url,
        readBy: msg.message_reads?.map(r => r.user_id) || [],
        status: msg.sender_id === userId ? (msg.message_reads?.length > 0 ? 'seen' : 'sent') : null,
      };
    });

    if (before) {
      setMessages(prev => [...formatted, ...prev]);
    } else {
      setMessages(formatted);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);

    if (userId && conversationId) {
      await supabase.rpc('mark_messages_as_read', { conv_id: conversationId, reader_id: userId });
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Realtime: new + edited/deleted messages
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
            type: msg.type,
            file_url: msg.deleted_at ? null : msg.file_url,
            duration: msg.duration,
            replyToId: msg.reply_to,
            replyPreview: replyMsg ? { text: replyMsg.type === 'voice' ? 'Voice message' : replyMsg.type === 'image' ? 'Photo' : replyMsg.text, sender: replyMsg.from === 'me' ? 'You' : (replyMsg.senderName || 'them') } : null,
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
          ? { ...m, deletedAt: msg.deleted_at, text: msg.deleted_at ? '' : msg.text, file_url: msg.deleted_at ? null : m.file_url }
          : m));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reads',
      }, () => { fetchMessages(); })
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
    typingChannelRef.current?.track({ typing: isTyping, name: profile?.name || 'Someone' });
  }, [profile?.name]);

  const getReplyPreview = useCallback((id) => {
    const m = messages.find(x => x.id === id);
    if (!m) return null;
    return { text: m.type === 'voice' ? 'Voice message' : m.type === 'image' ? 'Photo' : m.text, sender: m.from === 'me' ? 'You' : (m.senderName || 'them') };
  }, [messages]);

  const sendMessage = useCallback(async ({ text = '', type = 'text', file = null, duration = null, replyToId = null }) => {
    if (!conversationId || !userId) return;
    if (!text.trim() && !file) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, from: 'me', text: text.trim(), type, duration, replyToId,
      replyPreview: replyToId ? getReplyPreview(replyToId) : null,
      time: new Date().toISOString(), status: 'sending', deletedAt: null,
      file_url: file ? URL.createObjectURL(file) : null, // local preview while uploading
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
      .insert({ conversation_id: conversationId, sender_id: userId, text: text.trim(), type, file_url, duration, reply_to: replyToId })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      return;
    }

    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, file_url: file_url || m.file_url, status: 'sent' } : m));
  }, [conversationId, userId, getReplyPreview]);

  const deleteMessage = useCallback(async (messageId) => {
    const { error } = await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
    if (error) { console.error('Delete message error:', error); return; }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), text: '', file_url: null } : m));
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || messages.length === 0) return;
    fetchMessages(messages[0]?.time);
  }, [messages, hasMore, loading, fetchMessages]);

  return { messages, loading, hasMore, typingUsers, sendMessage, deleteMessage, setTyping, loadMore };
}