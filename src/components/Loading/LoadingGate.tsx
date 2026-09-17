import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingState from './LoadingState';
import { isReady, subscribeReady } from '../../lib/ready';

const LABELS = ['Prototyping', 'Playtesting', 'Shipping'];

const MIN_MS = 1200;

const CAP_MS = 5000;

const FADE_MS = 400;

const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);

// Not 1: a fully opaque cover lets the browser skip rasterising the page
// behind it, then drops ~150ms of frames doing it all at the reveal.
const COVER_OPACITY = 0.99;

export default function LoadingGate() {
  const { pathname } = useLocation();
  const [entryIsHome] = useState(() => pathname === '/');
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let finished = false;
    let unsubscribe = () => {};

    const finish = () => {
      if (finished) return;
      finished = true;
      setLeaving(true);
      window.setTimeout(() => setVisible(false), FADE_MS);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ready = new Promise<void>(resolve => {
      if (!entryIsHome) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        return;
      }
      if (isReady()) {
        resolve();
        return;
      }
      unsubscribe = subscribeReady(resolve);
    });

    const beat = reduced ? Promise.resolve() : new Promise<void>(resolve => window.setTimeout(resolve, MIN_MS));

    void Promise.all([ready, beat]).then(finish);
    const cap = window.setTimeout(finish, CAP_MS);

    return () => {
      finished = true;
      unsubscribe();
      window.clearTimeout(cap);
    };
  }, [entryIsHome]);

  useLayoutEffect(() => {
    if (!visible) return;
    const stop = (e: Event) => e.preventDefault();
    const stopKeys = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && !(e.target as HTMLElement)?.closest?.('input, textarea')) e.preventDefault();
    };
    window.addEventListener('wheel', stop, { passive: false });
    window.addEventListener('touchmove', stop, { passive: false });
    window.addEventListener('keydown', stopKeys);
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stopKeys);
    };
  }, [visible]);

  if (!visible) return null;

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg transition-opacity"
      style={{ opacity: leaving ? 0 : COVER_OPACITY, transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <LoadingState labels={LABELS} animate={!reduced} />
    </div>
  );
}
