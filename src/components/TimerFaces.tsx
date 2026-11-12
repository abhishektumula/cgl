import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, FlipInXDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors } from '../lib/theme';
import { TimerStyle } from '../lib/types';

export const TIMER_STYLES: { id: TimerStyle; label: string; icon: string }[] = [
  { id: 'ring', label: 'Ring', icon: 'ellipse-outline' },
  { id: 'bloom', label: 'Bloom', icon: 'flower-outline' },
  { id: 'liquid', label: 'Liquid', icon: 'water-outline' },
  { id: 'flip', label: 'Flip clock', icon: 'albums-outline' },
  { id: 'orbit', label: 'Orbit', icon: 'planet-outline' },
];

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

export const SIZE = 260;

export const mmss = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function TimerFace({ style, ...p }: FaceProps & { style: TimerStyle }) {
  switch (style) {
    case 'bloom': return <BloomFace {...p} />;
    case 'liquid': return <LiquidFace {...p} />;
    case 'flip': return <FlipFace {...p} />;
    case 'orbit': return <OrbitFace {...p} />;
    default: return <RingFace {...p} />;
  }
}

/* ---------------- shared bits ---------------- */

function Digits({ ms, colors, size = 58 }: { ms: number; colors: Colors; size?: number }) {
  return (
    <Text style={{ fontSize: size, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1 }}>
      {mmss(ms)}
    </Text>
  );
}

