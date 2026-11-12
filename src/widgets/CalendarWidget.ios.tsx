import { Capsule, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, strikethrough, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { CalendarWidgetProps } from './types';

/** Today's date and planned sessions. */
const CalendarWidget = (p: CalendarWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const small = env.widgetFamily === 'systemSmall';
  const max = small ? 2 : env.widgetFamily === 'systemLarge' ? 8 : 3;
  const items = p.items.slice(0, max);

  const date = (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(c.primary)]}>{p.weekday.toUpperCase()}</Text>
      <Text modifiers={[font({ size: small ? 34 : 40, weight: 'bold', design: 'rounded' }), foregroundStyle(c.text)]}>{String(p.day)}</Text>
      {!small && <Text modifiers={[font({ size: 12 }), foregroundStyle(c.sub)]}>{p.month}</Text>}
    </VStack>
  );

  const list = (
    <VStack alignment="leading" spacing={7}>
      {items.length === 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(c.sub)]}>Nothing planned</Text>
      ) : (
        items.map((s, i) => (
          <HStack key={i} spacing={7}>
            <Capsule modifiers={[foregroundStyle(s.color), frame({ width: 4, height: 28 })]} />
            <VStack alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(s.done ? c.sub : c.text), lineLimit(1), ...(s.done ? [strikethrough({ isActive: true, pattern: 'solid' })] : [])]}>{s.title}</Text>
              <Text modifiers={[font({ size: 11 }), foregroundStyle(c.sub)]}>{s.time}</Text>
            </VStack>
            <Spacer />
          </HStack>
        ))
      )}
      {p.items.length > items.length && (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(c.sub)]}>+{p.items.length - items.length} more</Text>
      )}
    </VStack>
  );

  if (small) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[containerBackground(c.bg, 'widget'), widgetURL('prepplanner://plan')]}>
        {date}
        <Spacer />
        {list}
      </VStack>
    );
  }
  return (
    <HStack alignment="top" spacing={14} modifiers={[containerBackground(c.bg, 'widget'), widgetURL('prepplanner://plan')]}>
      <VStack alignment="leading" spacing={6}>
        {date}
        <Spacer />
        {!!p.note && <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(c.primary), lineLimit(2)]}>{p.note}</Text>}
      </VStack>
      {list}
    </HStack>
  );
};

export default createWidget('CalendarWidget', CalendarWidget);
