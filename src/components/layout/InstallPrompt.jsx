import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const DISMISSED_KEY = 'sprout_install_dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
      style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
    >
      <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 36, height: 36, backgroundColor: COLORS.accentSoft }}>
        <Download size={18} color={COLORS.primary} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: COLORS.text }}>Install Sprout</div>
        <div className="text-xs" style={{ color: COLORS.textMuted }}>Add it to your home screen for quick access</div>
      </div>
      <button onClick={handleInstall} className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.primary, color: 'white' }}>
        Install
      </button>
      <button onClick={handleDismiss} className="p-1 flex-shrink-0"><X size={14} color={COLORS.textMuted} /></button>
    </div>
  );
}