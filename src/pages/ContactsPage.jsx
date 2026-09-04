import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, MessageCircle, Trash2, Send, Ban, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useContacts } from '../hooks/useContacts.js';
import { useConversations } from '../hooks/useConversations.js';
import { useBlockedUsers } from '../hooks/useBlockedUsers.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

export default function ContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts, addContact, removeContact } = useContacts(user?.id);
  const { createDirect } = useConversations();
  const { blockedIds, blockUser, unblockUser } = useBlockedUsers(user?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Contacts</h1>
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>Add Contact</div>
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
        {contacts.map(c => {
          const isBlocked = c.registered && blockedIds.has(c.id);
          return (
            <div key={c.rowId} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
              <Avatar url={c.avatar_url} initials={c.initials} online={c.registered && c.online && !isBlocked} size={48} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold flex items-center gap-1.5" style={{ color: COLORS.text }}>
                  {c.name}
                  {isBlocked && <Ban size={12} color={COLORS.danger} />}
                </div>
                <div className="text-sm" style={{ color: isBlocked ? COLORS.danger : c.registered ? COLORS.textMuted : COLORS.primary }}>
                  {isBlocked ? 'Blocked' : c.registered ? (c.bio || c.status || c.phone) : 'Not on Sprout yet'}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.registered && (
                  <button onClick={() => handleToggleBlock(c)} className="p-2 rounded-full hover:bg-black/5" title={isBlocked ? 'Unblock' : 'Block'}>
                    {isBlocked ? <ShieldCheck size={16} color={COLORS.primary} /> : <Ban size={16} color={COLORS.textMuted} />}
                  </button>
                )}
                {c.registered ? (
                  <button onClick={() => startChat(c)} className="p-2 rounded-full hover:bg-black/5"><MessageCircle size={18} color={COLORS.primary} /></button>
                ) : (
                  <a href={`sms:${c.phone}?body=${encodeURIComponent(`Hey ${c.name.split(' ')[0]}, join me on Sprout!`)}`} className="p-2 rounded-full hover:bg-black/5">
                    <Send size={16} color={COLORS.primary} />
                  </a>
                )}
                <button onClick={() => removeContact(c.rowId)} className="p-2 rounded-full hover:bg-red-50"><Trash2 size={16} color={COLORS.danger} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}