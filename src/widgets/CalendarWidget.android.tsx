import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, height, paddingAll, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { CalendarWidgetProps } from './types';

const CalendarWidget = (p: CalendarWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const items = p.items.slice(0, 4);
  return (
    <Column modifiers={[fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(14)]}>
      <Row>
        <Text color={c.text} style={{ fontSize: 30, fontWeight: '700' }}>{String(p.day)}</Text>
        <Spacer modifiers={[width(8)]} />
        <Column>
          <Text color={c.primary} style={{ fontSize: 12, fontWeight: '700' }}>{p.weekday.toUpperCase()}</Text>
          <Text color={c.sub} style={{ fontSize: 12 }}>{p.month}</Text>
        </Column>
      </Row>
      <Spacer modifiers={[height(8)]} />
      {items.length === 0 ? (
        <Text color={c.sub} style={{ fontSize: 13 }}>{p.note || 'Nothing planned today'}</Text>
      ) : (
        items.map((s, i) => (
          <Column key={i}>
            <Row>
              <Box modifiers={[size(4, 28), background(s.color), cornerRadius(2)]} />
              <Spacer modifiers={[width(8)]} />
              <Column>
                <Text color={s.done ? c.sub : c.text} maxLines={1} style={{ fontSize: 13, fontWeight: '500', textDecoration: s.done ? 'lineThrough' : 'none' }}>{s.title}</Text>
                <Text color={c.sub} style={{ fontSize: 11 }}>{s.time}</Text>
              </Column>
            </Row>
            <Spacer modifiers={[height(6)]} />
          </Column>
        ))
      )}
    </Column>
  );
};

export default createWidget('CalendarWidget', CalendarWidget);
