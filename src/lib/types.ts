export type Priority = 'high' | 'medium' | 'low' | 'none';

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string; // Ionicons name
  createdAt: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
}

export interface Task {
  id: string;
  subjectId: string | null; // null = General
  title: string;
  notes: string;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  done: boolean;
  completedAt?: number;
  subtasks: Subtask[];
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  subjectId: string | null;
  taskId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMin: number;
  reminderMin: number; // minutes before start, -1 = none
  notes: string;
  done: boolean;
  notificationIds: string[];
}

export type ResourceType = 'youtube' | 'playlist' | 'pdf' | 'website' | 'book' | 'telegram' | 'file' | 'other';

export interface Attachment {
  fileName: string; // stored in <documents>/prep-planner/files/
  originalName: string;
  mimeType?: string;
  size?: number;
}

export interface Resource {
  id: string;
  title: string;
  url: string; // may be empty when a local file is attached
  file?: Attachment;
  type: ResourceType;
  subjectId: string | null;
  notes: string;
  favorite: boolean;
  createdAt: number;
}

export interface MockTest {
  id: string;
  name: string;
  date: string;
  score: number;
  total: number;
  notes: string;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
  showCountdown: boolean;
  userName: string;
  examName: string;
  examDate?: string;
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLong: number;
  dailyGoalMin: number;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:mm
  dailyReminderId?: string;
}

export type TimerMode = 'focus' | 'short' | 'long';

export interface TimerState {
  mode: TimerMode;
  running: boolean;
  endAt?: number; // epoch ms when running
  remainingMs: number; // when paused
  round: number; // completed focus rounds in current cycle
  subjectId: string | null;
  notificationId?: string;
}

export interface AppState {
  hydrated: boolean;
  subjects: Subject[];
  tasks: Task[];
  sessions: Session[];
  resources: Resource[];
  mocks: MockTest[];
  focusLog: Record<string, number>; // date -> minutes studied
  settings: Settings;
  timer: TimerState;
}
