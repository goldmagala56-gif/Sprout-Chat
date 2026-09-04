import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon, Info, Trash2, Timer, Download } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages.js';
import { useConversations } from '../../hooks/useConversations.js';
import { useCall } from '../../context/CallContext.jsx';
import { COLORS } from '../../utils/constants.js';
import { formatLastSeen } from '../../utils/formatters.js';
import { exportChatAsText } from '../../lib/exportChat.js';
import Avatar from '../ui/Avatar.jsx';
import MessageBubble from './MessageBubble.jsx';
import Composer from './Composer.jsx';
import ForwardModal from './ForwardModal.jsx';
import GalleryModal from './GalleryModal.jsx';
import GroupInfoModal from './GroupInfoModal.jsx';
import DisappearingMessagesModal from './DisappearingMessagesModal.jsx';

function formatDisappearing(seconds) {
  if (!seconds) return null;
  if (seconds === 86400) return '24h';
  if (seconds === 604800) return '7d';
  if (seconds === 7776000) return '90d';
  return `${Math.round(seconds / 86400)}d`;
}

export default function ChatWindow({ conversation, userId, onBack, onDelete }) {
  const scrollRef = useRef(null);
  const {
    messages, loading, sendMessage, editMessage, deleteMessage,
    toggleReaction, toggleStar, typingUsers, setTyping, blockedError,
  } = useMessages(conversation?.id, userId);
  const { conversations, setDisappearingMessages } = useConversations();
  const { startCall, callState } = useCall();
  const [replyTo, setReplyTo] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [disappearingOpen, setDisappearingOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { setReplyTo(null); setHeaderMenuOpen(false); }, [conversation?.id]);

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
  const groupMemberNames = (conversation.memberList || []).map(m => m.name);
  const typingNames = Object.values(typingUsers);
  const disappearingLabel = formatDisappearing(conversation.disappearingSeconds);
  const subtitle = typingNames.length > 0
    ? `${typingNames.join(', ')} typing...`
    : conversation.online ? 'Online' : isGroup ? `${conversation.members?.length || 0} members` : formatLastSeen(conversation.otherUser?.last_seen);

  const canCall = !isGroup && conversation.otherUser?.id && callState === 'idle';
  const handleCall = (type) => {
    if (!canCall) return;
    startCall({ id: conversation.otherUser.id, name: conversation.name, avatar_url: conversation.avatar_url }, type);
  };

  const canManageDisappearing = isGroup ? conversation.isAdmin : true;

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: '#f0f2f5' }}>
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded-full hover:bg-black/5 flex-shrink-0"><ArrowLeft size={22} color={COLORS.text} /></button>
          <button onClick={() => isGroup && setGroupInfoOpen(true)} className="flex items-center gap-3 min-w-0 text-left">
            <Avatar url={conversation.avatar_url} initials={conversation.initials} online={conversation.online} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base font-semibold truncate" style={{ color: COLORS.text }}>{conversation.name}</span>
                {disappearingLabel && <Timer size={13} color={COLORS.textMuted} className="flex-shrink-0" />}
              </div>
              <div className="text-xs truncate" style={{ color: typingNames.length > 0 ? COLORS.primary : COLORS.textMuted }}>{subtitle}</div>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 relative">
          {!isGroup && (
            <>
              <button onClick={() => handleCall('video')} disabled={!canCall} className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40">
                <Video size={20} color={COLORS.textMuted} />
              </button>
              <button onClick={() => handleCall('voice')} disabled={!canCall} className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40">
                <Phone size={18} color={COLORS.textMuted} />
              </button>
            </>
          )}
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors" onClick={() => setHeaderMenuOpen(!headerMenuOpen)}>
            <MoreVertical size={20} color={COLORS.textMuted} />
          </button>
          {headerMenuOpen && (
            <div className="absolute top-full right-0 mt-1 rounded-lg shadow-lg py-1 z-50 min-w-[210px]" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}>
              <button onClick={() => { setGalleryOpen(true); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                <ImageIcon size={14} color={COLORS.text} /> Media, links and docs
              </button>
              {isGroup && (
                <button onClick={() => { setGroupInfoOpen(true); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                  <Info size={14} color={COLORS.text} /> Group info
                </button>
              )}
              {canManageDisappearing && (
                <button onClick={() => { setDisappearingOpen(true); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left">
                  <Timer size={14} color={COLORS.text} /> Disappearing messages {disappearingLabel ? `(${disappearingLabel})` : ''}
                </button>
              )}
              <button
                onClick={() => { setHeaderMenuOpen(false); exportChatAsText(conversation.id, conversation.name, userId); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left"
              >
                <Download size={14} color={COLORS.text} /> Export chat
              </button>
              <button
                onClick={() => { setHeaderMenuOpen(false); if (confirm('Delete this conversation?')) onDelete?.(conversation.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 text-left"
                style={{ color: COLORS.danger }}
              >
                <Trash2 size={14} /> Delete conversation
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
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
            <MessageBubble
              key={msg.id}
              msg={msg}
              showAvatar={showAvatar}
              isGroup={isGroup}
              currentUserId={userId}
              groupMemberNames={groupMemberNames}
              onReply={setReplyTo}
              onEdit={editMessage}
              onDelete={deleteMessage}
              onReact={toggleReaction}
              onToggleStar={toggleStar}
              onForward={setForwardTarget}
            />
          );
        })}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
          </div>
        )}
      </div>

      {blockedError && (
        <div className="px-4 py-2 text-xs text-center flex-shrink-0" style={{ backgroundColor: '#FEF2F2', color: COLORS.danger }}>
          {blockedError}
        </div>
      )}

      <Composer
        onSend={sendMessage}
        disabled={!userId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTypingChange={setTyping}
        isGroup={isGroup}
        members={(conversation.memberList || []).filter(m => m.id !== userId)}
      />

      {forwardTarget && (
        <ForwardModal message={forwardTarget} conversations={conversations} userId={userId} onClose={() => setForwardTarget(null)} />
      )}
      {galleryOpen && (
        <GalleryModal conversationId={conversation.id} onClose={() => setGalleryOpen(false)} />
      )}
      {groupInfoOpen && isGroup && (
        <GroupInfoModal conversation={conversation} userId={userId} onClose={() => setGroupInfoOpen(false)} onLeft={onBack} />
      )}
      {disappearingOpen && (
        <DisappearingMessagesModal
          currentSeconds={conversation.disappearingSeconds}
          onSelect={(seconds) => setDisappearingMessages(conversation.id, seconds)}
          onClose={() => setDisappearingOpen(false)}
        />
      )}
    </div>
  );
}