import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DateField } from '../src/components/DateField';
import { SwipeRow } from '../src/components/SwipeRow';
import { Button, Divider, EmptyState, Fab, Group, Header, Input, Row, Sheet } from '../src/components/ui';
import { formatDate, todayKey } from '../src/lib/dates';
import { removeMock, saveMock, useStore } from '../src/lib/store';
import { MockTest } from '../src/lib/types';
import { useColors } from '../src/lib/useTheme';

function MockSheet({ visible, onClose, mock }: { visible: boolean; onClose: () => void; mock?: MockTest }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayKey());
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('200');
  const [notes, setNotes] = useState('');

  // reset the form each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(mock?.name ?? '');
      setDate(mock?.date ?? todayKey());
      setScore(mock ? String(mock.score) : '');
      setTotal(mock ? String(mock.total) : '200');
      setNotes(mock?.notes ?? '');
    }
  }

  const s = parseFloat(score);
  const t = parseFloat(total);
  const valid = name.trim() && !isNaN(s) && !isNaN(t) && t > 0 && s <= t;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={mock ? 'Edit mock' : 'Log a mock'}
      footer={<Button title="Save" disabled={!valid} onPress={() => { saveMock({ id: mock?.id, name: name.trim(), date, score: s, total: t, notes }); onClose(); }} />}
    >
      <Input value={name} onChangeText={setName} placeholder="Test name" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Input value={score} onChangeText={setScore} keyboardType="decimal-pad" placeholder="Score" /></View>
        <View style={{ flex: 1 }}><Input value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="Out of" /></View>
      </View>
      <DateField value={date} onChange={(d) => d && setDate(d)} />
      <Input value={notes} onChangeText={setNotes} multiline placeholder="What to improve (optional)" />
    </Sheet>
  );
}

export default function Mocks() {
  const colors = useColors();
  const mocks = useStore((s) => s.mocks);
  const [sheet, setSheet] = useState<{ open: boolean; mock?: MockTest }>({ open: false });
  const sorted = useMemo(() => [...mocks].sort((a, b) => a.date.localeCompare(b.date)), [mocks]);
  const pct = (m: MockTest) => (m.score / m.total) * 100;
  const avg = sorted.length ? sorted.reduce((n, m) => n + pct(m), 0) / sorted.length : 0;
  const best = sorted.length ? Math.max(...sorted.map(pct)) : 0;
  const recent = sorted.slice(-12);

  return (
    <View style={{ flex: 1 }}>
      <Header back title="Mock tests" subtitle={sorted.length ? `Average ${avg.toFixed(0)}%  ·  Best ${best.toFixed(0)}%` : undefined} />
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 110 }}>
        {sorted.length === 0 ? (
          <EmptyState icon="bar-chart-outline" title="Log mocks to see your progress over time" />
        ) : (
          <>
            {recent.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8, marginTop: 4 }}>
                {recent.map((m) => (
                  <View key={m.id} style={{ flex: 1, height: Math.max(4, (pct(m) / 100) * 90), borderRadius: 4, backgroundColor: m === recent[recent.length - 1] ? colors.primary : colors.primarySoft }} />
                ))}
              </View>
            )}
            <Group>
              {[...sorted].reverse().map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <SwipeRow actions={[{ icon: 'trash-outline', label: 'Delete', color: colors.danger, onPress: () => removeMock(m.id) }]}>
                    <Row onPress={() => setSheet({ open: true, mock: m })}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, color: colors.text }} numberOfLines={1}>{m.name}</Text>
                        <Text style={{ fontSize: 13, color: colors.sub }}>{formatDate(m.date)}</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] }}>{m.score}<Text style={{ color: colors.faint }}>/{m.total}</Text></Text>
                    </Row>
                  </SwipeRow>
                </View>
              ))}
            </Group>
          </>
        )}
      </ScrollView>
      <Fab onPress={() => setSheet({ open: true })} />
      <MockSheet visible={sheet.open} mock={sheet.mock} onClose={() => setSheet({ open: false })} />
    </View>
  );
}
