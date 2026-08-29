import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Smile,
  Check, CheckCheck, Mic, Image, Trash2, Info
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { colors } from '../data/seed.js';
import { emit } from '../services/socket.js';
import Avatar from './Avatar.jsx';

export default function ChatWindow() {
  const navigate = useNavigate();
  const {
    activeChatId, chats, messages, sendMessage, mobileView, closeChat,
    deleteChat, profile, typingUsers
  } = useApp();

  const [draft, setDraft] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const chatMessages = messages[activeChatId] || [];
  const typingName = (typingUsers || {})[activeChatId];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeChatId, typingName]);

  const handleTyping = (text) => {
    setDraft(text);
    if (!isTyping && activeChatId) {
      setIsTyping(true);
      emit('typing', { conversationId: activeChatId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      if (activeChatId) emit('stop_typing', { conversationId: activeChatId });
    }, 2000);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeChatId) return;
    sendMessage(activeChatId, text);
    setDraft('');
    setShowAttach(false);
    setIsTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    emit('stop_typing', { conversationId: activeChatId });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = () => {
    if (!activeChatId) return;
    deleteChat(activeChatId);
    setShowMenu(false);
  };

  if (!activeChat) {
    return (
      <div className={`flex-col flex-1 ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex items-center justify-center`}
        style={{ backgroundColor: '#FBFEFC' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 72, height: 72, backgroundColor: colors.accentSoft }}>
            <LeafIcon size={32} color={colors.primary} />
          </div>
          <span className="text-base font-medium" style={{ color: colors.textDark }}>Welcome to Sprout</span>
          <span className="text-sm text-center max-w-xs" style={{ color: colors.textMuted }}>
            Select a conversation to start chatting, or create a new one from your contacts.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-col flex-1 ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex`} style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: colors.panel, borderBottom: `1px solid ${colors.panelBorder}` }}>
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={closeChat}>
            <ArrowLeft size={20} color={colors.textDark} />
          </button>
          <Avatar initials={activeChat.initials} online={activeChat.online} size={40} />
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.textDark }}>{activeChat.name}</div>
            <div className="text-xs" style={{ color: colors.textMuted }}>
              {typingName ? `${typingName} is typing...` : (activeChat.online ? 'Online' : activeChat.group ? `${activeChat.members?.length || 0} members` : 'Last seen recently')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 relative">
          <Video size={19} color={colors.primary} className="cursor-pointer" />
          <Phone size={17} color={colors.primary} className="cursor-pointer" />
          <button onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical size={19} color={colors.textMuted} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 rounded-xl shadow-lg py-1 z-50 min-w-[160px]" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}` }}>
              <button onClick={() => { navigate('/profile'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50" style={{ color: colors.textDark }}>
                <Info size={14} /> Contact info
              </button>
              <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-red-50" style={{ color: '#DC2626' }}>
                <Trash2 size={14} /> Delete chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" style={{ backgroundColor: '#FBFEFC' }}>
        {chatMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm" style={{ color: colors.textMuted }}>No messages yet. Say hello! 👋</span>
          </div>
        )}
        {chatMessages.map((msg, idx) => {
          const showSender = activeChat.group && msg.from === 'them' && msg.senderName;
          const prevMsg = chatMessages[idx - 1];
          const showAvatar = activeChat.group && msg.from === 'them' && (!prevMsg || prevMsg.from !== 'them' || prevMsg.senderName !== msg.senderName);

          return (
            <div key={msg.id || msg._id || idx} className="flex" style={{ justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {showAvatar && (
                  <Avatar initials={msg.senderName?.slice(0,2).toUpperCase() || activeChat.initials} size={28} online={false} />
                )}
                {!showAvatar && activeChat.group && msg.from === 'them' && <div style={{ width: 28 }} />}
                <div className="flex flex-col">
                  {showSender && (
                    <span className="text-xs font-medium ml-1 mb-0.5" style={{ color: colors.textMuted }}>{msg.senderName}</span>
                  )}
                  <div className="px-3 py-2 rounded-2xl text-sm" style={{
                    backgroundColor: msg.from === 'me' ? colors.sentBubble : colors.receivedBubble,
                    color: colors.textDark,
                    border: msg.from === 'me' ? 'none' : `1px solid ${colors.divider}`,
                    borderBottomRightRadius: msg.from === 'me' ? 4 : 16,
                    borderBottomLeftRadius: msg.from === 'me' ? 16 : 4,
                  }}>
                    {msg.type === 'voice' ? (
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: colors.primary }}>
                          <Mic size={14} color="#FFFFFF" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: colors.divider }}>
                              <div className="h-1 rounded-full" style={{ width: '40%', backgroundColor: colors.primary }} />
                            </div>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{msg.duration || '0:00'}</div>
                        </div>
                      </div>
                    ) : (
                      <div>{msg.text}</div>
                    )}
                    <div className="flex items-center gap-1 justify-end mt-1" style={{ color: colors.textMuted, fontSize: 11 }}>
                      {msg.time}
                      {msg.from === 'me' && profile?.settings?.readReceipts !== false && (
                        msg.status === 'seen' ? <CheckCheck size={13} color={colors.primary} /> : <Check size={13} color={colors.textMuted} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typingName && (
          <div className="flex" style={{ justifyContent: 'flex-start' }}>
            <div className="px-3 py-2 rounded-2xl text-sm" style={{ backgroundColor: colors.receivedBubble, border: `1px solid ${colors.divider}` }}>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.textMuted, animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 px-3 py-3 relative" style={{ backgroundColor: colors.panel, borderTop: `1px solid ${colors.panelBorder}` }}>
        {showAttach && (
          <div className="absolute bottom-14 left-3 rounded-xl shadow-lg p-2 flex gap-2 z-50" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}` }}>
            <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50" onClick={() => { sendMessage(activeChatId, '', 'image'); setShowAttach(false); }}>
              <Image size={20} color={colors.primary} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Photo</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50" onClick={() => { sendMessage(activeChatId, '', 'voice', { duration: '0:30' }); setShowAttach(false); }}>
              <Mic size={20} color={colors.primary} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Voice</span>
            </button>
          </div>
        )}
        <button onClick={() => setShowAttach(!showAttach)}><Paperclip size={20} color={colors.textMuted} /></button>
        <button><Smile size={22} color={colors.textMuted} /></button>
        <input
          value={draft}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
          style={{ backgroundColor: '#FFFFFF', border: `1px solid ${colors.panelBorder}`, color: colors.textDark }}
        />
        <button onClick={handleSend} className="flex items-center justify-center rounded-full flex-shrink-0 transition-transform active:scale-95" style={{ width: 38, height: 38, backgroundColor: colors.primary }}>
          {draft.trim() ? <Send size={17} color="#FFFFFF" /> : <Mic size={17} color="#FFFFFF" />}
        </button>
      </div>
    </div>
  );
}

function LeafIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.6C15.5 5.7 20 8.6 20 14c0 3.9-3.6 6-9 6z"/>
      <path d="M2 21c0-3 1.8-5.9 4.8-7.4C7.4 16.5 9 20 9 20"/>
    </svg>
  );
}
