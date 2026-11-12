import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  Blob, C, clamp, DigitPill, Digits, DriftBlob, FaceProps, faceStyles, mix, rnd, SIZE, sparklePath, Twinkle, usePhase,
} from './kit';

/* ---------------- Hourglass: sand runs down while you study ---------------- */

const HW = 150; // hourglass box
const HH = 196;
const NECK = 7;
// one bulb outline, top half; the bottom one is the same shape mirrored
const TOP_BULB = `M14 14 H${HW - 14} C${HW - 14} 62 ${HW / 2 + NECK} 82 ${HW / 2 + NECK} ${HH / 2} H${HW / 2 - NECK} C${HW / 2 - NECK} 82 14 62 14 14 Z`;
const BOTTOM_BULB = `M14 ${HH - 14} H${HW - 14} C${HW - 14} ${HH - 62} ${HW / 2 + NECK} ${HH - 82} ${HW / 2 + NECK} ${HH / 2} H${HW / 2 - NECK} C${HW / 2 - NECK} ${HH - 82} 14 ${HH - 62} 14 ${HH - 14} Z`;
const BULB_H = HH / 2 - 14;

function Grain({ running, offset, color }: { running: boolean; offset: number; color: string }) {
  const t = usePhase(running, 900);
  const style = useAnimatedStyle(() => {
    const k = (t.value + offset) % 1;
    return { opacity: running ? 1 : 0, transform: [{ translateY: k * (BULB_H - 6) }, { translateX: Math.sin(k * 20 + offset * 9) * 1.4 }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: HW / 2 - 2, top: HH / 2, width: 4, height: 4, borderRadius: 2, backgroundColor: color }, style]} />;
}

export function HourglassFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const p = clamp(progress);
  const sand = mix(accent, '#F4C27A', 0.35);
  // top: sand surface sinks towards the neck; bottom: a pile grows from the base
  const topY = 14 + BULB_H * (0.18 + p * 0.82);
  const bottomY = HH - 14 - BULB_H * (0.06 + p * 0.78);
  const pile = `M14 ${HH - 14} H${HW - 14} L${HW - 14} ${bottomY + 18} Q${HW / 2} ${bottomY - 14} 14 ${bottomY + 18} Z`;
  return (
    <View style={[faceStyles.box, { gap: 2 }]}>
      <View style={{ position: 'absolute', top: 6, left: C - 110 }}>
        <Blob color={accent} size={220} opacity={0.22} />
      </View>
      <View style={{ width: HW, height: HH + 10 }}>
        <Svg width={HW} height={HH + 10}>
          <Defs>
            <ClipPath id="top"><Path d={TOP_BULB} /></ClipPath>
            <ClipPath id="bottom"><Path d={BOTTOM_BULB} /></ClipPath>
            <LinearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sand} />
              <Stop offset="1" stopColor={accent} />
            </LinearGradient>
          </Defs>
          <Path d={TOP_BULB} fill={colors.card} />
          <Path d={BOTTOM_BULB} fill={colors.card} />
          {p < 1 && <Rect x={0} y={topY} width={HW} height={HH / 2 - topY + 1} fill="url(#sand)" clipPath="url(#top)" />}
          <Path d={pile} fill="url(#sand)" clipPath="url(#bottom)" />
          <Path d={TOP_BULB} fill="none" stroke={accent2} strokeOpacity={0.6} strokeWidth={2.5} />
          <Path d={BOTTOM_BULB} fill="none" stroke={accent2} strokeOpacity={0.6} strokeWidth={2.5} />
          {/* glass shine */}
          <Path d={`M26 22 C26 50 44 66 56 78`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Rect x={4} y={2} width={HW - 8} height={12} rx={6} fill={accent2} />
          <Rect x={4} y={HH - 14} width={HW - 8} height={12} rx={6} fill={accent2} />
        </Svg>
        {p < 1 && [0, 0.2, 0.4, 0.6, 0.8].map((o) => <Grain key={o} running={running} offset={o} color={sand} />)}
      </View>
      <Digits ms={remainingMs} colors={colors} size={40} />
      {footer}
    </View>
  );
}

/* ---------------- Sunrise: night turns into day over the round ---------------- */

