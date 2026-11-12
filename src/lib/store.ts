import { useSyncExternalStore } from 'react';
import { addDays, todayKey } from './dates';
import {
  cancelNotifications,
  scheduleDailyReminder,
  scheduleSessionNotifications,
  scheduleTimerEnd,
} from './notifications';
import { hideLiveTimer, showLiveTimer } from '../live/liveTimer';
import { deleteStoredFile, loadData, saveData } from './storage';
import { showToast } from './toast';
import { emitRewards, REWARDS, unlockedIds } from './rewards';
import { currentStreak, lifetime } from './stats';
import { PALETTES, SUBJECT_COLORS } from './theme';
import {
  AppState, FocusEntry, MockTest, Priority, Resource, Session, Settings, StudyKind, Subject, Subtask, Task, TimerMode,
  TimerState, TimerStyle,
} from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const defaultSettings: Settings = {
  theme: 'system',
  palette: 'blush',
  timerStyle: 'ring',
  liveTimer: true,
  showCountdown: true,
  userName: '',
  examName: 'SSC CGL',
  focusMin: 45,
  shortBreakMin: 10,
  longBreakMin: 25,
  roundsBeforeLong: 3,
  dailyGoalMin: 360,
  dailyReminder: false,
  dailyReminderTime: '07:00',
};

function seed(): Pick<AppState, 'subjects' | 'tasks'> {
  const now = Date.now();
  const subjects: Subject[] = [
    { id: uid(), name: 'Quantitative Aptitude', color: SUBJECT_COLORS[0], icon: 'calculator', createdAt: now },
    { id: uid(), name: 'Reasoning', color: SUBJECT_COLORS[3], icon: 'bulb', createdAt: now + 1 },
    { id: uid(), name: 'English', color: SUBJECT_COLORS[2], icon: 'language', createdAt: now + 2 },
    { id: uid(), name: 'General Awareness', color: SUBJECT_COLORS[4], icon: 'globe', createdAt: now + 3 },
  ];
  const st = (title: string, done = false): Subtask => ({ id: uid(), title, done, priority: 'none' });
  const tasks: Task[] = [
    {
      id: uid(), subjectId: subjects[0].id, title: 'Statistics', notes: '',
      priority: 'high', done: false, createdAt: now,
      subtasks: [st('Watch concept lectures'), st('Solve 50 PYQs'), st('Make formula sheet')],
    },
    {
      id: uid(), subjectId: subjects[1].id, title: 'Syllogism', notes: '', priority: 'medium', done: false,
      createdAt: now + 1, subtasks: [st('Venn diagram method'), st('Practice set 1')],
    },
    {
      id: uid(), subjectId: null, title: 'Set up my study plan', notes: '',
      priority: 'none', done: false, createdAt: now + 2,
      subtasks: [st('Add my subjects'), st('Plan this week'), st('Save a few playlists')],
    },
  ];
  return { subjects, tasks };
}

let state: AppState = {
  hydrated: false,
  subjects: [],
  tasks: [],
  sessions: [],
  resources: [],
  mocks: [],
  focusLog: {},
  focusEntries: [],
  seenRewards: [],
  settings: defaultSettings,
  timer: freshTimer(),
};

function freshTimer(): TimerState {
  return { mode: 'focus', running: false, remainingMs: defaultSettings.focusMin * 60000, round: 0, kind: 'study' };
}

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function writeNow() {
  saveTimer = null;
  const { hydrated, ...rest } = state;
  saveData({ version: 1, ...rest });
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 300);
}

/** Write any pending change right away (called when the app goes to the background). */
export function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  writeNow();
}

function set(updater: (s: AppState) => Partial<AppState>) {
  state = { ...state, ...updater(state) };
  if (state.hydrated) persist();
  listeners.forEach((l) => l());
}

export const getState = () => state;

export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

/** Selectors must return existing references (or primitives) – derive lists with useMemo in the component. */
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

const TIMER_STYLES: TimerStyle[] = ['ring', 'aurora', 'heart', 'bloom', 'liquid', 'flip', 'orbit', 'hourglass', 'sunrise'];

function normalizeSettings(saved?: Partial<Settings>): Settings {
  const s = { ...defaultSettings, ...saved };
  if (!PALETTES[s.palette]) s.palette = defaultSettings.palette;
  if (!TIMER_STYLES.includes(s.timerStyle)) s.timerStyle = defaultSettings.timerStyle;
  return s;
}

