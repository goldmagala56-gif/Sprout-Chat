import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';

const DISMISSED_KEY = 'sprout_install_dismissed';
const IOS_DISMISSED_KEY = 'sprout_ios_install_dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — never show anything

    // Android/Chrome and other browsers that support the real install prompt
    const handler = (e) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari never fires beforeinstallprompt — there is no automatic
    // prompt there at all, so show manual instructions instead.
    if (isIOS() && !localStorage.getItem(IOS_DISMISSED_KEY)) {
      setShowIOSInstructions(true);
    }

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

  const handleDismissIOS = () => {
    localStorage.setItem(IOS_DISMISSED_KEY, '1');
    setShowIOSInstructions(false);
  };

  if (showIOSInstructions) {
    return (
      <div
        className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg"
        style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
      >
        <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 36, height: 36, backgroundColor: COLORS.accentSoft }}>
          <Share size={18} color={COLORS.primary} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: COLORS.text }}>Install Sprout</div>
          <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
            Tap the Share icon <Share size={11} className="inline" style={{ verticalAlign: 'middle' }} /> below, then "Add to Home Screen"
          </div>
        </div>
        <button onClick={handleDismissIOS} className="p-1 flex-shrink-0"><X size={14} color={COLORS.textMuted} /></button>
      </div>
    );
  }

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