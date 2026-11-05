import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Alert, Platform, Share, Text, TextInput, View } from 'react-native';
import { exportData, formatBytes, pickBackup } from '../lib/storage';
import { exportJson, importData, parseBackup, useStore } from '../lib/store';
import { showToast } from '../lib/toast';
import { AppState } from '../lib/types';
import { useColors } from '../lib/useTheme';
import { Button, Divider, Group, Label, Row, Sheet, KEYBOARD_DONE_ID } from './ui';

/** Settings → Backup & transfer: copy / share / save the planner as JSON, or paste / open JSON from another phone. */
export function DataSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const counts = useStore((s) => `${s.subjects.length} subjects · ${s.tasks.length} tasks · ${s.sessions.length} sessions · ${s.resources.length} resources`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setText('');
  }

  const size = visible ? formatBytes(exportJson().length) : '';

  const copy = async () => {
    await Clipboard.setStringAsync(exportJson());
    showToast('Copied to clipboard');
  };

  const share = async () => {
    try {
      await Share.share({ message: exportJson(), title: 'Prep Planner data' });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? String(e));
    }
  };

  const saveFile = async () => {
    try {
      if (!(await exportData())) Alert.alert('Sharing is not available on this device');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? String(e));
    }
  };

  // read the clipboard and import straight away (big JSON is slow to show in a text box)
  const importClipboard = async () => {
    const clip = await Clipboard.getStringAsync();
    if (!clip.trim()) {
      showToast('Clipboard is empty');
      return;
    }
    try {
      confirmImport(parseBackup(clip));
    } catch (e: any) {
      Alert.alert('Can\'t import', e.message);
    }
  };

  const confirmImport = (data: Partial<AppState>) => {
    const summary = `${data.subjects?.length ?? 0} subjects, ${data.tasks?.length ?? 0} tasks`;
    Alert.alert('Replace current data?', `Import ${summary}. What's in the app now will be replaced.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            await importData(data);
            showToast('Data imported');
            onClose();
          } catch (e: any) {
            Alert.alert('Import failed', e?.message ?? String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const importText = () => {
    try {
      confirmImport(parseBackup(text));
    } catch (e: any) {
      Alert.alert('Can\'t import', e.message);
    }
  };

  const openFile = async () => {
    try {
      const data = await pickBackup<Partial<AppState>>();
      if (data) confirmImport(parseBackup(JSON.stringify(data)));
    } catch (e: any) {
      Alert.alert('Can\'t import', e?.message ?? String(e));
    }
  };

  const rowText = { fontSize: 16, color: colors.text, flex: 1 } as const;

  return (
    <Sheet visible={visible} onClose={onClose} title="Backup & transfer">
      <View style={{ gap: 8 }}>
        <Label>Send to another phone</Label>
        <Group>
          <Row onPress={copy}><Text style={rowText}>Copy JSON</Text><Text style={{ color: colors.faint, fontSize: 13 }}>{size}</Text></Row>
          <Divider />
          <Row onPress={share}><Text style={rowText}>Share JSON as text</Text></Row>
          <Divider />
          <Row onPress={saveFile}><Text style={rowText}>Save as .json file</Text></Row>
        </Group>
        <Text style={{ color: colors.faint, fontSize: 12, paddingHorizontal: 4 }}>{`${counts}. Attached files aren't included.`}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Bring data in</Label>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste JSON here"
          placeholderTextColor={colors.faint}
          keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.muted, borderRadius: 12, padding: 14, minHeight: 110, maxHeight: 200,
            fontSize: 13, color: colors.text, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          }}
        />
        {!!text.trim() && <Button title="Import" onPress={importText} disabled={busy} />}
        <Group>
          <Row onPress={busy ? undefined : importClipboard}><Text style={rowText}>Import from clipboard</Text></Row>
          <Divider />
          <Row onPress={busy ? undefined : openFile}><Text style={rowText}>Open a .json file</Text></Row>
        </Group>
        <Text style={{ color: colors.faint, fontSize: 12, paddingHorizontal: 4 }}>Or paste it below</Text>
      </View>
    </Sheet>
  );
}