/** Fill in missing fields so older / imported files never crash the app. */
function normalize(saved: Partial<AppState>): Omit<AppState, 'hydrated'> {
  return {
    subjects: saved.subjects ?? [],
    tasks: (saved.tasks ?? []).map((t) => ({ ...t, subtasks: t.subtasks ?? [] })),
    sessions: saved.sessions ?? [],
    resources: saved.resources ?? [],
    mocks: saved.mocks ?? [],
    focusLog: saved.focusLog ?? {},
    focusEntries: Array.isArray(saved.focusEntries) ? saved.focusEntries : [],
    seenRewards: Array.isArray(saved.seenRewards) ? saved.seenRewards : [],
    settings: normalizeSettings(saved.settings),
    timer: normalizeTimer(saved.timer),
  };
}

function normalizeTimer(t?: Partial<TimerState> & { subjectId?: unknown }): TimerState {
  if (!t || !t.mode) return state.timer;
  const { subjectId, ...rest } = t;
  return { ...freshTimer(), ...rest, kind: t.kind === 'class' ? 'class' : 'study' };
}

/** All planner data as a JSON string (same format as data.json) – for copy / share to another phone. */
export function exportJson(pretty = false) {
  const { hydrated, timer, ...rest } = state;
  return JSON.stringify({ app: 'prep-planner', version: 1, exportedAt: new Date().toISOString(), ...rest }, null, pretty ? 2 : 0);
}

/** Parse pasted JSON; throws a friendly error if it isn't a planner backup. */
export function parseBackup(text: string): Partial<AppState> {
  let data: any;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error('That text isn\'t valid JSON. Make sure you copied all of it.');
  }
  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.subjects)) {
    throw new Error('This does not look like a Prep Planner backup.');
  }
  return data;
}

/** Replace everything with data from an imported backup file. */
export async function importData(data: Partial<AppState>) {
  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.subjects)) {
    throw new Error('This does not look like a Prep Planner backup.');
  }
  await cancelNotifications([
    ...state.sessions.flatMap((s) => s.notificationIds),
    state.settings.dailyReminderId,
    state.timer.notificationId,
  ]);
  const next = normalize(data);
  next.timer = { ...next.timer, running: false, endAt: undefined, notificationId: undefined };
  // attachments are not part of the backup file, so drop dangling file references
  next.resources = next.resources.map((r) => (r.file ? { ...r, file: undefined, notes: `${r.notes}\n(attached file "${r.file.originalName}" was not included in the backup)`.trim() } : r));
  next.sessions = next.sessions.map((s) => ({ ...s, notificationIds: [] }));
  next.settings = { ...next.settings, dailyReminder: false, dailyReminderId: undefined };
  set(() => next);
  syncLiveTimer();
  // re-create reminders for upcoming sessions on this device
  for (const s of next.sessions) {
    if (!s.done) await saveSession(s);
  }
}

export async function hydrate() {
  try {
    const saved = await loadData<Partial<AppState>>();
    if (saved) {
      const next = normalize(saved);
      // first launch with rewards: whatever is already earned counts as seen – no pile of pop-ups
      if (!Array.isArray(saved.seenRewards)) next.seenRewards = unlockedIds(lifetime(next));
      set(() => ({ ...next, hydrated: true }));
      // re-attach to a timer that kept running while the app was closed – after the first screen is up
      setTimeout(syncLiveTimer, 1500);
    } else {
      set(() => ({ ...seed(), hydrated: true }));
      persist();
    }
  } catch (e) {
    console.warn('load failed', e);
    set(() => ({ ...seed(), hydrated: true }));
  }
}

/* ---------------- Subjects ---------------- */

export function addSubject(data: Pick<Subject, 'name' | 'color' | 'icon'>) {
  const s: Subject = { ...data, id: uid(), createdAt: Date.now() };
  set((st) => ({ subjects: [...st.subjects, s] }));
  return s;
}

