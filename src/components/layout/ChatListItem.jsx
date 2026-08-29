import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatChatListTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';

export default function ChatListItem({ chat, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
      style={{ 
        backgroundColor: isActive ? COLORS.accentSoft : 'transparent',
        borderBottom: `1px solid ${COLORS.divider}`,
      }}
    >
      <Avatar 
        url={chat.avatar_url} 
        initials={chat.initials} 
        online={chat.online} 
        size={48} 
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold truncate" style={{ color: COLORS.text }}>
            {chat.name}
          </span>
          <span className="text-xs flex-shrink-0 ml-2" style={{ color: chat.unread > 0 ? COLORS.primary : COLORS.textMuted }}>
            {formatChatListTime(chat.time)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {chat.last && chat.last.startsWith('You:') && (
              <Check size={14} color={COLORS.checkSent} className="flex-shrink-0" />
            )}
            <span className="text-sm truncate" style={{ color: COLORS.textMuted }}>
              {chat.last}
            </span>
          </div>
          {chat.unread > 0 && (
            <span
              className="flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ml-2"
              style={{ width: 20, height: 20, backgroundColor: COLORS.badge, color: COLORS.badgeText }}
            >
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
