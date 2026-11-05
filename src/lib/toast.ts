import { useSyncExternalStore } from 'react';

export interface ToastData {
  id: number;
  message: string;
  undo?: () => void;
  onExpire?: () => void; // runs when the toast goes away without undo
}

let current: ToastData | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function finish(undone: boolean) {
  if (timer) clearTimeout(timer);
  timer = null;
  const t = current;
  current = null;
  emit();
  if (t && !undone) t.onExpire?.();
}

export function showToast(message: string, opts: { undo?: () => void; onExpire?: () => void } = {}) {
  if (current) finish(false); // commit the previous one
  current = { id: Date.now(), message, ...opts };
  emit();
  timer = setTimeout(() => finish(false), opts.undo ? 4500 : 2200);
}

export function undoToast() {
  const t = current;
  finish(true);
  t?.undo?.();
}

export const dismissToast = () => finish(false);

export function useToast() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current
  );
}
