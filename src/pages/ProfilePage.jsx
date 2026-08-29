import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Edit2, Check, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const startEditing = () => {
  setForm({ name: profile?.name || '', bio: profile?.bio || '', phone: profile?.phone || '' });
  setEditing(true);
};

  const handleSave = async () => {
    await updateProfile(form);
    setEditing(false);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            <Avatar url={profile?.avatar_url} initials={profile?.initials} online={true} size={100} />
            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-white shadow-md" style={{ border: `1px solid ${COLORS.divider}` }}>
              <Camera size={16} color={COLORS.primary} />
            </button>
          </div>
          <h2 className="text-xl font-semibold mt-4" style={{ color: COLORS.text }}>{profile?.name}</h2>
          <p className="text-sm mt-1 px-4 text-center" style={{ color: COLORS.textMuted }}>{profile?.bio}</p>
        </div>

        <div className="px-4 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Edit Profile</span>
            <button onClick={() => editing ? handleSave() : startEditing()} className="p-2 rounded-lg" style={{ backgroundColor: COLORS.accentSoft }}>
              {editing ? <Check size={16} color={COLORS.primary} /> : <Edit2 size={16} color={COLORS.primary} />}
            </button>
          </div>

          <div className="space-y-4">
            {['name', 'bio', 'phone'].map(field => (
              <div key={field}>
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{field}</label>
                {editing ? (
                  <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${COLORS.panelBorder}` }} />
                ) : (
                  <div className="text-sm mt-1 py-1" style={{ color: COLORS.text }}>{profile?.[field] || '-'}</div>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => { signOut(); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mt-6" style={{ backgroundColor: COLORS.dangerBg, color: COLORS.danger }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
