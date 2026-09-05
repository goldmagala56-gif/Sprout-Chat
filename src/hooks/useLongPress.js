import { useRef, useCallback } from 'react';

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 10;

// Returns event handlers to spread onto an element. Fires onLongPress after
// holding for LONG_PRESS_MS (mouse or touch), and suppresses the ordinary
// click/tap that follows a long-press so it doesn't also trigger onClick.
// A normal, quick tap still calls onClick as usual.
export function useLongPress(onLongPress, onClick) {
  const timerRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback((x, y) => {
    firedRef.current = false;
    startPos.current = { x, y };
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress, clear]);

  const move = useCallback((x, y) => {
    const dx = Math.abs(x - startPos.current.x);
    const dy = Math.abs(y - startPos.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) clear();
  }, [clear]);

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseUp: clear,
    onMouseLeave: clear,
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onTouchStart: (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); },
    onTouchEnd: clear,
    onTouchMove: (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); },
    onContextMenu: (e) => e.preventDefault(), // suppress the native long-press menu on mobile browsers
    onClick: (e) => {
      if (firedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        firedRef.current = false;
        return;
      }
      onClick?.(e);
    },
  };
}