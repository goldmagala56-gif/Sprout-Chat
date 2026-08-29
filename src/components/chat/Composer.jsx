import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, Mic, Camera, Image } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

export default function Composer({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, 'text');
    setText('');
    setShowAttach(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="relative flex items-end gap-2 px-3 py-2" style={{ backgroundColor: COLORS.bgSecondary, borderTop: `1px solid ${COLORS.divider}` }}>
      {showAttach && (
        <div className="absolute bottom-14 left-4 rounded-xl shadow-lg p-2 flex gap-3 z-50" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => { setShowAttach(false); }}>
            <div className="p-2 rounded-full" style={{ backgroundColor: '#7F66FF' }}><Image size={18} color="white" /></div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Gallery</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => { setShowAttach(false); }}>
            <div className="p-2 rounded-full" style={{ backgroundColor: '#FF2E74' }}><Camera size={18} color="white" /></div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Camera</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => { onSend('', 'voice', { duration: '0:30' }); setShowAttach(false); }}>
            <div className="p-2 rounded-full" style={{ backgroundColor: COLORS.primary }}><Mic size={18} color="white" /></div>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>Audio</span>
          </button>
        </div>
      )}

      <button onClick={() => setShowAttach(!showAttach)} className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0">
        <Paperclip size={20} color={COLORS.textMuted} />
      </button>

      <div className="flex-1 flex items-end gap-1 rounded-full px-3 py-1.5" style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }}>
        <button className="p-1 flex-shrink-0">
          <Smile size={20} color={COLORS.textMuted} />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm resize-none py-1.5 max-h-32"
          style={{ color: COLORS.text }}
        />
      </div>

      <button 
        onClick={handleSend}
        disabled={!hasText || disabled}
        className="flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90 disabled:opacity-50"
        style={{ width: 40, height: 40, backgroundColor: hasText ? COLORS.primary : COLORS.primary }}
      >
        {hasText ? <Send size={18} color="white" /> : <Mic size={20} color="white" />}
      </button>
    </div>
  );
}
