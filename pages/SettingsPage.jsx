import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Volume2, Moon, Eye, Clock, Type, Shield, Smartphone, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../src/hooks/useAuth.js';
import { COLORS } from '../src/utils/constants.js';
import BottomNav from '../src/components/layout/BottomNav.jsx';

function SettingRow({ icon: Icon, label, sublabel, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
      <div className="flex items-center gap-3">
        <Icon size={20} color={COLORS.primary} />
        <div>
          <div className="text-[15px]" style={{ color: COLORS.text }}>{label}</div>
          {sublabel && <div className="text-xs" style={{ color: COLORS.textMuted }}>{sublabel}</div>}
        </div>
      </div>
      <button onClick={onChange} className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0" style={{ backgroundColor: value ? COLORS.primary : COLORS.divider }}>
        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all" style={{ left: value ? 22 : 2 }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, signOut } = useAuth();
  const s = profile?.settings || {};

  const updateSetting = (key, val) => {
    updateProfile({ settings: { ...s, [key]: val } });
  };

  const handleLogout = async () => {
    if (!confirm('Log out of Sprout?')) return;
    await signOut();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>Preferences</div>
          <SettingRow icon={Bell} label="Notifications" value={s.notifications} onChange={() => updateSetting('notifications', !s.notifications)} />
          <SettingRow icon={Volume2} label="Sounds" value={s.sound} onChange={() => updateSetting('sound', !s.sound)} />
          <SettingRow icon={Moon} label="Dark Mode" value={s.darkMode} onChange={() => updateSetting('darkMode', !s.darkMode)} />
          <SettingRow icon={Type} label="Typing Indicators" value={s.typingIndicators} onChange={() => updateSetting('typingIndicators', !s.typingIndicators)} />
        </div>

        <div className="px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>Privacy</div>
          <SettingRow
            icon={Eye}
            label="Read Receipts"
            sublabel="Others see when you've read their messages"
            value={s.readReceipts !== false}
            onChange={() => updateSetting('readReceipts', s.readReceipts === false)}
          />
          <SettingRow
            icon={Clock}
            label="Last Seen & Online"
            sublabel="Show your online status and last seen time"
            value={!s.lastSeenPrivacy}
            onChange={() => updateSetting('lastSeenPrivacy', !s.lastSeenPrivacy)}
          />
          <button onClick={() => navigate('/sessions')} className="w-full flex items-center gap-3 py-3.5" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <Smartphone size={20} color={COLORS.primary} />
            <div className="text-left"><div className="text-[15px]" style={{ color: COLORS.text }}>Linked Devices</div><div className="text-xs" style={{ color: COLORS.textMuted }}>Manage where you're signed in</div></div>
          </button>
        </div>

        <div className="px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>About</div>
          <div className="flex items-center gap-3 py-3.5" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <Shield size={20} color={COLORS.primary} />
            <div><div className="text-[15px]" style={{ color: COLORS.text }}>Privacy Policy</div><div className="text-xs" style={{ color: COLORS.textMuted }}>How we protect your data</div></div>
          </div>
          <div className="flex items-center gap-3 py-3.5" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
            <HelpCircle size={20} color={COLORS.primary} />
            <div><div className="text-[15px]" style={{ color: COLORS.text }}>Help Center</div><div className="text-xs" style={{ color: COLORS.textMuted }}>Get support and FAQs</div></div>
          </div>
          <div className="py-4 text-center"><span className="text-xs" style={{ color: COLORS.textMuted }}>Sprout v2.0.0 — Built with Supabase</span></div>
        </div>

        <div className="px-4 py-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold"
            style={{ color: COLORS.danger, backgroundColor: '#FEF2F2' }}
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}