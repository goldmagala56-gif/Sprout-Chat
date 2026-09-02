import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, MoreVertical, Reply, Trash2, Pencil, X as XIcon, Check as CheckIcon } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatMessageTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';

export default function MessageBubble({ msg, showAvatar, isGroup, onReply, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // false | 'me' | 'everyone'
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || '');
  const editRef = useRef(null);

  const isMe = msg.from === 'me';
  const isVoice = msg.type === 'voice';
  const isImage = msg.type === 'image';
  const isDeleted = !!msg.deletedAt;
  const isEdited = !!msg.editedAt && !isDeleted;
  const canEdit = isMe && !isDeleted && !isVoice && !isImage;

  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      editRef.current?.setSelectionRange(editText.length, editText.length);
    }
  }, [editing]);

  const startEdit = () => {
    setEditText(msg.text || '');
    setEditing(true);
    setMenuOpen(false);
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) { setEditing(false); return; }
    if (trimmed !== msg.text) onEdit?.(msg.id, trimmed);
    setEditing(false);
  };

  const cancelEdit = () => { setEditing(false); setEditText(msg.text || ''); };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const requestDelete = (scope) => {
    setMenuOpen(false);
    setConfirmDelete(scope);
  };

  const confirmDeleteNow = () => {
    onDelete?.(msg.id, confirmDelete);
    setConfirmDelete(false);
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex items-end gap-2 max-w-[75%] md:max-w-[65%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isMe && isGroup && (
          <Avatar url={msg.senderAvatar} initials={msg.senderName?.slice(0, 2).toUpperCase() || '??'} size={28} />
        )}
        <div className="flex flex-col relative">
          {showAvatar && !isMe && isGroup && msg.senderName && (
            <span className="text-xs font-medium ml-1 mb-0.5" style={{ color: COLORS.primaryLight }}>{msg.senderName}</span>
          )}

          <div className="flex items-center gap-1" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
            <div
              className="relative px-3 py-1.5 text-sm shadow-sm"
              style={{
                backgroundColor: isMe ? COLORS.sentBubble : COLORS.receivedBubble,
                color: isDeleted ? COLORS.textMuted : COLORS.text,
                borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                maxWidth: editing ? 260 : '100%',
                fontStyle: isDeleted ? 'italic' : 'normal',
              }}
            >
              {!isDeleted && !editing && msg.replyPreview && (
                <div className="mb-1 pl-2 py-1 rounded" style={{ borderLeft: `3px solid ${COLORS.primary}`, backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <div className="text-xs font-semibold" style={{ color: COLORS.primary }}>{msg.replyPreview.sender}</div>
                  <div className="text-xs truncate" style={{ color: COLORS.textMuted, maxWidth: 200 }}>{msg.replyPreview.text}</div>
                </div>
              )}

              {isDeleted ? (
                <div>This message was deleted</div>
              ) : editing ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    rows={Math.min(6, Math.max(1, editText.split('\n').length))}
                    className="bg-transparent outline-none text-sm resize-none w-full"
                    style={{ color: COLORS.text, minWidth: 160 }}
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={cancelEdit} className="p-1 rounded-full hover:bg-black/10"><XIcon size={14} color={COLORS.textMuted} /></button>
                    <button onClick={submitEdit} className="p-1 rounded-full hover:bg-black/10"><CheckIcon size={14} color={COLORS.primary} /></button>
                  </div>
                </div>
              ) : isImage && msg.file_url ? (
                <img src={msg.file_url} alt="Shared image" className="rounded-lg max-w-full cursor-pointer" style={{ maxHeight: 300 }} loading="lazy" />
              ) : isVoice ? (
                <div className="flex items-center gap-2 min-w-[160px]">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: COLORS.primary }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                  </div>
                  <audio src={msg.file_url} controls className="max-w-[180px] h-8" />
                  <span className="text-xs flex-shrink-0" style={{ color: COLORS.textMuted }}>{msg.duration || '0:00'}</span>
                </div>
              ) : (
                <div className="break-words whitespace-pre-wrap">{msg.text}</div>
              )}

              {!isDeleted && !editing && (
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {isEdited && <span className="text-[10px] italic" style={{ color: COLORS.textMuted }}>edited</span>}
                  <span className="text-[10px]" style={{ color: COLORS.textMuted }}>{formatMessageTime(msg.time)}</span>
                  {isMe && (
                    msg.status === 'seen' ? <CheckCheck size={14} color={COLORS.checkRead} strokeWidth={2.5} />
                    : msg.status === 'failed' ? <span className="text-[10px] text-red-500">!</span>
                    : <Check size={14} color={COLORS.checkSent} strokeWidth={2} />
                  )}
                </div>
              )}
            </div>

            {!isDeleted && !editing && (
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full hover:bg-black/5">
                  <MoreVertical size={14} color={COLORS.textMuted} />
                </button>
                {menuOpen && (
                  <div className="absolute top-full mt-1 rounded-lg shadow-lg py-1 z-50 min-w-[150px]" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}`, [isMe ? 'right' : 'left']: 0 }}>
                    <button onClick={() => { onReply?.(msg); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                      <Reply size={14} color={COLORS.text} /> Reply
                    </button>
                    {canEdit && (
                      <button onClick={startEdit} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                        <Pencil size={14} color={COLORS.text} /> Edit
                      </button>
                    )}
                    <button onClick={() => requestDelete('me')} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                      <Trash2 size={14} color={COLORS.danger} /> Delete for me
                    </button>
                    {isMe && (
                      <button onClick={() => requestDelete('everyone')} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                        <Trash2 size={14} color={COLORS.danger} /> Delete for everyone
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {confirmDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setConfirmDelete(false)}>
              <div className="rounded-lg shadow-xl p-4 w-72" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
                <div className="text-sm mb-3" style={{ color: COLORS.text }}>
                  {confirmDelete === 'everyone' ? 'Delete this message for everyone?' : 'Delete this message for you?'}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs rounded-md hover:bg-black/5" style={{ color: COLORS.textMuted }}>Cancel</button>
                  <button onClick={confirmDeleteNow} className="px-3 py-1.5 text-xs rounded-md text-white" style={{ backgroundColor: COLORS.danger }}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}