import React, { useState, useRef } from 'react';
import { X, Image, Check } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const BG_COLORS = ['#146C43', '#7F66FF', '#FF2E74', '#0891B2', '#D97706', '#1F2937'];

export default function StatusComposer({ onPost, onClose }) {
  const [mode, setMode] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilePicked = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMode('image');
  };

  const handlePost = async () => {
    if (posting) return;
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'image' && !file) return;
    setPosting(true);
    const ok = await onPost(mode === 'text' ? { type: 'text', text: text.trim(), bgColor } : { type: 'image', file });
    setPosting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: mode === 'text' ? bgColor : '#000' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="p-1"><X size={22} color="white" /></button>
        <button
          onClick={handlePost}
          disabled={posting || (mode === 'text' ? !text.trim() : !file)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'white', color: COLORS.primary }}
        >
          <Check size={16} /> {posting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        {mode === 'image' && preview ? (
          <img src={preview} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        ) : (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status..."
            rows={4}
            className="w-full bg-transparent outline-none text-white text-2xl font-medium text-center resize-none placeholder-white/60"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-4 flex-shrink-0">
        {mode === 'text' && BG_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setBgColor(c)}
            className="rounded-full flex-shrink-0"
            style={{ width: 28, height: 28, backgroundColor: c, border: bgColor === c ? '2px solid white' : '2px solid transparent' }}
          />
        ))}
        {mode === 'image' && (
          <button onClick={() => { setMode('text'); setFile(null); setPreview(null); }} className="text-xs text-white underline">
            Switch to text
          </button>
        )}
        {mode === 'text' && (
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full ml-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Image size={18} color="white" />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePicked} />
    </div>
  );
}