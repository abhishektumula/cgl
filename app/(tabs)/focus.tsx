import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TIMER_STYLES, TimerFace } from '../../src/components/TimerFaces';
import { showBreakPrompt } from '../../src/components/TimerRunner';
import { Chip, Header, IconButton, Label, layout, Sheet, tap } from '../../src/components/ui';
import { addDays, formatMinutes, fromKey, todayKey } from '../../src/lib/dates';
import { exactAlarmsAllowed, requestExactAlarms } from '../../src/lib/notifications';
import { needText, rewardFor } from '../../src/lib/rewards';
import { dayTotals, KIND_ICON, KIND_LABEL } from '../../src/lib/stats';
import {
  completeTimer, pauseTimer, resetTimer, setTimerKind, setTimerMode, startTimer, timerRemaining, timerTotal,
  updateSettings, useStore,
} from '../../src/lib/store';
import { Colors, kindColor, kindSoft } from '../../src/lib/theme';
import { showToast } from '../../src/lib/toast';
import { StudyKind, TimerMode, TimerState, TimerStyle } from '../../src/lib/types';
import { useUnlocked } from '../../src/lib/useStats';
import { useColors } from '../../src/lib/useTheme';

const LABEL: Record<TimerMode, string> = { focus: 'Focus', short: 'Break', long: 'Long break' };

const accentsFor = (t: Pick<TimerState, 'mode' | 'kind'>, colors: Colors) =>
  t.mode === 'focus'
    ? [kindColor(t.kind, colors), t.kind === 'class' ? colors.primary : colors.calm]
    : [colors.warning, colors.calm];

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

  const [accent, accent2] = accentsFor(timer, colors);
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