export function updateSubject(id: string, patch: Partial<Subject>) {
  set((st) => ({ subjects: st.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
}

/** Deletes the subject. Its tasks / resources / sessions are moved to General (not deleted). */
export function deleteSubject(id: string) {
  set((st) => ({
    subjects: st.subjects.filter((s) => s.id !== id),
    tasks: st.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
    resources: st.resources.map((r) => (r.subjectId === id ? { ...r, subjectId: null } : r)),
    sessions: st.sessions.map((r) => (r.subjectId === id ? { ...r, subjectId: null } : r)),
  }));
}

/* ---------------- Tasks ---------------- */

const withDone = (t: Task): Task => {
  if (t.subtasks.length === 0) return t;
  const allDone = t.subtasks.every((s) => s.done);
  if (allDone === t.done) return t;
  return { ...t, done: allDone, completedAt: allDone ? Date.now() : undefined };
};

function updateTaskRaw(id: string, fn: (t: Task) => Task) {
  set((st) => ({ tasks: st.tasks.map((t) => (t.id === id ? withDone(fn(t)) : t)) }));
}

export function addTask(data: { title: string; subjectId: string | null; priority?: Priority; dueDate?: string; notes?: string; subtasks?: string[] }) {
  const t: Task = {
    id: uid(),
    subjectId: data.subjectId,
    title: data.title.trim(),
    notes: data.notes ?? '',
    priority: data.priority ?? 'none',
    dueDate: data.dueDate,
    done: false,
    subtasks: (data.subtasks ?? []).filter((x) => x.trim()).map((title) => ({ id: uid(), title: title.trim(), done: false, priority: 'none' as Priority })),
    createdAt: Date.now(),
  };
  set((st) => ({ tasks: [...st.tasks, t] }));
  return t;
}

export function updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'subtasks'>>) {
  updateTaskRaw(id, (t) => ({ ...t, ...patch }));
}

export function toggleTask(id: string) {
  set((st) => ({
    tasks: st.tasks.map((t) => {
      if (t.id !== id) return t;
      const done = !t.done;
      // Completing a parent completes every subtask; un-completing re-opens them.
      return {
        ...t,
        done,
        completedAt: done ? Date.now() : undefined,
        subtasks: t.subtasks.map((s) => (s.done === done ? s : { ...s, done, completedAt: done ? Date.now() : undefined })),
      };
    }),
  }));
}

export function moveTask(id: string, subjectId: string | null) {
  updateTaskRaw(id, (t) => ({ ...t, subjectId }));
}

export function deleteTask(id: string) {
  set((st) => ({
    tasks: st.tasks.filter((t) => t.id !== id),
    sessions: st.sessions.map((s) => (s.taskId === id ? { ...s, taskId: null } : s)),
  }));
}

export function addSubtask(taskId: string, title: string, extra?: Partial<Subtask>) {
  updateTaskRaw(taskId, (t) => ({
    ...t,
    subtasks: [...t.subtasks, { id: uid(), title: title.trim(), done: false, priority: 'none', ...extra }],
  }));
}

export function updateSubtask(taskId: string, subId: string, patch: Partial<Subtask>) {
  updateTaskRaw(taskId, (t) => ({
    ...t,
    subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, ...patch } : s)),
  }));
}

export function toggleSubtask(taskId: string, subId: string) {
  updateTaskRaw(taskId, (t) => ({
    ...t,
    subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done, completedAt: s.done ? undefined : Date.now() } : s)),
  }));
}

export function deleteSubtask(taskId: string, subId: string) {
  updateTaskRaw(taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }));
}

export const taskProgress = (t: Task) => {
  if (t.subtasks.length === 0) return t.done ? 1 : 0;
  return t.subtasks.filter((s) => s.done).length / t.subtasks.length;
};

/* ---------------- Sessions (calendar) ---------------- */

const subjectName = (id: string | null) => state.subjects.find((s) => s.id === id)?.name;

export async function saveSession(data: Omit<Session, 'id' | 'notificationIds' | 'done'> & { id?: string; done?: boolean }) {
  const existing = data.id ? state.sessions.find((s) => s.id === data.id) : undefined;
  if (existing) await cancelNotifications(existing.notificationIds);
  const session: Session = {
    done: false,
    ...existing,
    ...data,
    id: existing?.id ?? uid(),
    notificationIds: [],
  };
  session.notificationIds = await scheduleSessionNotifications(session, subjectName(session.subjectId));
  set((st) => ({
    sessions: existing ? st.sessions.map((s) => (s.id === session.id ? session : s)) : [...st.sessions, session],
  }));
  return session;
}

export async function toggleSession(id: string) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return;
  const done = !s.done;
  let notificationIds = s.notificationIds;
  if (done) {
    await cancelNotifications(s.notificationIds);
    notificationIds = [];
  } else {
    notificationIds = await scheduleSessionNotifications({ ...s, done }, subjectName(s.subjectId));
  }
  set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, done, notificationIds } : x)) }));
}

