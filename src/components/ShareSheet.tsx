import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { addDays, daysBetween, formatLongDate, formatMinutes, fromKey } from '../lib/dates';
import { currentStreak, dayBounds, dayTotals, entriesOn, finishedBetween, Finished, range, weekStart } from '../lib/stats';
import { useStore } from '../lib/store';
import { Colors } from '../lib/theme';
import { showToast } from '../lib/toast';
import { useColors } from '../lib/useTheme';
import { DayTimeline, Legend, SplitBar, WeekBars } from './StatsBits';
import { sparklePath } from './timer/kit';
import { Chip, tap } from './ui';

type Period = 'day' | 'week';

const CARD_W = 340;
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (k: string) => { const d = fromKey(k); return `${d.getDate()} ${SHORT_MONTH[d.getMonth()]}`; };

function Backdrop({ colors, height }: { colors: Colors; height: number }) {
  return (
    <Svg width={CARD_W} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="card" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primarySoft} />
          <Stop offset="0.6" stopColor={colors.card} />
          <Stop offset="1" stopColor={colors.calmSoft} />
        </LinearGradient>
      </Defs>
      <Rect width={CARD_W} height={height} fill="url(#card)" />
      <Circle cx={CARD_W - 30} cy={40} r={80} fill={colors.primary} fillOpacity={0.12} />
      <Circle cx={20} cy={height - 30} r={90} fill={colors.calm} fillOpacity={0.12} />
      <Path d={sparklePath(CARD_W - 46, 38, 11)} fill={colors.primary} />
      <Path d={sparklePath(CARD_W - 24, 64, 6)} fill={colors.calm} />
    </Svg>
  );
}

function FinishedList({ items, colors, max = 6 }: { items: Finished[]; colors: Colors; max?: number }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.sub, letterSpacing: 0.6 }}>FINISHED · {items.length}</Text>
      {items.slice(0, max).map((f) => (
        <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={1}>
            {f.title}{f.parent ? <Text style={{ color: colors.faint }}>{`  ·  ${f.parent}`}</Text> : null}
          </Text>
        </View>
      ))}
      {items.length > max && <Text style={{ fontSize: 13, color: colors.sub, marginLeft: 26 }}>+ {items.length - max} more</Text>}
    </View>
  );
}

function Footer({ colors, streak, examLine }: { colors: Colors; streak: number; examLine: string | null }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
      {streak > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Ionicons name="flame" size={13} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{streak}-day streak</Text>
        </View>
      )}
      {!!examLine && <Text style={{ fontSize: 12, color: colors.sub }}>{examLine}</Text>}
      <View style={{ flex: 1 }} />
      <Text style={{ fontSize: 11, color: colors.faint, fontWeight: '600' }}>Prep Planner</Text>
    </View>
  );
}

