import { Capsule, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { TasksWidgetProps } from './types';

/** "Up next" list of open tasks. */
const TasksWidget = (p: TasksWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const max = env.widgetFamily === 'systemSmall' ? 3 : env.widgetFamily === 'systemLarge' ? 9 : 4;
  const items = p.items.slice(0, max);
  const small = env.widgetFamily === 'systemSmall';
  return (
    <VStack alignment="leading" spacing={small ? 7 : 8} modifiers={[containerBackground(c.bg, 'widget'), widgetURL('prepplanner://tasks')]}>
      <HStack spacing={6}>
        <Image systemName="checklist" color={c.primary} size={13} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.text)]}>Up next</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(c.sub)]}>
          {p.doneToday > 0 ? `✓ ${p.doneToday} today` : `${p.open} open`}
        </Text>
      </HStack>
      {items.length === 0 ? (
        <VStack alignment="leading" spacing={4}>
          <Spacer />
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(c.text)]}>All clear ✨</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(c.sub)]}>Add a topic in the app</Text>
          <Spacer />
        </VStack>
      ) : (
        items.map((t, i) => (
          <HStack key={i} spacing={8}>
            <Capsule modifiers={[foregroundStyle(t.color), frame({ width: 4, height: small ? 26 : 30 })]} />
            <VStack alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: small ? 13 : 14, weight: 'medium' }), foregroundStyle(c.text), lineLimit(1)]}>{t.title}</Text>
              {!!t.sub && (
                <Text modifiers={[font({ size: 11 }), foregroundStyle(t.due ? c.primary : c.sub), lineLimit(1)]}>{t.sub}</Text>
              )}
            </VStack>
            <Spacer />
          </HStack>
        ))
      )}
      <Spacer />
    </VStack>
  );
};

export default createWidget('TasksWidget', TasksWidget);
