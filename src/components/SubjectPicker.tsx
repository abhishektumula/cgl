import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { useColors } from '../lib/useTheme';
import { Chip, Divider, Group, Sheet, tap } from './ui';

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Horizontal chip row to pick a subject (or General). */
export function SubjectChips({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const colors = useColors();
  const subjects = useStore((s) => s.subjects);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      <Chip label="General" active={value === null} color={colors.sub} onPress={() => onChange(null)} />
      {subjects.map((s) => (
        <Chip key={s.id} label={s.name} dot={s.color} active={value === s.id} color={s.color} onPress={() => onChange(s.id)} />
      ))}
    </ScrollView>
  );
}

/** Sheet listing General + subjects; used for "Move to…" and for picking a subject. */
export function MoveSheet({ visible, current, onClose, onPick, title = 'Move to' }: {
  visible: boolean; current: string | null; onClose: () => void; onPick: (id: string | null) => void; title?: string;
}) {
  const colors = useColors();
  const subjects = useStore((s) => s.subjects);
  const items = [{ id: null as string | null, name: 'General', color: colors.faint }, ...subjects];
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Group>
        {items.map((s, i) => (
          <View key={s.id ?? 'general'}>
            {i > 0 && <Divider inset={38} />}
            <Pressable
              onPress={() => { tap(); onPick(s.id); onClose(); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? colors.muted : colors.card })}
            >
              <Dot color={s.color} />
              <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{s.name}</Text>
              {current === s.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          </View>
        ))}
      </Group>
    </Sheet>
  );
}
