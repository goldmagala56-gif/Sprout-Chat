import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { COLORS } from '../../utils/constants.js';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GalleryModal({ conversationId, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('media'); // 'media' (images) | 'files' (voice + docs)

  useEffect(() => {
    let active = true;
    supabase
      .from('messages')
      .select('id, type, file_url, file_name, file_size, duration, created_at')
      .eq('conversation_id', conversationId)
      .in('type', ['image', 'voice', 'file'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Fetch gallery error:', error);
        setItems(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [conversationId]);

  const images = items.filter(i => i.type === 'image');
  const others = items.filter(i => i.type !== 'image');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[80vh]" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Media, links and docs</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={COLORS.textMuted} /></button>
        </div>

        <div className="flex gap-2 px-3 py-2 flex-shrink-0">
          <button onClick={() => setTab('media')} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: tab === 'media' ? COLORS.accentSoft : 'transparent', color: tab === 'media' ? COLORS.primary : COLORS.textMuted }}>Media ({images.length})</button>
          <button onClick={() => setTab('files')} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: tab === 'files' ? COLORS.accentSoft : 'transparent', color: tab === 'files' ? COLORS.primary : COLORS.textMuted }}>Docs & voice ({others.length})</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
          {loading && <div className="text-center text-xs py-8" style={{ color: COLORS.textMuted }}>Loading...</div>}

          {!loading && tab === 'media' && (
            images.length === 0
              ? <div className="text-center text-xs py-8" style={{ color: COLORS.textMuted }}>No media shared yet</div>
              : (
                <div className="grid grid-cols-3 gap-1">
                  {images.map(item => (
                    <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer" className="aspect-square rounded overflow-hidden">
                      <img src={item.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )
          )}

          {!loading && tab === 'files' && (
            others.length === 0
              ? <div className="text-center text-xs py-8" style={{ color: COLORS.textMuted }}>No documents or voice notes yet</div>
              : (
                <div className="flex flex-col gap-1">
                  {others.map(item => (
                    <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.02]">
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 36, height: 36, backgroundColor: COLORS.primary }}>
                        <FileText size={16} color="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: COLORS.text }}>{item.type === 'voice' ? 'Voice message' : (item.file_name || 'File')}</div>
                        <div className="text-[10px]" style={{ color: COLORS.textMuted }}>{item.type === 'voice' ? item.duration : formatFileSize(item.file_size)}</div>
                      </div>
                      <Download size={14} color={COLORS.textMuted} className="flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
}