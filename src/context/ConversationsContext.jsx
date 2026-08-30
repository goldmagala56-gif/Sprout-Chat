import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';

const ConversationsContext = createContext(null);

export function ConversationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        unread_count,
        is_muted, is_archived, is_pinned, pinned_at,
        conversations!inner(
          id, name, is_group, created_at, updated_at,
          conversation_participants(
            user_id,
            profiles:user_id(id, name, initials, avatar_url, online, last_seen)
          ),
          messages!conversation_id(id, text, type, sender_id, created_at)
        )
      `)
      .eq('user_id', userId);

    if (error) { console.error('Fetch conversations error:', error); setLoading(false); return; }

    const formatted = (data || []).map(row => {
      const conv = row.conversations;
      const participants = conv.conversation_participants || [];
      const other = participants.find(p => p.user_id !== userId)?.profiles;

      const lastMsg = (conv.messages || []).reduce(
        (latest, m) => (!latest || new Date(m.created_at) > new Date(latest.created_at)) ? m : latest,
        null
      );
      const lastText = lastMsg ? (lastMsg.type === 'voice' ? 'Voice message' : lastMsg.text) : 'No messages yet';
      const lastIsMine = lastMsg?.sender_id === userId;

      return {
        id: conv.id,
        name: conv.is_group ? conv.name : (other?.name || 'Unknown'),
        initials: conv.is_group
          ? (conv.name || 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : (other?.initials || '??'),
        avatar_url: conv.is_group ? conv.avatar_url : other?.avatar_url,
        last: lastIsMine ? `You: ${lastText}` : lastText,
        time: lastMsg?.created_at || conv.updated_at,
        unread: row.unread_count || 0,
        online: !conv.is_group && (other?.online || false),
        group: conv.is_group,
        members: participants.map(p => p.profiles?.name || 'User'),
        participantIds: participants.map(p => p.user_id),
        otherUser: other,
        isMuted: row.is_muted,
        isArchived: row.is_archived,
        isPinned: row.is_pinned,
      };
    });

    formatted.sort((a, b) => new Date(b.time) - new Date(a.time));
    setConversations(formatted);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversation-updates-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchConversations]);

  const createDirect = useCallback(async (otherUserId) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { user1: userId, user2: otherUserId });
    if (error) { console.error('Create direct error:', error); return null; }
    await fetchConversations();
    return data;
  }, [userId, fetchConversations]);

  const createGroup = useCallback(async (name, memberIds) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('create_group_conversation', {
      group_name: name,
      member_ids: memberIds,
      creator_id: userId,
    });
    if (error) { console.error('Create group error:', error); return null; }
    await fetchConversations();
    return data;
  }, [userId, fetchConversations]);

  const deleteConversation = useCallback(async (convId) => {
    const { error } = await supabase.from('conversations').delete().eq('id', convId);
    if (error) { console.error('Delete conversation error:', error); return false; }
    setConversations(prev => prev.filter(c => c.id !== convId));
    return true;
  }, []);

  const value = { conversations, loading, fetchConversations, createDirect, createGroup, deleteConversation };
  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used within ConversationsProvider');
  return ctx;
}