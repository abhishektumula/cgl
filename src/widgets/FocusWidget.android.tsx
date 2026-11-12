import { Box, Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { FocusWidgetProps } from './types';

/** Android: no ticking clock in widgets, so show when the round ends plus today's class / study split. */
const FocusWidget = (p: FocusWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const live = p.state !== 'idle' && p.endAt > 0;
  const endTime = () => {
    const d = new Date(p.endAt);
    const h = d.getHours();
    return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const mins = Math.max(1, Math.ceil(p.leftMs / 60000));
  return (
    <Column modifiers={[fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(14)]}>
      <Text color={live ? p.color : c.primary} style={{ fontSize: 13, fontWeight: '600' }}>
        {live ? (p.state === 'paused' ? `${p.label} · paused` : `${p.label} · running`) : p.streak > 0 ? `🔥 ${p.streak}-day streak` : 'Focus'}
      </Text>
      <Spacer modifiers={[height(6)]} />
      {live ? (
        <Column>
          <Text color={c.text} style={{ fontSize: 26, fontWeight: '700' }}>{p.state === 'paused' ? `${mins} min left` : `Ends ${endTime()}`}</Text>
          <Spacer modifiers={[height(8)]} />
          <LinearProgressIndicator
            progress={Math.max(0, Math.min(1, 1 - p.leftMs / Math.max(1, p.endAt - p.startAt)))}
            color={p.color}
            trackColor={c.muted}
            modifiers={[fillMaxWidth(), height(6)]}
          />
        </Column>
      ) : (
        <Column>
          <Text color={c.text} style={{ fontSize: 28, fontWeight: '700' }}>{p.total}</Text>
          <Text color={c.sub} style={{ fontSize: 12 }}>{`focused today · ${Math.round(p.goal * 100)}% of goal`}</Text>
          <Spacer modifiers={[height(8)]} />
          <LinearProgressIndicator progress={p.studyShare} color={c.study} trackColor={p.total === '0m' ? c.muted : c.cls} modifiers={[fillMaxWidth(), height(6)]} />
        </Column>
      )}
      <Spacer modifiers={[height(8)]} />
      <Row>
        <Box modifiers={[size(8, 8), background(c.study), cornerRadius(4)]} />
        <Spacer modifiers={[width(5)]} />
        <Text color={c.sub} style={{ fontSize: 12 }}>{`Study ${p.study}`}</Text>
        <Spacer modifiers={[width(12)]} />
        <Box modifiers={[size(8, 8), background(c.cls), cornerRadius(4)]} />
        <Spacer modifiers={[width(5)]} />
        <Text color={c.sub} style={{ fontSize: 12 }}>{`Class ${p.cls}`}</Text>
      </Row>
    </Column>
  );
};

export default createWidget('FocusWidget', FocusWidget);
