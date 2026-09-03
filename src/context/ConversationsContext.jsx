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
          id, name, avatar_url, description, admin_only, invite_code, is_group, created_at, updated_at,
          conversation_participants(
            user_id, is_admin,
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
      const myParticipant = participants.find(p => p.user_id === userId);

      const lastMsg = (conv.messages || []).reduce(
        (latest, m) => (!latest || new Date(m.created_at) > new Date(latest.created_at)) ? m : latest,
        null
      );
      const lastText = lastMsg ? (lastMsg.type === 'voice' ? 'Voice message' : lastMsg.type === 'file' ? 'Document' : lastMsg.text) : 'No messages yet';
      const lastIsMine = lastMsg?.sender_id === userId;

      return {
        id: conv.id,
        name: conv.is_group ? conv.name : (other?.name || 'Unknown'),
        initials: conv.is_group
          ? (conv.name || 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : (other?.initials || '??'),
        avatar_url: conv.is_group ? conv.avatar_url : other?.avatar_url,
        description: conv.description,
        adminOnly: !!conv.admin_only,
        inviteCode: conv.invite_code,
        isAdmin: !!myParticipant?.is_admin,
        last: lastIsMine ? `You: ${lastText}` : lastText,
        time: lastMsg?.created_at || conv.updated_at,
        unread: row.unread_count || 0,
        online: !conv.is_group && (other?.online || false),
        group: conv.is_group,
        members: participants.map(p => p.profiles?.name || 'User'),
        memberList: participants.map(p => ({
          id: p.user_id,
          name: p.profiles?.name || 'User',
          avatar_url: p.profiles?.avatar_url,
          initials: p.profiles?.initials || '??',
          isAdmin: !!p.is_admin,
        })),
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
        event: '*', schema: 'public', table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, () => fetchConversations())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
      }, (payload) => {
        const p = payload.new;
        setConversations(prev => prev.map(c => {
          if (c.group || c.otherUser?.id !== p.id) return c;
          return { ...c, online: p.online, otherUser: { ...c.otherUser, online: p.online, last_seen: p.last_seen } };
        }));
      })
      // Group name/description/admin_only/avatar edits — infrequent, so a
      // global refetch (rather than a per-row filter) is an acceptable cost.
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
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
    const { data, error } = await supabase.rpc('create_group_conversation', { group_name: name, member_ids: memberIds, creator_id: userId });
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

  const updateConversation = useCallback(async (convId, updates) => {
    const { data, error } = await supabase.from('conversations').update(updates).eq('id', convId).select().single();
    if (error) { console.error('Update conversation error:', error); return null; }
    await fetchConversations();
    return data;
  }, [fetchConversations]);

  const leaveGroup = useCallback(async (convId) => {
    if (!userId) return false;
    const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', convId).eq('user_id', userId);
    if (error) { console.error('Leave group error:', error); return false; }
    setConversations(prev => prev.filter(c => c.id !== convId));
    return true;
  }, [userId]);

  const joinViaInvite = useCallback(async (code) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('join_group_via_invite', { code, joining_user: userId });
    if (error) { console.error('Join via invite error:', error); return null; }
    await fetchConversations();
    return data;
  }, [userId, fetchConversations]);

  const regenerateInviteCode = useCallback(async (convId) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('regenerate_invite_code', { conv_id: convId, requester: userId });
    if (error) { console.error('Regenerate invite error:', error); return null; }
    await fetchConversations();
    return data;
  }, [userId, fetchConversations]);

  const setParticipantAdmin = useCallback(async (convId, targetUserId, isAdmin) => {
    const { error } = await supabase.from('conversation_participants').update({ is_admin: isAdmin }).eq('conversation_id', convId).eq('user_id', targetUserId);
    if (error) { console.error('Set admin error:', error); return false; }
    await fetchConversations();
    return true;
  }, [fetchConversations]);

  const removeMember = useCallback(async (convId, targetUserId) => {
    const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', convId).eq('user_id', targetUserId);
    if (error) { console.error('Remove member error:', error); return false; }
    await fetchConversations();
    return true;
  }, [fetchConversations]);

  const value = {
    conversations, loading, fetchConversations, createDirect, createGroup, deleteConversation,
    updateConversation, leaveGroup, joinViaInvite, regenerateInviteCode, setParticipantAdmin, removeMember,
  };
  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used within ConversationsProvider');
  return ctx;
}