/** The picture that gets shared. Sized for stories / chats. */
export function SummaryCard({ period, dayKey }: { period: Period; dayKey: string }) {
  const colors = useColors();
  const focusLog = useStore((s) => s.focusLog);
  const focusEntries = useStore((s) => s.focusEntries);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const [h, setH] = useState(520);

  const data = useMemo(() => {
    const src = { focusLog, focusEntries };
    if (period === 'day') {
      const { from, to } = dayBounds(dayKey);
      return { totals: dayTotals(src, dayKey), entries: entriesOn(focusEntries, dayKey), finished: finishedBetween(tasks, from, to), days: [] };
    }
    const start = weekStart(dayKey);
    const days = range(start, 7).map((k) => ({ k, ...dayTotals(src, k) }));
    const totals = days.reduce((a, d) => ({ class: a.class + d.class, study: a.study + d.study, total: a.total + d.total }), { class: 0, study: 0, total: 0 });
    const from = fromKey(start).getTime();
    return { totals, entries: [], finished: finishedBetween(tasks, from, fromKey(addDays(start, 7)).getTime()), days };
  }, [period, dayKey, focusLog, focusEntries, tasks]);

  const streak = currentStreak(focusLog);
  const daysLeft = settings.examDate ? daysBetween(dayKey, settings.examDate) : null;
  const examLine = daysLeft && daysLeft > 0 ? `${daysLeft} days to ${settings.examName || 'exam'}` : null;
  const start = weekStart(dayKey);
  const bestDay = data.days.reduce((b, d) => (d.total > (b?.total ?? 0) ? d : b), undefined as undefined | (typeof data.days)[number]);
  const activeDays = data.days.filter((d) => d.total > 0).length;

  return (
    <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ width: CARD_W, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.card }}>
      <Backdrop colors={colors} height={h} />
      <View style={{ padding: 24, gap: 18 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 1 }}>{period === 'day' ? 'MY STUDY DAY' : 'MY STUDY WEEK'}</Text>
          <Text style={{ fontSize: 15, color: colors.sub }}>
            {period === 'day' ? formatLongDate(dayKey) : `${shortDate(start)} – ${shortDate(addDays(start, 6))}`}
          </Text>
        </View>

        <View>
          <Text style={{ fontSize: 52, fontWeight: '700', color: colors.text, letterSpacing: -1.5 }}>{formatMinutes(data.totals.total)}</Text>
          <Text style={{ fontSize: 15, color: colors.sub, marginTop: -2 }}>
            {period === 'day' ? 'focused today' : `focused · ${activeDays} of 7 days`}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <SplitBar totals={data.totals} colors={colors} height={12} />
          <Legend totals={data.totals} colors={colors} />
        </View>

        {period === 'day' && data.entries.length > 0 && (
          <View style={{ gap: 8 }}>
            <DayTimeline entries={data.entries} dayKey={dayKey} colors={colors} height={28} />
            <Text style={{ fontSize: 12, color: colors.sub }}>
              {data.entries.length} session{data.entries.length === 1 ? '' : 's'} · first at {new Date(data.entries[0].start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {period === 'week' && (
          <View style={{ gap: 6 }}>
            <WeekBars days={data.days} colors={colors} height={84} />
            {bestDay && bestDay.total > 0 && (
              <Text style={{ fontSize: 12, color: colors.sub }}>
                Best day: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatLongDate(bestDay.k).split(',')[0]}</Text> · {formatMinutes(bestDay.total)}
              </Text>
            )}
          </View>
        )}

        <FinishedList items={data.finished} colors={colors} max={period === 'day' ? 6 : 5} />

        {data.totals.total === 0 && data.finished.length === 0 && (
          <Text style={{ fontSize: 15, color: colors.sub }}>A rest day. Tomorrow is a fresh start 🌱</Text>
        )}

        <Footer colors={colors} streak={streak} examLine={examLine} />
      </View>
    </View>
  );
}

/** Preview the card, switch day / week, then share it as a picture. */
export function ShareSheet({ visible, onClose, dayKey, initial = 'day' }: { visible: boolean; onClose: () => void; dayKey: string; initial?: Period }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>(initial);
  const [busy, setBusy] = useState(false);
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  const share = async () => {
    if (!ref.current || busy) return;
    tap();
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        showToast('Sharing isn\'t available on this phone');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your progress', UTI: 'public.png' });
    } catch (e) {
      console.warn(e);
      showToast('Could not create the picture');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 16, paddingBottom: insets.bottom + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: '600', color: colors.text }}>Share</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.sub} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 }}>
          <Chip label={`Day · ${shortDate(dayKey)}`} active={period === 'day'} onPress={() => setPeriod('day')} />
          <Chip label="Week" active={period === 'week'} onPress={() => setPeriod('week')} />
        </View>
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20 }}>
          <View ref={ref} collapsable={false} style={{ borderRadius: 28, backgroundColor: 'transparent' }}>
            <SummaryCard period={period} dayKey={dayKey} />
          </View>
        </ScrollView>
        <Pressable
          onPress={share}
          style={({ pressed }) => ({
            marginHorizontal: 20, height: 54, borderRadius: 27, backgroundColor: colors.primary, flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed || busy ? 0.8 : 1,
          })}
        >
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="share-outline" size={20} color={colors.onPrimary} />}
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.onPrimary }}>Share picture</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
