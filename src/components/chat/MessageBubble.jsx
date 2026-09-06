import React, { useState } from 'react';
import { Check, CheckCheck, Forward, FileText, Download, Pin } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatMessageTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';
import { useLongPress } from '../../hooks/useLongPress.js';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderTextWithMentions(text, memberNames) {
  if (!text || !memberNames?.length) return text;
  const escaped = memberNames.filter(Boolean).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return text;
  const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.startsWith('@') && memberNames.includes(part.slice(1))
      ? <span key={i} className="font-semibold" style={{ color: COLORS.primary }}>{part}</span>
      : part
  );
}

export default function MessageBubble({
  msg, showAvatar, isGroup, currentUserId, groupMemberNames = [],
  isSelected, onSelect, isEditing, onSubmitEdit, onCancelEdit,
  onReact,
}) {
  const [editText, setEditText] = useState(msg.text || '');
  const isMe = msg.from === 'me';
  const isVoice = msg.type === 'voice';
  const isImage = msg.type === 'image';
  const isFile = msg.type === 'file';
  const isDeleted = !!msg.deletedAt;
  const reactionEntries = Object.entries(msg.reactions || {});

  const longPress = useLongPress({
    onLongPress: () => { if (!isDeleted && !isEditing) onSelect?.(msg); },
  });

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== msg.text) onSubmitEdit?.(msg.id, trimmed);
    else onCancelEdit?.();
  };

  return (
    <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex items-end gap-2 max-w-[75%] md:max-w-[65%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
        {showAvatar && !isMe && isGroup && (
          <Avatar url={msg.senderAvatar} initials={msg.senderName?.slice(0, 2).toUpperCase() || '??'} size={28} />
        )}
        <div className="flex flex-col relative">
          {showAvatar && !isMe && isGroup && msg.senderName && (
            <span className="text-xs font-medium ml-1 mb-0.5" style={{ color: COLORS.primaryLight }}>{msg.senderName}</span>
          )}

          {isSelected && (
            <div
              className="absolute z-50 bottom-full mb-1 flex items-center gap-1 rounded-full shadow-lg px-2 py-1.5"
              style={{ [isMe ? 'left' : 'right']: 0, backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => onReact?.(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform px-0.5">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div
            {...(!isDeleted && !isEditing ? longPress : {})}
            className="relative px-3 py-1.5 text-sm shadow-sm select-none"
            style={{
              backgroundColor: isMe ? COLORS.sentBubble : COLORS.receivedBubble,
              color: isDeleted ? COLORS.textMuted : COLORS.text,
              borderRadius: isMe ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
              maxWidth: '100%',
              fontStyle: isDeleted ? 'italic' : 'normal',
              minWidth: isEditing ? 220 : undefined,
              marginBottom: reactionEntries.length > 0 ? 10 : 0,
              outline: isSelected ? `2px solid ${COLORS.primary}` : 'none',
              outlineOffset: isSelected ? 2 : 0,
              zIndex: isSelected ? 50 : 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {!isDeleted && !isEditing && msg.pinnedAt && (
              <div className="text-[10px] mb-0.5 flex items-center gap-1" style={{ color: COLORS.primary }}>
                <Pin size={10} /> Pinned
              </div>
            )}

            {!isDeleted && !isEditing && msg.forwarded && (
              <div className="text-[10px] italic mb-0.5 flex items-center gap-1" style={{ color: COLORS.textMuted }}>
                <Forward size={10} /> Forwarded
              </div>
            )}

            {!isDeleted && !isEditing && msg.replyPreview && (
              <div className="mb-1 pl-2 py-1 rounded" style={{ borderLeft: `3px solid ${COLORS.primary}`, backgroundColor: 'rgba(0,0,0,0.03)' }}>
                <div className="text-xs font-semibold" style={{ color: COLORS.primary }}>{msg.replyPreview.sender}</div>
                <div className="text-xs truncate" style={{ color: COLORS.textMuted, maxWidth: 200 }}>{msg.replyPreview.text}</div>
              </div>
            )}

            {isDeleted ? (
              <div>This message was deleted</div>
            ) : isEditing ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                    if (e.key === 'Escape') onCancelEdit?.();
                  }}
                  rows={2}
                  className="w-full bg-transparent outline-none text-sm resize-none border rounded px-2 py-1"
                  style={{ color: COLORS.text, borderColor: COLORS.panelBorder }}
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelEdit} className="text-xs px-2 py-1 rounded hover:bg-black/5" style={{ color: COLORS.textMuted }}>Cancel</button>
                  <button onClick={submitEdit} className="text-xs px-2 py-1 rounded font-medium hover:bg-black/5" style={{ color: COLORS.primary }}>Save</button>
                </div>
              </div>
            ) : isImage && msg.file_url ? (
              <img src={msg.file_url} alt="Shared image" className="rounded-lg max-w-full pointer-events-none" style={{ maxHeight: 300 }} loading="lazy" />
            ) : isVoice ? (
              <div className="flex items-center gap-2 min-w-[160px]">
                <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: COLORS.primary }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                </div>
                <audio src={msg.file_url} controls className="max-w-[180px] h-8" />
                <span className="text-xs flex-shrink-0" style={{ color: COLORS.textMuted }}>{msg.duration || '0:00'}</span>
              </div>
            ) : isFile ? (
              <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-[180px] hover:opacity-80" onClick={(e) => isSelected && e.preventDefault()}>
                <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 36, height: 36, backgroundColor: COLORS.primary }}>
                  <FileText size={18} color="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{msg.file_name || 'File'}</div>
                  <div className="text-[10px]" style={{ color: COLORS.textMuted }}>{formatFileSize(msg.file_size)}</div>
                </div>
                <Download size={14} color={COLORS.textMuted} className="flex-shrink-0" />
              </a>
            ) : (
              <div className="break-words whitespace-pre-wrap">{renderTextWithMentions(msg.text, groupMemberNames)}</div>
            )}

            {!isDeleted && !isEditing && (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {msg.starred && <span style={{ color: COLORS.primary }}>★</span>}
                {msg.editedAt && <span className="text-[10px] italic" style={{ color: COLORS.textMuted }}>edited</span>}
                <span className="text-[10px]" style={{ color: COLORS.textMuted }}>{formatMessageTime(msg.time)}</span>
                {isMe && (
                  msg.status === 'seen' ? <CheckCheck size={14} color={COLORS.checkRead} strokeWidth={2.5} />
                  : msg.status === 'failed' ? <span className="text-[10px] text-red-500">!</span>
                  : <Check size={14} color={COLORS.checkSent} strokeWidth={2} />
                )}
              </div>
            )}

            {!isDeleted && reactionEntries.length > 0 && (
              <div
                className="absolute -bottom-3 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm"
                style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}`, [isMe ? 'left' : 'right']: 6 }}
              >
                {reactionEntries.map(([emoji, uids]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact?.(msg.id, emoji)}
                    className="flex items-center gap-0.5 text-[11px] px-0.5 rounded-full"
                    style={{ backgroundColor: uids.includes(currentUserId) ? COLORS.accentSoft : 'transparent' }}
                  >
                    <span>{emoji}</span>
                    {uids.length > 1 && <span style={{ color: COLORS.textMuted }}>{uids.length}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}