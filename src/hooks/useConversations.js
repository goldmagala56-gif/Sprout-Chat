import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Get conversations with participants and last message
    const { data, error } = await supabase
  .from('conversation_participants')
  .select(`
    conversation_id,
    unread_count,
    conversations!inner(
      id, name, is_group, created_at, updated_at,
      conversation_participants(
        user_id,
        profiles:user_id(id, name, initials, avatar_url, online, last_seen)
      ),
      messages!conversation_id(id, text, type, sender_id, created_at)
    )
  `)
  .eq('user_id', userId)
  .order('conversations(updated_at)', { ascending: false })
  .order('created_at', { ascending: false, foreignTable: 'messages' })
  .limit(1, { foreignTable: 'messages' });
    if (error) {
      console.error('Fetch conversations error:', error);
      setLoading(false);
      return;
    }

    // Transform to app format
    const formatted = (data || []).map(row => {
      // useConversations.js, inside the formatted map()
    const lastMsg = conv.messages?.[0];
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
    };
    });

    setConversations(formatted);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('conversation-updates')
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
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      user1: userId,
      user2: otherUserId,
    });
    if (error) { console.error('Create direct error:', error); return null; }
    await fetchConversations();
    return data;
  }, [userId, fetchConversations]);

  const createGroup = useCallback(async (name, memberIds) => {
    if (!userId) return null;

    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ name, is_group: true, created_by: userId })
      .select()
      .single();
    if (convError) { console.error('Create group error:', convError); return null; }

    // Add participants
    const allMembers = [...new Set([userId, ...memberIds])];
    const participants = allMembers.map(uid => ({
      conversation_id: conv.id,
      user_id: uid,
      is_admin: uid === userId,
    }));

    await supabase.from('conversation_participants').insert(participants);
    await fetchConversations();
    return conv.id;
  }, [userId, fetchConversations]);

  const deleteConversation = useCallback(async (convId) => {
  const { error } = await supabase.from('conversations').delete().eq('id', convId);
  if (error) { console.error('Delete conversation error:', error); return false; }
  setConversations(prev => prev.filter(c => c.id !== convId));
  return true;
}, []);

  return { conversations, loading, fetchConversations, createDirect, createGroup, deleteConversation };
}
