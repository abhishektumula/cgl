import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { DataSheet } from '../src/components/DataSheet';
import { DateField } from '../src/components/DateField';
import { Chip, Divider, Group, Header, layout, Row, SectionLabel, tap, KEYBOARD_DONE_ID } from '../src/components/ui';
import { formatMinutes } from '../src/lib/dates';
import { formatBytes, storageUsage } from '../src/lib/storage';
import { getState, resetAllData, updateSettings, useStore } from '../src/lib/store';
import { useColors } from '../src/lib/useTheme';

const EXAMS = ['SSC CGL', 'SSC CHSL', 'UPSC', 'Bank PO', 'RRB NTPC', 'State PSC'];

export default function Settings() {
  const colors = useColors();
  const settings = useStore((s) => s.settings);
  const [name, setName] = useState(settings.userName);
  const [exam, setExam] = useState(settings.examName);
  const usage = (() => { try { return storageUsage(); } catch { return null; } })();

  const inputStyle = { flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' as const, paddingVertical: 0 };
  const labelStyle = { fontSize: 16, color: colors.text };
  const switchProps = { trackColor: { true: colors.primary, false: colors.border }, thumbColor: '#fff' };

  const toggleReminder = async (on: boolean) => {
    await updateSettings({ dailyReminder: on });
    if (on && !getState().settings.dailyReminder) Alert.alert('Notifications are off', 'Allow notifications for this app in your phone settings.');
  };

  // Hidden data tools: tap the footer 5 times quickly (or long-press it).
  const [dataOpen, setDataOpen] = useState(false);
  const taps = useRef<number[]>([]);
  const footerTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      tap();
      setDataOpen(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header back title="Settings" />
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <SectionLabel>You</SectionLabel>
        <Group>
          <Row>
            <Text style={labelStyle}>Name</Text>
            <TextInput value={name} onChangeText={setName} onEndEditing={() => updateSettings({ userName: name.trim() })}
              placeholder="Optional" placeholderTextColor={colors.faint} style={inputStyle} keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID} />
          </Row>
          <Divider />
          <Row>
            <Text style={labelStyle}>Exam</Text>
            <TextInput value={exam} onChangeText={setExam} onEndEditing={() => updateSettings({ examName: exam.trim() })}
              placeholderTextColor={colors.faint} style={inputStyle} keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID} />
          </Row>
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <View style={layout.row}>
              {EXAMS.map((e) => <Chip key={e} label={e} active={settings.examName === e} onPress={() => { setExam(e); updateSettings({ examName: e }); }} />)}
            </View>
          </View>
          <Divider />
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={labelStyle}>Exam date</Text>
            <DateField value={settings.examDate} onChange={(d) => updateSettings({ examDate: d })} clearable placeholder="Not set" />
          </View>
          <Divider />
          <Row>
            <Text style={[labelStyle, { flex: 1 }]}>Show countdown</Text>
            <Switch value={settings.showCountdown} onValueChange={(v) => updateSettings({ showCountdown: v })} {...switchProps} />
          </Row>
        </Group>

        <SectionLabel>Daily goal</SectionLabel>
        <View style={layout.row}>
          {[120, 240, 360, 480].map((m) => <Chip key={m} label={formatMinutes(m)} active={settings.dailyGoalMin === m} onPress={() => updateSettings({ dailyGoalMin: m })} />)}
        </View>

        <SectionLabel>Appearance</SectionLabel>
        <View style={layout.row}>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={settings.theme === t} onPress={() => updateSettings({ theme: t })} />
          ))}
        </View>

        <SectionLabel>Reminders</SectionLabel>
        <Group>
          <Row>
            <Text style={[labelStyle, { flex: 1 }]}>Morning nudge</Text>
            <Switch value={settings.dailyReminder} onValueChange={toggleReminder} {...switchProps} />
          </Row>
          {settings.dailyReminder && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              <DateField mode="time" value={settings.dailyReminderTime} onChange={(t) => t && updateSettings({ dailyReminderTime: t })} />
            </View>
          )}
        </Group>

        <SectionLabel right={usage ? <Text style={{ fontSize: 12, color: colors.faint }}>{formatBytes(usage.dataBytes + usage.bytes)} on this phone</Text> : undefined}>
          Data
        </SectionLabel>
        <Group>
          <Row onPress={() => Alert.alert('Erase everything?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Erase', style: 'destructive', onPress: () => resetAllData() },
          ])}>
            <Text style={{ fontSize: 16, color: colors.danger }}>Erase all data</Text>
          </Row>
        </Group>
        <Pressable onPress={footerTap} onLongPress={() => { tap(); setDataOpen(true); }} delayLongPress={800}>
          <Text style={{ color: colors.faint, fontSize: 12, paddingHorizontal: 4, paddingVertical: 8 }}>Everything stays on this phone.</Text>
        </Pressable>
      </ScrollView>
      <DataSheet visible={dataOpen} onClose={() => setDataOpen(false)} />
    </View>
  );
}
