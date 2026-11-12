import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SubjectChips } from '../../src/components/SubjectPicker';
import { TIMER_STYLES, TimerFace } from '../../src/components/TimerFaces';
import { showBreakPrompt } from '../../src/components/TimerRunner';
import { Chip, Header, IconButton, Label, layout, Sheet, tap } from '../../src/components/ui';
import { addDays, formatMinutes, fromKey, todayKey } from '../../src/lib/dates';
import { exactAlarmsAllowed, requestExactAlarms } from '../../src/lib/notifications';
import {
  completeTimer, pauseTimer, resetTimer, setTimerMode, setTimerSubject, startTimer, timerRemaining, timerTotal,
  updateSettings, useStore,
} from '../../src/lib/store';
import { TimerMode } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

const LABEL: Record<TimerMode, string> = { focus: 'Focus', short: 'Break', long: 'Long break' };

/** The only part of the screen that re-renders every tick. */
function TimerDisplay() {
  const colors = useColors();
  const timer = useStore((s) => s.timer);
  const settings = useStore((s) => s.settings);
  const [, setNow] = useState(0);

  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.running]);

  const accent = timer.mode === 'focus' ? colors.primary : colors.calm;
  const accent2 = timer.mode === 'focus' ? colors.calm : colors.primary;
  const total = timerTotal(timer, settings);
  const remaining = timerRemaining(timer);
  const progress = total ? 1 - remaining / total : 0;

  const dots = (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
      {Array.from({ length: settings.roundsBeforeLong }, (_, i) => (
        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < timer.round ? accent : colors.border }} />
      ))}
    </View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View key={settings.timerStyle} entering={FadeIn.duration(300)}>
        <TimerFace
          style={settings.timerStyle}
          progress={progress}
          remainingMs={remaining}
          running={timer.running}
          accent={accent}
          accent2={accent2}
          colors={colors}
          footer={timer.mode === 'focus' ? dots : undefined}
        />
      </Animated.View>
    </View>
  );
}

export default function Focus() {
  const colors = useColors();
  const mode = useStore((s) => s.timer.mode);
  const running = useStore((s) => s.timer.running);
  const subjectId = useStore((s) => s.timer.subjectId);
  const settings = useStore((s) => s.settings);
  const focusLog = useStore((s) => s.focusLog);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exactOk, setExactOk] = useState(true);

  useEffect(() => {
    if (running) activateKeepAwakeAsync('focus').catch(() => {});
    else deactivateKeepAwake('focus').catch(() => {});
  }, [running]);

  useEffect(() => {
    if (settingsOpen) exactAlarmsAllowed().then(setExactOk);
  }, [settingsOpen]);

  const accent = mode === 'focus' ? colors.primary : colors.calm;

  const week = useMemo(() => {
    const t = todayKey();
    return Array.from({ length: 7 }, (_, i) => {
      const k = addDays(t, i - 6);
      return { k, min: focusLog[k] ?? 0, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][fromKey(k).getDay()] };
    });
  }, [focusLog]);
  const maxWeek = Math.max(...week.map((w) => w.min), 60);
  const weekTotal = week.reduce((n, w) => n + w.min, 0);
  const today = todayKey();

  return (
    <View style={{ flex: 1 }}>
      <Header title="Focus" right={<IconButton icon="options-outline" color={colors.sub} onPress={() => setSettingsOpen(true)} />} />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 22, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignSelf: 'center', backgroundColor: colors.muted, borderRadius: 999, padding: 4 }}>
          {(['focus', 'short', 'long'] as TimerMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => { if (m !== mode) { tap(); setTimerMode(m); } }}
              style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, backgroundColor: mode === m ? colors.card : 'transparent' }}
            >
              <Text style={{ fontSize: 14, fontWeight: mode === m ? '600' : '500', color: mode === m ? colors.text : colors.sub }}>{LABEL[m]}</Text>
            </Pressable>
          ))}
        </View>

        <TimerDisplay />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <IconButton icon="refresh" size={24} color={colors.sub} onPress={() => { tap(); resetTimer(); }} />
          <Pressable
            onPress={() => { tap(); if (running) pauseTimer(); else startTimer(); }}
            accessibilityLabel={running ? 'Pause' : 'Start'}
            style={({ pressed }) => ({
              width: 74, height: 74, borderRadius: 37, backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed ? 0.95 : 1 }],
              shadowColor: accent, shadowOpacity: colors.dark ? 0 : 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3,
            })}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={30} color={colors.onPrimary} style={{ marginLeft: running ? 0 : 3 }} />
          </Pressable>
          <IconButton
            icon="play-skip-forward-outline" size={24} color={colors.sub}
            onPress={() => { tap(); const next = completeTimer(true); if (next !== 'focus') showBreakPrompt(next); }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {TIMER_STYLES.map((st) => {
            const active = settings.timerStyle === st.id;
            return (
              <Pressable
                key={st.id}
                accessibilityLabel={`${st.label} timer style`}
                onPress={() => { tap(); updateSettings({ timerStyle: st.id }); }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.primarySoft : 'transparent' }}
              >
                <Ionicons name={st.icon as any} size={19} color={active ? colors.primary : colors.faint} />
              </Pressable>
            );
          })}
        </View>

        <SubjectChips value={subjectId} onChange={setTimerSubject} />

        <View style={{ gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            <Label>This week</Label>
            <Text style={{ fontSize: 13, color: colors.sub }}>{formatMinutes(weekTotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 10 }}>
            {week.map((w) => (
              <View key={w.k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: '100%', height: Math.max(3, (w.min / maxWeek) * 50), borderRadius: 6, backgroundColor: w.k === today ? colors.primary : colors.primarySoft }} />
                <Text style={{ fontSize: 11, color: w.k === today ? colors.text : colors.faint }}>{w.label}</Text>
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
        <View style={{ gap: 8 }}>
          <Label>Style</Label>
          <View style={layout.row}>
            {TIMER_STYLES.map((st) => (
              <Chip key={st.id} label={st.label} icon={st.icon as any} active={settings.timerStyle === st.id} onPress={() => updateSettings({ timerStyle: st.id })} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Show on lock screen</Text>
            <Text style={{ fontSize: 13, color: colors.sub }}>Live countdown in notifications while the timer runs</Text>
          </View>
          <Switch
            value={settings.liveTimer}
            onValueChange={(v) => updateSettings({ liveTimer: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        {Platform.OS === 'android' && !exactOk && (
          <Pressable
            onPress={async () => setExactOk(await requestExactAlarms())}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.warningSoft }}
          >
            <Ionicons name="alarm-outline" size={20} color={colors.warning} />
            <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
              Allow “Alarms & reminders” so the timer alert rings exactly on time.
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </Pressable>
        )}
      </Sheet>
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
