import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageCircle, Phone, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useContacts } from '../hooks/useContacts.js';
import { useConversations } from '../hooks/useConversations.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

export default function ContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts, searchUsers, addContact, removeContact } = useContacts(user?.id);
  const { createDirect } = useConversations(user?.id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
