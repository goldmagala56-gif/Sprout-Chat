import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, MessageCircle, Trash2, Send, Ban, ShieldCheck, MoreVertical, Contact, Flag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useContacts } from '../hooks/useContacts.js';
import { useConversations } from '../hooks/useConversations.js';
import { useBlockedUsers } from '../hooks/useBlockedUsers.js';
import { useReportUser } from '../hooks/useReportUser.js';
import { useLongPress } from '../hooks/useLongPress.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import ReportUserModal from '../components/ui/ReportUserModal.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

const supportsContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

function ContactRow({ contact, isBlocked, isReported, onStartChat, onToggleBlock, onRemove, onReport, menuOpen, onOpenMenu, onCloseMenu }) {
  const menuRef = useRef(null);
  useClickOutside(menuRef, menuOpen, onCloseMenu);

  const pressHandlers = useLongPress({
    onClick: () => { if (contact.registered) onStartChat(contact); },
    onLongPress: onOpenMenu,
  });

  return (
    <div className="relative flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
      <button {...pressHandlers} className="flex items-center gap-3 flex-1 min-w-0 text-left select-none">
        <Avatar url={contact.avatar_url} initials={contact.initials} online={contact.registered && contact.online && !isBlocked} size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold flex items-center gap-1.5" style={{ color: COLORS.text }}>
            {contact.name}
            {isBlocked && <Ban size={12} color={COLORS.danger} />}
          </div>
          <div className="text-sm truncate" style={{ color: isBlocked ? COLORS.danger : contact.registered ? COLORS.textMuted : COLORS.primary }}>
            {isBlocked ? 'Blocked' : contact.registered ? (contact.bio || contact.status || contact.phone) : 'Not on Sprout yet'}
          </div>
        </div>
      </button>

      <button onClick={onOpenMenu} className="p-2 rounded-full hover:bg-black/5 flex-shrink-0">
        <MoreVertical size={16} color={COLORS.textMuted} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-1 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
          style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
        >
          {contact.registered ? (
            <>
              <button onClick={() => { onStartChat(contact); onCloseMenu(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                <MessageCircle size={14} color={COLORS.primary} /> Message
              </button>
              <button onClick={() => { onToggleBlock(contact); onCloseMenu(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                {isBlocked ? <ShieldCheck size={14} color={COLORS.primary} /> : <Ban size={14} color={COLORS.text} />}
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
              <button
                onClick={() => { onReport(contact); onCloseMenu(); }}
                disabled={isReported}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left disabled:opacity-50"
              >
                <Flag size={14} color={isReported ? COLORS.textMuted : COLORS.danger} /> {isReported ? 'Reported' : 'Report'}
              </button>
            </>
          ) : (
            
             <a href={`sms:${contact.phone}?body=${encodeURIComponent(`Hey ${contact.name.split(' ')[0]}, join me on Sprout!`)}`}
              onClick={onCloseMenu}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left"
            >
              <Send size={14} color={COLORS.primary} /> Invite via SMS
            </a>
          )}
          <button
            onClick={() => { onRemove(contact.rowId); onCloseMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-50 text-left"
            style={{ color: COLORS.danger }}
          >
            <Trash2 size={14} /> Delete contact
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts, addContact, removeContact } = useContacts(user?.id);
  const { createDirect } = useConversations();
  const { blockedIds, blockUser, unblockUser } = useBlockedUsers(user?.id);
  const { reportedIds, reportUser } = useReportUser(user?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [picking, setPicking] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const handleAdd = async () => {
    setFormError('');
    if (!name.trim() || !phone.trim()) { setFormError('Enter both a name and a phone number.'); return; }
    setSaving(true);
    const result = await addContact(name, phone);
    setSaving(false);
    if (result.error) { setFormError(result.error); return; }
    setName('');
    setPhone('');
  };

  const handlePickFromContacts = async () => {
    setFormError('');
    setPicking(true);
    try {
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      const picked = results?.[0];
      if (picked) {
        setName(picked.name?.[0] || '');
        setPhone(picked.tel?.[0] || '');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Contact picker error:', err);
        setFormError("Couldn't read from your contacts. Try entering them manually.");
      }
    } finally {
      setPicking(false);
    }
  };

  const startChat = async (contact) => {
    if (!contact.registered) return;
    const convId = await createDirect(contact.id);
    if (convId) navigate(`/chat/${convId}`);
  };

  const handleToggleBlock = (contact) => {
    const isBlocked = blockedIds.has(contact.id);
    if (isBlocked) {
      unblockUser(contact.id);
    } else if (confirm(`Block ${contact.name}? They won't be able to message you.`)) {
      blockUser(contact.id);
    }
  };

  const handleReportSubmit = async (reason, details) => {
    if (!reportTarget) return;
    const ok = await reportUser(reportTarget.id, reason, details);
    if (!ok) alert("Couldn't submit the report. Try again.");
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Contacts</h1>
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>Add Contact</div>
          {supportsContactPicker && (
            <button
              onClick={handlePickFromContacts}
              disabled={picking}
              className="flex items-center gap-1 text-xs font-medium disabled:opacity-50"
              style={{ color: COLORS.primary }}
            >
              <Contact size={14} /> {picking ? 'Picking...' : 'Pick from contacts'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${COLORS.panelBorder}` }} />
          <div className="flex items-center gap-2">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256 7XX XXX XXX" type="tel" className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${COLORS.panelBorder}` }} />
            <button onClick={handleAdd} disabled={saving} className="p-2.5 rounded-lg disabled:opacity-50 flex-shrink-0" style={{ backgroundColor: COLORS.primary }}>
              <UserPlus size={16} color="white" />
            </button>
          </div>
          {formError && <div className="text-xs text-red-600">{formError}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>My Contacts ({contacts.length})</div>
        {contacts.map(c => (
          <ContactRow
            key={c.rowId}
            contact={c}
            isBlocked={c.registered && blockedIds.has(c.id)}
            isReported={c.registered && reportedIds.has(c.id)}
            onStartChat={startChat}
            onToggleBlock={handleToggleBlock}
            onRemove={removeContact}
            onReport={setReportTarget}
            menuOpen={openMenuId === c.rowId}
            onOpenMenu={() => setOpenMenuId(c.rowId)}
            onCloseMenu={() => setOpenMenuId(null)}
          />
        ))}
      </div>

      {reportTarget && (
        <ReportUserModal
          contactName={reportTarget.name}
          onSubmit={handleReportSubmit}
          onClose={() => setReportTarget(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

