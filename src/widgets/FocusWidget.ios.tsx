import { Capsule, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, tint, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { FocusWidgetProps } from './types';

/** Home screen focus timer: live countdown while running, today's class / study split otherwise. */
const FocusWidget = (p: FocusWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const c = env.colorScheme === 'dark' ? p.dark : p.light;
  const small = env.widgetFamily === 'systemSmall';
  const live = p.state !== 'idle' && p.endAt > 0;
  const start = new Date(p.startAt);
  const end = new Date(p.endAt);
  const pauseTime = p.state === 'paused' ? new Date(p.endAt - p.leftMs) : undefined;
  const barW = small ? 120 : 132;
  const studyW = Math.max(p.studyShare > 0 ? 4 : 0, barW * p.studyShare);
  const icon = p.label === 'Class' ? 'graduationcap.fill' : p.label === 'Break' ? 'cup.and.saucer.fill' : 'book.fill';

  const head = (
    <HStack spacing={6}>
      <Image systemName={live ? icon : 'flame.fill'} color={live ? p.color : c.primary} size={13} />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.text), lineLimit(1)]}>
        {live ? (p.state === 'paused' ? `${p.label} · paused` : p.label) : p.streak > 0 ? `${p.streak}-day streak` : 'Focus'}
      </Text>
      <Spacer />
    </HStack>
  );

  const timer = live ? (
    <VStack alignment="leading" spacing={8}>
      <Text
        timerInterval={{ lower: start, upper: end }}
        countsDown
        pauseTime={pauseTime}
        modifiers={[font({ size: small ? 36 : 42, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(p.color)]}
      />
      {p.state === 'paused' ? (
        <ProgressView value={Math.max(0, Math.min(1, 1 - p.leftMs / Math.max(1, p.endAt - p.startAt)))} modifiers={[tint(p.color)]} />
      ) : (
        <ProgressView timerInterval={{ lower: start, upper: end }} countsDown={false} modifiers={[tint(p.color)]} />
      )}
    </VStack>
  ) : (
    <VStack alignment="leading" spacing={8}>
      <VStack alignment="leading" spacing={0}>
        <Text modifiers={[font({ size: small ? 32 : 38, weight: 'bold', design: 'rounded' }), foregroundStyle(c.text)]}>{p.total}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.sub)]}>focused today · {Math.round(p.goal * 100)}%</Text>
      </VStack>
      <HStack spacing={2}>
        <Capsule modifiers={[foregroundStyle(c.study), frame({ width: studyW, height: 7 })]} />
        <Capsule modifiers={[foregroundStyle(p.studyShare > 0 || p.total !== '0m' ? c.cls : c.muted), frame({ width: Math.max(4, barW - studyW), height: 7 })]} />
      </HStack>
    </VStack>
  );

  const split = (
    <VStack alignment="leading" spacing={10}>
      <HStack spacing={6}>
        <Capsule modifiers={[foregroundStyle(c.study), frame({ width: 8, height: 8 })]} />
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(c.sub)]}>Self study</Text>
          <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(c.text)]}>{p.study}</Text>
        </VStack>
      </HStack>
      <HStack spacing={6}>
        <Capsule modifiers={[foregroundStyle(c.cls), frame({ width: 8, height: 8 })]} />
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(c.sub)]}>Class</Text>
          <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(c.text)]}>{p.cls}</Text>
        </VStack>
      </HStack>
    </VStack>
  );

  if (small) {
    return (
      <VStack alignment="leading" spacing={10} modifiers={[containerBackground(c.bg, 'widget'), widgetURL('prepplanner://focus')]}>
        {head}
        <Spacer />
        {timer}
      </VStack>
    );
  }
  return (
    <HStack spacing={16} modifiers={[containerBackground(c.bg, 'widget'), widgetURL('prepplanner://focus'), padding({ all: 2 })]}>
      <VStack alignment="leading" spacing={10}>
        {head}
        <Spacer />
        {timer}
      </VStack>
      {split}
    </HStack>
  );
};

export default createWidget('FocusWidget', FocusWidget);
