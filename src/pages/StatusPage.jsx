import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { COLORS } from '../utils/constants.js';
import Avatar from '../components/ui/Avatar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

export default function StatusPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <button onClick={() => navigate('/')} className="md:hidden p-1 -ml-1"><ArrowLeft size={22} color={COLORS.text} /></button>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Status</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar url={profile?.avatar_url} initials={profile?.initials} size={56} showRing={true} />
              <button className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                <Plus size={12} color="white" />
              </button>
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: COLORS.text }}>My Status</div>
              <div className="text-sm" style={{ color: COLORS.textMuted }}>Tap to add status update</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide py-2" style={{ color: COLORS.textMuted }}>Recent Updates</div>
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="text-sm" style={{ color: COLORS.textMuted }}>No status updates yet</div>
            <div className="text-xs" style={{ color: COLORS.textMuted }}>Status feature coming in the next update</div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
