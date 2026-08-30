import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, Camera, Image, Square, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { COLORS } from '../../utils/constants.js';

export default function Composer({ onSend, disabled, replyTo, onCancelReply, onTypingChange }) {
  const [text, setText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const inputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const hasText = text.trim().length > 0;

  const notifyTyping = () => {
    onTypingChange?.(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTypingChange?.(false), 2000);
  };

  useEffect(() => () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend({ text: trimmed, type: 'text', replyToId: replyTo?.id || null });
    setText('');
    setShowAttach(false);
    setShowEmoji(false);
    onTypingChange?.(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setShowAttach(false);
    if (!file) return;
    onSend({ type: 'image', file, replyToId: replyTo?.id || null });
  };

  const handleEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        const mins = Math.floor(recordSeconds / 60);
        const secs = recordSeconds % 60;
        onSend({ type: 'voice', file, duration: `${mins}:${secs.toString().padStart(2, '0')}`, replyToId: replyTo?.id || null });
        setRecordSeconds(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Could not access microphone. Check your browser permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  return (
    <div className="relative flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary, borderTop: `1px solid ${COLORS.divider}` }}>
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${COLORS.divider}`, backgroundColor: COLORS.bg }}>
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.primary }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold" style={{ color: COLORS.primary }}>{replyTo.senderName || (replyTo.from === 'me' ? 'You' : 'Them')}</div>
            <div className="text-xs truncate" style={{ color: COLORS.textMuted }}>{replyTo.type === 'voice' ? 'Voice message' : replyTo.type === 'image' ? 'Photo' : replyTo.text}</div>
          </div>
          <button onClick={onCancelReply} className="p-1 flex-shrink-0"><X size={16} color={COLORS.textMuted} /></button>
        </div>
      )}

      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-1 z-50">
          <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={350} />
        </div>
      )}

      {showAttach && (
        <div className="absolute bottom-full left-4 mb-1 rounded-xl shadow-lg p-2 flex gap-3 z-50" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => galleryInputRef.current?.click()}>
            <div className="p-2 rounded-full" style={{ backgroundColor: '#7F66FF' }}><Image size={18} color="white" /></div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Gallery</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => cameraInputRef.current?.click()}>
            <div className="p-2 rounded-full" style={{ backgroundColor: '#FF2E74' }}><Camera size={18} color="white" /></div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Camera</span>
          </button>
        </div>
      )}
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePicked} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFilePicked} />

      {recording ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#DC2626', animation: 'pulse 1s infinite' }} />
          <span className="text-sm flex-1" style={{ color: COLORS.text }}>Recording... {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}</span>
          <button onClick={stopRecording} className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, backgroundColor: COLORS.primary }}>
            <Square size={16} color="white" fill="white" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-3 py-2">
          <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0">
            <Paperclip size={20} color={COLORS.textMuted} />
          </button>

          <div className="flex-1 flex items-end gap-1 rounded-full px-3 py-1.5" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
            <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }} className="p-1 flex-shrink-0">
              <Smile size={20} color={COLORS.textMuted} />
            </button>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); notifyTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm resize-none py-1.5 max-h-32"
              style={{ color: COLORS.text }}
            />
          </div>

          <button
            onClick={hasText ? handleSend : startRecording}
            disabled={disabled}
            className="flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90 disabled:opacity-50"
            style={{ width: 40, height: 40, backgroundColor: COLORS.primary }}
          >
            {hasText ? <Send size={18} color="white" /> : <Mic size={20} color="white" />}
          </button>
        </div>
      )}
    </div>
  );
}