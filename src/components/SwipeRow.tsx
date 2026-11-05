import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useColors } from '../lib/useTheme';
import { IconName, tap } from './ui';

export interface SwipeAction {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}

/** Swipe left on a row to reveal actions (Edit / Move / Delete…). */
export function SwipeRow({ children, actions }: { children: ReactNode; actions: SwipeAction[] }) {
  const colors = useColors();
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={36}
      overshootRight={false}
      onSwipeableWillOpen={() => tap()}
      renderRightActions={(_p, _t, methods) => (
        <View style={{ flexDirection: 'row' }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => { methods.close(); a.onPress(); }}
              style={({ pressed }) => ({ width: 76, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: pressed ? 0.8 : 1 })}
            >
              <Ionicons name={a.icon} size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      childrenContainerStyle={{ backgroundColor: colors.card }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
