import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useBlockedUsers(userId) {
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('owner_id', userId);
    if (error) { console.error('Fetch blocked users error:', error); setLoading(false); return; }
    setBlockedIds(new Set((data || []).map(r => r.blocked_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const blockUser = useCallback(async (targetId) => {
    if (!userId) return false;
    const { error } = await supabase.from('blocked_users').insert({ owner_id: userId, blocked_id: targetId });
    if (error) { console.error('Block user error:', error); return false; }
    setBlockedIds(prev => new Set([...prev, targetId]));
    return true;
  }, [userId]);

  const unblockUser = useCallback(async (targetId) => {
    if (!userId) return false;
    const { error } = await supabase.from('blocked_users').delete().eq('owner_id', userId).eq('blocked_id', targetId);
    if (error) { console.error('Unblock user error:', error); return false; }
    setBlockedIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    return true;
  }, [userId]);

  return { blockedIds, loading, blockUser, unblockUser };
}