import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { formatDate, isOverdue } from '../lib/dates';
import { removeTask, toggleTask, useStore } from '../lib/store';
import { Task } from '../lib/types';
import { useColors } from '../lib/useTheme';
import { Dot } from './SubjectPicker';
import { SwipeRow } from './SwipeRow';
import { Checkbox, PriorityFlag, Row } from './ui';

/**
 * A task in a list. Checking it plays the checkbox animation first, then commits –
 * so the row has time to "land" before it moves to the completed section.
 */
export function TaskRow({ task, showSubject, onMove }: { task: Task; showSubject?: boolean; onMove?: (t: Task) => void }) {
  const colors = useColors();
  const subject = useStore((s) => s.subjects.find((x) => x.id === task.subjectId));
  const [localDone, setLocalDone] = useState(task.done);
  const [seenDone, setSeenDone] = useState(task.done);
  if (task.done !== seenDone) {
    // the store changed (e.g. completed elsewhere) → follow it
    setSeenDone(task.done);
    setLocalDone(task.done);
  }

  const toggle = () => {
    setLocalDone(!localDone);
    setTimeout(() => toggleTask(task.id), localDone ? 0 : 450);
  };

  const doneCount = task.subtasks.filter((s) => s.done).length;
  const meta: string[] = [];
  if (showSubject) meta.push(subject?.name ?? 'General');
  if (task.subtasks.length) meta.push(`${doneCount}/${task.subtasks.length}`);
  if (task.dueDate && !localDone) meta.push(isOverdue(task.dueDate) ? `from ${formatDate(task.dueDate)}` : formatDate(task.dueDate));

  const actions = [
    ...(onMove ? [{ icon: 'swap-horizontal' as const, label: 'Move', color: colors.calm, onPress: () => onMove(task) }] : []),
    { icon: 'trash-outline' as const, label: 'Delete', color: colors.danger, onPress: () => removeTask(task.id) },
  ];

  return (
    <SwipeRow actions={actions}>
      <Row onPress={() => router.push(`/task/${task.id}`)} style={{ alignItems: 'flex-start' }}>
        <View style={{ paddingTop: 1 }}>
          <Checkbox checked={localDone} onToggle={toggle} color={subject?.color ?? colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{ flexShrink: 1, fontSize: 16, color: localDone ? colors.faint : colors.text, textDecorationLine: localDone ? 'line-through' : 'none' }}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {!localDone && <PriorityFlag priority={task.priority} />}
          </View>
          {meta.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {showSubject && subject && <Dot color={subject.color} size={6} />}
              <Text style={{ fontSize: 13, color: colors.sub }} numberOfLines={1}>{meta.join('  ·  ')}</Text>
            </View>
          )}
        </View>
      </Row>
    </SwipeRow>
  );
}
