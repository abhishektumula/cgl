import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { addDays, formatMinutes, fromKey, todayKey } from '../lib/dates';
import { clockTime, DayTotals, entryMinutes, KIND_ICON, KIND_LABEL } from '../lib/stats';
import { Colors, kindColor, kindSoft } from '../lib/theme';
import { FocusEntry, StudyKind } from '../lib/types';
import { sparklePath } from './timer/kit';

const KINDS: StudyKind[] = ['study', 'class'];

/* ---------------- legend + split bar ---------------- */

export function Legend({ totals, colors, size = 13 }: { totals?: DayTotals; colors: Colors; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      {KINDS.map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: kindColor(k, colors) }} />
          <Text style={{ fontSize: size, color: colors.sub }}>
            {KIND_LABEL[k]}{totals ? <Text style={{ color: colors.text, fontWeight: '600' }}>{`  ${formatMinutes(totals[k])}`}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** One bar, study part then class part. */
export function SplitBar({ totals, colors, height = 10 }: { totals: DayTotals; colors: Colors; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.muted, gap: totals.study && totals.class ? 2 : 0 }}>
      <View style={{ flex: totals.study, backgroundColor: kindColor('study', colors) }} />
      <View style={{ flex: totals.class, backgroundColor: kindColor('class', colors) }} />
    </View>
  );
}

/* ---------------- timeline of one day ---------------- */

const H = 3600000;

/** Hours shown on the timeline: from the first start to the last end, at least 6 hours wide. */
function hourWindow(entries: FocusEntry[], dayStart: number) {
  if (!entries.length) return { from: 8, to: 20 };
  let from = Math.floor((Math.min(...entries.map((e) => e.start)) - dayStart) / H);
  let to = Math.ceil((Math.max(...entries.map((e) => e.end)) - dayStart) / H);
  while (to - from < 6) {
    if (from > 0) from--;
    if (to - from < 6 && to < 24) to++;
    if (from === 0 && to === 24) break;
  }
  return { from: Math.max(0, from), to: Math.min(24, Math.max(to, from + 1)) };
}

