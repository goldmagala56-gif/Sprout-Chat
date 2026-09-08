import React, { useState, useRef } from 'react';
import { Check, BellOff, Pin, Archive, ArchiveRestore, MoreVertical } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatChatListTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import DropdownMenu from '../ui/DropdownMenu.jsx';

export default function ChatListItem({ chat, isActive, onClick, onMute, onArchive, onPin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef(null);
  const close = () => setMenuOpen(false);

  const pressHandlers = useLongPress({ onClick, onLongPress: () => setMenuOpen(true) });

  return (
    <div
      className="relative w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] group"
      style={{
        backgroundColor: isActive || menuOpen ? COLORS.accentSoft : 'transparent',
        borderBottom: `1px solid ${COLORS.divider}`,
      }}
    >
      <button {...pressHandlers} className="flex items-center gap-3 flex-1 min-w-0 text-left select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
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

      {/* Hidden until the row is hovered (desktop) or the menu is already open
          (so it doesn't vanish mid-interaction). Touch devices never trigger
          :hover at all, so mobile relies on the long-press above instead — this
          button is purely a mouse-hover convenience on top of that. */}
      <button
        ref={anchorRef}
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="p-1.5 rounded-full hover:bg-black/5 flex-shrink-0 transition-opacity"
        style={{ opacity: menuOpen ? 1 : undefined }}
      >
        <MoreVertical size={16} color={COLORS.textMuted} className="opacity-0 group-hover:opacity-100 transition-opacity" style={menuOpen ? { opacity: 1 } : undefined} />
      </button>

      <DropdownMenu anchorRef={anchorRef} open={menuOpen} onClose={close}>
        <button onClick={() => { onPin?.(chat.id); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left">
          <Pin size={16} color={COLORS.text} /> {chat.isPinned ? 'Unpin chat' : 'Pin chat'}
        </button>
        <button onClick={() => { onMute?.(chat.id); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left">
          <BellOff size={16} color={COLORS.text} /> {chat.isMuted ? 'Unmute' : 'Mute notifications'}
        </button>
        <button onClick={() => { onArchive?.(chat.id); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left">
          {chat.isArchived ? <ArchiveRestore size={16} color={COLORS.text} /> : <Archive size={16} color={COLORS.text} />}
          {chat.isArchived ? 'Unarchive' : 'Archive chat'}
        </button>
      </DropdownMenu>
    </div>
  );
}