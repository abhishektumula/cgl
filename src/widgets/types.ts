/** Colours handed to the widgets – they can't read the app theme themselves. */
export interface WidgetTheme {
  bg: string;
  card: string;
  text: string;
  sub: string;
  muted: string;
  primary: string;
  study: string;
  cls: string;
}

export interface Themed {
  light: WidgetTheme;
  dark: WidgetTheme;
}

export interface FocusWidgetProps extends Themed {
  state: 'idle' | 'running' | 'paused';
  /** "Self study", "Class" or "Break" */
  label: string;
  /** colour of the running round */
  color: string;
  startAt: number;
  endAt: number;
  /** ms left when paused */
  leftMs: number;
  /** today, already formatted ("2h 15m") */
  total: string;
  study: string;
  cls: string;
  /** 0 → 1 study share of today, for the split bar */
  studyShare: number;
  goal: number;
  streak: number;
}

export interface TaskItem {
  title: string;
  sub: string;
  color: string;
  due: boolean;
}

export interface TasksWidgetProps extends Themed {
  items: TaskItem[];
  open: number;
  doneToday: number;
}

export interface AgendaItem {
  time: string;
  title: string;
  color: string;
  done: boolean;
}

export interface CalendarWidgetProps extends Themed {
  weekday: string;
  day: number;
  month: string;
  items: AgendaItem[];
  /** e.g. "42 days to SSC CGL" */
  note: string;
}
