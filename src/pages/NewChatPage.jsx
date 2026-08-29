import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageCircle, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useContacts } from '../hooks/useContacts.js';
import { useConversations } from '../hooks/useConversations.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';

export default function NewChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts } = useContacts(user?.id);
  const { createDirect, createGroup } = useConversations(user?.id);
  const [mode, setMode] = useState('direct');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  const toggleSelect = (c) => {
    setSelected(prev => prev.find(s => s.id === c.id) ? prev.filter(s => s.id !== c.id) : [...prev, c]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    const convId = await createGroup(groupName, selected.map(s => s.id));
    if (convId) navigate(`/chat/${convId}`);
  };

  const handleStartChat = async (contact) => {
    const convId = await createDirect(contact.id);
    if (convId) navigate(`/chat/${convId}`);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>New Chat</h1>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 px-3 py-2 flex-shrink-0">
        <button onClick={() => setMode('direct')} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: mode === 'direct' ? COLORS.accentSoft : COLORS.bgSecondary, color: mode === 'direct' ? COLORS.primary : COLORS.textMuted }}>Direct</button>
        <button onClick={() => setMode('group')} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: mode === 'group' ? COLORS.accentSoft : COLORS.bgSecondary, color: mode === 'group' ? COLORS.primary : COLORS.textMuted }}>New Group</button>
      </div>

      {/* Group Name Input */}
      {mode === 'group' && (
        <div className="px-3 py-2 flex-shrink-0">
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${COLORS.panelBorder}` }} />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selected.map(s => <span key={s.id} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.accentSoft, color: COLORS.primary }}>{s.name}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: COLORS.bgSecondary }}>
          <Search size={16} color={COLORS.textMuted} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contacts" className="w-full bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <Avatar url={c.avatar_url} initials={c.initials} online={c.online} size={44} />
            <div className="flex-1"><div className="text-sm font-semibold" style={{ color: COLORS.text }}>{c.name}</div><div className="text-xs" style={{ color: COLORS.textMuted }}>{c.status}</div></div>
            {mode === 'direct' ? (
              <button onClick={() => handleStartChat(c)} className="p-2 rounded-full" style={{ backgroundColor: COLORS.accentSoft }}><MessageCircle size={16} color={COLORS.primary} /></button>
            ) : (
              <button onClick={() => toggleSelect(c)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors" style={{ borderColor: selected.find(s => s.id === c.id) ? COLORS.primary : COLORS.divider, backgroundColor: selected.find(s => s.id === c.id) ? COLORS.primary : 'transparent' }}>
                {selected.find(s => s.id === c.id) && <Check size={14} color="white" />}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create Group Button */}
      {mode === 'group' && selected.length > 0 && (
        <div className="px-3 py-3 flex-shrink-0">
          <button onClick={handleCreateGroup} className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: COLORS.primary }}>Create Group ({selected.length})</button>
        </div>
      )}
    </div>
  );
}
