import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useReportUser(userId) {
  const [reportedIds, setReportedIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchReported = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_reports')
      .select('reported_id')
      .eq('reporter_id', userId);
    if (error) { console.error('Fetch reports error:', error); return; }
    setReportedIds(new Set((data || []).map(r => r.reported_id)));
  }, [userId]);

  useEffect(() => { fetchReported(); }, [fetchReported]);

  const reportUser = useCallback(async (reportedId, reason, details = '') => {
    if (!userId || !reportedId) return false;
    setSubmitting(true);
    const { error } = await supabase
      .from('user_reports')
      .insert({ reporter_id: userId, reported_id: reportedId, reason, details });
    setSubmitting(false);
    if (error) { console.error('Report user error:', error); return false; }
    setReportedIds(prev => new Set(prev).add(reportedId));
    return true;
  }, [userId]);

  return { reportedIds, reportUser, submitting };
}