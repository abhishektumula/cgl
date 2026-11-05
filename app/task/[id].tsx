import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, type TextInputInstance, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { DateField } from '../../src/components/DateField';
import { MoveSheet } from '../../src/components/SubjectPicker';
import { SwipeRow } from '../../src/components/SwipeRow';
import {
  Checkbox, Chip, Divider, Group, Header, IconButton, layout, PriorityPicker, ProgressBar, Sheet, success, KEYBOARD_DONE_ID,
} from '../../src/components/ui';
import { formatDate } from '../../src/lib/dates';
import { showToast } from '../../src/lib/toast';
import {
  addSubtask, moveTask, planRevisions, removeSubtask, removeTask, taskProgress, toggleSubtask, toggleTask,
  updateSubtask, updateTask, useStore,
} from '../../src/lib/store';
import { priorityMeta, PRIORITY_ORDER } from '../../src/lib/theme';
import { Subtask } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

function StepRow({ taskId, sub, color, onMore }: { taskId: string; sub: Subtask; color: string; onMore: () => void }) {
  const colors = useColors();
  const [title, setTitle] = useState(sub.title);
  const [seenTitle, setSeenTitle] = useState(sub.title);
  if (sub.title !== seenTitle) {
    // changed from outside (not by typing here) → follow the store
    setSeenTitle(sub.title);
    if (sub.title !== title.trim()) setTitle(sub.title);
  }
  const meta = [sub.priority !== 'none' ? priorityMeta(sub.priority, colors).label : null, sub.dueDate ? formatDate(sub.dueDate) : null].filter(Boolean);
  return (
    <SwipeRow actions={[
      { icon: 'options-outline', label: 'Details', color: colors.calm, onPress: onMore },
      { icon: 'trash-outline', label: 'Delete', color: colors.danger, onPress: () => removeSubtask(taskId, sub.id) },
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card }}>
        <Checkbox checked={sub.done} onToggle={() => toggleSubtask(taskId, sub.id)} color={color} size={20} />
        <View style={{ flex: 1 }}>
          <TextInput
            value={title}
            onChangeText={(v) => { setTitle(v); if (v.trim()) updateSubtask(taskId, sub.id, { title: v.trim() }); }}
            onEndEditing={() => { if (!title.trim()) setTitle(sub.title); }}
            keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{ fontSize: 16, paddingVertical: 2, color: sub.done ? colors.faint : colors.text, textDecorationLine: sub.done ? 'line-through' : 'none' }}
          />
          {meta.length > 0 && <Text style={{ fontSize: 12, color: colors.sub }}>{meta.join('  ·  ')}</Text>}
        </View>
      </View>
    </SwipeRow>
  );
}

