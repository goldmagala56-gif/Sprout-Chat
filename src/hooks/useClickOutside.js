import { useEffect } from 'react';

// Calls onOutside the moment a pointer/touch lands outside `ref`'s element,
// but only while `active` is true (e.g. while a menu is open).
export function useClickOutside(ref, active, onOutside) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [active, ref, onOutside]);
}