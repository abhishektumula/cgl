import { isRunningInExpoGo } from 'expo';
import { AppState, Platform } from 'react-native';
import { addDays, formatMinutes, formatTime, fromKey, MONTHS_FULL, todayKey, daysBetween } from '../lib/dates';
import { currentStreak, dayBounds, dayTotals, finishedBetween } from '../lib/stats';
import { getState, subscribe, timerColor, timerRemaining, timerTotal } from '../lib/store';
import { PALETTES, PRIORITY_RANK } from '../lib/theme';
import { AppState as Data } from '../lib/types';
import type { CalendarWidgetProps, FocusWidgetProps, TasksWidgetProps, Themed, WidgetTheme } from './types';

type Entry<P> = { date: Date; props: P };
interface WidgetHandle<P> {
  updateSnapshot(props: P): void;
  updateTimeline?(entries: Entry<P>[]): void;
}

/* ---------------- loading the native widgets lazily ---------------- */

const supported = (Platform.OS === 'ios' || Platform.OS === 'android') && !isRunningInExpoGo();

function load<P>(get: () => { default: unknown }): WidgetHandle<P> | null {
  if (!supported) return null;
  try {
    return (get().default as WidgetHandle<P> | null) ?? null;
  } catch (e) {
    console.warn('Widget unavailable', e);
    return null;
  }
}

let widgets: {
  focus: WidgetHandle<FocusWidgetProps> | null;
  tasks: WidgetHandle<TasksWidgetProps> | null;
  calendar: WidgetHandle<CalendarWidgetProps> | null;
} | null = null;

function handles() {
  if (!widgets) {
    widgets = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      focus: load(() => require('./FocusWidget')),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      tasks: load(() => require('./TasksWidget')),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      calendar: load(() => require('./CalendarWidget')),
    };
  }
  return widgets;
}

/* ---------------- building the props ---------------- */

function theme(s: Data): Themed {
  const p = PALETTES[s.settings.palette] ?? PALETTES.blush;
  const pick = (c: typeof p.light): WidgetTheme => ({
    bg: c.bg, card: c.card, text: c.text, sub: c.sub, muted: c.muted, primary: c.primary, study: c.primary, cls: c.calm,
  });
  return { light: pick(p.light), dark: pick(p.dark) };
}

function focusProps(s: Data, day: string, timerOverride?: 'idle'): FocusWidgetProps {
  const t = s.timer;
  const totals = dayTotals(s, day);
  const total = timerTotal(t, s.settings);
  const started = t.running || t.remainingMs < total;
  const state = timerOverride ?? (t.running ? 'running' : started ? 'paused' : 'idle');
  const now = Date.now();
  const leftMs = timerRemaining(t);
  const endAt = t.running && t.endAt ? t.endAt : now + leftMs;
  return {
    ...theme(s),
    state,
    label: t.mode !== 'focus' ? 'Break' : t.kind === 'class' ? 'Class' : 'Self study',
    color: timerColor(t, s.settings),
    startAt: endAt - total,
    endAt,
    leftMs,
    total: formatMinutes(totals.total),
    study: formatMinutes(totals.study),
    cls: formatMinutes(totals.class),
    studyShare: totals.total ? totals.study / totals.total : 0,
    goal: Math.min(1, totals.total / Math.max(1, s.settings.dailyGoalMin)),
    streak: currentStreak(s.focusLog),
  };
}

function tasksProps(s: Data): TasksWidgetProps {
  const today = todayKey();
  const subjects = new Map(s.subjects.map((x) => [x.id, x]));
  const open = s.tasks.filter((t) => !t.done);
  const items = [...open]
    .sort((a, b) =>
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt - a.createdAt)
    .slice(0, 9)
    .map((t) => {
      const sub = subjects.get(t.subjectId ?? '');
      const steps = t.subtasks.length ? `${t.subtasks.filter((x) => x.done).length}/${t.subtasks.length} steps` : '';
      const due = !!t.dueDate && t.dueDate <= today;
      const when = t.dueDate ? (t.dueDate < today ? 'Overdue' : t.dueDate === today ? 'Due today' : '') : '';
      return {
        title: t.title,
        sub: [when, sub?.name, steps].filter(Boolean).join(' · '),
        color: sub?.color ?? PALETTES[s.settings.palette]?.light.primary ?? '#E68AAE',
        due,
      };
    });
  const { from, to } = dayBounds(today);
  return { ...theme(s), items, open: open.length, doneToday: finishedBetween(s.tasks, from, to).length };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function calendarProps(s: Data, day: string): CalendarWidgetProps {
  const d = fromKey(day);
  const subjects = new Map(s.subjects.map((x) => [x.id, x]));
  const items = s.sessions
    .filter((x) => x.date === day)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((x) => ({
      time: `${formatTime(x.time)} · ${formatMinutes(x.durationMin)}`,
      title: x.title,
      color: subjects.get(x.subjectId ?? '')?.color ?? PALETTES[s.settings.palette]?.light.calm ?? '#A99CDB',
      done: x.done,
    }));
  const left = s.settings.examDate ? daysBetween(day, s.settings.examDate) : 0;
  return {
    ...theme(s),
    weekday: WEEKDAYS[d.getDay()].slice(0, 3),
    day: d.getDate(),
    month: MONTHS_FULL[d.getMonth()],
    items,
    note: s.settings.showCountdown && left > 0 ? `${left} days to ${s.settings.examName || 'exam'}` : '',
  };
}

/* ---------------- pushing to the widgets ---------------- */

function push<P>(w: WidgetHandle<P> | null, entries: Entry<P>[]) {
  if (!w) return;
  try {
    // iOS can switch to the next entry by itself (e.g. at midnight or when the timer ends)
    if (Platform.OS === 'ios' && w.updateTimeline && entries.length > 1) w.updateTimeline(entries);
    else w.updateSnapshot(entries[0].props);
  } catch (e) {
    console.warn('Widget update failed', e);
  }
}

export function syncWidgets() {
  if (!supported) return;
  const s = getState();
  if (!s.hydrated) return;
  const w = handles();
  const now = new Date();
  const today = todayKey();
  const midnight = fromKey(addDays(today, 1));

  const focus: Entry<FocusWidgetProps>[] = [{ date: now, props: focusProps(s, today) }];
  if (s.timer.running && s.timer.endAt && s.timer.endAt < midnight.getTime()) {
    focus.push({ date: new Date(s.timer.endAt + 1000), props: focusProps(s, today, 'idle') });
  }
  focus.push({ date: midnight, props: { ...focusProps(s, addDays(today, 1), 'idle'), streak: currentStreak(s.focusLog) } });
  push(w.focus, focus);

  push(w.tasks, [{ date: now, props: tasksProps(s) }]);

  push(w.calendar, [
    { date: now, props: calendarProps(s, today) },
    { date: midnight, props: calendarProps(s, addDays(today, 1)) },
  ]);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Keep the home screen widgets in step with the app's data. Call once at startup. */
export function startWidgetSync() {
  if (!supported || started) return;
  started = true;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(syncWidgets, 1200);
  };
  subscribe(schedule);
  // a new day, or the app was away for a while
  AppState.addEventListener('change', (st) => { if (st === 'active' || st === 'background') schedule(); });
  schedule();
}
