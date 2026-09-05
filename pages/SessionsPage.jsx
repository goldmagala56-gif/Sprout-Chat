import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, LogOut } from 'lucide-react';
import { useAuth } from '../src/hooks/useAuth.js';
import { useSessions } from '../src/hooks/useSessions.js';
import { COLORS } from '../src/utils/constants.js';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Active now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions, loading, removeSession, currentDeviceId } = useSessions(user?.id);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/settings')} className="p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Linked Devices</h1>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2">
        <p className="text-xs py-2" style={{ color: COLORS.textMuted }}>
          Devices signed into your account. Removing a device signs it out within about a minute.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
          </div>
        )}

        {!loading && sessions.map(s => {
          const isThisDevice = s.device_id === currentDeviceId;
          return (
            <div key={s.id} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, backgroundColor: COLORS.accentSoft }}>
                <Smartphone size={18} color={COLORS.primary} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: COLORS.text }}>
                  {s.device_label || 'Unknown device'} {isThisDevice && <span style={{ color: COLORS.primary }}>(this device)</span>}
                </div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>{timeAgo(s.last_active)}</div>
              </div>
              {!isThisDevice && (
                <button onClick={() => { if (confirm('Sign this device out?')) removeSession(s.id); }} className="p-2 rounded-full hover:bg-black/5 flex-shrink-0">
                  <LogOut size={16} color={COLORS.danger} />
                </button>
              )}
            </div>
          );
        })}

        {!loading && sessions.length === 0 && (
          <div className="text-center text-xs py-10" style={{ color: COLORS.textMuted }}>No devices found</div>
        )}
      </div>
    </div>
  );
}
