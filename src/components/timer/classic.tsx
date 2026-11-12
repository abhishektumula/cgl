import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation, FlipInXDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors } from '../../lib/theme';
import {
  Blob, C, clamp, DigitPill, Digits, DriftBlob, FaceProps, faceStyles, Floaty, mix, mmss, rnd, SIZE, sparklePath,
  Twinkle, useBreath, useSpin, Wave,
} from './kit';

/* ---------------- Halo: glowing ring, the seconds sweep around inside it ---------------- */

const STROKE = 10;
const R = SIZE / 2 - 22;
const CIRC = 2 * Math.PI * R;
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
  const long = i % 5 === 0;
  const r1 = R - 18;
  const r2 = r1 - (long ? 9 : 5);
  return { x1: C + Math.cos(a) * r1, y1: C + Math.sin(a) * r1, x2: C + Math.cos(a) * r2, y2: C + Math.sin(a) * r2, long };
});

export function RingFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const breath = useBreath(running, 0.86, 1.05);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }], opacity: 0.5 + (breath.value - 0.86) * 2.6 }));
  const p = clamp(progress);
  const a = p * Math.PI * 2 - Math.PI / 2;
  const hx = C + Math.cos(a) * R;
  const hy = C + Math.sin(a) * R;
  // ticks light up one per second and start over every minute
  const lit = (60 - (Math.ceil(remainingMs / 1000) % 60)) % 60;
  const arc = {
    cx: C, cy: C, r: R, fill: 'none', strokeDasharray: `${CIRC * p} ${CIRC}`,
    strokeLinecap: 'round' as const, transform: `rotate(-90 ${C} ${C})`,
  };
  return (
    <View style={faceStyles.box}>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Blob color={accent} size={SIZE} opacity={0.38} />
      </Animated.View>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset="1" stopColor={accent2} />
          </LinearGradient>
        </Defs>
        {TICKS.map((t, i) => (
          <Line
            key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeLinecap="round"
            stroke={i < lit ? (t.long ? accent2 : accent) : colors.border} strokeWidth={t.long ? 2.2 : 1.4}
          />
        ))}
        <Circle cx={C} cy={C} r={R} stroke={colors.muted} strokeWidth={STROKE} fill="none" />
        <Circle {...arc} stroke={accent} strokeOpacity={0.12} strokeWidth={STROKE + 16} />
        <Circle {...arc} stroke={accent} strokeOpacity={0.2} strokeWidth={STROKE + 7} />
        <Circle {...arc} stroke="url(#ring)" strokeWidth={STROKE} />
        <Circle cx={hx} cy={hy} r={STROKE + 4} fill={accent2} fillOpacity={0.28} />
        <Circle cx={hx} cy={hy} r={STROKE - 3.5} fill="#FFFFFF" />
      </Svg>
      <Digits ms={remainingMs} colors={colors} size={54} />
      {footer}
    </View>
  );
}

/* ---------------- Bloom: petals open one by one ---------------- */

const PETALS = 12;

