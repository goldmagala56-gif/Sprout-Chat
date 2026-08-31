import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages.js';
import { COLORS } from '../../utils/constants.js';
import { formatLastSeen } from '../../utils/formatters.js';
import Avatar from '../ui/Avatar.jsx';
import MessageBubble from './MessageBubble.jsx';
import Composer from './Composer.jsx';

export default function ChatWindow({ conversation, userId, onBack, onDelete }) {
  const scrollRef = useRef(null);
  const { messages, loading, sendMessage, deleteMessage, typingUsers, setTyping } = useMessages(conversation?.id, userId);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { setReplyTo(null); }, [conversation?.id]);

  if (!conversation) {
  return (
    <div className="flex flex-1 items-center justify-center flex-col gap-4 h-full" style={{ backgroundColor: '#f0f2f5' }}>
        <div className="flex items-center justify-center rounded-full" style={{ width: 80, height: 80, backgroundColor: COLORS.accentSoft }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.6C15.5 5.7 20 8.6 20 14c0 3.9-3.6 6-9 6z" /><path d="M2 21c0-3 1.8-5.9 4.8-7.4C7.4 16.5 9 20 9 20" /></svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-1" style={{ color: '#41525d' }}>Sprout</h2>
          <p className="text-sm" style={{ color: '#8696a0' }}>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const isGroup = conversation.group;
  const typingNames = Object.values(typingUsers);
  const subtitle = typingNames.length > 0
    ? `${typingNames.join(', ')} typing...`
    : conversation.online ? 'Online' : isGroup ? `${conversation.members?.length || 0} members` : formatLastSeen(conversation.otherUser?.last_seen);

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: '#f0f2f5' }}>
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded-full hover:bg-black/5 flex-shrink-0"><ArrowLeft size={22} color={COLORS.text} /></button>
          <Avatar url={conversation.avatar_url} initials={conversation.initials} online={conversation.online} size={40} />
          <div className="min-w-0">
            <div className="text-base font-semibold truncate" style={{ color: COLORS.text }}>{conversation.name}</div>
            <div className="text-xs truncate" style={{ color: typingNames.length > 0 ? COLORS.primary : COLORS.textMuted }}>{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors hidden sm:block"><Video size={20} color={COLORS.textMuted} /></button>
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors hidden sm:block"><Phone size={18} color={COLORS.textMuted} /></button>
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors" onClick={() => { if (confirm('Delete this conversation?')) onDelete?.(conversation.id); }}>
            <MoreVertical size={20} color={COLORS.textMuted} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm mb-2" style={{ color: COLORS.textMuted }}>No messages yet</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>Send a message to start the conversation</div>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showAvatar = isGroup && msg.from === 'them' && (!prev || prev.from !== 'them' || prev.senderName !== msg.senderName);
          return (
            <MessageBubble key={msg.id} msg={msg} showAvatar={showAvatar} isGroup={isGroup} onReply={setReplyTo} onDelete={deleteMessage} />
          );
        })}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
          </div>
        )}
      </div>

      <Composer onSend={sendMessage} disabled={!userId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onTypingChange={setTyping} />
    </div>
  );
}