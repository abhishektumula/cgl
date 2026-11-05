import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dailyPick, QUOTES } from '../src/lib/quotes';

// Box breathing: 4s in · 4s hold · 4s out · 4s hold — calms the nervous system quickly.
const PHASES = [
  { label: 'Breathe in', scale: 1, ms: 4000 },
  { label: 'Hold', scale: 1, ms: 4000 },
  { label: 'Breathe out', scale: 0.55, ms: 4000 },
  { label: 'Hold', scale: 0.55, ms: 4000 },
];
const TOTAL_CYCLES = 4;

export default function Breathe() {
  const insets = useSafeAreaInsets();
  const [scale] = useState(() => new Animated.Value(0.55));
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const p = PHASES[phase];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(scale, { toValue: p.scale, duration: p.ms, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    const t = setTimeout(() => {
      if (phase === PHASES.length - 1) {
        if (cycle + 1 >= TOTAL_CYCLES) { setDone(true); return; }
        setCycle((c) => c + 1);
      }
      setPhase((x) => (x + 1) % PHASES.length);
    }, p.ms);
    return () => clearTimeout(t);
  }, [phase, done, cycle, scale]);

  return (
    <View style={{ flex: 1, backgroundColor: '#18211E', paddingTop: insets.top, paddingBottom: insets.bottom + 20, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', padding: 16 }}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#ffffffaa" />
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 50 }}>
        <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#8DB8A8', opacity: 0.25, transform: [{ scale }] }} />
          <Animated.View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#8DB8A8', opacity: 0.5, transform: [{ scale }] }} />
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>{done ? 'Well done' : PHASES[phase].label}</Text>
        </View>
        <Text style={{ color: '#ffffffaa', fontSize: 15 }}>
          {done ? '' : `${cycle + 1} / ${TOTAL_CYCLES}`}
        </Text>
      </View>
      <Text style={{ color: '#ffffffcc', fontSize: 16, textAlign: 'center', paddingHorizontal: 36, lineHeight: 23, marginBottom: 20 }}>
        {done ? dailyPick(QUOTES) : 'Relax your shoulders.'}
      </Text>
      {done && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => { setDone(false); setCycle(0); setPhase(0); }} style={{ paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, borderColor: '#ffffff55' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#8DB8A8' }}>
            <Text style={{ color: '#18211E', fontWeight: '800' }}>Back to study</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
