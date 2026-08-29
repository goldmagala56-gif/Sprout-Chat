import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { formatMessageTime } from '../../utils/formatters.js';
import { COLORS } from '../../utils/constants.js';

export default function MessageBubble({ msg, showAvatar, isGroup }) {
  const isMe = msg.from === 'me';
  const isVoice = msg.type === 'voice';
  const isImage = msg.type === 'image';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[75%] md:max-w-[65%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isMe && isGroup && (
          <Avatar 
            url={msg.senderAvatar} 
            initials={msg.senderName?.slice(0,2).toUpperCase() || '??'} 
            size={28} 
          />
        )}
        <div className="flex flex-col">
          {showAvatar && !isMe && isGroup && msg.senderName && (
            <span className="text-xs font-medium ml-1 mb-0.5" style={{ color: COLORS.primaryLight }}>
              {msg.senderName}
            </span>
          )}
          <div 
            className="relative px-3 py-1.5 text-sm shadow-sm"
            style={{
              backgroundColor: isMe ? COLORS.sentBubble : COLORS.receivedBubble,
              color: COLORS.text,
              borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              maxWidth: '100%',
            }}
          >
            {isImage && msg.file_url ? (
              <img 
                src={msg.file_url} 
                alt="Shared image"
                className="rounded-lg max-w-full cursor-pointer"
                style={{ maxHeight: 300 }}
                loading="lazy"
              />
            ) : isVoice ? (
              <div className="flex items-center gap-2 min-w-[160px]">
                <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, backgroundColor: COLORS.primary }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-0.5 h-6">
                    {[...Array(20)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-0.5 rounded-full" 
                        style={{ 
                          height: `${Math.random() * 100}%`, 
                          backgroundColor: COLORS.primary,
                          opacity: 0.6 + Math.random() * 0.4,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{msg.duration || '0:00'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="break-words whitespace-pre-wrap">{msg.text}</div>
            )}

            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[10px]" style={{ color: COLORS.textMuted }}>
                {formatMessageTime(msg.time)}
              </span>
              {isMe && (
                msg.status === 'seen' ? (
                  <CheckCheck size={14} color={COLORS.checkRead} strokeWidth={2.5} />
                ) : msg.status === 'failed' ? (
                  <span className="text-[10px] text-red-500">!</span>
                ) : (
                  <Check size={14} color={COLORS.checkSent} strokeWidth={2} />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
