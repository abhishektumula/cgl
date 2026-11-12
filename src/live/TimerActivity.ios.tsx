import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { TimerActivityProps } from './types';

/**
 * Lock Screen + Dynamic Island view of the running focus / break timer.
 * The countdown is drawn by iOS itself (timerInterval), so it keeps ticking while the app sleeps.
 * Runs in the widget runtime: everything it needs must come through props.
 */
const TimerActivity = (props: TimerActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : props.color;
  const start = new Date(props.endAt - props.totalMs);
  const end = new Date(props.endAt);
  const paused = props.pausedAt > 0;
  const pauseTime = paused ? new Date(props.pausedAt) : undefined;
  const icon = props.mode === 'focus' ? 'sparkles' : 'cup.and.saucer.fill';
  const left = paused ? Math.max(0, Math.min(1, (props.endAt - props.pausedAt) / props.totalMs)) : 1;

  const clock = (size: number) => (
    <Text
      timerInterval={{ lower: start, upper: end }}
      countsDown
      pauseTime={pauseTime}
      modifiers={[font({ size, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(accent)]}
    />
  );
  const bar = paused ? (
    <ProgressView value={left} modifiers={[tint(accent)]} />
  ) : (
    <ProgressView timerInterval={{ lower: start, upper: end }} countsDown modifiers={[tint(accent)]} />
  );

  return {
    banner: (
      <VStack spacing={10} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Image systemName={icon} color={accent} size={16} />
          <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 }), foregroundStyle('secondary')]}>{paused ? 'Paused' : props.subtitle}</Text>
        </HStack>
        {clock(44)}
        {bar}
      </VStack>
    ),
    compactLeading: <Image systemName={icon} color={accent} />,
    compactTrailing: (
      <Text
        timerInterval={{ lower: start, upper: end }}
        countsDown
        pauseTime={pauseTime}
        modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 52 })]}
      />
    ),
    minimal: <Image systemName={icon} color={accent} />,
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 6, top: 6 })]}>
        <Image systemName={icon} color={accent} />
        <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>{props.title}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <Text modifiers={[font({ size: 13 }), foregroundStyle('secondary'), padding({ trailing: 6, top: 6 })]}>
        {paused ? 'Paused' : props.subtitle}
      </Text>
    ),
    expandedBottom: (
      <VStack spacing={6} modifiers={[padding({ horizontal: 8, bottom: 6 })]}>
        {clock(34)}
        {bar}
      </VStack>
    ),
  };
};

export default createLiveActivity('FocusTimer', TimerActivity);
