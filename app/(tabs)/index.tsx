import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddTaskSheet } from '../../src/components/Sheets';
import { Dot } from '../../src/components/SubjectPicker';
import { TaskRow } from '../../src/components/TaskRow';
import { Checkbox, Divider, Group, IconButton, ProgressBar, Row, SectionLabel } from '../../src/components/ui';
import { daysBetween, formatLongDate, formatMinutes, formatTime, todayKey } from '../../src/lib/dates';
import { dailyPick, QUOTES } from '../../src/lib/quotes';
import { streak, toggleSession, useStore } from '../../src/lib/store';
import { PRIORITY_RANK } from '../../src/lib/theme';
import { useColors } from '../../src/lib/useTheme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Today() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const subjects = useStore((s) => s.subjects);
  const focusLog = useStore((s) => s.focusLog);
  const today = todayKey();
  const [addOpen, setAddOpen] = useState(false);

  const todaysSessions = useMemo(
    () => sessions.filter((s) => s.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [sessions, today]
  );
  // gentle "up next": things due today or carried over, then a couple of high-priority ones
  const upNext = useMemo(() => {
    const due = tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= today);
    const important = tasks.filter((t) => !t.done && !due.includes(t) && t.priority === 'high');
    const picked = [...due, ...important]
      .sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    // top up with the newest open topics so freshly added tasks show here too
    const recent = tasks
      .filter((t) => !t.done && !picked.includes(t))
      .sort((a, b) => b.createdAt - a.createdAt);
    return [...picked, ...recent].slice(0, 5);
  }, [tasks, today]);

  const minutes = focusLog[today] ?? 0;
  const days = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const currentStreak = streak(focusLog);

  const line = [
    settings.showCountdown && days !== null && days > 0 ? `${days} days to ${settings.examName || 'your exam'}` : null,
    currentStreak > 1 ? `${currentStreak}-day streak` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <View style={{ flex: 1 }}>
    <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 14, gap: 12, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 14, color: colors.sub }}>{formatLongDate(today)}</Text>
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>
            {greeting()}{settings.userName ? `, ${settings.userName}` : ''}
          </Text>
          {!!line && <Text style={{ fontSize: 14, color: colors.sub }}>{line}</Text>}
        </View>
        <IconButton icon="ellipsis-horizontal" color={colors.sub} onPress={() => router.push('/settings')} />
      </View>

      <Pressable
        onPress={() => router.push('/focus')}
        style={({ pressed }) => ({
          marginTop: 8, padding: 18, borderRadius: 18, backgroundColor: colors.primarySoft, gap: 12, opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{formatMinutes(minutes)}</Text>
            <Text style={{ fontSize: 13, color: colors.sub }}>studied today</Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play" size={20} color={colors.onPrimary} style={{ marginLeft: 2 }} />
          </View>
        </View>
        <ProgressBar value={minutes / Math.max(1, settings.dailyGoalMin)} />
      </Pressable>

      {todaysSessions.length > 0 && (
        <>
          <SectionLabel>Schedule</SectionLabel>
          <Group>
            {todaysSessions.map((s, i) => {
              const sub = subjects.find((x) => x.id === s.subjectId);
              return (
                <View key={s.id}>
                  {i > 0 && <Divider inset={52} />}
                  <Row onPress={() => router.push({ pathname: '/plan', params: { date: s.date } })}>
                    <Checkbox checked={s.done} onToggle={() => toggleSession(s.id)} color={sub?.color} size={22} />
                    <Text style={{ flex: 1, fontSize: 16, color: s.done ? colors.faint : colors.text, textDecorationLine: s.done ? 'line-through' : 'none' }} numberOfLines={1}>
                      {s.title}
                    </Text>
                    {sub && <Dot color={sub.color} size={7} />}
                    <Text style={{ fontSize: 13, color: colors.sub }}>{formatTime(s.time)}</Text>
                  </Row>
                </View>
              );
            })}
          </Group>
        </>
      )}

      <SectionLabel right={<IconButton icon="add" size={20} color={colors.primary} onPress={() => setAddOpen(true)} />}>Up next</SectionLabel>
      {upNext.length === 0 ? (
        <Group>
          <Row onPress={() => router.push('/tasks')}>
            <Ionicons name="leaf-outline" size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.sub }}>All clear. Tap + to add a topic.</Text>
          </Row>
        </Group>
      ) : (
        <Group>
          {upNext.map((t, i) => (
            <View key={t.id}>
              {i > 0 && <Divider inset={52} />}
              <TaskRow task={t} showSubject />
            </View>
          ))}
        </Group>
      )}

      <Group style={{ marginTop: 12 }}>
        <Row onPress={() => router.push('/breathe')}>
          <Ionicons name="leaf-outline" size={20} color={colors.calm} />
          <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Take a breath</Text>
          <Text style={{ fontSize: 13, color: colors.faint }}>1 min</Text>
        </Row>
        <Divider inset={48} />
        <Row onPress={() => router.push('/mocks')}>
          <Ionicons name="bar-chart-outline" size={20} color={colors.calm} />
          <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Mock tests</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.faint} />
        </Row>
      </Group>

      <Text style={{ textAlign: 'center', color: colors.faint, fontSize: 14, marginTop: 16, fontStyle: 'italic' }}>{dailyPick(QUOTES)}</Text>
    </ScrollView>
    <AddTaskSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
