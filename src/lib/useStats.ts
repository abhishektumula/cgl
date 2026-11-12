import { useMemo } from 'react';
import { isUnlocked, Reward } from './rewards';
import { lifetime } from './stats';
import { useStore } from './store';

/** Lifetime numbers (hours, best streak, …) – recomputed only when the underlying data changes. */
export function useLifetime() {
  const focusLog = useStore((s) => s.focusLog);
  const focusEntries = useStore((s) => s.focusEntries);
  const tasks = useStore((s) => s.tasks);
  return useMemo(() => lifetime({ focusLog, focusEntries, tasks }), [focusLog, focusEntries, tasks]);
}

/** `(kind, id) => boolean` – is this clock / theme unlocked yet? */
export function useUnlocked() {
  const l = useLifetime();
  return useMemo(() => (kind: Reward['kind'], target: string) => isUnlocked(kind, target, l), [l]);
}
