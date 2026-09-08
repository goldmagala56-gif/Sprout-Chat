import React, { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { COLORS } from '../../utils/constants.js';

// Renders its children into document.body, positioned just below/aligned
// with the triggering button — avoids being clipped by any scrollable
// ancestor's overflow, which absolute-positioned-in-place menus can't avoid.
export default function DropdownMenu({ anchorRef, open, onClose, children, align = 'right' }) {
  const [pos, setPos] = useState(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: align === 'right' ? undefined : rect.left,
      right: align === 'right' ? window.innerWidth - rect.right : undefined,
    });
  }, [open, anchorRef, align]);

  useLayoutEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed rounded-lg shadow-lg py-1 z-[100] min-w-[180px]"
      style={{ top: pos.top, left: pos.left, right: pos.right, backgroundColor: COLORS.bg, border: `1px solid ${COLORS.divider}` }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}