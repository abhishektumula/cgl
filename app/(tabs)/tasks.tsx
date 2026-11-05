import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { AddTaskSheet, SubjectSheet } from '../../src/components/Sheets';
import { Dot } from '../../src/components/SubjectPicker';
import { SwipeRow } from '../../src/components/SwipeRow';
import { TaskRow } from '../../src/components/TaskRow';
import { Divider, EmptyState, Fab, Group, Header, IconButton, ProgressBar, Row, KEYBOARD_DONE_ID } from '../../src/components/ui';
import { removeSubject, useStore } from '../../src/lib/store';
import { Subject, Task } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

function FolderRow({ id, name, color, tasks }: { id: string; name: string; color: string; tasks: Task[] }) {
  const colors = useColors();
  const done = tasks.filter((t) => t.done).length;
  const left = tasks.length - done;
  return (
    <Row onPress={() => router.push(`/subject/${id}`)}>
      <Dot color={color} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 16, color: colors.text }} numberOfLines={1}>{name}</Text>
          <Text style={{ fontSize: 14, color: colors.sub }}>{tasks.length === 0 ? '' : left === 0 ? 'All done' : `${left} left`}</Text>
        </View>
        {tasks.length > 0 && <ProgressBar value={done / tasks.length} color={color} height={2} />}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Row>
  );
}

export default function Tasks() {
  const colors = useColors();
  const subjects = useStore((s) => s.subjects);
  const tasks = useStore((s) => s.tasks);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [subjectSheet, setSubjectSheet] = useState<{ open: boolean; subject?: Subject }>({ open: false });
  const [addOpen, setAddOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.subtasks.some((s) => s.title.toLowerCase().includes(q))
    );
  }, [query, tasks]);

  const done = tasks.filter((t) => t.done).length;

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Tasks"
        subtitle={tasks.length ? `${done} of ${tasks.length} done` : undefined}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon={searching ? 'close' : 'search'} color={colors.sub} onPress={() => { setSearching(!searching); setQuery(''); }} />
            <IconButton icon="folder-open-outline" color={colors.sub} onPress={() => setSubjectSheet({ open: true })} />
          </View>
        }
      />
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        {searching && (
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.faint}
            keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{ backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: colors.text }}
          />
        )}

        {searching && query.trim() ? (
          results.length ? (
            <Group>
              {results.map((t, i) => (
                <View key={t.id}>{i > 0 && <Divider inset={52} />}<TaskRow task={t} showSubject /></View>
              ))}
            </Group>
          ) : <EmptyState icon="search-outline" title="No matches" />
        ) : (
          <Group>
            <FolderRow id="general" name="General" color={colors.faint} tasks={tasks.filter((t) => t.subjectId === null)} />
            {subjects.map((s) => (
              <Animated.View key={s.id} entering={FadeIn} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(250)}>
                <Divider inset={42} />
                <SwipeRow
                  actions={[
                    { icon: 'create-outline', label: 'Edit', color: colors.calm, onPress: () => setSubjectSheet({ open: true, subject: s }) },
                    { icon: 'trash-outline', label: 'Delete', color: colors.danger, onPress: () => removeSubject(s.id) },
                  ]}
                >
                  <FolderRow id={s.id} name={s.name} color={s.color} tasks={tasks.filter((t) => t.subjectId === s.id)} />
                </SwipeRow>
              </Animated.View>
            ))}
            <Divider inset={42} />
            <Row onPress={() => setSubjectSheet({ open: true })}>
              <Ionicons name="add" size={18} color={colors.primary} style={{ marginLeft: -4 }} />
              <Text style={{ fontSize: 16, color: colors.primary }}>New subject</Text>
            </Row>
          </Group>
        )}
        {!searching && subjects.length > 0 && (
          <Text style={{ textAlign: 'center', color: colors.faint, fontSize: 12 }}>Swipe a subject left to edit or delete</Text>
        )}
      </ScrollView>
      <Fab onPress={() => setAddOpen(true)} />
      <SubjectSheet visible={subjectSheet.open} subject={subjectSheet.subject} onClose={() => setSubjectSheet({ open: false })} />
      <AddTaskSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}
