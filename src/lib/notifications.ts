import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import { formatTime, timeToDate } from './dates';
import { Session, TimerMode } from './types';

/** What a notification is for – read by the foreground handler to decide how loud it should be. */
type Kind = 'session' | 'timer-end' | 'timer-live' | 'daily';

let setup: Promise<void> | null = null;

/** Registers the foreground handler and the Android channels. Safe to call many times. */
export function setupNotifications() {
  if (!setup) setup = doSetup().catch((e) => console.warn('Notification setup failed', e));
  return setup;
}

async function doSetup() {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const kind = n.request.content.data?.kind as Kind | undefined;
      // The app is open: the Focus screen already shows its own "time's up" card, and the
      // live timer must stay quiet – so don't drop a banner over the screen for those.
      const quiet = kind === 'timer-live';
      const noBanner = kind === 'timer-end' || quiet;
      return {
        shouldShowBanner: !noBanner,
        shouldShowList: true,
        shouldPlaySound: !quiet,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    // Channels must exist before the first permission prompt on Android 13+.
    await Notifications.setNotificationChannelAsync('study', {
      name: 'Study reminders',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Timer finished',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
    });
    await Notifications.setNotificationChannelAsync('timer-live', {
      name: 'Running timer',
      importance: AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  await setupNotifications();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (granted(current)) return true;
    if (!current.canAskAgain) return false;
    return granted(await Notifications.requestPermissionsAsync());
  } catch {
    return false;
  }
}

const granted = (p: Notifications.NotificationPermissionsStatus) =>
  p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;

/* ---------------- Exact alarms (Android 12+) ---------------- */

/** Without "Alarms & reminders" access Android may deliver timer alerts minutes late. */
export async function exactAlarmsAllowed() {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

export async function requestExactAlarms() {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/* ---------------- Scheduling ---------------- */

async function scheduleAt(
  date: Date,
  content: { title: string; body: string; kind: Kind; url?: string },
  opts: { channelId?: string; alarm?: boolean } = {}
) {
  if (date.getTime() <= Date.now() + 1000) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { kind: content.kind, ...(content.url ? { url: content.url } : {}) },
        ...(content.kind === 'timer-end' ? { interruptionLevel: 'timeSensitive' as const } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: opts.channelId ?? 'study',
        ...(opts.alarm ? { delivery: 'alarmClock' as const } : {}),
      },
    });
  } catch (e) {
    console.warn('Failed to schedule notification', e);
    return null;
  }
}

export async function cancelNotifications(ids: (string | null | undefined)[]) {
  await Promise.all(
    ids.filter((x): x is string => !!x).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

export async function scheduleSessionNotifications(s: Session, subjectName?: string): Promise<string[]> {
  if (s.done || s.reminderMin < 0) return [];
  const start = timeToDate(s.date, s.time);
  if (start.getTime() <= Date.now()) return [];
  if (!(await ensurePermission())) return [];
  const label = subjectName ? `${subjectName} · ${s.title}` : s.title;
  const url = `/plan?date=${s.date}`;
  const ids: (string | null)[] = [];
  if (s.reminderMin > 0) {
    ids.push(
      await scheduleAt(
        new Date(start.getTime() - s.reminderMin * 60000),
        { title: `In ${s.reminderMin} min · ${s.title}`, body: `Starts at ${formatTime(s.time)}. Keep some water nearby.`, kind: 'session', url }
      )
    );
  }
  ids.push(await scheduleAt(start, { title: label, body: `Whenever you're ready · ${s.durationMin} min`, kind: 'session', url }));
  return ids.filter((x): x is string => !!x);
}

export async function scheduleTimerEnd(endAt: number, mode: TimerMode) {
  if (!(await ensurePermission())) return undefined;
  const isFocus = mode === 'focus';
  const id = await scheduleAt(
    new Date(endAt),
    {
      title: isFocus ? 'Focus done – nice work ✨' : 'Break finished',
      body: isFocus ? 'Time for a short rest. Stretch, sip some water.' : 'Start the next round when you feel ready.',
      kind: 'timer-end',
      url: '/focus',
    },
    { channelId: 'timer', alarm: true }
  );
  return id ?? undefined;
}

export async function scheduleDailyReminder(hhmm: string, examName: string) {
  if (!(await ensurePermission())) return undefined;
  const [hour, minute] = hhmm.split(':').map(Number);
  const title = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: `Pick a few ${examName ? examName + ' ' : ''}topics for today. No rush.`,
        data: { kind: 'daily', url: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'study' },
    });
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}

/* ---------------- Fallback live timer (Expo Go / no native module) ---------------- */

const LIVE_ID = 'live-timer';

/** A plain, silent notification that says when the timer ends. Used when the live countdown isn't available. */
export async function presentStaticLiveTimer(title: string, body: string) {
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm || !granted(perm)) return;
  await Notifications.scheduleNotificationAsync({
    identifier: LIVE_ID,
    content: {
      title,
      body,
      sound: false,
      sticky: true,
      autoDismiss: false,
      interruptionLevel: 'passive',
      data: { kind: 'timer-live', url: '/focus' },
    },
    trigger: Platform.OS === 'android' ? { channelId: 'timer-live' } : null,
  }).catch(() => {});
}

export async function dismissStaticLiveTimer() {
  await Notifications.dismissNotificationAsync(LIVE_ID).catch(() => {});
}
