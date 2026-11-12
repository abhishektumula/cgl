import React from 'react';
import { TimerStyle } from '../lib/types';
import { AuroraFace, BloomFace, FlipFace, HeartFace, LiquidFace, OrbitFace, RingFace } from './timer/classic';
import { FaceProps } from './timer/kit';
import { HourglassFace, SunriseFace } from './timer/scenes';

export { mmss, SIZE } from './timer/kit';
export type { FaceProps } from './timer/kit';

export const TIMER_STYLES: { id: TimerStyle; label: string; icon: string }[] = [
  { id: 'ring', label: 'Halo', icon: 'ellipse-outline' },
  { id: 'aurora', label: 'Aurora', icon: 'color-palette-outline' },
  { id: 'heart', label: 'Heart', icon: 'heart-outline' },
  { id: 'bloom', label: 'Bloom', icon: 'flower-outline' },
  { id: 'liquid', label: 'Liquid', icon: 'water-outline' },
  { id: 'orbit', label: 'Galaxy', icon: 'planet-outline' },
  { id: 'flip', label: 'Flip clock', icon: 'albums-outline' },
  { id: 'hourglass', label: 'Hourglass', icon: 'hourglass-outline' },
  { id: 'sunrise', label: 'Sunrise', icon: 'partly-sunny-outline' },
];

export function TimerFace({ style, ...p }: FaceProps & { style: TimerStyle }) {
  switch (style) {
    case 'aurora': return <AuroraFace {...p} />;
    case 'heart': return <HeartFace {...p} />;
    case 'bloom': return <BloomFace {...p} />;
    case 'liquid': return <LiquidFace {...p} />;
    case 'flip': return <FlipFace {...p} />;
    case 'orbit': return <OrbitFace {...p} />;
    case 'hourglass': return <HourglassFace {...p} />;
    case 'sunrise': return <SunriseFace {...p} />;
    default: return <RingFace {...p} />;
  }
}