const HILL_BACK = `M0 ${SIZE * 0.74} C${SIZE * 0.2} ${SIZE * 0.62} ${SIZE * 0.38} ${SIZE * 0.66} ${SIZE * 0.55} ${SIZE * 0.72} C${SIZE * 0.72} ${SIZE * 0.78} ${SIZE * 0.86} ${SIZE * 0.6} ${SIZE} ${SIZE * 0.66} V${SIZE} H0 Z`;
const HILL_FRONT = `M0 ${SIZE * 0.84} C${SIZE * 0.18} ${SIZE * 0.76} ${SIZE * 0.42} ${SIZE * 0.92} ${SIZE * 0.64} ${SIZE * 0.82} C${SIZE * 0.8} ${SIZE * 0.75} ${SIZE * 0.92} ${SIZE * 0.8} ${SIZE} ${SIZE * 0.78} V${SIZE} H0 Z`;
const STARS = Array.from({ length: 14 }, (_, i) => ({ x: 30 + rnd(i + 3) * (SIZE - 60), y: 26 + rnd(i + 40) * SIZE * 0.4, r: 0.8 + rnd(i + 70) * 1.8 }));

export function SunriseFace({ progress, remainingMs, running, accent, accent2, colors, footer }: FaceProps) {
  const p = clamp(progress);
  // sky: deep night → warm dawn → soft day
  const sky = useMemo(() => {
    const night = ['#1E2150', '#4A3A78'];
    const dawn = [mix(accent2, '#5A4C9A', 0.4), mix(accent, '#FFB38A', 0.4)];
    const day = [mix(accent2, '#BFE3FF', 0.6), mix(accent, '#FFF1E0', 0.75)];
    const k = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
    const [a, b] = p < 0.5 ? [night, dawn] : [dawn, day];
    return [mix(a[0], b[0], k), mix(a[1], b[1], k)];
  }, [p, accent, accent2]);
  const sunY = SIZE * (0.86 - p * 0.58);
  const starOpacity = Math.max(0, 1 - p * 2.2);
  const sun = mix('#FF9E7A', '#FFE08A', p);
  const hillBack = mix(mix(accent2, '#2A2350', 0.55), accent2, p);
  const hillFront = mix(mix(accent, '#2A2350', 0.6), accent, p);
  const D = SIZE - 8;
  return (
    <View style={faceStyles.box}>
      <View style={{ width: D, height: D, borderRadius: D, overflow: 'hidden' }}>
        <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sky[0]} />
              <Stop offset="1" stopColor={sky[1]} />
            </LinearGradient>
          </Defs>
          <Rect width={D} height={D} fill="url(#sky)" />
        </Svg>
        {starOpacity > 0 && (
          <View style={[StyleSheet.absoluteFill, { opacity: starOpacity }]}>
            <Twinkle running={running} period={2400}>
              <Svg width={D} height={D}>
                {STARS.map((s, i) => (i % 5 === 0
                  ? <Path key={i} d={sparklePath(s.x, s.y, s.r * 3)} fill="#FFFFFF" />
                  : <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" />))}
              </Svg>
            </Twinkle>
          </View>
        )}
        <View style={{ position: 'absolute', left: D / 2 - 90, top: sunY - 90 }}>
          <Blob color={sun} size={180} opacity={0.7} />
        </View>
        <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
          <Circle cx={D / 2} cy={sunY} r={30} fill={sun} />
        </Svg>
        <DriftBlob running={running} color="#FFFFFF" size={110} x={D * 0.25} y={D * 0.3} range={26} period={16000} opacity={0.35 + p * 0.3} />
        <DriftBlob running={running} color="#FFFFFF" size={90} x={D * 0.78} y={D * 0.22} range={20} period={12000} opacity={0.3 + p * 0.3} />
        <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
          <G scale={D / SIZE}>
            <Path d={HILL_BACK} fill={hillBack} />
            <Path d={HILL_FRONT} fill={hillFront} />
          </G>
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFill, { top: -SIZE * 0.32 }]}>
        <DigitPill ms={remainingMs} colors={colors} size={40} footer={footer} />
      </View>
    </View>
  );
}
