import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SessionSheet } from '../../src/components/SessionSheet';
import { Dot } from '../../src/components/SubjectPicker';
import { SwipeRow } from '../../src/components/SwipeRow';
import { TaskRow } from '../../src/components/TaskRow';
import { Checkbox, Divider, EmptyState, Fab, Group, Header, IconButton, Row, SectionLabel, tap } from '../../src/components/ui';
import { endTime, formatDate, formatMinutes, formatTime, MONTHS_FULL, toKey, todayKey } from '../../src/lib/dates';
import { removeSession, toggleSession, useStore } from '../../src/lib/store';
import { Session } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 6 rows × 7 columns, Monday first. Each week is its own row so columns can never wrap or drop. */
function monthWeeks(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const weeks: { key: string; day: number; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      week.push({ key: toKey(date), day: date.getDate(), inMonth: date.getMonth() === month });
    }
    // skip a trailing week that is entirely next month
    if (w > 3 && week.every((x) => !x.inMonth)) break;
    weeks.push(week);
  }
  return weeks;
}

export default function Plan() {
  const colors = useColors();
  const params = useLocalSearchParams<{ date?: string; newForTask?: string }>();
  const sessions = useStore((s) => s.sessions);
  const tasks = useStore((s) => s.tasks);
  const subjects = useStore((s) => s.subjects);
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [sheet, setSheet] = useState<{ open: boolean; session?: Session; taskId?: string }>({ open: false });

  const goTo = (key: string) => {
    setSelected(key);
    const [y, m] = key.split('-').map(Number);
    setCursor({ y, m: m - 1 });
  };

  // deep links (from Today or "Schedule a session" on a task): react once, then clear the param
  const [seenParams, setSeenParams] = useState<{ date?: string; task?: string }>({});
  if (params.date !== seenParams.date || params.newForTask !== seenParams.task) {
    setSeenParams({ date: params.date, task: params.newForTask });
    if (params.date && params.date !== seenParams.date) goTo(params.date);
    if (params.newForTask && params.newForTask !== seenParams.task) setSheet({ open: true, taskId: params.newForTask });
  }
  useEffect(() => {
    if (params.date || params.newForTask) router.setParams({ date: undefined, newForTask: undefined });
  }, [params.date, params.newForTask]);

  const weeks = useMemo(() => monthWeeks(cursor.y, cursor.m), [cursor]);
  const busy = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.date));
    tasks.forEach((t) => { if (t.dueDate && !t.done) set.add(t.dueDate); });
    return set;
  }, [sessions, tasks]);

  const daySessions = sessions.filter((s) => s.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const dayTasks = tasks.filter((t) => t.dueDate === selected);
  const plannedMin = daySessions.reduce((n, s) => n + s.durationMin, 0);

  const shiftMonth = (d: number) => {
    tap();
    setCursor(({ y, m }) => {
      const nm = m + d;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={MONTHS_FULL[cursor.m]}
        subtitle={cursor.y !== new Date().getFullYear() ? String(cursor.y) : undefined}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(selected !== today || cursor.m !== new Date().getMonth()) && (
              <Pressable onPress={() => goTo(today)} hitSlop={8} style={{ paddingHorizontal: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Today</Text>
              </Pressable>
            )}
            <IconButton icon="chevron-back" color={colors.sub} onPress={() => shiftMonth(-1)} />
            <IconButton icon="chevron-forward" color={colors.sub} onPress={() => shiftMonth(1)} />
          </View>
        }
      />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 110 }}>
        <View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={{ flex: 1, textAlign: 'center', color: colors.faint, fontSize: 12, fontWeight: '500' }}>{w}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row' }}>
              {week.map((c) => {
                const isSel = c.key === selected;
                const isToday = c.key === today;
                return (
                  <Pressable key={c.key} onPress={() => { tap(); goTo(c.key); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSel ? colors.primary : 'transparent',
                    }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: isToday || isSel ? '700' : '400',
                        color: isSel ? colors.onPrimary : isToday ? colors.primary : c.inMonth ? colors.text : colors.faint,
                      }}>
                        {c.day}
                      </Text>
                    </View>
                    <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: busy.has(c.key) && !isSel ? colors.sub : 'transparent' }} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <SectionLabel right={plannedMin > 0 ? <Text style={{ fontSize: 13, color: colors.sub }}>{formatMinutes(plannedMin)}</Text> : undefined}>
          {formatDate(selected)}
        </SectionLabel>

        {daySessions.length === 0 && dayTasks.length === 0 ? (
          <EmptyState icon="cafe-outline" title={selected < today ? 'Nothing here' : 'Free day. Tap + to plan something.'} />
        ) : (
          <>
            {daySessions.length > 0 && (
              <Group>
                {daySessions.map((s, i) => {
                  const sub = subjects.find((x) => x.id === s.subjectId);
                  return (
                    <View key={s.id}>
                      {i > 0 && <Divider inset={52} />}
                      <SwipeRow actions={[{ icon: 'trash-outline', label: 'Remove', color: colors.danger, onPress: () => removeSession(s.id) }]}>
                        <Row onPress={() => setSheet({ open: true, session: s })}>
                          <Checkbox checked={s.done} onToggle={() => toggleSession(s.id)} color={sub?.color} size={22} />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 16, color: s.done ? colors.faint : colors.text, textDecorationLine: s.done ? 'line-through' : 'none' }} numberOfLines={1}>
                              {s.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {sub && <Dot color={sub.color} size={6} />}
                              <Text style={{ fontSize: 13, color: colors.sub }}>
                                {formatTime(s.time)} – {formatTime(endTime(s.time, s.durationMin))}
                              </Text>
                            </View>
                          </View>
                        </Row>
                      </SwipeRow>
                    </View>
                  );
                })}
              </Group>
            )}
            {dayTasks.length > 0 && (
              <Group>
                {dayTasks.map((t, i) => (
                  <View key={t.id}>{i > 0 && <Divider inset={52} />}<TaskRow task={t} showSubject /></View>
                ))}
              </Group>
            )}
          </>
        )}
      </ScrollView>
      <Fab onPress={() => setSheet({ open: true })} />
      <SessionSheet
        visible={sheet.open}
        session={sheet.session}
        defaultTaskId={sheet.taskId}
        defaultDate={selected < today ? today : selected}
        onClose={() => setSheet({ open: false })}
      />
    </View>
  );
}