export async function deleteSession(id: string) {
  const s = state.sessions.find((x) => x.id === id);
  if (s) await cancelNotifications(s.notificationIds);
  set((st) => ({ sessions: st.sessions.filter((x) => x.id !== id) }));
}

/** Spaced-repetition revision plan: creates revision sessions at +1, +3, +7, +21 days. */
export async function planRevisions(taskId: string, time = '07:00', offsets = [1, 3, 7, 21]) {
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return 0;
  const base = todayKey();
  for (const off of offsets) {
    await saveSession({
      title: `Revise: ${t.title}`,
      subjectId: t.subjectId,
      taskId: t.id,
      date: addDays(base, off),
      time,
      durationMin: 30,
      reminderMin: 0,
      notes: `Revision #${offsets.indexOf(off) + 1} (day ${off})`,
    });
  }
  return offsets.length;
}

/* ---------------- Resources ---------------- */

export function saveResource(data: Omit<Resource, 'id' | 'createdAt' | 'favorite'> & { id?: string; favorite?: boolean }) {
  if (data.id) {
    const old = state.resources.find((r) => r.id === data.id);
    if (old?.file && old.file.fileName !== data.file?.fileName) deleteStoredFile(old.file.fileName);
    set((st) => ({ resources: st.resources.map((r) => (r.id === data.id ? { ...r, ...data } as Resource : r)) }));
  } else {
    const r: Resource = { favorite: false, ...data, id: uid(), createdAt: Date.now() };
    set((st) => ({ resources: [r, ...st.resources] }));
  }
}

export function toggleFavorite(id: string) {
  set((st) => ({ resources: st.resources.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)) }));
}

export function deleteResource(id: string) {
  set((st) => ({ resources: st.resources.filter((r) => r.id !== id) }));
}

/* ---------------- Mock tests ---------------- */

export function saveMock(data: Omit<MockTest, 'id'> & { id?: string }) {
  if (data.id) set((st) => ({ mocks: st.mocks.map((m) => (m.id === data.id ? { ...m, ...data } as MockTest : m)) }));
  else set((st) => ({ mocks: [...st.mocks, { ...data, id: uid() }] }));
}

export function deleteMock(id: string) {
  set((st) => ({ mocks: st.mocks.filter((m) => m.id !== id) }));
}

/* ---------------- Settings ---------------- */

export async function updateSettings(patch: Partial<Settings>) {
  const next = { ...state.settings, ...patch };
  const reminderChanged =
    'dailyReminder' in patch || 'dailyReminderTime' in patch || ('examName' in patch && next.dailyReminder);
  if (reminderChanged) {
    await cancelNotifications([state.settings.dailyReminderId]);
    next.dailyReminderId = next.dailyReminder
      ? await scheduleDailyReminder(next.dailyReminderTime, next.examName || 'exam')
      : undefined;
    if (next.dailyReminder && !next.dailyReminderId) next.dailyReminder = false;
  }
  set((st) => {
    // an untouched (full) timer follows the new length right away
    const t = st.timer;
    const timer = !t.running && t.remainingMs === modeMinutes(t.mode, st.settings) * 60000
      ? { ...t, remainingMs: modeMinutes(t.mode, next) * 60000 }
      : t;
    return { settings: next, timer };
  });
  if ('liveTimer' in patch || 'palette' in patch) syncLiveTimer();
}

export async function resetAllData() {
  state.resources.forEach((r) => deleteStoredFile(r.file?.fileName));
  await cancelNotifications([
    ...state.sessions.flatMap((s) => s.notificationIds),
    state.settings.dailyReminderId,
    state.timer.notificationId,
  ]);
  set(() => ({
    subjects: [], tasks: [], sessions: [], resources: [], mocks: [], focusLog: {}, focusEntries: [], seenRewards: [],
    settings: defaultSettings,
    timer: freshTimer(),
  }));
  hideLiveTimer();
}

/* ---------------- Pomodoro timer ---------------- */

export const modeMinutes = (mode: TimerMode, s: Settings = state.settings) =>
  mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortBreakMin : s.longBreakMin;

export const timerRemaining = (t = state.timer) =>
  t.running && t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remainingMs;

/** Total length of the current round (never shorter than what is left, e.g. after changing the preset mid-round). */
export const timerTotal = (t = state.timer, s: Settings = state.settings) => Math.max(modeMinutes(t.mode, s) * 60000, t.remainingMs);