export function BloomFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const spin = useSpin(running, 90000);
  const back = useSpin(running, 60000, true);
  const breath = useBreath(running, 0.96, 1.02);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const filled = clamp(progress) * PETALS;
  return (
    <View style={faceStyles.box}>
      <Animated.View style={[StyleSheet.absoluteFill, back]}>
        <Svg width={SIZE} height={SIZE}>
          {Array.from({ length: 8 }, (_, i) => (
            <Ellipse
              key={i} cx={C} cy={C - 104} rx={20} ry={34} fill={accent2} fillOpacity={0.14}
              transform={`rotate(${45 * i + 22} ${C} ${C})`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Animated.View style={[StyleSheet.absoluteFill, pulse]}>
          <Svg width={SIZE} height={SIZE}>
            {Array.from({ length: PETALS }, (_, i) => {
              const amount = clamp(filled - i);
              const fill = i % 2 ? accent2 : accent;
              return (
                <Ellipse
                  key={i}
                  cx={C} cy={C - 82} rx={27} ry={52}
                  transform={`rotate(${(360 / PETALS) * i} ${C} ${C})`}
                  fill={fill}
                  fillOpacity={0.12 + amount * 0.62}
                  stroke={fill}
                  strokeOpacity={0.35 + amount * 0.5}
                  strokeWidth={1.2}
                />
              );
            })}
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={{ width: 154, height: 154, borderRadius: 77, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: accent + '30' }}>
        <Digits ms={remainingMs} colors={colors} size={40} />
        {footer}
      </View>
    </View>
  );
}

/* ---------------- Liquid: the glass fills up as you study ---------------- */

export function LiquidFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const level = 0.08 + clamp(progress) * 0.84;
  const D = SIZE - 16;
  return (
    <View style={faceStyles.box}>
      <View style={{ width: D, height: D, borderRadius: D, overflow: 'hidden', backgroundColor: colors.muted, borderWidth: 3, borderColor: accent + '40' }}>
        <View style={{ position: 'absolute', left: -8, top: -8, width: SIZE, height: SIZE }}>
          <Wave box={SIZE} color={accent2} opacity={0.45} speed={5200} phase={Math.PI} level={level} running={running} />
          <Wave box={SIZE} color={accent} opacity={0.75} speed={3400} phase={0} level={level} running={running} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Floaty
              key={i} running={running} color="#FFFFFF" opacity={0.55}
              x={50 + rnd(i) * (SIZE - 110)} bottom={6} size={5 + rnd(i + 9) * 7}
              period={3200 + rnd(i + 3) * 2600} offset={rnd(i + 5)} rise={Math.max(10, SIZE * level - 30)}
            />
          ))}
        </View>
      </View>
      <DigitPill ms={remainingMs} colors={colors} size={48} footer={footer} />
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

export function FlipFace({ progress, remainingMs, accent, accent2, colors, footer }: FaceProps) {
  const [m, s] = mmss(remainingMs).split(':');
  return (
    <View style={[faceStyles.box, { gap: 22 }]}>
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

/* ---------------- Galaxy: planets circle while 60 stars light up ---------------- */

const DOTS = 60;
const DOT_R = SIZE / 2 - 12;
const DOT_POS = Array.from({ length: DOTS }, (_, i) => {
  const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
  return { x: C + Math.cos(a) * DOT_R, y: C + Math.sin(a) * DOT_R };
});
/** three groups of background stars, each twinkling at its own pace */
const STAR_GROUPS = [0, 1, 2].map((g) =>
  Array.from({ length: 9 }, (_, i) => {
    const a = rnd(g * 31 + i) * Math.PI * 2;
    const d = 20 + rnd(g * 17 + i + 50) * (DOT_R - 34);
    return { x: C + Math.cos(a) * d, y: C + Math.sin(a) * d, r: 1 + rnd(g * 7 + i + 90) * 2.6 };
  })
);

function Planet({ running, period, radius, size, color, reverse, ringed }: {
  running: boolean; period: number; radius: number; size: number; color: string; reverse?: boolean; ringed?: boolean;
}) {
  const spin = useSpin(running, period, reverse);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, spin]}>
      <View style={{
        position: 'absolute', left: C - size / 2, top: C - radius - size / 2, width: size, height: size, borderRadius: size,
        backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
      }} />
      {ringed && (
        <View style={{
          position: 'absolute', left: C - size, top: C - radius - size * 0.22, width: size * 2, height: size * 0.44,
          borderRadius: size, borderWidth: 1.6, borderColor: color, opacity: 0.7, transform: [{ rotate: '-18deg' }],
        }} />
      )}
    </Animated.View>
  );
}

export function OrbitFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const filled = Math.floor(clamp(progress) * DOTS);
  const starColor = colors.dark ? '#FFFFFF' : mix(accent, colors.text, 0.25);
  return (
    <View style={faceStyles.box}>
      {STAR_GROUPS.map((group, g) => (
        <Twinkle key={g} running={running} period={2600 + g * 900} offset={g / 3}>
          <Svg width={SIZE} height={SIZE}>
            {group.map((s, i) => (
              i % 4 === 0
                ? <Path key={i} d={sparklePath(s.x, s.y, s.r * 2.6)} fill={i % 8 === 0 ? accent2 : starColor} />
                : <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={starColor} fillOpacity={0.8} />
            ))}
          </Svg>
        </Twinkle>
      ))}
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {DOT_POS.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={i < filled ? 3.6 : 2.2} fill={i < filled ? (i % 5 === 0 ? accent2 : accent) : colors.border} />
        ))}
        <Circle cx={C} cy={C} r={104} stroke={accent} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 7" fill="none" />
        <Circle cx={C} cy={C} r={84} stroke={accent2} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 7" fill="none" />
      </Svg>
      <Planet running={running} period={14000} radius={104} size={18} color={accent2} ringed />
      <Planet running={running} period={8000} radius={84} size={10} color={accent} reverse />
      <Digits ms={remainingMs} colors={colors} size={44} />
      {footer}
    </View>
  );
}

