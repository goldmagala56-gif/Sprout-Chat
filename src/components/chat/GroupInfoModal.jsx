import React, { useState } from 'react';
import { X, Copy, RefreshCw, Crown, UserMinus, LogOut, Pencil, Check } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { COLORS } from '../../utils/constants.js';
import { useConversations } from '../../hooks/useConversations.js';

export default function GroupInfoModal({ conversation, userId, onClose, onLeft }) {
  const { updateConversation, leaveGroup, joinViaInvite, regenerateInviteCode, setParticipantAdmin, removeMember } = useConversations();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(conversation.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(conversation.description || '');
  const [copied, setCopied] = useState(false);

  const isAdmin = conversation.isAdmin;
  const inviteLink = `${window.location.origin}${window.location.pathname}#/join/${conversation.inviteCode}`;

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== conversation.name) await updateConversation(conversation.id, { name: trimmed });
    setEditingName(false);
  };

  const saveDescription = async () => {
    if (description !== conversation.description) await updateConversation(conversation.id, { description });
    setEditingDesc(false);
  };

  const toggleAdminOnly = async () => {
    await updateConversation(conversation.id, { admin_only: !conversation.adminOnly });
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = async () => {
    if (confirm('Regenerate the invite link? The old link will stop working.')) {
      await regenerateInviteCode(conversation.id);
    }
  };

  const handleLeave = async () => {
    if (confirm('Leave this group?')) {
      await leaveGroup(conversation.id);
      onLeft?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[85vh]" style={{ backgroundColor: COLORS.bg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Group info</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5"><X size={18} color={COLORS.textMuted} /></button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col items-center gap-2 py-5" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <Avatar url={conversation.avatar_url} initials={conversation.initials} size={72} />
            {editingName ? (
              <div className="flex items-center gap-1 px-4 w-full">
                <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 text-center text-base font-semibold outline-none border-b" style={{ color: COLORS.text, borderColor: COLORS.primary }} autoFocus />
                <button onClick={saveName}><Check size={16} color={COLORS.primary} /></button>
              </div>
            ) : (
              <button onClick={() => isAdmin && setEditingName(true)} className="flex items-center gap-1.5">
                <span className="text-base font-semibold" style={{ color: COLORS.text }}>{conversation.name}</span>
                {isAdmin && <Pencil size={12} color={COLORS.textMuted} />}
              </button>
            )}
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{conversation.memberList?.length || 0} members</span>
          </div>

          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: COLORS.textMuted }}>Description</div>
            {editingDesc ? (
              <div className="flex flex-col gap-1.5">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full text-sm outline-none border rounded px-2 py-1" style={{ color: COLORS.text, borderColor: COLORS.panelBorder }} autoFocus />
                <button onClick={saveDescription} className="self-end text-xs font-medium" style={{ color: COLORS.primary }}>Save</button>
              </div>
            ) : (
              <button onClick={() => isAdmin && setEditingDesc(true)} className="text-sm text-left w-full" style={{ color: description ? COLORS.text : COLORS.textMuted }}>
                {description || (isAdmin ? 'Add a group description' : 'No description')}
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
              <div>
                <div className="text-sm" style={{ color: COLORS.text }}>Admin-only messaging</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>Only admins can send messages</div>
              </div>
              <button onClick={toggleAdminOnly} className="w-11 h-6 rounded-full relative flex-shrink-0" style={{ backgroundColor: conversation.adminOnly ? COLORS.primary : COLORS.divider }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all" style={{ left: conversation.adminOnly ? 22 : 2 }} />
              </button>
            </div>
          )}

          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textMuted }}>Invite link</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-xs truncate px-2 py-1.5 rounded" style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textMuted }}>{inviteLink}</div>
              <button onClick={copyInvite} className="p-1.5 rounded-full hover:bg-black/5 flex-shrink-0"><Copy size={14} color={copied ? COLORS.primary : COLORS.textMuted} /></button>
              {isAdmin && <button onClick={handleRegenerate} className="p-1.5 rounded-full hover:bg-black/5 flex-shrink-0"><RefreshCw size={14} color={COLORS.textMuted} /></button>}
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textMuted }}>Members</div>
            {(conversation.memberList || []).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <Avatar url={m.avatar_url} initials={m.initials} size={36} />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm truncate" style={{ color: COLORS.text }}>{m.id === userId ? 'You' : m.name}</span>
                  {m.isAdmin && <Crown size={12} color={COLORS.primary} />}
                </div>
                {isAdmin && m.id !== userId && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setParticipantAdmin(conversation.id, m.id, !m.isAdmin)} className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.accentSoft, color: COLORS.primary }}>
                      {m.isAdmin ? 'Dismiss' : 'Make admin'}
                    </button>
                    <button onClick={() => { if (confirm(`Remove ${m.name} from the group?`)) removeMember(conversation.id, m.id); }} className="p-1 rounded-full hover:bg-black/5">
                      <UserMinus size={14} color={COLORS.danger} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.divider}` }}>
          <button onClick={handleLeave} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium" style={{ color: COLORS.danger, backgroundColor: '#FEF2F2' }}>
            <LogOut size={16} /> Leave group
          </button>
        </div>
      </div>
    </div>
  );
}