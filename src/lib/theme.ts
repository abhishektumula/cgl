import { Priority, ResourceType } from './types';

/** Calm, paper-like palette with a single sage accent. No alarm reds. */
export const lightColors = {
  dark: false,
  bg: '#F7F6F3',
  card: '#FFFFFF',
  text: '#1D1D1B',
  sub: '#7A7872',
  faint: '#B3B0A8',
  border: '#ECEAE5',
  primary: '#4F7C6D',
  primarySoft: '#E7EFEB',
  success: '#4F7C6D',
  successSoft: '#E7EFEB',
  danger: '#C2705F',
  dangerSoft: '#F6E9E5',
  warning: '#C49A4A',
  warningSoft: '#F5EEDF',
  calm: '#6C8FA6',
  calmSoft: '#E6EDF2',
  muted: '#F0EEE9',
  warm: '#F3EEE6',
  backdrop: 'rgba(30,28,24,0.3)',
  shadow: '#1D1D1B',
  onPrimary: '#FFFFFF',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  dark: true,
  bg: '#111312',
  card: '#1A1C1B',
  text: '#EAE9E4',
  sub: '#9C9A93',
  faint: '#5E5D58',
  border: '#272927',
  primary: '#8DB8A8',
  primarySoft: '#1F2B27',
  success: '#8DB8A8',
  successSoft: '#1F2B27',
  danger: '#D99282',
  dangerSoft: '#30221F',
  warning: '#D6B673',
  warningSoft: '#2E291C',
  calm: '#93B2C7',
  calmSoft: '#1D252B',
  muted: '#222423',
  warm: '#211F1B',
  backdrop: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  onPrimary: '#111312',
};

export const SUBJECT_COLORS = ['#6F9A8B', '#7E9CB8', '#C08A6A', '#A58BB5', '#C49A4A', '#6FA3A3', '#B57B8A', '#8C9A6B'];

export const SUBJECT_ICONS = [
  'calculator', 'bulb', 'book', 'globe', 'language', 'flask', 'stats-chart', 'library',
  'newspaper', 'school', 'code-slash', 'earth', 'time', 'briefcase', 'pencil', 'leaf',
];

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };
export const PRIORITY_ORDER: Priority[] = ['none', 'low', 'medium', 'high'];

export const priorityMeta = (p: Priority, c: Colors) =>
  ({
    high: { label: 'High', color: c.danger, bg: c.dangerSoft },
    medium: { label: 'Medium', color: c.warning, bg: c.warningSoft },
    low: { label: 'Low', color: c.calm, bg: c.calmSoft },
    none: { label: 'Priority', color: c.faint, bg: c.muted },
  })[p];

export const RESOURCE_TYPES: Record<ResourceType, { label: string; icon: string }> = {
  youtube: { label: 'Video', icon: 'logo-youtube' },
  playlist: { label: 'Playlist', icon: 'list' },
  pdf: { label: 'PDF', icon: 'document-text-outline' },
  website: { label: 'Website', icon: 'globe-outline' },
  book: { label: 'Book', icon: 'book-outline' },
  telegram: { label: 'Telegram', icon: 'paper-plane-outline' },
  file: { label: 'File', icon: 'folder-open-outline' },
  other: { label: 'Other', icon: 'link-outline' },
};

export const radius = 14;
