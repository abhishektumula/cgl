import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../../lib/theme';

export interface FaceProps {
  /** 0 → 1, how much of the round is done */
  progress: number;
  remainingMs: number;
  running: boolean;
  accent: string;
  accent2: string;
  colors: Colors;
  /** rendered under the digits (round dots) */
  footer?: ReactNode;
}

export const SIZE = 280;
export const C = SIZE / 2;

export const clamp = (n: number) => Math.min(1, Math.max(0, n));

export const mmss = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Blend two #RRGGBB colours. */
export function mix(a: string, b: string, t: number) {
  const k = clamp(t);
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2]
    .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0'))
    .join('');
}

/** Stable "random" numbers, so stars and sparkles sit in the same place on every render. */
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Digits({ ms, colors, size = 58, color }: { ms: number; colors: Colors; size?: number; color?: string }) {
  return (
    <Text style={{ fontSize: size, fontWeight: '200', color: color ?? colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1 }}>
      {mmss(ms)}
    </Text>
  );
}

/* ---------------- animation helpers ---------------- */

/**
 * A value that keeps climbing by 1 every `duration` ms while running and holds still otherwise.
 * Feed it into anything periodic (sin, % 1, rotation) and pausing / resuming never jumps.
 */
export function usePhase(running: boolean, duration: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (running) t.value = withRepeat(withTiming(t.value + 1, { duration, easing: Easing.linear }), -1, false);
    else cancelAnimation(t);
    return () => cancelAnimation(t);
  }, [running, duration, t]);
  return t;
}

/** Endless spin while running; pauses in place otherwise. */
export function useSpin(running: boolean, duration: number, reverse = false) {
  const t = usePhase(running, duration);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -t.value : t.value) * 360}deg` }] }));
}

/** Slow "breathing" value between `from` and `to`. */
export function useBreath(running: boolean, from = 0.94, to = 1, duration = 2600) {
  const v = useSharedValue(to);
  useEffect(() => {
    if (running) {
      v.value = from;
      v.value = withRepeat(withTiming(to, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(v);
      v.value = withTiming(to, { duration: 400 });
    }
    return () => cancelAnimation(v);
  }, [running, from, to, duration, v]);
  return v;
}

/* ---------------- building blocks ---------------- */

/** A soft glowing dot – colour in the middle fading to nothing. Stands in for a blur. */
export function Blob({ color, size, opacity = 0.9 }: { color: string; size: number; opacity?: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="b" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#b)" />
    </Svg>
  );
}

/** A glow that wanders slowly around (x, y). */
export function DriftBlob({ running, color, size, x, y, range = 30, period = 10000, opacity = 0.9 }: {
  running: boolean; color: string; size: number; x: number; y: number; range?: number; period?: number; opacity?: number;
}) {
  const t = usePhase(running, period);
  const style = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.sin(a) * range },
        { translateY: Math.cos(a * 2) * range * 0.6 },
        { scale: 1 + Math.sin(a) * 0.1 },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, pointerEvents: 'none' }, style]}>
      <Blob color={color} size={size} opacity={opacity} />
    </Animated.View>
  );
}

/** A small dot that floats upwards and fades, over and over. */
export function Floaty({ running, x, bottom, size, color, period, rise, offset = 0, opacity = 0.8 }: {
  running: boolean; x: number; bottom: number; size: number; color: string; period: number; rise: number; offset?: number; opacity?: number;
}) {
  const t = usePhase(running, period);
  const style = useAnimatedStyle(() => {
    const k = (t.value + offset) % 1;
    return {
      opacity: Math.sin(k * Math.PI) * opacity,
      transform: [{ translateY: -k * rise }, { translateX: Math.sin(k * Math.PI * 4) * 5 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: x, bottom, width: size, height: size, borderRadius: size, backgroundColor: color }, style]} />;
}

/** Fades its children in and out, like twinkling stars. */
export function Twinkle({ running, period, offset = 0, children }: { running: boolean; period: number; offset?: number; children: ReactNode }) {
  const t = usePhase(running, period);
  const style = useAnimatedStyle(() => ({ opacity: 0.3 + 0.7 * Math.abs(Math.sin((t.value + offset) * Math.PI)) }));
  return <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>{children}</Animated.View>;
}

/** Four-pointed sparkle path centred on (cx, cy). */
export function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.2;
  return `M${cx} ${cy - r} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} `
    + `C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/* ---------------- waves (liquid, heart) ---------------- */

const WAVE_H = 14;

function wavePath(box: number, phase: number) {
  let d = `M0 ${WAVE_H}`;
  for (let x = 0; x <= box * 2; x += 6) {
    d += ` L${x} ${(WAVE_H + Math.sin((x / box) * Math.PI * 2 + phase) * (WAVE_H / 2)).toFixed(1)}`;
  }
  return `${d} L${box * 2} ${box + WAVE_H * 2} L0 ${box + WAVE_H * 2} Z`;
}

/** A sheet of liquid `box` wide that scrolls sideways and rises to `level` (0 → 1). */
export function Wave({ box, color, opacity, speed, phase, level, running }: {
  box: number; color: string; opacity: number; speed: number; phase: number; level: number; running: boolean;
}) {
  const t = usePhase(running, speed);
  const y = useSharedValue(box);
  useEffect(() => {
    y.value = withTiming(box * (1 - level) - WAVE_H, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [level, box, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -(t.value % 1) * box }, { translateY: y.value }] }));
  const d = useMemo(() => wavePath(box, phase), [box, phase]);
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box * 2, height: box + WAVE_H * 2 }, style]}>
      <Svg width={box * 2} height={box + WAVE_H * 2}>
        <Path d={d} fill={color} fillOpacity={opacity} />
      </Svg>
    </Animated.View>
  );
}

/** Time on a soft pill, readable over any moving background. */
export function DigitPill({ ms, colors, size = 46, footer }: { ms: number; colors: Colors; size?: number; footer?: ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card + 'E0', alignItems: 'center' }}>
        <Digits ms={ms} colors={colors} size={size} />
        {footer}
      </View>
    </View>
  );
}

export const faceStyles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
});
