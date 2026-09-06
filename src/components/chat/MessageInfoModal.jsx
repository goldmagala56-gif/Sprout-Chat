import React from 'react';
import { X, Check, CheckCheck } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

export default function MessageInfoModal({ msg, onClose }) {
  const sentTime = new Date(msg.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full sm:max-w-xs sm:rounded-2xl rounded-t-2xl flex flex-col" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Message info</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={COLORS.textMuted} /></button>
        </div>
        <div className="px-4 py-4">
          <div className="mb-3">
            <div className="text-xs" style={{ color: COLORS.textMuted }}>Sent</div>
            <div className="text-sm flex items-center gap-1.5" style={{ color: COLORS.text }}>
              <Check size={14} color={COLORS.checkSent} /> {sentTime}
            </div>
          </div>
          {msg.from === 'me' && (
            <div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>Status</div>
              <div className="text-sm flex items-center gap-1.5" style={{ color: COLORS.text }}>
                {msg.status === 'seen'
                  ? <><CheckCheck size={14} color={COLORS.checkRead} /> Read</>
                  : <><Check size={14} color={COLORS.checkSent} /> Delivered, not yet read</>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}