export default function TaskScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const subject = useStore((s) => s.subjects.find((x) => x.id === task?.subjectId));
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [newSub, setNewSub] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const wasDone = useRef(task?.done ?? false);
  const stepRef = useRef<TextInputInstance>(null);

  // a small "well done" when the whole task gets completed (e.g. by finishing the last step)
  const isDone = task?.done ?? false;
  useEffect(() => {
    if (isDone && !wasDone.current) {
      success();
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1800);
      wasDone.current = true;
      return () => clearTimeout(t);
    }
    wasDone.current = isDone;
  }, [isDone]);

  if (!task) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const progress = taskProgress(task);
  const accent = subject?.color ?? colors.primary;
  const sub = task.subtasks.find((s) => s.id === editingSub) ?? null;
  const pm = priorityMeta(task.priority, colors);

  const addSub = () => {
    if (!newSub.trim()) return;
    addSubtask(task.id, newSub);
    setNewSub('');
    setTimeout(() => stepRef.current?.focus(), 0);
  };

  const more = () => {
    const options = ['Schedule a session', 'Plan revisions', 'Move to…', 'Delete', 'Cancel'];
    const run = (i: number) => {
      if (i === 0) router.push({ pathname: '/plan', params: { newForTask: task.id } });
      if (i === 1) planRevisions(task.id).then((n) => showToast(`${n} revision sessions added to Plan`));
      if (i === 2) setMoveOpen(true);
      if (i === 3) { router.back(); setTimeout(() => removeTask(task.id), 250); }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, destructiveButtonIndex: 3, cancelButtonIndex: 4 }, run);
    } else {
      Alert.alert(task.title, undefined, [
        { text: options[0], onPress: () => run(0) },
        { text: options[1], onPress: () => run(1) },
        { text: options[2], onPress: () => run(2) },
        { text: options[3], style: 'destructive', onPress: () => run(3) },
      ], { cancelable: true });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header back title="" right={<IconButton icon="ellipsis-horizontal" color={colors.sub} onPress={more} />} />
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ paddingTop: 6 }}>
            <Checkbox checked={task.done} onToggle={() => toggleTask(task.id)} color={accent} size={26} />
          </View>
          <TextInput
            value={title}
            onChangeText={(v) => { setTitle(v.replace(/\n/g, ' ')); if (v.trim()) updateTask(task.id, { title: v.replace(/\n/g, ' ').trim() }); }}
            onEndEditing={() => { if (!title.trim()) setTitle(task.title); }}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{ flex: 1, fontSize: 26, fontWeight: '700', color: task.done ? colors.sub : colors.text, letterSpacing: -0.3 }}
          />
        </View>

        {celebrate && (
          <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Done. Nice work.</Text>
          </Animated.View>
        )}

        <View style={layout.row}>
          <Chip label={subject?.name ?? 'General'} dot={subject?.color ?? colors.faint} active={!!subject} color={subject?.color} onPress={() => setMoveOpen(true)} />
          <Chip
            label={task.priority === 'none' ? 'Priority' : pm.label}
            icon="flag"
            active={task.priority !== 'none'}
            color={pm.color}
            onPress={() => updateTask(task.id, { priority: PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(task.priority) + 1) % PRIORITY_ORDER.length] })}
          />
          <DateField variant="chip" value={task.dueDate} onChange={(d) => updateTask(task.id, { dueDate: d })} clearable placeholder="Due date" />
        </View>

        <View style={{ gap: 10 }}>
          {task.subtasks.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
              <View style={{ flex: 1 }}><ProgressBar value={progress} color={accent} /></View>
              <Text style={{ fontSize: 13, color: colors.sub }}>{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</Text>
            </View>
          )}
          <Group>
            {task.subtasks.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider inset={48} />}
                <StepRow taskId={task.id} sub={s} color={accent} onMore={() => setEditingSub(s.id)} />
              </View>
            ))}
            {task.subtasks.length > 0 && <Divider inset={48} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 4 }}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <TextInput
                ref={stepRef}
                value={newSub}
                onChangeText={setNewSub}
                onSubmitEditing={addSub}
                submitBehavior="submit"
                returnKeyType="done"
                placeholder="Add a step"
                placeholderTextColor={colors.faint}
                keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
                style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: 10 }}
              />
            </View>
          </Group>
        </View>

        <TextInput
          value={notes}
          onChangeText={(v) => { setNotes(v); updateTask(task.id, { notes: v }); }}
          multiline
          placeholder="Notes"
          placeholderTextColor={colors.faint}
          keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
          style={{ fontSize: 16, color: colors.text, minHeight: 100, textAlignVertical: 'top', lineHeight: 22 }}
        />
      </ScrollView>

      <MoveSheet visible={moveOpen} current={task.subjectId} onClose={() => setMoveOpen(false)} onPick={(sid) => moveTask(task.id, sid)} />
      <Sheet visible={!!sub} onClose={() => setEditingSub(null)} title={sub?.title}>
        {sub && (
          <>
            <PriorityPicker value={sub.priority} onChange={(p) => updateSubtask(task.id, sub.id, { priority: p })} />
            <DateField value={sub.dueDate} onChange={(d) => updateSubtask(task.id, sub.id, { dueDate: d })} clearable placeholder="No due date" />
          </>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