const hourLabel = (h: number) => (h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`);

export function DayTimeline({ entries, dayKey, colors, height = 34 }: { entries: FocusEntry[]; dayKey: string; colors: Colors; height?: number }) {
  const dayStart = fromKey(dayKey).getTime();
  const { from, to } = hourWindow(entries, dayStart);
  const span = (to - from) * H;
  const startMs = dayStart + from * H;
  const step = to - from > 12 ? 3 : to - from > 6 ? 2 : 1;
  const ticks = [];
  for (let h = from; h <= to; h += step) ticks.push(h);
  const [now] = useState(Date.now);
  const nowPct = dayKey === todayKey() ? (now - startMs) / span : -1;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, borderRadius: 10, backgroundColor: colors.muted, overflow: 'hidden' }}>
        {ticks.map((h) => (
          <View key={h} style={{ position: 'absolute', left: `${((h - from) / (to - from)) * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: colors.border }} />
        ))}
        {entries.map((e) => {
          const left = Math.max(0, (e.start - startMs) / span);
          const w = Math.max(0.006, (Math.min(e.end, startMs + span) - Math.max(e.start, startMs)) / span);
          return (
            <View
              key={e.id}
              style={{
                position: 'absolute', left: `${left * 100}%`, width: `${w * 100}%`, top: 4, bottom: 4,
                borderRadius: 5, backgroundColor: kindColor(e.kind, colors),
              }}
            />
          );
        })}
        {nowPct > 0 && nowPct < 1 && (
          <View style={{ position: 'absolute', left: `${nowPct * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.text, opacity: 0.5 }} />
        )}
      </View>
      <View style={{ height: 14 }}>
        {ticks.map((h) => (
          <Text
            key={h}
            style={{
              position: 'absolute', left: `${((h - from) / (to - from)) * 100}%`, width: 30, marginLeft: h === from ? 0 : h === to ? -30 : -15,
              textAlign: h === from ? 'left' : h === to ? 'right' : 'center', fontSize: 10, color: colors.faint,
            }}
          >
            {hourLabel(h)}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Start → end list of every session, with the breaks in between. */
export function SessionList({ entries, colors }: { entries: FocusEntry[]; colors: Colors }) {
  return (
    <View>
      {entries.map((e, i) => {
        const gap = i > 0 ? (e.start - entries[i - 1].end) / 60000 : 0;
        const c = kindColor(e.kind, colors);
        return (
          <View key={e.id}>
            {gap >= 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 21, height: 26 }}>
                <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: colors.border, borderRadius: 1 }} />
                <Text style={{ fontSize: 12, color: colors.faint }}>{formatMinutes(Math.round(gap))} break</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: kindSoft(e.kind, colors), alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={KIND_ICON[e.kind] as any} size={20} color={c} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                  {clockTime(e.start)} <Text style={{ color: colors.faint, fontWeight: '400' }}>→</Text> {clockTime(e.end)}
                </Text>
                <Text style={{ fontSize: 13, color: c }}>{KIND_LABEL[e.kind]}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatMinutes(Math.max(1, Math.round(entryMinutes(e))))}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- week bars ---------------- */

export function WeekBars({ days, colors, selected, onSelect, height = 120 }: {
  days: (DayTotals & { k: string })[]; colors: Colors; selected?: string; onSelect?: (k: string) => void; height?: number;
}) {
  const max = Math.max(60, ...days.map((d) => d.total));
  const today = todayKey();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height + 34 }}>
      {days.map((d) => {
        const sel = selected === d.k;
        const fill = Math.max(4, (d.total / max) * height);
        return (
          <Pressable key={d.k} disabled={!onSelect} onPress={() => onSelect?.(d.k)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10, color: sel ? colors.text : colors.faint, fontWeight: sel ? '600' : '400' }} numberOfLines={1}>
              {d.total ? formatMinutes(d.total).replace(/ /g, '') : ''}
            </Text>
            <View style={{ width: '100%', height: fill, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.muted, justifyContent: 'flex-end', opacity: !selected || sel ? 1 : 0.55 }}>
              <View style={{ flex: d.class, backgroundColor: kindColor('class', colors) }} />
              <View style={{ flex: d.study, backgroundColor: kindColor('study', colors) }} />
            </View>
            <Text style={{ fontSize: 11, color: d.k === today ? colors.text : colors.faint, fontWeight: d.k === today ? '700' : '400' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][fromKey(d.k).getDay()]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- heatmap ---------------- */

/** GitHub-style grid of the last `weeks` weeks, Monday on top. */
export function Heatmap({ focusLog, colors, weeks = 17, goal }: { focusLog: Record<string, number>; colors: Colors; weeks?: number; goal: number }) {
  const today = todayKey();
  const cols = useMemo(() => {
    const back = (fromKey(today).getDay() + 6) % 7; // days since Monday
    const firstMonday = addDays(today, -back - (weeks - 1) * 7);
    return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)));
  }, [today, weeks]);
  const level = (m: number) => (m <= 0 ? 0 : m < goal * 0.25 ? 1 : m < goal * 0.5 ? 2 : m < goal * 0.85 ? 3 : 4);
  const opacity = [0, 0.25, 0.45, 0.7, 1];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {cols.map((col, i) => (
          <View key={i} style={{ flex: 1, gap: 3 }}>
            {col.map((k) => {
              const m = focusLog[k] ?? 0;
              const lv = level(m);
              return (
                <View
                  key={k}
                  style={{
                    aspectRatio: 1, borderRadius: 3,
                    backgroundColor: k > today ? 'transparent' : lv ? colors.primary : colors.muted,
                    opacity: k > today ? 1 : lv ? opacity[lv] : 1,
                    borderWidth: k === today ? 1.5 : 0, borderColor: colors.text,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 11, color: colors.faint, marginRight: 2 }}>Less</Text>
        {opacity.map((o, i) => (
          <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: i ? colors.primary : colors.muted, opacity: i ? o : 1 }} />
        ))}
        <Text style={{ fontSize: 11, color: colors.faint, marginLeft: 2 }}>More</Text>
      </View>
    </View>
  );
}

/* ---------------- streak hero ---------------- */

export function StreakHero({ current, best, focusLog, colors, onPress }: {
  current: number; best: number; focusLog: Record<string, number>; colors: Colors; onPress?: () => void;
}) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const studiedToday = (focusLog[today] ?? 0) > 0;
  const line = current === 0
    ? 'Study a little today to start a streak'
    : !studiedToday
      ? 'Study today to keep it going'
      : current >= best && current > 1 ? 'Your best streak ever ✨' : `Best: ${best} days`;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={colors.dark ? 0.35 : 0.22} />
            <Stop offset="1" stopColor={colors.calm} stopOpacity={colors.dark ? 0.25 : 0.18} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill={colors.card} />
        <Rect width="100" height="100" fill="url(#sh)" />
      </Svg>
      <Svg width={80} height={80} style={{ position: 'absolute', right: 8, top: 4 }}>
        <Path d={sparklePath(56, 22, 12)} fill={colors.primary} fillOpacity={0.5} />
        <Path d={sparklePath(30, 50, 7)} fill={colors.calm} fillOpacity={0.6} />
      </Svg>
      <View style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: studiedToday ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flame" size={30} color={studiedToday ? colors.onPrimary : colors.faint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>
              {current} <Text style={{ fontSize: 17, fontWeight: '500', color: colors.sub }}>day{current === 1 ? '' : 's'} streak</Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.sub }}>{line}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {days.map((k) => {
            const done = (focusLog[k] ?? 0) > 0;
            const isToday = k === today;
            return (
              <View key={k} style={{ alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? colors.primary : 'transparent', borderWidth: done ? 0 : 1.5,
                  borderColor: isToday ? colors.primary : colors.border, borderStyle: isToday && !done ? 'dashed' : 'solid',
                }}>
                  {done && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
                </View>
                <Text style={{ fontSize: 11, color: isToday ? colors.text : colors.faint, fontWeight: isToday ? '700' : '400' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][fromKey(k).getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}
