/**
 * Shows the running timer outside the app:
 *  - Android: an ongoing notification with a native countdown (modules/focus-notification)
 *  - iOS: a Live Activity on the Lock Screen / Dynamic Island (expo-widgets)
 *  - Expo Go or anything else: a silent notification that says when the timer ends
 * Calls are queued so quick start/pause taps never leave a stale timer behind.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import FocusNotificationModule from '../../modules/focus-notification';
import { dismissStaticLiveTimer, presentStaticLiveTimer } from '../lib/notifications';
import type { TimerActivityProps } from './types';

export type LiveTimerInfo = TimerActivityProps;

type Factory = {
  start: (props: TimerActivityProps, url?: string, staleDate?: Date) => Activity;
  getInstances: () => Activity[];
};
type Activity = {
  update: (props: TimerActivityProps, staleDate?: Date) => Promise<void>;
  end: (policy?: 'default' | 'immediate', props?: TimerActivityProps, contentDate?: Date) => Promise<void>;
};

/** Expo Go has neither our Android module nor expo-widgets – never touch them there. */
const inExpoGo = isRunningInExpoGo();
const FocusNotification = inExpoGo ? null : FocusNotificationModule;

let factory: Factory | null = null;
let factoryLoaded = false;
/** Loads the Live Activity code (and @expo/ui) only the first time a timer is actually shown. */
function activityFactory(): Factory | null {
  if (!factoryLoaded && Platform.OS === 'ios' && !inExpoGo) {
    factoryLoaded = true;
    try {
      // lazy: throws in Expo Go, where the expo-widgets native module isn't bundled
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      factory = require('./TimerActivity').default ?? null;
    } catch {
      factory = null;
    }
  }
  return factory;
}

let activity: Activity | null = null;
/** whether this app session may have something on screen outside the app */
let shown = false;
let queue: Promise<unknown> = Promise.resolve();
const enqueue = (job: () => Promise<unknown>) => {
  queue = queue.then(job).catch((e) => console.warn('live timer', e));
  return queue;
};

const hhmm = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};
const left = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function showLiveTimer(info: LiveTimerInfo) {
  return enqueue(async () => {
    const paused = info.pausedAt > 0;
    const remaining = info.endAt - (paused ? info.pausedAt : Date.now());
    // the round ended while the app was closed – clear whatever is still on the lock screen
    if (remaining <= 0) return hideNow(true);
    shown = true;

    if (Platform.OS === 'android' && FocusNotification) {
      await FocusNotification.show({
        title: info.title,
        body: paused ? `Paused · ${left(remaining)} left` : info.subtitle,
        endAt: info.endAt,
        remainingMs: remaining,
        totalMs: info.totalMs,
        paused,
        color: info.color,
        url: 'prepplanner://focus',
      });
      return;
    }

    const f = activityFactory();
    if (f) {
      activity ??= f.getInstances()[0] ?? null;
      const stale = new Date(info.endAt + 5000);
      if (activity) await activity.update(info, stale);
      else activity = f.start(info, 'prepplanner://focus', stale);
      return;
    }

    await presentStaticLiveTimer(
      info.title,
      paused ? `Paused · ${left(remaining)} left` : `Ends at ${hhmm(info.endAt)} · ${info.subtitle}`
    );
  });
}

async function hideNow(force = false) {
  // nothing was shown since launch: skip, so app start never loads the native timer code
  if (!shown && !force) return;
  shown = false;
  if (Platform.OS === 'android' && FocusNotification) {
    await FocusNotification.hide();
    return;
  }
  const f = activityFactory();
  if (f) {
    const all = activity ? [activity, ...f.getInstances()] : f.getInstances();
    activity = null;
    await Promise.all(all.map((a) => a.end('immediate').catch(() => {})));
    return;
  }
  await dismissStaticLiveTimer();
}

export const hideLiveTimer = () => enqueue(hideNow);
