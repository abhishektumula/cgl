import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ShareSheet } from '../src/components/ShareSheet';
import { DayTimeline, Heatmap, Legend, SessionList, SplitBar, StreakHero, WeekBars } from '../src/components/StatsBits';
import { TIMER_STYLES } from '../src/components/TimerFaces';
import { Group, Header, IconButton, ProgressBar, SectionLabel, tap } from '../src/components/ui';
import { addDays, formatDate, formatMinutes, todayKey } from '../src/lib/dates';
import { needText, progressText, REWARDS, rewardProgress } from '../src/lib/rewards';
import { bestStreak, currentStreak, dayBounds, dayTotals, entriesOn, finishedBetween, range, weekStart } from '../src/lib/stats';
import { updateSettings, useStore } from '../src/lib/store';
import { kindColor, PALETTES } from '../src/lib/theme';
import { Palette, TimerStyle } from '../src/lib/types';
import { useLifetime } from '../src/lib/useStats';
import { useColors } from '../src/lib/useTheme';

function Big({ value, label, color }: { value: string; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color, letterSpacing: -0.4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.sub }}>{label}</Text>
    </View>
  );
}

export default function Stats() {
  const colors = useColors();
  const focusLog = useStore((s) => s.focusLog);
  const focusEntries = useStore((s) => s.focusEntries);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const life = useLifetime();
  const today = todayKey();
  const [day, setDay] = useState(today);
  const [shareOpen, setShareOpen] = useState(false);

  const src = useMemo(() => ({ focusLog, focusEntries }), [focusLog, focusEntries]);
  const totals = useMemo(() => dayTotals(src, day), [src, day]);
  const entries = useMemo(() => entriesOn(focusEntries, day), [focusEntries, day]);
  const finished = useMemo(() => { const b = dayBounds(day); return finishedBetween(tasks, b.from, b.to); }, [tasks, day]);
  const week = useMemo(() => range(weekStart(day), 7).map((k) => ({ k, ...dayTotals(src, k) })), [src, day]);
  const weekTotals = week.reduce((a, d) => ({ class: a.class + d.class, study: a.study + d.study, total: a.total + d.total }), { class: 0, study: 0, total: 0 });
  const cur = currentStreak(focusLog);
  const best = bestStreak(focusLog);
  const goal = Math.max(1, settings.dailyGoalMin);

  const first = entries[0];
  const last = entries[entries.length - 1];
  const longest = entries.reduce((m, e) => Math.max(m, e.end - e.start), 0);

  return (
    <View style={{ flex: 1 }}>
      <Header back title="Stats" right={<IconButton icon="share-outline" color={colors.primary} onPress={() => setShareOpen(true)} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 60 }}>
        <StreakHero current={cur} best={best} focusLog={focusLog} colors={colors} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { v: `${Math.floor(life.hours)}h`, l: 'all time', i: 'time-outline' },
            { v: String(life.sessions), l: 'sessions', i: 'layers-outline' },
            { v: `${best}d`, l: 'best streak', i: 'trophy-outline' },
          ].map((x) => (
            <View key={x.l} style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: colors.card, gap: 6 }}>
              <Ionicons name={x.i as any} size={18} color={colors.primary} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{x.v}</Text>
              <Text style={{ fontSize: 12, color: colors.sub }}>{x.l}</Text>
            </View>
          ))}
        </View>

        {/* ---- one day ---- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <IconButton icon="chevron-back" color={colors.sub} onPress={() => { tap(); setDay(addDays(day, -1)); }} />
          <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => setDay(today)}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{formatDate(day)}</Text>
            {day !== today && <Text style={{ fontSize: 12, color: colors.primary }}>Back to today</Text>}
          </Pressable>
          <IconButton icon="chevron-forward" color={day < today ? colors.sub : colors.border} onPress={() => { if (day < today) { tap(); setDay(addDays(day, 1)); } }} />
        </View>

        <Group style={{ padding: 18, gap: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <Big value={formatMinutes(totals.total)} label={`of ${formatMinutes(goal)} goal`} color={colors.text} />
            <Big value={formatMinutes(totals.study)} label="self study" color={kindColor('study', colors)} />
            <Big value={formatMinutes(totals.class)} label="class" color={kindColor('class', colors)} />
          </View>
          <SplitBar totals={totals} colors={colors} />
          <ProgressBar value={totals.total / goal} />
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.sub }}>Timeline</Text>
            <DayTimeline entries={entries} dayKey={day} colors={colors} />
          </View>
          {entries.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { l: 'Started', v: new Date(first.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
                { l: 'Ended', v: new Date(last.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
                { l: 'Longest', v: formatMinutes(Math.round(longest / 60000)) },
              ].map((x) => (
                <View key={x.l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: colors.muted }}>
                  <Text style={{ fontSize: 11, color: colors.sub }}>{x.l}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{x.v}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: colors.sub }}>
              {totals.total > 0 ? 'Time from before session tracking – no start / end times.' : 'No focus sessions on this day.'}
            </Text>
          )}
        </Group>

        {entries.length > 0 && (
          <>
            <SectionLabel>Sessions</SectionLabel>
            <Group style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
              <SessionList entries={entries} colors={colors} />
            </Group>
          </>
        )}

        {finished.length > 0 && (
          <>
            <SectionLabel right={<Text style={{ fontSize: 12, color: colors.faint }}>{finished.length}</Text>}>Finished</SectionLabel>
            <Group style={{ padding: 14, gap: 10 }}>
              {finished.map((f) => (
                <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }} numberOfLines={1}>
                    {f.title}{f.parent ? <Text style={{ color: colors.faint }}>{`  ·  ${f.parent}`}</Text> : null}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.faint }}>{new Date(f.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
              ))}
            </Group>
          </>
        )}

        {/* ---- week ---- */}
        <SectionLabel right={<Text style={{ fontSize: 13, color: colors.sub }}>{formatMinutes(weekTotals.total)}</Text>}>This week</SectionLabel>
        <Group style={{ padding: 16, gap: 12 }}>
          <WeekBars days={week} colors={colors} selected={day} onSelect={(k) => { if (k <= today) { tap(); setDay(k); } }} />
          <Legend totals={weekTotals} colors={colors} />
        </Group>

        {/* ---- months ---- */}
        <SectionLabel>Last 4 months</SectionLabel>
        <Group style={{ padding: 16 }}>
          <Heatmap focusLog={focusLog} colors={colors} goal={goal} />
        </Group>

        {/* ---- rewards ---- */}
        <SectionLabel right={<Text style={{ fontSize: 12, color: colors.faint }}>{REWARDS.filter((r) => rewardProgress(r, life) >= 1).length} / {REWARDS.length}</Text>}>Rewards</SectionLabel>
        <Group style={{ padding: 6 }}>
          {REWARDS.map((r) => {
            const p = rewardProgress(r, life);
            const done = p >= 1;
            const style = TIMER_STYLES.find((s) => s.id === r.target);
            const pal = r.kind === 'palette' ? PALETTES[r.target as Palette][colors.dark ? 'dark' : 'light'] : null;
            const inUse = r.kind === 'style' ? settings.timerStyle === r.target : settings.palette === r.target;
            return (
              <Pressable
                key={r.id}
                disabled={!done || inUse}
                onPress={() => { tap(); updateSettings(r.kind === 'style' ? { timerStyle: r.target as TimerStyle } : { palette: r.target as Palette }); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.primarySoft : colors.muted }}>
                  {pal ? (
                    <View style={{ flexDirection: 'row', width: 44, height: 44, opacity: done ? 1 : 0.35 }}>
                      <View style={{ flex: 1, backgroundColor: pal.primary }} />
                      <View style={{ flex: 1, backgroundColor: pal.calm }} />
                    </View>
                  ) : (
                    <Ionicons name={(style?.icon ?? 'time-outline') as any} size={22} color={done ? colors.primary : colors.faint} />
                  )}
                  {!done && (
                    <View style={{ position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="lock-closed" size={10} color={colors.sub} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: done ? colors.text : colors.sub }}>{r.name}</Text>
                    <Text style={{ fontSize: 12, color: done ? colors.primary : colors.faint, fontWeight: done ? '600' : '400' }}>
                      {inUse ? 'In use' : done ? 'Use' : progressText(r, life)}
                    </Text>
                  </View>
                  {done ? (
                    <Text style={{ fontSize: 12, color: colors.sub }}>Unlocked · {needText(r.need).toLowerCase()}</Text>
                  ) : (
                    <>
                      <ProgressBar value={p} />
                      <Text style={{ fontSize: 12, color: colors.faint }}>{needText(r.need)}</Text>
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </Group>

        <Pressable
          onPress={() => setShareOpen(true)}
          style={({ pressed }) => ({ marginTop: 8, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 })}
        >
          <Ionicons name="share-social-outline" size={20} color={colors.onPrimary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.onPrimary }}>Share my progress</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/focus')} style={{ alignItems: 'center', padding: 10 }}>
          <Text style={{ fontSize: 14, color: colors.sub }}>Start a focus session →</Text>
        </Pressable>
      </ScrollView>
      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} dayKey={day} />
    </View>
  );
}
