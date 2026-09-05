import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, CircleDot, Settings, User } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const tabs = [
  { icon: MessageSquare, label: 'Chats', path: '/' },
  { icon: CircleDot, label: 'Status', path: '/status' },
  { icon: Users, label: 'Contacts', path: '/contacts' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center justify-around px-2 flex-shrink-0"
      style={{ 
        height: 56, 
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: COLORS.bg,
        borderTop: `1px solid ${COLORS.divider}`,
      }}
    >
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path === '/' && location.pathname.startsWith('/chat/'));
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0"
          >
            <tab.icon size={22} color={active ? COLORS.primary : COLORS.textMuted} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: active ? COLORS.primary : COLORS.textMuted }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}