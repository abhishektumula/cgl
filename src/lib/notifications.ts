import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { formatTime, timeToDate } from './dates';
import { Session } from './types';

let configured = false;

export async function setupNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study', {
      name: 'Study reminders',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B5BD6',
    });
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Focus timer',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

async function scheduleAt(date: Date, title: string, body: string, channelId = 'study', url?: string) {
  if (date.getTime() <= Date.now() + 1000) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: url ? { url } : {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
    });
  } catch (e) {
    console.warn('Failed to schedule notification', e);
    return null;
  }
}

export async function cancelNotifications(ids: (string | undefined)[]) {
  await Promise.all(
    ids.filter(Boolean).map((id) => Notifications.cancelScheduledNotificationAsync(id!).catch(() => {}))
  );
}

export async function scheduleSessionNotifications(s: Session, subjectName?: string): Promise<string[]> {
  if (s.done) return [];
  if (!(await ensurePermission())) return [];
  const start = timeToDate(s.date, s.time);
  const label = subjectName ? `${subjectName} · ${s.title}` : s.title;
  const ids: (string | null)[] = [];
  if (s.reminderMin > 0) {
    ids.push(
      await scheduleAt(
        new Date(start.getTime() - s.reminderMin * 60000),
        `In ${s.reminderMin} min · ${s.title}`,
        `Starts at ${formatTime(s.time)}. Keep some water nearby.`,
        'study',
        `/plan?date=${s.date}`
      )
    );
  }
  if (s.reminderMin >= 0) {
    ids.push(await scheduleAt(start, label, `Whenever you're ready · ${s.durationMin} min`, 'study', `/plan?date=${s.date}`));
  }
  return ids.filter((x): x is string => !!x);
}

export async function scheduleTimerEnd(endAt: number, mode: 'focus' | 'short' | 'long') {
  if (!(await ensurePermission())) return undefined;
  const isFocus = mode === 'focus';
  const id = await scheduleAt(
    new Date(endAt),
    isFocus ? 'Nice work' : 'Break finished',
    isFocus
      ? 'Time for a short rest. Stretch, sip some water.'
      : 'Start the next round when you feel ready.',
    'timer',
    '/focus'
  );
  return id ?? undefined;
}

export async function scheduleDailyReminder(hhmm: string, examName: string) {
  if (!(await ensurePermission())) return undefined;
  const [hour, minute] = hhmm.split(':').map(Number);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Good morning',
        body: 'Pick a few topics for today. No rush.',
        data: { url: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'study' },
    });
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}
