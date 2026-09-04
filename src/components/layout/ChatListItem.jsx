import React, { useState } from 'react';
import { Check, BellOff, Pin, Archive, ArchiveRestore, MoreVertical } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatChatListTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';

export default function ChatListItem({ chat, isActive, onClick, onMute, onArchive, onPin }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] group"
      style={{
        backgroundColor: isActive ? COLORS.accentSoft : 'transparent',
        borderBottom: `1px solid ${COLORS.divider}`,
      }}
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Avatar
          url={chat.avatar_url}
          initials={chat.initials}
          online={chat.online}
          size={48}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold truncate flex items-center gap-1" style={{ color: COLORS.text }}>
              {chat.isPinned && <Pin size={11} color={COLORS.textMuted} className="flex-shrink-0" />}
              {chat.name}
              {chat.isMuted && <BellOff size={11} color={COLORS.textMuted} className="flex-shrink-0" />}
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
            {chat.unread > 0 && !chat.isMuted && (
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

      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-opacity"
        >
          <MoreVertical size={16} color={COLORS.textMuted} />
        </button>
        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-1 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
            style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { onPin?.(chat.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
              <Pin size={14} color={COLORS.text} /> {chat.isPinned ? 'Unpin chat' : 'Pin chat'}
            </button>
            <button onClick={() => { onMute?.(chat.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
              <BellOff size={14} color={COLORS.text} /> {chat.isMuted ? 'Unmute' : 'Mute notifications'}
            </button>
            <button onClick={() => { onArchive?.(chat.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
              {chat.isArchived ? <ArchiveRestore size={14} color={COLORS.text} /> : <Archive size={14} color={COLORS.text} />}
              {chat.isArchived ? 'Unarchive' : 'Archive chat'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}