/* ---------------- Aurora: slow northern lights behind the numbers ---------------- */

export function AuroraFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const D = SIZE - 30;
  const r = SIZE / 2 - 5;
  const circ = 2 * Math.PI * r;
  const third = useMemo(() => mix(accent2, '#FFD08A', 0.55), [accent2]);
  return (
    <View style={faceStyles.box}>
      <View style={{ width: D, height: D, borderRadius: D, overflow: 'hidden', backgroundColor: colors.card }}>
        <DriftBlob running={running} color={accent} size={D * 1.05} x={D * 0.28} y={D * 0.3} range={38} period={11000} />
        <DriftBlob running={running} color={accent2} size={D} x={D * 0.76} y={D * 0.62} range={34} period={14500} />
        <DriftBlob running={running} color={third} size={D * 0.8} x={D * 0.32} y={D * 0.86} range={30} period={9000} opacity={0.8} />
        <DriftBlob running={running} color="#FFFFFF" size={D * 0.5} x={D * 0.66} y={D * 0.2} range={24} period={7600} opacity={colors.dark ? 0.12 : 0.6} />
      </View>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={C} cy={C} r={r} stroke={colors.border} strokeWidth={3} fill="none" />
        <Circle
          cx={C} cy={C} r={r} stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ * clamp(progress)} ${circ}`} transform={`rotate(-90 ${C} ${C})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Digits ms={remainingMs} colors={colors} size={62} />
        {footer}
      </View>
    </View>
  );
}

/* ---------------- Heart: fills with every minute and beats softly ---------------- */

const HB = 220; // box the heart is drawn in
const HS = 0.53;
const HCX = HB / 2;
const HCY = HB / 2 + 20 * HS;
const HEART_PTS = [
  'M', 0, 150, 'C', -40, 118, -200, 10, -200, -78, 'C', -200, -150, -145, -190, -92, -190, 'C', -52, -190, -18, -168, 0, -136,
  'C', 18, -168, 52, -190, 92, -190, 'C', 145, -190, 200, -150, 200, -78, 'C', 200, 10, 40, 118, 0, 150, 'Z',
];
const HEART = (() => {
  let isX = true;
  return HEART_PTS.map((v) => {
    if (typeof v === 'string') { isX = true; return v; }
    const out = (isX ? HCX + v * HS : HCY + v * HS).toFixed(1);
    isX = !isX;
    return out;
  }).join(' ');
})();
const HEART_TOP = HCY - 190 * HS;
const HEART_BOTTOM = HCY + 150 * HS;

export function HeartFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const beat = useSharedValue(1);
  useEffect(() => {
    if (running) {
      beat.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 140 }), withTiming(1, { duration: 170 }),
          withTiming(1.04, { duration: 140 }), withTiming(1, { duration: 750 })
        ), -1, false
      );
    } else {
      cancelAnimation(beat);
      beat.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(beat);
  }, [running, beat]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  const surface = HEART_BOTTOM - (HEART_BOTTOM - HEART_TOP) * (0.06 + clamp(progress) * 0.9);
  const level = 1 - surface / HB;
  const D = SIZE - 14;
  return (
    <View style={faceStyles.box}>
      <View style={{ width: D, height: D, borderRadius: D, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.View style={[{ width: HB, height: HB }, pulse]}>
          <View style={{ width: HB, height: HB, overflow: 'hidden', backgroundColor: colors.muted }}>
            <Wave box={HB} color={accent2} opacity={0.5} speed={4800} phase={Math.PI} level={level} running={running} />
            <Wave box={HB} color={accent} opacity={0.8} speed={3000} phase={0} level={level} running={running} />
          </View>
          {/* everything outside the heart is painted over, leaving a heart-shaped window */}
          <Svg width={HB} height={HB} style={StyleSheet.absoluteFill}>
            <Path d={`M-2 -2 H${HB + 2} V${HB + 2} H-2 Z ${HEART}`} fill={colors.card} fillRule="evenodd" />
            <Path d={HEART} fill="none" stroke={accent} strokeWidth={3} strokeLinejoin="round" />
            <Path d={sparklePath(HB - 22, 30, 11)} fill={accent2} />
            <Path d={sparklePath(20, HB - 46, 7)} fill={accent} fillOpacity={0.7} />
          </Svg>
        </Animated.View>
      </View>
      <DigitPill ms={remainingMs} colors={colors} size={38} footer={footer} />
    </View>
  );
}
