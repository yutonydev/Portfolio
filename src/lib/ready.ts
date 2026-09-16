/**
 * Lets a page tell the loading cover it has finished its own startup work.
 *
 * Pages with nothing heavy to wait for never signal; the cover falls back to
 * the first painted frame.
 */
let ready = false;
const listeners = new Set<() => void>();

export function markReady(): void {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

export function isReady(): boolean {
  return ready;
}

export function subscribeReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
