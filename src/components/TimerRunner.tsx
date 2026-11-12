import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BREAK_TIPS, pick } from '../lib/quotes';
import { onRewards, Reward } from '../lib/rewards';
import { completeTimer, getState, startTimer, timerRemaining, updateSettings, useStore } from '../lib/store';
import { PALETTES } from '../lib/theme';
import { Palette, TimerMode, TimerStyle } from '../lib/types';
import { TimerFace } from './TimerFaces';
import { useColors } from '../lib/useTheme';
import { Button, success } from './ui';

/* ---- "time's up" card, shown from anywhere in the app ---- */

type Prompt = { next: TimerMode; tip: string } | null;
let prompt: Prompt = null;
const listeners = new Set<() => void>();
const setPrompt = (p: Prompt) => { prompt = p; listeners.forEach((l) => l()); };
const usePrompt = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => prompt);

export const showBreakPrompt = (next: TimerMode) => setPrompt({ next, tip: pick(BREAK_TIPS) });

/**
 * Finishes the timer when it runs out – mounted once at the root, so it works on every tab
 * and right after the app comes back from the background (or was closed meanwhile).
 */
export function TimerRunner() {
  const running = useStore((s) => s.timer.running);

  useEffect(() => {
    if (!running) return;
    const check = () => {
      const t = getState().timer;
      if (!t.running || timerRemaining(t) > 0) return;
      const next = completeTimer();
      success();
      showBreakPrompt(next);
    };
    check();
    const id = setInterval(check, 1000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [running]);

  return (
    <>
      <BreakPrompt />
      <RewardPrompt />
    </>
  );
}

/** "New clock unlocked!" – with a live preview of the clock or theme. */
function RewardPrompt() {
  const colors = useColors();
  const breakOpen = !!usePrompt();
  const [queue, setQueue] = useState<Reward[]>([]);
  useEffect(() => onRewards((r) => setQueue((q) => [...q, ...r])), []);
  // wait for the "time's up" card to close first
  const r = breakOpen ? undefined : queue[0];
  const next = () => setQueue((q) => q.slice(1));
  const pal = r?.kind === 'palette' ? PALETTES[r.target as Palette][colors.dark ? 'dark' : 'light'] : null;
  return (
    <Modal visible={!!r} transparent animationType="fade" onRequestClose={next}>
      <Pressable onPress={next} style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 24 }}>
        {r && (
          <Animated.View key={r.id} onStartShouldSetResponder={() => true} entering={ZoomIn.springify().damping(13)} style={{ backgroundColor: colors.card, borderRadius: 30, padding: 22, gap: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: colors.primary }}>REWARD UNLOCKED</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{r.name} ✨</Text>
            <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
              {pal ? (
                <View style={{ width: 170, height: 170, borderRadius: 40, backgroundColor: pal.bg, padding: 18, gap: 10, borderWidth: 1, borderColor: pal.border }}>
                  <View style={{ height: 14, width: 90, borderRadius: 7, backgroundColor: pal.text, opacity: 0.85 }} />
                  <View style={{ height: 40, borderRadius: 12, backgroundColor: pal.primarySoft, padding: 8, justifyContent: 'center' }}>
                    <View style={{ height: 8, width: '70%', borderRadius: 4, backgroundColor: pal.primary }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: pal.primary }} />
                    <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: pal.calm }} />
                  </View>
                </View>
              ) : (
                <View style={{ transform: [{ scale: 0.72 }] }}>
                  <TimerFace style={r.target as TimerStyle} progress={0.62} remainingMs={17 * 60000} running accent={colors.primary} accent2={colors.calm} colors={colors} />
                </View>
              )}
            </View>
            <Button
              title={r.kind === 'style' ? 'Use this clock' : 'Use this theme'}
              style={{ alignSelf: 'stretch' }}
              onPress={() => {
                updateSettings(r.kind === 'style' ? { timerStyle: r.target as TimerStyle } : { palette: r.target as Palette });
                next();
              }}
            />
            <Button title="Maybe later" variant="ghost" onPress={next} />
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

function BreakPrompt() {
  const colors = useColors();
  const p = usePrompt();
  const close = () => setPrompt(null);
  const toFocus = p?.next === 'focus';
  return (
    <Modal visible={!!p} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 28 }}>
        <Animated.View onStartShouldSetResponder={() => true} entering={ZoomIn.springify().damping(14)} style={{ backgroundColor: colors.card, borderRadius: 28, padding: 24, gap: 14, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={toFocus ? 'sunny-outline' : 'sparkles-outline'} size={26} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>{toFocus ? 'Ready when you are' : 'Nice work ✨'}</Text>
          <Text style={{ color: colors.sub, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>
            {toFocus ? 'Start the next round whenever you like.' : `${p?.tip}.`}
          </Text>
          <Button title={toFocus ? 'Start focus' : 'Start break'} style={{ alignSelf: 'stretch', marginTop: 6 }} onPress={() => { close(); startTimer(); }} />
          {!toFocus && (
            <Button title="Breathe with me" variant="secondary" style={{ alignSelf: 'stretch' }} onPress={() => { close(); startTimer(); router.push('/breathe'); }} />
          )}
          <Button title="Later" variant="ghost" onPress={close} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
