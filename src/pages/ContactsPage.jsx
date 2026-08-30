import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageCircle, Phone, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useContacts } from '../hooks/useContacts.js';
import { useConversations } from '../hooks/useConversations.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import { UserPlus as AddByPhone } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav.jsx';

export default function ContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createDirect } = useConversations(user?.id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const { contacts, searchUsers, searchByPhone, addContact, removeContact } = useContacts(user?.id);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [phoneResult, setPhoneResult] = useState(undefined); // undefined = not searched, null = not found, object = found
  const [phoneSearching, setPhoneSearching] = useState(false);

  const handlePhoneSearch = async () => {
    if (!phoneQuery.trim()) return;
    setPhoneSearching(true);
    const result = await searchByPhone(phoneQuery.trim());
    setPhoneResult(result);
    setPhoneSearching(false);
  };

  const handleAddByPhone = async (contact) => {
    await addContact(contact.id);
    setPhoneQuery('');
    setPhoneResult(undefined);
  };

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const users = await searchUsers(q);
    setResults(users.filter(u => !contacts.find(c => c.id === u.id)));
    setSearching(false);
  };

  const startChat = async (contact) => {
    const convId = await createDirect(contact.id);
    if (convId) navigate(`/chat/${convId}`);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Contacts</h1>
      </div>

      {/* Add by phone number — place this above the existing name Search block */}
        <div className="px-3 py-2 flex-shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>Add by Phone Number</div>
          <div className="flex items-center gap-2">
            <input
              value={phoneQuery}
              onChange={e => { setPhoneQuery(e.target.value); setPhoneResult(undefined); }}
              placeholder="+256 7XX XXX XXX"
              type="tel"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${COLORS.panelBorder}` }}
            />
            <button onClick={handlePhoneSearch} disabled={phoneSearching || !phoneQuery.trim()} className="p-2.5 rounded-lg disabled:opacity-50" style={{ backgroundColor: COLORS.primary }}>
              <AddByPhone size={16} color="white" />
            </button>
          </div>

          {phoneResult === null && (
            <div className="text-xs mt-2 py-2 px-3 rounded-lg" style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textMuted }}>
              No Sprout user found with that number.
            </div>
          )}
          {phoneResult && (
            <div className="flex items-center gap-3 mt-2 py-2">
              <Avatar url={phoneResult.avatar_url} initials={phoneResult.initials} online={phoneResult.online} size={44} />
              <div className="flex-1"><div className="text-sm font-semibold" style={{ color: COLORS.text }}>{phoneResult.name}</div></div>
              <button onClick={() => handleAddByPhone(phoneResult)} className="p-2 rounded-full" style={{ backgroundColor: COLORS.accentSoft }}>
                <UserPlus size={16} color={COLORS.primary} />
              </button>
            </div>
          )}
        </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.bgSecondary }}>
          <Search size={16} color={COLORS.textMuted} />
          <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search by name" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>Search Results</div>
          {results.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-2">
              <Avatar url={u.avatar_url} initials={u.initials} online={u.online} size={44} />
              <div className="flex-1"><div className="text-sm font-semibold" style={{ color: COLORS.text }}>{u.name}</div><div className="text-xs" style={{ color: COLORS.textMuted }}>{u.status}</div></div>
              <button onClick={() => addContact(u.id)} className="p-2 rounded-full" style={{ backgroundColor: COLORS.accentSoft }}><UserPlus size={16} color={COLORS.primary} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>My Contacts ({contacts.length})</div>
        {contacts.map(c => (
          <div key={c.id} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <Avatar url={c.avatar_url} initials={c.initials} online={c.online} size={48} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold" style={{ color: COLORS.text }}>{c.name}</div>
              <div className="text-sm" style={{ color: COLORS.textMuted }}>{c.bio || c.status}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => startChat(c)} className="p-2 rounded-full hover:bg-black/5"><MessageCircle size={18} color={COLORS.primary} /></button>
              <button className="p-2 rounded-full hover:bg-black/5"><Phone size={16} color={COLORS.primary} /></button>
              <button onClick={() => removeContact(c.id)} className="p-2 rounded-full hover:bg-red-50"><Trash2 size={16} color={COLORS.danger} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
