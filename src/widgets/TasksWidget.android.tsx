import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, height, paddingAll, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { TasksWidgetProps } from './types';

const TasksWidget = (p: TasksWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const items = p.items.slice(0, 5);
  return (
    <Column modifiers={[fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(14)]}>
      <Text color={c.primary} style={{ fontSize: 13, fontWeight: '600' }}>
        {p.doneToday > 0 ? `Up next · ✓ ${p.doneToday} done today` : `Up next · ${p.open} open`}
      </Text>
      <Spacer modifiers={[height(8)]} />
      {items.length === 0 ? (
        <Text color={c.text} style={{ fontSize: 15, fontWeight: '600' }}>All clear ✨</Text>
      ) : (
        items.map((t, i) => (
          <Column key={i}>
            <Row>
              <Box modifiers={[size(4, 30), background(t.color), cornerRadius(2)]} />
              <Spacer modifiers={[width(8)]} />
              <Column>
                <Text color={c.text} maxLines={1} style={{ fontSize: 14, fontWeight: '500' }}>{t.title}</Text>
                {!!t.sub && <Text color={t.due ? c.primary : c.sub} maxLines={1} style={{ fontSize: 11 }}>{t.sub}</Text>}
              </Column>
            </Row>
            <Spacer modifiers={[height(6)]} />
          </Column>
        ))
      )}
    </Column>
  );
};

export default createWidget('TasksWidget', TasksWidget);