/** Class or self study – two big buttons, each in its own colour. */
function KindSwitch() {
  const colors = useColors();
  const kind = useStore((s) => s.timer.kind);
  const mode = useStore((s) => s.timer.mode);
  return (
    <View style={{ flexDirection: 'row', gap: 10, opacity: mode === 'focus' ? 1 : 0.55 }}>
      {(['study', 'class'] as StudyKind[]).map((k) => {
        const active = kind === k;
        const c = kindColor(k, colors);
        return (
          <Pressable
            key={k}
            accessibilityLabel={`Log as ${KIND_LABEL[k]}`}
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) { tap(); setTimerKind(k); } }}
            style={({ pressed }) => ({
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 13, borderRadius: 16, borderWidth: 1.5,
              borderColor: active ? c : colors.border, backgroundColor: active ? kindSoft(k, colors) : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Ionicons name={KIND_ICON[k] as any} size={18} color={active ? c : colors.faint} />
            <Text style={{ fontSize: 15, fontWeight: active ? '600' : '500', color: active ? colors.text : colors.sub }}>{KIND_LABEL[k]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StylePicker({ chips }: { chips?: boolean }) {
  const colors = useColors();
  const current = useStore((s) => s.settings.timerStyle);
  const unlocked = useUnlocked();
  const pick = (id: TimerStyle) => {
    tap();
    if (!unlocked('style', id)) {
      const r = rewardFor('style', id);
      showToast(`🔒 ${r?.name ?? 'Locked'} – ${r ? needText(r.need) : ''}`);
      return;
    }
    updateSettings({ timerStyle: id });
  };
  if (chips) {
    return (
      <View style={layout.row}>
        {TIMER_STYLES.map((st) => (
          <Chip
            key={st.id}
            label={st.label}
            icon={(unlocked('style', st.id) ? st.icon : 'lock-closed') as any}
            active={current === st.id}
            onPress={() => pick(st.id)}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
      {TIMER_STYLES.map((st) => {
        const active = current === st.id;
        const open = unlocked('style', st.id);
        return (
          <Pressable
            key={st.id}
            accessibilityLabel={`${st.label} timer style${open ? '' : ', locked'}`}
            onPress={() => pick(st.id)}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.primarySoft : 'transparent' }}
          >
            <Ionicons name={st.icon as any} size={18} color={active ? colors.primary : open ? colors.sub : colors.border} />
            {!open && (
              <View style={{ position: 'absolute', right: 3, bottom: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={9} color={colors.faint} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Focus() {
  const colors = useColors();
  const mode = useStore((s) => s.timer.mode);
  const kind = useStore((s) => s.timer.kind);
  const running = useStore((s) => s.timer.running);
  const settings = useStore((s) => s.settings);
  const focusLog = useStore((s) => s.focusLog);
  const focusEntries = useStore((s) => s.focusEntries);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exactOk, setExactOk] = useState(true);

  useEffect(() => {
    if (running) activateKeepAwakeAsync('focus').catch(() => {});
    else deactivateKeepAwake('focus').catch(() => {});
  }, [running]);

  useEffect(() => {
    if (settingsOpen) exactAlarmsAllowed().then(setExactOk);
  }, [settingsOpen]);

  const [accent] = accentsFor({ mode, kind }, colors);
  const today = todayKey();

  const week = useMemo(() => {
    const t = todayKey();
    return Array.from({ length: 7 }, (_, i) => {
      const k = addDays(t, i - 6);
      return { k, ...dayTotals({ focusLog, focusEntries }, k), label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][fromKey(k).getDay()] };
    });
  }, [focusLog, focusEntries]);
  const maxWeek = Math.max(...week.map((w) => w.total), 60);
  const todayTotals = week[6];
  const weekTotal = week.reduce((n, w) => n + w.total, 0);

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Focus"
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="stats-chart-outline" color={colors.sub} onPress={() => router.push('/stats')} />
            <IconButton icon="options-outline" color={colors.sub} onPress={() => setSettingsOpen(true)} />
          </View>
        }
      />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingBottom: 40 }}>
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

        <KindSwitch />

        <StylePicker />

        <Pressable onPress={() => router.push('/stats')} style={({ pressed }) => ({ gap: 12, marginTop: 4, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
            <Label>This week</Label>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 13, color: colors.sub }}>{formatMinutes(weekTotal)}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.faint} style={{ marginLeft: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 74, gap: 10 }}>
            {week.map((w) => (
              <View key={w.k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: '100%', height: Math.max(3, (w.total / maxWeek) * 54), borderRadius: 6, overflow: 'hidden', backgroundColor: colors.muted, justifyContent: 'flex-end' }}>
                  <View style={{ flex: w.study, backgroundColor: kindColor('study', colors), opacity: w.k === today ? 1 : 0.7 }} />
                  <View style={{ flex: w.class, backgroundColor: kindColor('class', colors), opacity: w.k === today ? 1 : 0.7 }} />
                </View>
                <Text style={{ fontSize: 11, color: w.k === today ? colors.text : colors.faint }}>{w.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
            {(['study', 'class'] as StudyKind[]).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: kindColor(k, colors) }} />
                <Text style={{ fontSize: 12, color: colors.sub }}>{KIND_LABEL[k]} today · {formatMinutes(todayTotals[k])}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </ScrollView>

      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="Timer">
        <Preset label="Focus" values={[25, 30, 45, 50, 60, 90]} value={settings.focusMin} onPick={(v) => updateSettings({ focusMin: v })} />
        <Preset label="Break" values={[5, 10, 15]} value={settings.shortBreakMin} onPick={(v) => updateSettings({ shortBreakMin: v })} />
        <Preset label="Long break" values={[15, 20, 30]} value={settings.longBreakMin} onPick={(v) => updateSettings({ longBreakMin: v })} />
        <Preset label="Long break after" values={[2, 3, 4]} suffix=" rounds" value={settings.roundsBeforeLong} onPick={(v) => updateSettings({ roundsBeforeLong: v })} />
        <View style={{ gap: 8 }}>
          <Label>Clock</Label>
          <StylePicker chips />
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
