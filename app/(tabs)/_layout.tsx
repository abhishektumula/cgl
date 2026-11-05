import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useColors } from '../../src/lib/useTheme';

function TabIcon({ name, color, focused }: { name: string; color: any; focused: boolean }) {
  return <Ionicons name={(focused ? name : `${name}-outline`) as any} size={23} color={color} />;
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: (p) => <TabIcon name='sunny' {...p} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: (p) => <TabIcon name='checkmark-circle' {...p} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: (p) => <TabIcon name='calendar-clear' {...p} /> }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus', tabBarIcon: (p) => <TabIcon name='timer' {...p} /> }} />
      <Tabs.Screen name="resources" options={{ title: 'Resources', tabBarIcon: (p) => <TabIcon name='bookmark' {...p} /> }} />
    </Tabs>
  );
}
