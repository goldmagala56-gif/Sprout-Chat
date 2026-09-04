import React from 'react';
import ChatListItem from './ChatListItem.jsx';

export default function ChatList({ chats, activeId, onSelect, onMute, onArchive, onPin }) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-sm" style={{ color: '#8696A0' }}>No conversations yet</div>
        <div className="text-xs" style={{ color: '#8696A0' }}>Start a new chat from your contacts</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map(chat => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeId}
          onClick={() => onSelect(chat.id)}
          onMute={onMute}
          onArchive={onArchive}
          onPin={onPin}
        />
      ))}
    </div>
  );
}