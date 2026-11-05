import { useColorScheme } from 'react-native';
import { useStore } from './store';
import { darkColors, lightColors } from './theme';

/** Current palette: follows the phone's setting unless the user picked Light/Dark in Settings. */
export function useColors() {
  const pref = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return dark ? darkColors : lightColors;
}
