import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Eye } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { COLORS } from '../../utils/constants.js';

const DURATION_MS = 5000;

export default function StatusViewer({ user, statuses, isMine, onClose, onMarkViewed, onDelete, onFetchViewers }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  const current = statuses[index];

  useEffect(() => {
    if (current) onMarkViewed?.(current.id);
    setViewers(null);
    startRef.current = Date.now();
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) advance();
    }, 50);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const advance = () => {
    if (index < statuses.length - 1) setIndex(i => i + 1);
    else onClose();
  };

  const goBack = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  const loadViewers = async () => {
    if (!isMine || !current) return;
    const v = await onFetchViewers(current.id);
    setViewers(v);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#000' }}>
      <div className="flex gap-1 px-3 pt-3 flex-shrink-0">
        {statuses.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
            <div className="h-full bg-white transition-all" style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar url={user.avatar_url} initials={user.initials} size={32} />
          <span className="text-sm font-medium text-white">{isMine ? 'You' : user.name}</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {current ? new Date(current.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMine && (
            <button onClick={() => { if (confirm('Delete this status?')) { onDelete?.(current.id); advance(); } }} className="p-2">
              <Trash2 size={18} color="white" />
            </button>
          )}
          <button onClick={onClose} className="p-2"><X size={20} color="white" /></button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden" onClick={(e) => {
        const x = e.clientX; const w = window.innerWidth;
        if (x < w / 3) goBack(); else advance();
      }}>
        {current?.type === 'image' && current.file_url ? (
          <img src={current.file_url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-8" style={{ backgroundColor: current?.bg_color || COLORS.primary }}>
            <span className="text-white text-2xl font-medium text-center break-words">{current?.text}</span>
          </div>
        )}
      </div>

      {isMine && (
        <button onClick={loadViewers} className="flex items-center justify-center gap-2 py-3 flex-shrink-0 text-sm text-white">
          <Eye size={16} />
          {viewers === null ? 'Viewed by' : `${viewers.length} view${viewers.length === 1 ? '' : 's'}`}
        </button>
      )}
      {viewers && viewers.length > 0 && (
        <div className="max-h-40 overflow-y-auto px-4 pb-4 flex-shrink-0">
          {viewers.map(v => (
            <div key={v.viewer_id} className="flex items-center gap-2 py-1.5">
              <Avatar url={v.profiles?.avatar_url} initials={v.profiles?.initials} size={28} />
              <span className="text-xs text-white">{v.profiles?.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}