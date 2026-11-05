/** Short, gentle lines. Nothing about pressure, ranks or competition. */
export const QUOTES = [
  'One page at a time.',
  'Slow progress is still progress.',
  'Rest is part of the plan.',
  'You\'re doing better than you think.',
  'Breathe. Then begin.',
  'Small steps, every day.',
  'Be kind to yourself today.',
  'Done is better than perfect.',
  'Just today. Only today.',
  'A calm mind remembers more.',
  'Showing up is enough.',
  'It\'s okay to go slowly.',
];

export const BREAK_TIPS = [
  'Drink some water',
  'Stretch your shoulders',
  'Look out of a window',
  'Take a few slow breaths',
  'Walk around a little',
  'Close your eyes for a minute',
  'Step into some sunlight',
];

export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const dailyPick = <T,>(arr: T[]) => {
  const d = new Date();
  return arr[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % arr.length];
};