/** Endless 0→360 spin while running; pauses in place otherwise. */
function useSpin(running: boolean, duration: number) {
  const deg = useSharedValue(0);
  useEffect(() => {
    if (running) {
      deg.value = withRepeat(withTiming(deg.value + 360, { duration, easing: Easing.linear }), -1, false);
    } else cancelAnimation(deg);
    return () => cancelAnimation(deg);
  }, [running, duration, deg]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${deg.value}deg` }] }));
}

/** Slow "breathing" scale, so the screen feels alive without being distracting. */
function useBreath(running: boolean, from = 0.94, to = 1) {
  const v = useSharedValue(to);
  useEffect(() => {
    if (running) {
      v.value = from;
      v.value = withRepeat(withTiming(to, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(v);
      v.value = withTiming(to, { duration: 400 });
    }
    return () => cancelAnimation(v);
  }, [running, from, to, v]);
  return v;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/* ---------------- Ring ---------------- */

const STROKE = 8;
const R = (SIZE - STROKE * 3) / 2;
const CIRC = 2 * Math.PI * R;

function RingFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const breath = useBreath(running, 0.9, 1);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }], opacity: 0.25 + (breath.value - 0.9) * 2.5 }));
  return (
    <View style={styles.box}>
      <Animated.View style={[styles.glow, { backgroundColor: accent + '22' }, glow]} />
      <Svg width={SIZE} height={SIZE} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset="1" stopColor={accent2} />
          </LinearGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.muted} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="url(#ring)" strokeWidth={STROKE} fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - clamp(progress))} strokeLinecap="round"
        />
      </Svg>
      <Digits ms={remainingMs} colors={colors} />
      {footer}
    </View>
  );
}

/* ---------------- Bloom: petals open one by one ---------------- */

const PETALS = 12;

function BloomFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const spin = useSpin(running, 90000);
  const breath = useBreath(running, 0.97, 1);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const c = SIZE / 2;
  const filled = clamp(progress) * PETALS;
  return (
    <View style={styles.box}>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Animated.View style={[StyleSheet.absoluteFill, pulse]}>
          <Svg width={SIZE} height={SIZE}>
            {Array.from({ length: PETALS }, (_, i) => {
              const amount = clamp(filled - i);
              const fill = i % 2 ? accent2 : accent;
              return (
                <Ellipse
                  key={i}
                  cx={c} cy={c - 78} rx={26} ry={50}
                  transform={`rotate(${(360 / PETALS) * i} ${c} ${c})`}
                  fill={fill}
                  fillOpacity={0.12 + amount * 0.6}
                  stroke={fill}
                  strokeOpacity={0.35 + amount * 0.5}
                  strokeWidth={1.2}
                />
              );
            })}
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Digits ms={remainingMs} colors={colors} size={40} />
        {footer}
      </View>
    </View>
  );
}

/* ---------------- Liquid: the cup fills up as you study ---------------- */

const WAVE_H = 14;
function wavePath(width: number, height: number, phase: number) {
  let d = `M0 ${WAVE_H}`;
  for (let x = 0; x <= width; x += 6) {
    d += ` L${x} ${WAVE_H + Math.sin((x / SIZE) * Math.PI * 2 + phase) * (WAVE_H / 2)}`;
  }
  return `${d} L${width} ${height} L0 ${height} Z`;
}

function Wave({ color, opacity, speed, phase, level, running }: {
  color: string; opacity: number; speed: number; phase: number; level: number; running: boolean;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(SIZE);
  useEffect(() => {
    if (running) x.value = withRepeat(withTiming(-SIZE, { duration: speed, easing: Easing.linear }), -1, false);
    else cancelAnimation(x);
    return () => cancelAnimation(x);
  }, [running, speed, x]);
  useEffect(() => {
    y.value = withTiming(SIZE * (1 - level) - WAVE_H, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [level, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  const d = useMemo(() => wavePath(SIZE * 2, SIZE + WAVE_H * 2, phase), [phase]);
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: SIZE * 2, height: SIZE + WAVE_H * 2 }, style]}>
      <Svg width={SIZE * 2} height={SIZE + WAVE_H * 2}>
        <Path d={d} fill={color} fillOpacity={opacity} />
      </Svg>
    </Animated.View>
  );
}

function LiquidFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const level = 0.08 + clamp(progress) * 0.84;
  return (
    <View style={styles.box}>
      <View style={{ width: SIZE - 16, height: SIZE - 16, borderRadius: SIZE, overflow: 'hidden', backgroundColor: colors.muted, borderWidth: 3, borderColor: accent + '40' }}>
        <View style={{ position: 'absolute', left: -8, top: -8, width: SIZE, height: SIZE }}>
          <Wave color={accent2} opacity={0.45} speed={5200} phase={Math.PI} level={level} running={running} />
          <Wave color={accent} opacity={0.75} speed={3400} phase={0} level={level} running={running} />
        </View>
      </View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card + 'D9', alignItems: 'center' }}>
          <Digits ms={remainingMs} colors={colors} size={48} />
          {footer}
        </View>
      </View>
    </View>
  );
}

/* ---------------- Flip clock ---------------- */

function FlipCard({ ch, colors, accent }: { ch: string; colors: Colors; accent: string }) {
  return (
    <View style={{ width: 62, height: 92, borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: accent + '55' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: '50%', backgroundColor: colors.muted, opacity: 0.6 }} />
      <Animated.Text key={ch} entering={FlipInXDown.duration(280)} style={{ fontSize: 60, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] }}>
        {ch}
      </Animated.Text>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 45, height: 2, backgroundColor: colors.bg }} />
    </View>
  );
}

function FlipFace({ progress, remainingMs, accent, accent2, colors, footer }: FaceProps) {
  const [m, s] = mmss(remainingMs).split(':');
  return (
    <View style={[styles.box, { gap: 22 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {m.split('').map((ch, i) => <FlipCard key={`m${i}`} ch={ch} colors={colors} accent={accent} />)}
        <Text style={{ fontSize: 44, fontWeight: '300', color: colors.faint, marginHorizontal: 2, marginTop: -6 }}>:</Text>
        {s.split('').map((ch, i) => <FlipCard key={`s${i}`} ch={ch} colors={colors} accent={accent2} />)}
      </View>
      <View style={{ width: 200, height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: 'hidden' }}>
        <View style={{ width: `${clamp(progress) * 100}%`, height: 6, borderRadius: 3, backgroundColor: accent }} />
      </View>
      {footer}
    </View>
  );
}

/* ---------------- Orbit: a little moon circles while 60 dots fill in ---------------- */

const DOTS = 60;

function OrbitFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const spin = useSpin(running, 12000);
  const c = SIZE / 2;
  const r = SIZE / 2 - 14;
  const filled = Math.floor(clamp(progress) * DOTS);
  const dots = useMemo(
    () => Array.from({ length: DOTS }, (_, i) => {
      const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
      return { x: c + Math.cos(a) * r, y: c + Math.sin(a) * r };
    }),
    [c, r]
  );
  return (
    <View style={styles.box}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {dots.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i < filled ? 3.6 : 2.4} fill={i < filled ? (i % 5 === 0 ? accent2 : accent) : colors.border} />
        ))}
        <Circle cx={c} cy={c} r={r - 34} stroke={colors.border} strokeWidth={1} strokeDasharray="2 6" fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <View style={{ position: 'absolute', left: c - 9, top: c - (r - 34) - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: accent2, shadowColor: accent2, shadowOpacity: 0.6, shadowRadius: 8 }} />
      </Animated.View>
      <Digits ms={remainingMs} colors={colors} size={52} />
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: SIZE - 30, height: SIZE - 30, borderRadius: SIZE },
});