const TIMER_TITLE: Record<TimerMode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const KIND_TITLE: Record<StudyKind, string> = { class: 'Class', study: 'Self study' };

/** Timer colour for the current round: study / class have their own, breaks are always calm. */
export function timerColor(t: TimerState, s: Settings = state.settings, dark = false) {
  const p = (PALETTES[s.palette] ?? PALETTES.blush)[dark ? 'dark' : 'light'];
  if (t.mode !== 'focus') return p.warning;
  return t.kind === 'class' ? p.calm : p.primary;
}

/** Mirror the timer in the notification shade / Lock Screen (or remove it there). */
export function syncLiveTimer() {
  const t = state.timer;
  const s = state.settings;
  const total = timerTotal(t);
  const started = t.running || t.remainingMs < total;
  if (!s.liveTimer || !started) {
    hideLiveTimer();
    return;
  }
  const now = Date.now();
  showLiveTimer({
    mode: t.mode,
    title: t.mode === 'focus' ? KIND_TITLE[t.kind] : TIMER_TITLE[t.mode],
    subtitle: t.mode === 'focus' ? `Round ${Math.min(t.round + 1, s.roundsBeforeLong)} of ${s.roundsBeforeLong}` : 'Rest your eyes',
    endAt: t.running && t.endAt ? t.endAt : now + t.remainingMs,
    totalMs: total,
    pausedAt: t.running ? 0 : now,
    color: timerColor(t, s),
  });
}

/** Gaps shorter than this between two stretches of the same kind are joined into one session. */
const JOIN_GAP = 3 * 60000;

function addEntry(entries: FocusEntry[], kind: StudyKind, start: number, end: number): FocusEntry[] {
  if (end - start < 15000) return entries; // a few seconds isn't a session
  const last = entries[entries.length - 1];
  if (last && last.kind === kind && start - last.end < JOIN_GAP && start >= last.end - 1000) {
    return [...entries.slice(0, -1), { ...last, end }];
  }
  return [...entries, { id: uid(), kind, start, end }];
}

/**
 * Add studied focus time (the stretch start → end) to today's total and the session log.
 * Seconds are carried over so pausing often never loses (or invents) minutes.
 */
function creditFocus(start: number, end: number) {
  const ms = Math.max(0, end - start);
  const totalMs = (state.timer.carryMs ?? 0) + ms;
  const mins = Math.floor(totalMs / 60000);
  const key = todayKey();
  set((st) => ({
    focusLog: mins > 0 ? { ...st.focusLog, [key]: (st.focusLog[key] ?? 0) + mins } : st.focusLog,
    focusEntries: addEntry(st.focusEntries, st.timer.kind, start, end),
    timer: { ...st.timer, carryMs: totalMs - mins * 60000 },
  }));
  checkRewards();
}

/** Credit focus time studied since the last start (used when pausing / skipping / resetting / switching mode). */
function logFocus(t = state.timer) {
  if (t.mode !== 'focus' || !t.running || !t.endAt) return;
  // while running, remainingMs holds the value captured at start
  const now = Math.min(Date.now(), t.endAt);
  creditFocus(t.endAt - t.remainingMs, now);
}

/** Tell the user about clocks / themes they just earned. */
export function checkRewards() {
  const earned = unlockedIds(lifetime(state));
  const fresh = earned.filter((id) => !state.seenRewards.includes(id));
  if (!fresh.length) return;
  set((st) => ({ seenRewards: [...st.seenRewards, ...fresh] }));
  emitRewards(REWARDS.filter((r) => fresh.includes(r.id)));
}

export async function startTimer() {
  const t = state.timer;
  if (t.running) return;
  const remainingMs = t.remainingMs > 0 ? t.remainingMs : modeMinutes(t.mode) * 60000;
  const endAt = Date.now() + remainingMs;
  set((st) => ({ timer: { ...st.timer, running: true, endAt, remainingMs, notificationId: undefined } }));
  syncLiveTimer();
  const notificationId = await scheduleTimerEnd(endAt, t.mode);
  // paused / reset / skipped while we were scheduling → that alert must not fire later
  if (state.timer.running && state.timer.endAt === endAt) {
    set((st) => ({ timer: { ...st.timer, notificationId } }));
    // the very first start also asked for notification permission – show the live timer now that we may post
    syncLiveTimer();
  } else cancelNotifications([notificationId]);
}

