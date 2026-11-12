import { isRunningInExpoGo } from 'expo';
import { ImageSourcePropType } from 'react-native';

/** Must match the names in the `expo-alternate-app-icons` plugin entry in app.json. */
export type AppIconName = 'Default' | 'Sage' | 'Lavender' | 'Peach' | 'Sky' | 'Bloom' | 'Heart' | 'Midnight';

export const APP_ICONS: { id: AppIconName; label: string; preview: ImageSourcePropType }[] = [
  { id: 'Default', label: 'Pink', preview: require('../../assets/icons/Default-preview.png') },
  { id: 'Heart', label: 'Heart', preview: require('../../assets/icons/Heart-preview.png') },
  { id: 'Bloom', label: 'Bloom', preview: require('../../assets/icons/Bloom-preview.png') },
  { id: 'Lavender', label: 'Lavender', preview: require('../../assets/icons/Lavender-preview.png') },
  { id: 'Peach', label: 'Peach', preview: require('../../assets/icons/Peach-preview.png') },
  { id: 'Sage', label: 'Sage', preview: require('../../assets/icons/Sage-preview.png') },
  { id: 'Sky', label: 'Sky', preview: require('../../assets/icons/Sky-preview.png') },
  { id: 'Midnight', label: 'Midnight', preview: require('../../assets/icons/Midnight-preview.png') },
];

type Mod = typeof import('expo-alternate-app-icons');
let mod: Mod | null | undefined;

/** The native module isn't in Expo Go – load it lazily so the app still opens there. */
function native(): Mod | null {
  if (mod === undefined) {
    mod = null;
    if (!isRunningInExpoGo()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const m: Mod = require('expo-alternate-app-icons');
        if (m.supportsAlternateIcons) mod = m;
      } catch {
        mod = null;
      }
    }
  }
  return mod;
}

export const canChangeAppIcon = () => native() !== null;

export function currentAppIcon(): AppIconName {
  try {
    return (native()?.getAppIconName() as AppIconName | null) ?? 'Default';
  } catch {
    return 'Default';
  }
}

export async function setAppIcon(name: AppIconName): Promise<boolean> {
  const m = native();
  if (!m) return false;
  try {
    await m.setAlternateAppIcon(name === 'Default' ? null : name);
    return true;
  } catch (e) {
    console.warn('Could not change app icon', e);
    return false;
  }
}
