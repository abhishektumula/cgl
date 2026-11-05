import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Dot, SubjectChips } from '../../src/components/SubjectPicker';
import { SwipeRow } from '../../src/components/SwipeRow';
import { Button, Chip, Divider, EmptyState, Fab, Group, Header, IconButton, Input, layout, Row, Sheet, KEYBOARD_DONE_ID } from '../../src/components/ui';
import { deleteStoredFile, formatBytes, openStoredFile, pickAndStoreFile } from '../../src/lib/storage';
import { removeResource, saveResource, toggleFavorite, useStore } from '../../src/lib/store';
import { RESOURCE_TYPES } from '../../src/lib/theme';
import { Attachment, Resource, ResourceType } from '../../src/lib/types';
import { useColors } from '../../src/lib/useTheme';

const guessType = (url: string): ResourceType | null => {
  const u = url.toLowerCase();
  if (u.includes('youtube.com/playlist') || u.includes('list=')) return 'playlist';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('t.me/') || u.includes('telegram')) return 'telegram';
  if (u.endsWith('.pdf') || u.includes('drive.google.com')) return 'pdf';
  if (u.startsWith('http') || u.includes('.')) return 'website';
  return null;
};

const normalizeUrl = (u: string) => (u && !/^[a-z]+:\/\//i.test(u) ? `https://${u}` : u);

function ResourceSheet({ visible, onClose, resource }: { visible: boolean; onClose: () => void; resource?: Resource }) {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ResourceType>('youtube');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<Attachment | undefined>();
  const [typeTouched, setTypeTouched] = useState(false);

  // reset the form each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTitle(resource?.title ?? '');
      setUrl(resource?.url ?? '');
      setType(resource?.type ?? 'youtube');
      setSubjectId(resource?.subjectId ?? null);
      setNotes(resource?.notes ?? '');
      setFile(resource?.file);
      setTypeTouched(!!resource);
    }
  }

  const discardNewFile = () => {
    if (file && file.fileName !== resource?.file?.fileName) deleteStoredFile(file.fileName);
  };
  const cancel = () => { discardNewFile(); onClose(); };

  const onUrl = (v: string) => {
    setUrl(v);
    const g = guessType(v);
    if (g && !typeTouched) setType(g);
  };

  const attach = async () => {
    try {
      const f = await pickAndStoreFile();
      if (!f) return;
      discardNewFile();
      setFile(f);
      if (!title.trim()) setTitle(f.originalName.replace(/\.[^.]+$/, ''));
      if (!typeTouched) setType(f.mimeType === 'application/pdf' ? 'pdf' : 'file');
    } catch (e: any) {
      Alert.alert('Could not attach file', e?.message ?? String(e));
    }
  };

  const valid = title.trim() && (url.trim() || file);
  const save = () => {
    if (!valid) return;
    saveResource({ id: resource?.id, title: title.trim(), url: url.trim() ? normalizeUrl(url.trim()) : '', type, subjectId, notes, file });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={cancel}
      title={resource ? 'Edit' : 'Save a resource'}
      footer={<Button title="Save" onPress={save} disabled={!valid} />}
    >
      {file ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.muted, padding: 12, borderRadius: 12 }}>
          <Ionicons name="document-outline" size={20} color={colors.sub} />
          <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{file.originalName}</Text>
          <IconButton icon="close" size={18} color={colors.faint} onPress={() => { discardNewFile(); setFile(undefined); }} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Input value={url} onChangeText={onUrl} placeholder="Paste a link" autoCapitalize="none" keyboardType="url" autoCorrect={false} />
          <Pressable onPress={attach} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
            <Ionicons name="attach" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>or attach a file from your phone</Text>
          </Pressable>
        </View>
      )}
      <Input value={title} onChangeText={setTitle} placeholder="Title" />
      <View style={layout.row}>
        {(Object.keys(RESOURCE_TYPES) as ResourceType[]).map((t) => (
          <Chip key={t} label={RESOURCE_TYPES[t].label} active={type === t} onPress={() => { setType(t); setTypeTouched(true); }} />
        ))}
      </View>
      <SubjectChips value={subjectId} onChange={setSubjectId} />
      <Input value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
    </Sheet>
  );
}

export default function Resources() {
  const colors = useColors();
  const resources = useStore((s) => s.resources);
  const subjects = useStore((s) => s.subjects);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; resource?: Resource }>({ open: false });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources
      .filter((r) => filter === 'all' || r.subjectId === (filter === 'general' ? null : filter))
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt);
  }, [resources, filter, query]);

  const open = async (r: Resource) => {
    try {
      if (r.file) await openStoredFile(r.file.fileName, r.file.mimeType);
      else await Linking.openURL(r.url);
    } catch (e: any) {
      Alert.alert('Could not open', e?.message ?? 'Check the link and try again.');
    }
  };

  const usedSubjects = subjects.filter((s) => resources.some((r) => r.subjectId === s.id));

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Resources"
        right={<IconButton icon={searching ? 'close' : 'search'} color={colors.sub} onPress={() => { setSearching(!searching); setQuery(''); }} />}
      />
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        {searching && (
          <TextInput
            autoFocus value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.faint}
            keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{ backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: colors.text }}
          />
        )}
        {resources.length > 0 && (usedSubjects.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            {usedSubjects.map((s) => <Chip key={s.id} label={s.name} dot={s.color} color={s.color} active={filter === s.id} onPress={() => setFilter(s.id)} />)}
            {resources.some((r) => r.subjectId === null) && <Chip label="General" active={filter === 'general'} onPress={() => setFilter('general')} />}
          </ScrollView>
        )}

        {list.length === 0 ? (
          <EmptyState icon="bookmark-outline" title={resources.length ? 'Nothing here' : 'Save playlists, PDFs and links here'} />
        ) : (
          <Group>
            {list.map((r, i) => {
              const sub = subjects.find((s) => s.id === r.subjectId);
              const subtitle = r.file
                ? `${r.file.originalName}${r.file.size ? ' · ' + formatBytes(r.file.size) : ''}`
                : r.url.replace(/^https?:\/\/(www\.)?/, '');
              return (
                <View key={r.id}>
                  {i > 0 && <Divider inset={52} />}
                  <SwipeRow actions={[
                    { icon: 'create-outline', label: 'Edit', color: colors.calm, onPress: () => setSheet({ open: true, resource: r }) },
                    { icon: 'trash-outline', label: 'Delete', color: colors.danger, onPress: () => removeResource(r.id) },
                  ]}>
                    <Row onPress={() => open(r)} onLongPress={() => setSheet({ open: true, resource: r })}>
                      <Ionicons name={(r.file ? 'document-outline' : RESOURCE_TYPES[r.type].icon) as any} size={22} color={colors.sub} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, color: colors.text }} numberOfLines={1}>{r.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {sub && <Dot color={sub.color} size={6} />}
                          <Text style={{ flex: 1, fontSize: 13, color: colors.faint }} numberOfLines={1}>{subtitle}</Text>
                        </View>
                      </View>
                      <Pressable hitSlop={10} onPress={() => toggleFavorite(r.id)}>
                        <Ionicons name={r.favorite ? 'star' : 'star-outline'} size={18} color={r.favorite ? colors.warning : colors.faint} />
                      </Pressable>
                    </Row>
                  </SwipeRow>
                </View>
              );
            })}
          </Group>
        )}
      </ScrollView>
      <Fab onPress={() => setSheet({ open: true })} />
      <ResourceSheet visible={sheet.open} resource={sheet.resource} onClose={() => setSheet({ open: false })} />
    </View>
  );
}
