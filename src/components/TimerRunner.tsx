import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useSyncExternalStore } from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BREAK_TIPS, pick } from '../lib/quotes';
import { completeTimer, getState, startTimer, timerRemaining, useStore } from '../lib/store';
import { TimerMode } from '../lib/types';
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

  return <BreakPrompt />;
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
