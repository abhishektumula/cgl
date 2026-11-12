import { addDays, fromKey, todayKey, toKey } from './dates';
import { AppState, FocusEntry, StudyKind, Task } from './types';

export const KIND_LABEL: Record<StudyKind, string> = { class: 'Class', study: 'Self study' };
export const KIND_ICON: Record<StudyKind, string> = { class: 'school-outline', study: 'book-outline' };

/** YYYY-MM-DD of an epoch-ms time, in local time. */
export const dayKeyOf = (ms: number) => toKey(new Date(ms));

export const clockTime = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const entryMinutes = (e: FocusEntry) => Math.max(0, (e.end - e.start) / 60000);

export function entriesOn(entries: FocusEntry[], key: string) {
  return entries.filter((e) => dayKeyOf(e.start) === key).sort((a, b) => a.start - b.start);
}

export interface DayTotals {
  class: number;
  study: number;
  total: number;
}

/**
 * Minutes for one day split into class / study.
 * Older days (before the session log existed) only have a total – that counts as study.
 */
export function dayTotals(s: Pick<AppState, 'focusLog' | 'focusEntries'>, key: string): DayTotals {
  const list = entriesOn(s.focusEntries, key);
  const cls = Math.round(list.filter((e) => e.kind === 'class').reduce((n, e) => n + entryMinutes(e), 0));
  const logged = Math.round(list.reduce((n, e) => n + entryMinutes(e), 0));
  const total = Math.max(s.focusLog[key] ?? 0, logged);
  return { class: Math.min(cls, total), study: Math.max(0, total - cls), total };
}

export function range(start: string, days: number) {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

/** Monday of the week that contains `key`. */
export function weekStart(key: string) {
  const d = fromKey(key);
  const back = (d.getDay() + 6) % 7;
  return addDays(key, -back);
}

/* ---------------- streaks ---------------- */

export function currentStreak(focusLog: Record<string, number>) {
  let n = 0;
  let day = todayKey();
  if (!focusLog[day]) day = addDays(day, -1); // today not studied yet doesn't break the streak
  while (focusLog[day] > 0) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(focusLog: Record<string, number>) {
  const days = Object.keys(focusLog).filter((k) => focusLog[k] > 0).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const k of days) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/* ---------------- finished work ---------------- */

export interface Finished {
  id: string;
  title: string;
  parent?: string;
  at: number;
  subjectId: string | null;
}

/** Tasks and steps finished between two times (epoch ms). */
export function finishedBetween(tasks: Task[], from: number, to: number): Finished[] {
  const out: Finished[] = [];
  for (const t of tasks) {
    if (t.done && t.completedAt && t.completedAt >= from && t.completedAt < to) {
      out.push({ id: t.id, title: t.title, at: t.completedAt, subjectId: t.subjectId });
    }
    for (const st of t.subtasks) {
      // a step finished together with its whole task is already covered by the task itself
      if (st.done && st.completedAt && st.completedAt >= from && st.completedAt < to && !(t.done && t.completedAt && Math.abs(t.completedAt - st.completedAt) < 2000)) {
        out.push({ id: st.id, title: st.title, parent: t.title, at: st.completedAt, subjectId: t.subjectId });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export const dayBounds = (key: string) => {
  const from = fromKey(key).getTime();
  return { from, to: fromKey(addDays(key, 1)).getTime() };
};

/* ---------------- lifetime numbers (rewards) ---------------- */

export interface Lifetime {
  hours: number;
  sessions: number;
  bestStreak: number;
  tasksDone: number;
}

export function lifetime(s: Pick<AppState, 'focusLog' | 'focusEntries' | 'tasks'>): Lifetime {
  const minutes = Object.values(s.focusLog).reduce((n, m) => n + m, 0);
  return {
    hours: minutes / 60,
    sessions: s.focusEntries.length,
    bestStreak: bestStreak(s.focusLog),
    tasksDone: s.tasks.filter((t) => t.done).length,
  };
}
