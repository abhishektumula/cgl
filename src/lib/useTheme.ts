import { useColorScheme } from 'react-native';
import { useStore } from './store';
import { PALETTES } from './theme';

/** Current palette: follows the phone's light/dark setting unless the user forced one in Settings. */
export function useColors() {
  const pref = useStore((s) => s.settings.theme);
  const palette = useStore((s) => s.settings.palette);
  const system = useColorScheme();
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const p = PALETTES[palette] ?? PALETTES.sage;
  return dark ? p.dark : p.light;
}
