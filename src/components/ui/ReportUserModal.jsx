import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const REASONS = ['Spam', 'Inappropriate content', 'Fake account', 'Harassment', 'Other'];

export default function ReportUserModal({ contactName, onSubmit, onClose }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onSubmit(reason, details.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[85vh]" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Report {contactName}</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={COLORS.textMuted} /></button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textMuted }}>Reason</div>
          <div className="flex flex-col gap-2 mb-4">
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="text-left px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: reason === r ? COLORS.accentSoft : COLORS.bgSecondary,
                  color: reason === r ? COLORS.primary : COLORS.text,
                  fontWeight: reason === r ? 600 : 400,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textMuted }}>Additional details (optional)</div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Anything else we should know?"
            className="w-full text-sm outline-none border rounded-lg px-3 py-2 resize-none"
            style={{ color: COLORS.text, borderColor: COLORS.panelBorder }}
          />
        </div>

        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.divider}` }}>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.danger }}
          >
            {submitting ? 'Submitting...' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}