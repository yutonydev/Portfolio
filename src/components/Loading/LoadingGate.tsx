import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingState from './LoadingState';
import { isReady, subscribeReady } from '../../lib/ready';

const LABELS = ['Prototyping', 'Playtesting', 'Shipping'];

/** Shortest the cover stays up, so a fast load is a beat rather than a flash. */
const MIN_MS = 1200;

/** Lifts regardless after this, so a failed signal can never trap the page. */
const CAP_MS = 5000;

const FADE_MS = 400;

/** Covers the page while it starts up, hiding work that would show as a stutter. */
export default function LoadingGate() {
  const { pathname } = useLocation();
  // Read once: this is about how the page was entered, not where it goes later.
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

    // Only Home has something heavy to wait for; elsewhere a painted frame is enough.
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

  // Layout, not passive: the lock lifts in the same commit that removes the cover.
  useLayoutEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  if (!visible) return null;

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      // Above the nav's z-40, and opaque, so the page starts up unseen behind it.
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg transition-opacity ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
    >
      {/* The cycling words would be read out one by one, so announce once instead. */}
      <span className="sr-only">Loading</span>
      <LoadingState labels={LABELS} animate={!reduced} />
    </div>
  );
}
