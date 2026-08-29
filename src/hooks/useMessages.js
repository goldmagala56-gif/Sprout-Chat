import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const PAGE_SIZE = 50;

export function useMessages(conversationId, userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const channelRef = useRef(null);

  const fetchMessages = useCallback(async (before = null) => {
    if (!conversationId) return;
    setLoading(true);

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, text, type, file_url, duration, reply_to, created_at,
        profiles:sender_id(id, name, initials, avatar_url),
        message_reads(user_id)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) { console.error('Fetch messages error:', error); setLoading(false); return; }

    const formatted = (data || []).reverse().map(msg => ({
      id: msg.id,
      from: msg.sender_id === userId ? 'me' : 'them',
      text: msg.text,
      type: msg.type,
      file_url: msg.file_url,
      duration: msg.duration,
      reply_to: msg.reply_to,
      time: msg.created_at,
      senderName: msg.profiles?.name,
      senderAvatar: msg.profiles?.avatar_url,
      readBy: msg.message_reads?.map(r => r.user_id) || [],
      status: msg.sender_id === userId 
        ? (msg.message_reads?.length > 0 ? 'seen' : 'sent')
        : null,
    }));

    if (before) {
      setMessages(prev => [...formatted, ...prev]);
    } else {
      setMessages(formatted);
    }

    setHasMore((data || []).length === PAGE_SIZE);
    setLoading(false);

    // Mark as read
    if (userId && conversationId) {
      await supabase.rpc('mark_messages_as_read', {
        conv_id: conversationId,
        reader_id: userId,
      });
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      // useMessages.js — inside the postgres_changes INSERT handler
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new;
        if (msg.sender_id === userId) return; // own sends are handled by the optimistic-insert flow in sendMessage
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev; // safety net against any other dupe path
          return [...prev, {
            id: msg.id,
            from: 'them',
            text: msg.text,
            type: msg.type,
            file_url: msg.file_url,
            duration: msg.duration,
            time: msg.created_at,
            status: null,
          }];
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reads',
      }, () => {
        // Refresh to get updated read status
        fetchMessages();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [conversationId, userId, fetchMessages]);

  const sendMessage = useCallback(async (text, type = 'text', extra = {}) => {
    if (!conversationId || !userId) return;

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      from: 'me',
      text,
      type,
      ...extra,
      time: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        text,
        type,
        ...extra,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      return;
    }

    // Replace optimistic with real
    setMessages(prev => prev.map(m => 
      m.id === tempId ? { ...m, id: data.id, status: 'sent' } : m
    ));
  }, [conversationId, userId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || messages.length === 0) return;
    const oldest = messages[0]?.time;
    fetchMessages(oldest);
  }, [messages, hasMore, loading, fetchMessages]);

  return { messages, loading, hasMore, typingUsers, sendMessage, loadMore };
}
