import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputInstance, View } from 'react-native';
import { addSubject, addTask, removeSubject, updateSubject, useStore } from '../lib/store';
import { priorityMeta, PRIORITY_ORDER, SUBJECT_COLORS } from '../lib/theme';
import { Priority, Subject } from '../lib/types';
import { useColors } from '../lib/useTheme';
import { DateField } from './DateField';
import { MoveSheet } from './SubjectPicker';
import { showToast } from '../lib/toast';
import { Button, Chip, Input, layout, Sheet, success, tap, KEYBOARD_DONE_ID } from './ui';

export function SubjectSheet({ visible, onClose, subject }: { visible: boolean; onClose: () => void; subject?: Subject }) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const subjectCount = useStore((s) => s.subjects.length);

  // reset the form each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(subject?.name ?? '');
      setColor(subject?.color ?? SUBJECT_COLORS[subjectCount % SUBJECT_COLORS.length]);
    }
  }

  const save = () => {
    if (!name.trim()) return;
    if (subject) updateSubject(subject.id, { name: name.trim(), color });
    else addSubject({ name: name.trim(), color, icon: 'book' });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={subject ? 'Edit subject' : 'New subject'}
      footer={
        <View style={{ gap: 4 }}>
          <Button title={subject ? 'Save' : 'Create'} onPress={save} disabled={!name.trim()} />
          {subject && <Button title="Delete subject" variant="danger" onPress={() => { onClose(); removeSubject(subject.id); }} />}
        </View>
      }
    >
      <Input value={name} onChangeText={setName} placeholder="Subject name" autoFocus={!subject} onSubmitEditing={save} returnKeyType="done" />
      <View style={[layout.row, { gap: 12 }]}>
        {SUBJECT_COLORS.map((c) => (
          <Pressable key={c} onPress={() => { tap(); setColor(c); }} hitSlop={4}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
            {color === c && <Ionicons name="checkmark" size={18} color="#fff" />}
          </Pressable>
        ))}
      </View>
      {!subject && <Text style={{ color: colors.faint, fontSize: 13 }}>e.g. Quant, Reasoning, English, GK</Text>}
    </Sheet>
  );
}

/** Create a task with its steps (subtasks) in one go. */
export function AddTaskSheet({ visible, onClose, defaultSubjectId = null }: {
  visible: boolean; onClose: () => void; defaultSubjectId?: string | null;
}) {
  const colors = useColors();
  const subjects = useStore((s) => s.subjects);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [step, setStep] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(defaultSubjectId);
  const [priority, setPriority] = useState<Priority>('none');
  const [dueDate, setDueDate] = useState<string | undefined>();
  const [pickSubject, setPickSubject] = useState(false);
  const stepRef = useRef<TextInputInstance>(null);
  const titleRef = useRef<TextInputInstance>(null);
  const [added, setAdded] = useState<string[]>([]);

  // reset the form each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTitle(''); setSteps([]); setStep(''); setPriority('none'); setDueDate(undefined); setSubjectId(defaultSubjectId); setAdded([]);
    }
  }

  const subject = subjects.find((s) => s.id === subjectId);
  const pm = priorityMeta(priority, colors);

  const addStep = () => {
    if (!step.trim()) return;
    setSteps((s) => [...s, step.trim()]);
    setStep('');
    setTimeout(() => stepRef.current?.focus(), 0);
  };

  const save = (another = false) => {
    if (!title.trim()) return;
    addTask({ title, subjectId, priority, dueDate, subtasks: step.trim() ? [...steps, step] : steps });
    success();
    if (another) {
      setAdded((a) => [...a, title.trim()]);
      setTitle(''); setSteps([]); setStep('');
      setTimeout(() => titleRef.current?.focus(), 0);
    } else {
      onClose();
      showToast(`Added to ${subject?.name ?? 'General'}`);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Add another" variant="secondary" style={{ flex: 1 }} onPress={() => save(true)} disabled={!title.trim()} />
          <Button title="Add" style={{ flex: 1 }} onPress={() => save()} disabled={!title.trim()} />
        </View>
      }
    >
      {added.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.sub }} numberOfLines={1}>
            {added.length === 1 ? `Added "${added[0]}"` : `Added ${added.length} tasks`}
          </Text>
        </View>
      )}
      <TextInput
        ref={titleRef}
        value={title}
        onChangeText={setTitle}
        placeholder="What do you want to study?"
        placeholderTextColor={colors.faint}
        keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
        autoFocus
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => stepRef.current?.focus()}
        style={{ fontSize: 22, fontWeight: '600', color: colors.text, paddingVertical: 4 }}
      />

      <View style={{ gap: 2 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.faint }} />
            <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{s}</Text>
            <Pressable hitSlop={10} onPress={() => setSteps((x) => x.filter((_, j) => j !== i))}>
              <Ionicons name="close" size={18} color={colors.faint} />
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <TextInput
            ref={stepRef}
            value={step}
            onChangeText={setStep}
            onSubmitEditing={addStep}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={steps.length ? 'Add another step' : 'Add steps (optional)'}
            placeholderTextColor={colors.faint}
            keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: 10 }}
          />
        </View>
      </View>

      <View style={layout.row}>
        <Chip label={subject?.name ?? 'General'} dot={subject?.color ?? colors.faint} active={!!subject} color={subject?.color} onPress={() => setPickSubject(true)} />
        <Chip
          label={priority === 'none' ? 'Priority' : pm.label}
          icon="flag"
          active={priority !== 'none'}
          color={pm.color}
          onPress={() => setPriority(PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(priority) + 1) % PRIORITY_ORDER.length])}
        />
        <DateField variant="chip" value={dueDate} onChange={setDueDate} clearable placeholder="Due date" />
      </View>
      <MoveSheet visible={pickSubject} current={subjectId} onClose={() => setPickSubject(false)} onPick={setSubjectId} title="Subject" />
    </Sheet>
  );
}

