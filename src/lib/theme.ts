import { Palette, Priority, ResourceType } from './types';

/** Every palette fills in these tokens, once for light and once for dark mode. */
export interface Colors {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  sub: string;
  faint: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  /** second accent – used for breaks, secondary icons and timer gradients */
  calm: string;
  calmSoft: string;
  muted: string;
  backdrop: string;
  shadow: string;
  onPrimary: string;
}

type Base = Pick<Colors, 'bg' | 'card' | 'text' | 'sub' | 'faint' | 'border' | 'primary' | 'primarySoft' | 'calm' | 'calmSoft' | 'muted'>;

const light = (b: Base): Colors => ({
  dark: false,
  ...b,
  success: b.primary,
  successSoft: b.primarySoft,
  danger: '#D9776A',
  dangerSoft: '#FBEAE6',
  warning: '#D2A04E',
  warningSoft: '#FAF0DE',
  backdrop: 'rgba(30,24,28,0.28)',
  shadow: b.text,
  onPrimary: '#FFFFFF',
});

const dark = (b: Base): Colors => ({
  dark: true,
  ...b,
  success: b.primary,
  successSoft: b.primarySoft,
  danger: '#E39A8C',
  dangerSoft: '#33221F',
  warning: '#DDBB78',
  warningSoft: '#2F291C',
  backdrop: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  onPrimary: b.bg,
});

