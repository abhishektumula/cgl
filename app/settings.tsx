import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { APP_ICONS, AppIconName, canChangeAppIcon, currentAppIcon, setAppIcon } from '../src/lib/appIcon';
import { DataSheet } from '../src/components/DataSheet';
import { DateField } from '../src/components/DateField';
import { Chip, Divider, Group, Header, layout, Row, SectionLabel, KEYBOARD_DONE_ID, tap } from '../src/components/ui';
import { formatMinutes } from '../src/lib/dates';
import { formatBytes, storageUsage } from '../src/lib/storage';
import { getState, resetAllData, updateSettings, useStore } from '../src/lib/store';
import { needText, rewardFor } from '../src/lib/rewards';
import { PALETTE_ORDER, PALETTES } from '../src/lib/theme';
import { showToast } from '../src/lib/toast';
import { useUnlocked } from '../src/lib/useStats';
import { useColors } from '../src/lib/useTheme';

function AppIconPicker() {
  const colors = useColors();
  const [available] = useState(canChangeAppIcon);
  const [icon, setIcon] = useState<AppIconName>(currentAppIcon);
  const choose = async (id: AppIconName) => {
    tap();
    if (!available) {
      Alert.alert('Not available here', 'App icons can be changed in the installed app, not in Expo Go.');
      return;
    }
    if (id === icon) return;
    if (await setAppIcon(id)) setIcon(id);
  };
  return (
    <Group>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 14 }}>
        {APP_ICONS.map((a) => {
          const active = available && icon === a.id;
          return (
            <Pressable key={a.id} accessibilityLabel={`${a.label} app icon`} onPress={() => choose(a.id)} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ padding: 3, borderRadius: 22, borderWidth: 2, borderColor: active ? colors.primary : 'transparent' }}>
                <Image source={a.preview} style={{ width: 58, height: 58, borderRadius: 16 }} />
              </View>
              <Text style={{ fontSize: 12, color: active ? colors.text : colors.sub, fontWeight: active ? '600' : '400' }}>{a.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Group>
  );
}

const EXAMS =['SSC CGL', 'SSC CHSL', 'UPSC', 'Bank PO', 'RRB NTPC', 'State PSC'];

export default function Settings() {
  const colors = useColors();
  const settings = useStore((s) => s.settings);
  const unlocked = useUnlocked();
  const [name, setName] = useState(settings.userName);
  const [exam, setExam] = useState(settings.examName);
  // reads the files folder – do it once, not on every keystroke
  const [usage] = useState(() => { try { return storageUsage(); } catch { return null; } });
  // follow the store if it changes elsewhere (import / erase)
  const [seen, setSeen] = useState({ name: settings.userName, exam: settings.examName });
  if (seen.name !== settings.userName || seen.exam !== settings.examName) {
    setSeen({ name: settings.userName, exam: settings.examName });
    setName(settings.userName);
    setExam(settings.examName);
  }

  const inputStyle = { flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' as const, paddingVertical: 0 };
  const labelStyle = { fontSize: 16, color: colors.text };
  const switchProps = { trackColor: { true: colors.primary, false: colors.border }, thumbColor: '#fff' };

  const toggleReminder = async (on: boolean) => {
    await updateSettings({ dailyReminder: on });
    if (on && !getState().settings.dailyReminder) Alert.alert('Notifications are off', 'Allow notifications for this app in your phone settings.');
  };

  const [dataOpen, setDataOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Header back title="Settings" />
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <SectionLabel>Theme</SectionLabel>
        <Group>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 14, paddingHorizontal: 8 }}>
            {PALETTE_ORDER.map((id) => {
              const p = PALETTES[id][colors.dark ? 'dark' : 'light'];
              const active = settings.palette === id;
              const open = unlocked('palette', id) || active;
              return (
                <Pressable
                  key={id}
                  accessibilityLabel={`${PALETTES[id].name} theme${open ? '' : ', locked'}`}
                  onPress={() => {
                    tap();
                    if (open) { updateSettings({ palette: id }); return; }
                    const r = rewardFor('palette', id);
                    showToast(`🔒 ${PALETTES[id].name} – ${r ? needText(r.need) : 'locked'}`);
                  }}
                  style={{ width: '33.33%', alignItems: 'center', gap: 6, paddingVertical: 8 }}
                >
                  <View style={{
                    width: 52, height: 52, borderRadius: 26, padding: 3,
                    borderWidth: 2, borderColor: active ? p.primary : 'transparent',
                  }}>
                    <View style={{ flex: 1, borderRadius: 23, overflow: 'hidden', backgroundColor: p.bg, flexDirection: 'row', opacity: open ? 1 : 0.3 }}>
                      <View style={{ flex: 1, backgroundColor: p.primary }} />
                      <View style={{ flex: 1, backgroundColor: p.calm }} />
                    </View>
                    {!open && (
                      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed" size={16} color={colors.sub} />
                      </View>
                    )}
                    {active && (
                      <View style={{ position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card }}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: active ? colors.text : open ? colors.sub : colors.faint, fontWeight: active ? '600' : '400' }}>{PALETTES[id].name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Group>
        <View style={layout.row}>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Chip key={t} icon={t === 'system' ? 'phone-portrait-outline' : t === 'light' ? 'sunny-outline' : 'moon-outline'}
              label={t === 'system' ? 'Auto' : t[0].toUpperCase() + t.slice(1)} active={settings.theme === t} onPress={() => updateSettings({ theme: t })} />
          ))}
        </View>

        <SectionLabel>App icon</SectionLabel>
        <AppIconPicker />

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
          <Row onPress={() => setDataOpen(true)}>
            <Ionicons name="swap-vertical-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>Backup & transfer</Text>
              <Text style={{ fontSize: 13, color: colors.sub }}>Copy, paste or share your data as JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </Row>
          <Divider />
          <Row onPress={() => Alert.alert('Erase everything?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Erase', style: 'destructive', onPress: () => resetAllData() },
          ])}>
            <Text style={{ fontSize: 16, color: colors.danger }}>Erase all data</Text>
          </Row>
        </Group>
        <Text style={{ color: colors.faint, fontSize: 12, paddingHorizontal: 4, paddingVertical: 8 }}>Everything stays on this phone.</Text>
      </ScrollView>
      <DataSheet visible={dataOpen} onClose={() => setDataOpen(false)} />
    </View>
  );
}
