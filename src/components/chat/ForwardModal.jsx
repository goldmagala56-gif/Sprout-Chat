import React, { useState } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { COLORS } from '../../utils/constants.js';
import { forwardMessage } from '../../lib/forwardMessage.js';

export default function ForwardModal({ message, conversations, userId, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [failedNames, setFailedNames] = useState(null);

  const filtered = conversations.filter(c => c.name?.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    setFailedNames(null);
    const targetIds = Array.from(selected);
    const { failed } = await forwardMessage(message, targetIds, userId);
    setSending(false);

    if (failed.length > 0) {
      const names = conversations.filter(c => failed.includes(c.id)).map(c => c.name);
      setFailedNames(names);
      // keep the modal open so the person can see which ones failed
      setSelected(new Set(failed));
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: COLORS.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Forward to</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5">
            <X size={18} color={COLORS.textMuted} />
          </button>
        </div>

        {failedNames && failedNames.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-2.5 flex-shrink-0" style={{ backgroundColor: '#FEF2F2' }}>
            <AlertCircle size={14} color={COLORS.danger} className="flex-shrink-0 mt-0.5" />
            <span className="text-xs" style={{ color: COLORS.danger }}>
              Couldn't send to: {failedNames.join(', ')}. You may not have permission to message there.
            </span>
          </div>
        )}

        <div className="px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.bgSecondary }}>
            <Search size={16} color={COLORS.textMuted} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: COLORS.text }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 && (
            <div className="text-center text-xs py-8" style={{ color: COLORS.textMuted }}>No chats found</div>
          )}
          {filtered.map(c => {
            const isSelected = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.02]"
              >
                <Avatar url={c.avatar_url} initials={c.initials} size={40} />
                <span className="flex-1 text-sm truncate" style={{ color: COLORS.text }}>{c.name}</span>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: isSelected ? COLORS.primary : 'transparent',
                    border: `2px solid ${isSelected ? COLORS.primary : COLORS.panelBorder}`,
                  }}
                >
                  {isSelected && <Check size={13} color="white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.divider}` }}>
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending}
            className="w-full py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {sending ? 'Sending...' : selected.size > 0 ? `Send to ${selected.size}` : 'Select chats'}
          </button>
        </div>
      </div>
    </div>
  );
}