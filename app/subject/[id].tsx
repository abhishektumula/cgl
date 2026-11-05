import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { AddTaskSheet, SubjectSheet } from '../../src/components/Sheets';
import { MoveSheet } from '../../src/components/SubjectPicker';
import { TaskRow } from '../../src/components/TaskRow';
import { Divider, EmptyState, Fab, Group, Header, IconButton, tap } from '../../src/components/ui';
import { moveTask, useStore } from '../../src/lib/store';
import { PRIORITY_RANK } from '../../src/lib/theme';
import { Task } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

const byPriority = (a: Task, b: Task) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9') || a.createdAt - b.createdAt;

export default function SubjectScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = useStore((s) => s.subjects.find((x) => x.id === id));
  const allTasks = useStore((s) => s.tasks);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [moving, setMoving] = useState<Task | null>(null);

  // the subject was deleted → leave the screen
  useEffect(() => {
    if (id !== 'general' && !subject && router.canGoBack()) router.back();
  }, [id, subject]);

  const scoped = useMemo(
    () => allTasks.filter((t) => (id === 'general' ? t.subjectId === null : t.subjectId === id)),
    [allTasks, id]
  );
  const pending = useMemo(() => scoped.filter((t) => !t.done).sort(byPriority), [scoped]);
  const completed = useMemo(() => scoped.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [scoped]);

  const color = subject?.color ?? colors.faint;

  return (
    <View style={{ flex: 1 }}>
      <Header
        back
        title={subject?.name ?? 'General'}
        color={color}
        subtitle={scoped.length ? `${completed.length} of ${scoped.length} done` : undefined}
        right={subject ? <IconButton icon="ellipsis-horizontal" color={colors.sub} onPress={() => setEditOpen(true)} /> : undefined}
      />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 110 }}>
        {pending.length === 0 ? (
          <EmptyState icon={completed.length ? 'checkmark-done-outline' : 'add-circle-outline'} title={completed.length ? 'All done here. Well done.' : 'Add your first topic'} />
        ) : (
          <Group>
            {pending.map((t, i) => (
              <Animated.View key={t.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(220)} layout={LinearTransition.duration(260)}>
                {i > 0 && <Divider inset={52} />}
                <TaskRow task={t} onMove={setMoving} />
              </Animated.View>
            ))}
          </Group>
        )}

        {completed.length > 0 && (
          <>
            <Pressable onPress={() => { tap(); setShowDone(!showDone); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.sub }}>Completed · {completed.length}</Text>
              <Ionicons name={showDone ? 'chevron-up' : 'chevron-down'} size={14} color={colors.sub} />
            </Pressable>
            {showDone && (
              <Group>
                {completed.map((t, i) => (
                  <Animated.View key={t.id} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(260)}>
                    {i > 0 && <Divider inset={52} />}
                    <TaskRow task={t} onMove={setMoving} />
                  </Animated.View>
                ))}
              </Group>
            )}
          </>
        )}
      </ScrollView>
      <Fab onPress={() => setAddOpen(true)} />
      <AddTaskSheet visible={addOpen} onClose={() => setAddOpen(false)} defaultSubjectId={subject ? subject.id : null} />
      {subject && <SubjectSheet visible={editOpen} subject={subject} onClose={() => setEditOpen(false)} />}
      <MoveSheet visible={!!moving} current={moving?.subjectId ?? null} onClose={() => setMoving(null)} onPick={(sid) => moving && moveTask(moving.id, sid)} />
    </View>
  );
}
