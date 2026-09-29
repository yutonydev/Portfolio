/** Pages call this to lift the loading cover once their startup work is done. */
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
