import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useStatuses(userId) {
  const [myStatuses, setMyStatuses] = useState([]);
  const [feed, setFeed] = useState([]); // [{ user, statuses: [...], allViewed }]
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('statuses')
      .select(`
        id, user_id, type, text, bg_color, file_url, created_at, expires_at,
        profiles:user_id(id, name, initials, avatar_url),
        status_views(viewer_id)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) { console.error('Fetch statuses error:', error); setLoading(false); return; }

    const mine = (data || []).filter(s => s.user_id === userId);
    const othersRaw = (data || []).filter(s => s.user_id !== userId);

    const grouped = {};
    othersRaw.forEach(s => {
      if (!grouped[s.user_id]) grouped[s.user_id] = { user: s.profiles, statuses: [] };
      grouped[s.user_id].statuses.push({ ...s, viewed: (s.status_views || []).some(v => v.viewer_id === userId) });
    });
    const feedArr = Object.values(grouped).map(g => ({ ...g, allViewed: g.statuses.every(s => s.viewed) }));

    setMyStatuses(mine);
    setFeed(feedArr);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`statuses-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => fetchStatuses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_views' }, () => fetchStatuses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchStatuses]);

  const postStatus = useCallback(async ({ type, text = null, bgColor = null, file = null }) => {
    if (!userId) return false;
    let file_url = null;
    if (file) {
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
      const path = `status/${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, file);
      if (uploadError) { console.error('Status upload error:', uploadError); return false; }
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
      file_url = urlData.publicUrl;
    }
    const { error } = await supabase.from('statuses').insert({ user_id: userId, type, text, bg_color: bgColor, file_url });
    if (error) { console.error('Post status error:', error); return false; }
    await fetchStatuses();
    return true;
  }, [userId, fetchStatuses]);

  const deleteStatus = useCallback(async (id) => {
    const { error } = await supabase.from('statuses').delete().eq('id', id);
    if (error) { console.error('Delete status error:', error); return; }
    setMyStatuses(prev => prev.filter(s => s.id !== id));
  }, []);

  const markViewed = useCallback(async (statusId) => {
    if (!userId) return;
    const { error } = await supabase.from('status_views').upsert(
      { status_id: statusId, viewer_id: userId },
      { onConflict: 'status_id,viewer_id' }
    );
    if (error) console.error('Mark viewed error:', error);
  }, [userId]);

  const fetchViewers = useCallback(async (statusId) => {
    const { data, error } = await supabase
      .from('status_views')
      .select('viewer_id, viewed_at, profiles:viewer_id(id, name, initials, avatar_url)')
      .eq('status_id', statusId);
    if (error) { console.error('Fetch viewers error:', error); return []; }
    return data || [];
  }, []);

  return { myStatuses, feed, loading, postStatus, deleteStatus, markViewed, fetchViewers, refetch: fetchStatuses };
}