export const PALETTES: Record<Palette, { name: string; light: Colors; dark: Colors }> = {
  sage: {
    name: 'Sage',
    light: light({
      bg: '#F7F6F3', card: '#FFFFFF', text: '#1D1D1B', sub: '#7A7872', faint: '#B3B0A8', border: '#EEECE7',
      primary: '#4F7C6D', primarySoft: '#E7EFEB', calm: '#6C8FA6', calmSoft: '#E6EDF2', muted: '#F1EFEA',
    }),
    dark: dark({
      bg: '#111312', card: '#1A1C1B', text: '#EAE9E4', sub: '#9C9A93', faint: '#5E5D58', border: '#262826',
      primary: '#8DB8A8', primarySoft: '#1F2B27', calm: '#93B2C7', calmSoft: '#1D252B', muted: '#222423',
    }),
  },
  blush: {
    name: 'Baby pink',
    light: light({
      bg: '#FFF7F9', card: '#FFFFFF', text: '#3B2731', sub: '#9B7D89', faint: '#D3BCC5', border: '#F8E6EC',
      primary: '#E68AAE', primarySoft: '#FDE9F0', calm: '#A99CDB', calmSoft: '#EFEBFB', muted: '#FCF0F4',
    }),
    dark: dark({
      bg: '#1B1418', card: '#251B21', text: '#F7E9EF', sub: '#BFA2AE', faint: '#6E5560', border: '#33252C',
      primary: '#F4A8C6', primarySoft: '#3A2430', calm: '#BDB1EC', calmSoft: '#2A2538', muted: '#2D2128',
    }),
  },
  rose: {
    name: 'Sakura',
    light: light({
      bg: '#FFF5F7', card: '#FFFFFF', text: '#3A1F2A', sub: '#9A6F80', faint: '#D6B3C0', border: '#F7E0E8',
      primary: '#D9658F', primarySoft: '#FCE4EC', calm: '#F0A07E', calmSoft: '#FDEDE5', muted: '#FBEDF2',
    }),
    dark: dark({
      bg: '#1A1215', card: '#24181D', text: '#F8E6EC', sub: '#C29AAA', faint: '#704E5B', border: '#35232A',
      primary: '#F08DB0', primarySoft: '#3D202C', calm: '#F5B497', calmSoft: '#3A2820', muted: '#2D1E24',
    }),
  },
  lavender: {
    name: 'Lavender',
    light: light({
      bg: '#F9F7FD', card: '#FFFFFF', text: '#2B2640', sub: '#857E9C', faint: '#C2BCD6', border: '#ECE8F6',
      primary: '#9583D6', primarySoft: '#EEEAFB', calm: '#E79BBD', calmSoft: '#FCEBF2', muted: '#F2EFFA',
    }),
    dark: dark({
      bg: '#14131B', card: '#1D1B27', text: '#ECE9F7', sub: '#A6A0BF', faint: '#5D5873', border: '#2A2737',
      primary: '#B5A6F0', primarySoft: '#2A2540', calm: '#F0B2CE', calmSoft: '#36232E', muted: '#24212F',
    }),
  },
  peach: {
    name: 'Peach',
    light: light({
      bg: '#FFF8F4', card: '#FFFFFF', text: '#3A2A22', sub: '#9A8073', faint: '#D8C2B5', border: '#F8E9E0',
      primary: '#E9906C', primarySoft: '#FDEBE2', calm: '#E68AAE', calmSoft: '#FDE9F0', muted: '#FCF1EA',
    }),
    dark: dark({
      bg: '#1A1512', card: '#241D19', text: '#F7EBE3', sub: '#BFA597', faint: '#6E5A4E', border: '#342923',
      primary: '#F4AA8A', primarySoft: '#3B2A21', calm: '#F4A8C6', calmSoft: '#3A2430', muted: '#2C231E',
    }),
  },
  sky: {
    name: 'Sky',
    light: light({
      bg: '#F5F9FC', card: '#FFFFFF', text: '#1F2A35', sub: '#768797', faint: '#B5C3CF', border: '#E5EDF3',
      primary: '#5B9BD0', primarySoft: '#E5F0F9', calm: '#8FC5B4', calmSoft: '#E5F3EE', muted: '#EDF3F8',
    }),
    dark: dark({
      bg: '#10151A', card: '#182029', text: '#E6EEF5', sub: '#94A6B6', faint: '#506172', border: '#24303B',
      primary: '#8CBFEA', primarySoft: '#1B2B3A', calm: '#A6D8C8', calmSoft: '#1C2D28', muted: '#1F2832',
    }),
  },
  candy: {
    name: 'Cotton candy',
    light: light({
      bg: '#FDF7FF', card: '#FFFFFF', text: '#33263F', sub: '#8E7C9E', faint: '#CDBFDA', border: '#F1E6F8',
      primary: '#EE8FC4', primarySoft: '#FDE8F4', calm: '#7FC4EE', calmSoft: '#E4F3FC', muted: '#F8EEFC',
    }),
    dark: dark({
      bg: '#17121C', card: '#211A28', text: '#F5EAFB', sub: '#B9A4C8', faint: '#64536F', border: '#30263A',
      primary: '#F7A9D4', primarySoft: '#3B2236', calm: '#9AD3F5', calmSoft: '#1D2C38', muted: '#2A2131',
    }),
  },
  mint: {
    name: 'Mint',
    light: light({
      bg: '#F4FBF8', card: '#FFFFFF', text: '#1F302A', sub: '#728C83', faint: '#B4CCC3', border: '#E2F1EB',
      primary: '#4DBF9C', primarySoft: '#E0F5EE', calm: '#F49FB6', calmSoft: '#FDEAF0', muted: '#EBF6F1',
    }),
    dark: dark({
      bg: '#101816', card: '#17221F', text: '#E4F4EE', sub: '#93B1A6', faint: '#4D6760', border: '#22312C',
      primary: '#78D8B9', primarySoft: '#183229', calm: '#F7B3C6', calmSoft: '#3A222A', muted: '#1C2925',
    }),
  },
  berry: {
    name: 'Berry',
    light: light({
      bg: '#FCF6F9', card: '#FFFFFF', text: '#35192A', sub: '#91687E', faint: '#D2B1C2', border: '#F4E1EA',
      primary: '#B5487E', primarySoft: '#F8E1EC', calm: '#8A6FD1', calmSoft: '#ECE6FA', muted: '#F8ECF2',
    }),
    dark: dark({
      bg: '#170F14', card: '#22161D', text: '#F7E5EE', sub: '#BE96AA', faint: '#6B4A5B', border: '#34212B',
      primary: '#E27BAE', primarySoft: '#3F1E2F', calm: '#AE98EE', calmSoft: '#272038', muted: '#2B1D24',
    }),
  },
  butter: {
    name: 'Butter',
    light: light({
      bg: '#FFFBF0', card: '#FFFFFF', text: '#33291A', sub: '#958664', faint: '#D8CCAE', border: '#F6EDD6',
      primary: '#E2A93B', primarySoft: '#FCF0D5', calm: '#E98C8C', calmSoft: '#FCE6E6', muted: '#FAF3E1',
    }),
    dark: dark({
      bg: '#17140D', card: '#211D13', text: '#F7EFDB', sub: '#BCAE8C', faint: '#665C45', border: '#322B1D',
      primary: '#F2C46B', primarySoft: '#3A2F17', calm: '#F2A9A9', calmSoft: '#3A2323', muted: '#29241A',
    }),
  },
  midnight: {
    name: 'Midnight',
    // a night-sky theme: dark even when the phone is in light mode
    light: dark({
      bg: '#14162E', card: '#1D2040', text: '#ECEBFA', sub: '#A3A5CC', faint: '#5C5F8A', border: '#2A2E55',
      primary: '#F7D98B', primarySoft: '#3A3550', calm: '#A99CF0', calmSoft: '#2A2850', muted: '#22264A',
    }),
    dark: dark({
      bg: '#0C0D1C', card: '#15172D', text: '#ECEBFA', sub: '#9C9EC6', faint: '#535680', border: '#22254A',
      primary: '#F7D98B', primarySoft: '#332F48', calm: '#A99CF0', calmSoft: '#25234A', muted: '#1B1E3D',
    }),
  },
};

export const PALETTE_ORDER: Palette[] = [
  'blush', 'rose', 'candy', 'berry', 'lavender', 'peach', 'butter', 'mint', 'sage', 'sky', 'midnight',
];

export const lightColors = PALETTES.sage.light;
export const darkColors = PALETTES.sage.dark;

export const SUBJECT_COLORS = ['#6F9A8B', '#7E9CB8', '#C08A6A', '#A58BB5', '#C49A4A', '#6FA3A3', '#D987A6', '#8C9A6B'];

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

export const radius = 18;