export async function pauseTimer() {
  const t = state.timer;
  if (!t.running) return;
  logFocus(t);
  set((st) => ({ timer: { ...st.timer, running: false, endAt: undefined, remainingMs: timerRemaining(t), notificationId: undefined } }));
  syncLiveTimer();
  await cancelNotifications([t.notificationId]);
}

export function setTimerMode(mode: TimerMode) {
  const t = state.timer;
  logFocus(t);
  set((st) => ({
    timer: { ...st.timer, mode, running: false, endAt: undefined, notificationId: undefined, remainingMs: modeMinutes(mode) * 60000 },
  }));
  syncLiveTimer();
  cancelNotifications([t.notificationId]);
}

/** Switch between class and self study. While running, the time so far is logged under the old kind. */
export function setTimerKind(kind: StudyKind) {
  const t = state.timer;
  if (t.kind === kind) return;
  if (t.running && t.endAt) {
    logFocus(t);
    // the next stretch starts now
    set((st) => ({ timer: { ...st.timer, kind, remainingMs: timerRemaining(t) } }));
  } else {
    set((st) => ({ timer: { ...st.timer, kind } }));
  }
  syncLiveTimer();
}

export async function resetTimer() {
  const t = state.timer;
  logFocus(t);
  set((st) => ({
    timer: { ...st.timer, running: false, endAt: undefined, notificationId: undefined, remainingMs: modeMinutes(st.timer.mode) * 60000 },
  }));
  syncLiveTimer();
  await cancelNotifications([t.notificationId]);
}

/** Called when the countdown reaches zero (or user skips). Returns the next mode. */
export function completeTimer(skipped = false): TimerMode {
  const t = state.timer;
  if (skipped) {
    logFocus(t);
    cancelNotifications([t.notificationId]);
  } else if (t.mode === 'focus' && t.endAt) {
    // the whole round ran out: credit what was left at the last start
    creditFocus(t.endAt - t.remainingMs, t.endAt);
  }
  let next: TimerMode = 'focus';
  let round = t.round;
  if (t.mode === 'focus') {
    round = t.round + 1;
    next = round >= state.settings.roundsBeforeLong ? 'long' : 'short';
    if (next === 'long') round = 0;
  }
  set((st) => ({
    timer: {
      ...st.timer, mode: next, round, running: false, endAt: undefined, notificationId: undefined,
      remainingMs: modeMinutes(next) * 60000,
    },
  }));
  syncLiveTimer();
  return next;
}

/* ---------------- Stats ---------------- */

export const streak = currentStreak;

/* ---------------- Undo ---------------- */

type Snapshot = Pick<AppState, 'subjects' | 'tasks' | 'sessions' | 'resources' | 'mocks'>;

const snapshot = (): Snapshot => ({
  subjects: state.subjects, tasks: state.tasks, sessions: state.sessions, resources: state.resources, mocks: state.mocks,
});

async function restore(snap: Snapshot) {
  const existing = new Set(state.sessions.map((s) => s.id));
  set(() => snap);
  // sessions that were deleted had their reminders cancelled – schedule them again
  for (const s of snap.sessions) {
    if (!existing.has(s.id) && !s.done) {
      const ids = await scheduleSessionNotifications(s, subjectName(s.subjectId));
      set((st) => ({ sessions: st.sessions.map((x) => (x.id === s.id ? { ...x, notificationIds: ids } : x)) }));
    }
  }
}

/** Run a destructive action and offer "Undo" in a small toast instead of a scary confirm dialog. */
export async function withUndo(message: string, action: () => void | Promise<void>, onCommit?: () => void) {
  const snap = snapshot();
  await action();
  showToast(message, { undo: () => restore(snap), onExpire: onCommit });
}

export const removeTask = (id: string) => withUndo('Task deleted', () => deleteTask(id));
export const removeSubject = (id: string) => withUndo('Subject deleted · tasks moved to General', () => deleteSubject(id));
export const removeSession = (id: string) => withUndo('Session removed', () => deleteSession(id));
export const removeMock = (id: string) => withUndo('Mock removed', () => deleteMock(id));
export const removeSubtask = (taskId: string, subId: string) => withUndo('Step deleted', () => deleteSubtask(taskId, subId));
export function removeResource(id: string) {
  const file = state.resources.find((r) => r.id === id)?.file?.fileName;
  return withUndo('Resource deleted', () => deleteResource(id), () => deleteStoredFile(file));
}
