import type { TimerMode } from '../lib/types';

/** Everything the lock-screen timer needs. Plain JSON – it is sent to the widget runtime. */
export interface TimerActivityProps {
  mode: TimerMode;
  title: string;
  subtitle: string;
  /** epoch ms when the countdown hits zero (while paused: now + remaining) */
  endAt: number;
  totalMs: number;
  /** epoch ms when paused, 0 while running */
  pausedAt: number;
  color: string;
}
