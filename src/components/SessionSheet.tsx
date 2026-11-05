import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { formatMinutes } from '../lib/dates';
import { removeSession, saveSession, useStore } from '../lib/store';
import { Session } from '../lib/types';
import { DateField } from './DateField';
import { SubjectChips } from './SubjectPicker';
import { Button, Chip, Input, Label, layout, Sheet, success } from './ui';

const DURATIONS = [30, 45, 60, 90, 120];
const REMINDERS: { label: string; value: number }[] = [
  { label: 'Off', value: -1 },
  { label: 'At start', value: 0 },
  { label: '10 min before', value: 10 },
  { label: '30 min before', value: 30 },
];

export function SessionSheet({ visible, onClose, session, defaultDate, defaultTaskId }: {
  visible: boolean; onClose: () => void; session?: Session; defaultDate: string; defaultTaskId?: string;
}) {
  const tasks = useStore((s) => s.tasks);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [reminder, setReminder] = useState(10);
  const [saving, setSaving] = useState(false);

  // reset the form each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const linked = tasks.find((t) => t.id === (session?.taskId ?? defaultTaskId));
      setTitle(session?.title ?? linked?.title ?? '');
      setSubjectId(session ? session.subjectId : linked?.subjectId ?? null);
      setTaskId(session?.taskId ?? linked?.id ?? null);
      setDate(session?.date ?? defaultDate);
      const now = new Date();
      setTime(session?.time ?? `${String(Math.min(23, now.getHours() + 1)).padStart(2, '0')}:00`);
      setDuration(session?.durationMin ?? 60);
      setReminder(session?.reminderMin ?? 10);
    }
  }

  const subjectTasks = tasks.filter((t) => !t.done && t.subjectId === subjectId);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await saveSession({
        id: session?.id, title: title.trim(), subjectId, taskId, date, time, durationMin: duration, reminderMin: reminder,
        notes: session?.notes ?? '',
      });
      success();
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={session ? 'Edit session' : 'New session'}
      footer={
        <View style={{ gap: 4 }}>
          <Button title={session ? 'Save' : 'Add'} onPress={save} disabled={!title.trim() || saving} />
          {session && <Button title="Remove" variant="danger" onPress={() => { onClose(); removeSession(session.id); }} />}
        </View>
      }
    >
      <Input value={title} onChangeText={setTitle} placeholder="What will you study?" />
      <SubjectChips value={subjectId} onChange={(id) => { setSubjectId(id); setTaskId(null); }} />
      {subjectTasks.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {subjectTasks.map((t) => (
            <Chip
              key={t.id} label={t.title} icon="link" active={taskId === t.id}
              onPress={() => { setTaskId(taskId === t.id ? null : t.id); if (!title.trim()) setTitle(t.title); }}
            />
          ))}
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.2 }}><DateField value={date} onChange={(d) => d && setDate(d)} /></View>
        <View style={{ flex: 1 }}><DateField mode="time" value={time} onChange={(t) => t && setTime(t)} /></View>
      </View>
      <View style={{ gap: 8 }}>
        <Label>Duration</Label>
        <View style={layout.row}>
          {DURATIONS.map((d) => <Chip key={d} label={formatMinutes(d)} active={duration === d} onPress={() => setDuration(d)} />)}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Label>Reminder</Label>
        <View style={layout.row}>
          {REMINDERS.map((r) => <Chip key={r.value} label={r.label} active={reminder === r.value} onPress={() => setReminder(r.value)} />)}
        </View>
      </View>
    </Sheet>
  );
}
