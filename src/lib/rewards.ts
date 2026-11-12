import { Lifetime } from './stats';
import { Palette, TimerStyle } from './types';

type Need = { type: 'streak' | 'hours' | 'sessions' | 'tasks'; value: number };

export interface Reward {
  id: string;
  kind: 'style' | 'palette';
  target: TimerStyle | Palette;
  name: string;
  need: Need;
}

/** Everything not listed here is free from day one. Ordered roughly by how soon you get there. */
export const REWARDS: Reward[] = [
  { id: 'style:aurora', kind: 'style', target: 'aurora', name: 'Aurora clock', need: { type: 'sessions', value: 3 } },
  { id: 'palette:candy', kind: 'palette', target: 'candy', name: 'Cotton candy theme', need: { type: 'streak', value: 3 } },
  { id: 'style:heart', kind: 'style', target: 'heart', name: 'Heart clock', need: { type: 'hours', value: 5 } },
  { id: 'palette:mint', kind: 'palette', target: 'mint', name: 'Mint theme', need: { type: 'tasks', value: 10 } },
  { id: 'style:orbit', kind: 'style', target: 'orbit', name: 'Galaxy clock', need: { type: 'streak', value: 7 } },
  { id: 'style:hourglass', kind: 'style', target: 'hourglass', name: 'Hourglass clock', need: { type: 'hours', value: 15 } },
  { id: 'palette:berry', kind: 'palette', target: 'berry', name: 'Berry theme', need: { type: 'sessions', value: 30 } },
  { id: 'style:sunrise', kind: 'style', target: 'sunrise', name: 'Sunrise clock', need: { type: 'streak', value: 14 } },
  { id: 'palette:butter', kind: 'palette', target: 'butter', name: 'Butter theme', need: { type: 'hours', value: 40 } },
  { id: 'palette:midnight', kind: 'palette', target: 'midnight', name: 'Midnight theme', need: { type: 'streak', value: 30 } },
];

const VALUE: Record<Need['type'], (l: Lifetime) => number> = {
  streak: (l) => l.bestStreak,
  hours: (l) => l.hours,
  sessions: (l) => l.sessions,
  tasks: (l) => l.tasksDone,
};

export const needText = (n: Need) =>
  n.type === 'streak' ? `Study ${n.value} days in a row`
    : n.type === 'hours' ? `Focus for ${n.value} hours in total`
      : n.type === 'sessions' ? `Finish ${n.value} focus sessions`
        : `Complete ${n.value} tasks`;

/** 0 → 1 */
export const rewardProgress = (r: Reward, l: Lifetime) => Math.min(1, VALUE[r.need.type](l) / r.need.value);

export const progressText = (r: Reward, l: Lifetime) => {
  const v = Math.floor(VALUE[r.need.type](l));
  return `${Math.min(v, r.need.value)} / ${r.need.value}${r.need.type === 'hours' ? ' h' : r.need.type === 'streak' ? ' days' : ''}`;
};

export const unlockedIds = (l: Lifetime) => REWARDS.filter((r) => rewardProgress(r, l) >= 1).map((r) => r.id);

export function rewardFor(kind: Reward['kind'], target: string) {
  return REWARDS.find((r) => r.kind === kind && r.target === target);
}

/** Is this clock / theme available to pick? */
export function isUnlocked(kind: Reward['kind'], target: string, l: Lifetime) {
  const r = rewardFor(kind, target);
  return !r || rewardProgress(r, l) >= 1;
}

/* ---- "you unlocked something" events, shown by TimerRunner ---- */

type Listener = (r: Reward[]) => void;
const listeners = new Set<Listener>();
export const onRewards = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const emitRewards = (r: Reward[]) => listeners.forEach((l) => l(r));
