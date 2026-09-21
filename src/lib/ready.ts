/** Lets a page tell the loading cover its startup work is done; pages with none never signal. */
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
