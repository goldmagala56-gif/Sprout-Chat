import React from 'react';
import { X, Check } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const OPTIONS = [
  { label: 'Off', seconds: null },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: '90 days', seconds: 7776000 },
];

export default function DisappearingMessagesModal({ currentSeconds, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full sm:max-w-xs sm:rounded-2xl rounded-t-2xl flex flex-col" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Disappearing messages</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={COLORS.textMuted} /></button>
        </div>
        <div className="py-2">
          {OPTIONS.map(opt => {
            const isSelected = currentSeconds === opt.seconds || (currentSeconds == null && opt.seconds == null);
            return (
              <button
                key={opt.label}
                onClick={() => { onSelect(opt.seconds); onClose(); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] text-left"
              >
                <span className="text-sm" style={{ color: COLORS.text }}>{opt.label}</span>
                {isSelected && <Check size={16} color={COLORS.primary} />}
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-4 pt-1">
          <p className="text-[11px]" style={{ color: COLORS.textMuted }}>New messages will disappear from this chat after the selected time. This doesn't affect existing messages.</p>
        </div>
      </div>
    </div>
  );
}





