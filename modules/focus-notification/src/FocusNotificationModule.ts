import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface LiveTimerOptions {
  title: string;
  body: string;
  /** epoch ms when the countdown reaches zero (ignored while paused) */
  endAt: number;
  remainingMs: number;
  totalMs: number;
  paused: boolean;
  /** accent color, #RRGGBB */
  color: string;
  /** deep link opened when the notification is tapped */
  url?: string;
}

declare class FocusNotificationModule extends NativeModule<{}> {
  /** Resolves false when notifications are not allowed. */
  show(options: LiveTimerOptions): Promise<boolean>;
  hide(): Promise<void>;
}

/** Android only, and only in a development / production build (null in Expo Go and on iOS). */
export default requireOptionalNativeModule<FocusNotificationModule>('FocusNotification');
