import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SubjectChips } from '../../src/components/SubjectPicker';
import { Button, Chip, Header, IconButton, Label, layout, Sheet, success, tap } from '../../src/components/ui';
import { addDays, formatMinutes, fromKey, todayKey } from '../../src/lib/dates';
import { BREAK_TIPS, pick } from '../../src/lib/quotes';
import {
  completeTimer, getState, modeMinutes, pauseTimer, resetTimer, setTimerMode, setTimerSubject, startTimer, timerRemaining,
  updateSettings, useStore,
} from '../../src/lib/store';
import { TimerMode } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

const LABEL: Record<TimerMode, string> = { focus: 'Focus', short: 'Break', long: 'Long break' };
const SIZE = 250;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const mmss = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function Focus() {
  const colors = useColors();
  const timer = useStore((s) => s.timer);
  const settings = useStore((s) => s.settings);
  const focusLog = useStore((s) => s.focusLog);
  const [, setNow] = useState(0);
  const [breakModal, setBreakModal] = useState<{ next: TimerMode; tip: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // tick while running; time is derived from endAt so it stays right after the app was in the background
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => {
      if (timerRemaining(getState().timer) <= 0) {
        clearInterval(id);
        const next = completeTimer();
        success();
        setBreakModal({ next, tip: pick(BREAK_TIPS) });
      } else setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, [timer.running]);

  useEffect(() => {
    if (timer.running) activateKeepAwakeAsync('focus').catch(() => {});
    else deactivateKeepAwake('focus').catch(() => {});
  }, [timer.running]);

  const accent = timer.mode === 'focus' ? colors.primary : colors.calm;
  const total = modeMinutes(timer.mode, settings) * 60000;
  const remaining = timerRemaining(timer);
  const progress = total ? 1 - remaining / total : 0;

  const week = useMemo(() => {
    const t = todayKey();
    return Array.from({ length: 7 }, (_, i) => {
      const k = addDays(t, i - 6);
      return { k, min: focusLog[k] ?? 0, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][fromKey(k).getDay()] };
    });
  }, [focusLog]);
  const maxWeek = Math.max(...week.map((w) => w.min), 60);
  const weekTotal = week.reduce((n, w) => n + w.min, 0);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Focus" right={<IconButton icon="options-outline" color={colors.sub} onPress={() => setSettingsOpen(true)} />} />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 4 }}>
          {(['focus', 'short', 'long'] as TimerMode[]).map((m) => (
            <Pressable key={m} onPress={() => { tap(); setTimerMode(m); }} hitSlop={8}>
              <Text style={{ fontSize: 15, fontWeight: timer.mode === m ? '700' : '500', color: timer.mode === m ? colors.text : colors.faint }}>{LABEL[m]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.muted} strokeWidth={STROKE} fill="none" />
              <Circle
                cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={accent} strokeWidth={STROKE} fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)} strokeLinecap="round"
              />
            </Svg>
            <Text style={{ fontSize: 60, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1 }}>{mmss(remaining)}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {Array.from({ length: settings.roundsBeforeLong }, (_, i) => (
                <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < timer.round ? accent : colors.border }} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <IconButton icon="refresh" size={24} color={colors.sub} onPress={() => { tap(); resetTimer(); }} />
          <Pressable
            onPress={() => { tap(); if (timer.running) pauseTimer(); else startTimer(); }}
            style={({ pressed }) => ({
              width: 76, height: 76, borderRadius: 38, backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Ionicons name={timer.running ? 'pause' : 'play'} size={32} color={colors.onPrimary} style={{ marginLeft: timer.running ? 0 : 3 }} />
          </Pressable>
          <IconButton
            icon="play-skip-forward-outline" size={24} color={colors.sub}
            onPress={() => { tap(); const next = completeTimer(true); if (next !== 'focus') setBreakModal({ next, tip: pick(BREAK_TIPS) }); }}
          />
        </View>

        <SubjectChips value={timer.subjectId} onChange={setTimerSubject} />

        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            <Label>This week</Label>
            <Text style={{ fontSize: 13, color: colors.sub }}>{formatMinutes(weekTotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 10 }}>
            {week.map((w) => (
              <View key={w.k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: '100%', height: Math.max(3, (w.min / maxWeek) * 50), borderRadius: 4, backgroundColor: w.k === todayKey() ? colors.primary : colors.primarySoft }} />
                <Text style={{ fontSize: 11, color: w.k === todayKey() ? colors.text : colors.faint }}>{w.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="Timer">
        <Preset label="Focus" values={[25, 30, 45, 50, 60, 90]} value={settings.focusMin} onPick={(v) => updateSettings({ focusMin: v })} />
        <Preset label="Break" values={[5, 10, 15]} value={settings.shortBreakMin} onPick={(v) => updateSettings({ shortBreakMin: v })} />
        <Preset label="Long break" values={[15, 20, 30]} value={settings.longBreakMin} onPick={(v) => updateSettings({ longBreakMin: v })} />
        <Preset label="Long break after" values={[2, 3, 4]} suffix=" rounds" value={settings.roundsBeforeLong} onPick={(v) => updateSettings({ roundsBeforeLong: v })} />
      </Sheet>

      <Modal visible={!!breakModal} transparent animationType="fade" onRequestClose={() => setBreakModal(null)}>
        <Pressable onPress={() => setBreakModal(null)} style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 28 }}>
          <Animated.View onStartShouldSetResponder={() => true} entering={ZoomIn.springify().damping(14)} style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, gap: 14, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={breakModal?.next === 'focus' ? 'sunny-outline' : 'leaf-outline'} size={26} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
              {breakModal?.next === 'focus' ? 'Ready when you are' : 'Nice work'}
            </Text>
            <Text style={{ color: colors.sub, textAlign: 'center', fontSize: 15 }}>
              {breakModal?.next === 'focus' ? 'Start the next round whenever you like.' : `${breakModal?.tip}.`}
            </Text>
            <Button
              title={breakModal?.next === 'focus' ? 'Start focus' : 'Start break'}
              style={{ alignSelf: 'stretch', marginTop: 6 }}
              onPress={() => { setBreakModal(null); startTimer(); }}
            />
            {breakModal?.next !== 'focus' && (
              <Button title="Breathe with me" variant="secondary" style={{ alignSelf: 'stretch' }} onPress={() => { setBreakModal(null); startTimer(); router.push('/breathe'); }} />
            )}
            <Button title="Later" variant="ghost" onPress={() => setBreakModal(null)} />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Preset({ label, values, value, onPick, suffix = ' min' }: { label: string; values: number[]; value: number; onPick: (v: number) => void; suffix?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View style={layout.row}>
        {values.map((v) => <Chip key={v} label={`${v}${suffix}`} active={value === v} onPress={() => onPick(v)} />)}
      </View>
    </View>
  );
}
