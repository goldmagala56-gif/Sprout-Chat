import { useRef, useCallback } from 'react';

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 10;

// Options-object API: useLongPress({ onLongPress, onClick }).
// Fires onLongPress after holding for LONG_PRESS_MS. A quick press-and-release
// fires onClick directly, from right here — not by waiting on the browser's
// own native `click` event, which can be unreliable inside scrollable lists
// on real touch devices.
export function useLongPress({ onLongPress, onClick } = {}) {
  const timerRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);
  const movedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback((x, y) => {
    firedRef.current = false;
    movedRef.current = false;
    startPos.current = { x, y };
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [onLongPress, clear]);

  const move = useCallback((x, y) => {
    const dx = Math.abs(x - startPos.current.x);
    const dy = Math.abs(y - startPos.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      movedRef.current = true;
      clear();
    }
  }, [clear]);

  const end = useCallback((e) => {
    clear();
    if (!firedRef.current && !movedRef.current) {
      onClick?.(e);
    }
    firedRef.current = false;
  }, [clear, onClick]);

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseUp: end,
    onMouseLeave: clear,
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onTouchStart: (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); },
    onTouchEnd: (e) => { e.preventDefault(); end(e); },
    onTouchMove: (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); },
    onContextMenu: (e) => e.preventDefault(),
  };
}