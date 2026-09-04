import { useRef, useCallback } from 'react';

const DEFAULT_DELAY = 500;
const MOVE_THRESHOLD = 10; // px of finger drift before we treat it as a scroll, not a hold

// Attach the returned handlers to any element. Short tap fires onClick;
// holding past `delay` fires onLongPress instead and swallows the trailing click.
export function useLongPress({ onLongPress, onClick, delay = DEFAULT_DELAY } = {}) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback((x, y) => {
    firedRef.current = false;
    startPosRef.current = { x, y };
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress?.();
    }, delay);
  }, [delay, onLongPress, clear]);

  const move = useCallback((x, y) => {
    const dx = Math.abs(x - startPosRef.current.x);
    const dy = Math.abs(y - startPosRef.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) clear();
  }, [clear]);

  const end = useCallback((e) => {
    clear();
    if (firedRef.current) {
      e?.preventDefault?.();
      firedRef.current = false;
      return;
    }
    onClick?.(e);
  }, [clear, onClick]);

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: (e) => { const t = e.touches[0]; if (t) start(t.clientX, t.clientY); },
    onTouchMove: (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); },
    onTouchEnd: end,
    onTouchCancel: clear,
  };
}