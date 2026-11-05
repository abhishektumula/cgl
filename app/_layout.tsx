import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardDoneBar, Toast } from '../src/components/ui';
import { setupNotifications } from '../src/lib/notifications';
import { hydrate, useStore } from '../src/lib/store';
import { useColors } from '../src/lib/useTheme';

export default function RootLayout() {
  const colors = useColors();
  const hydrated = useStore((s) => s.hydrated);

  // root background (visible behind screens / keyboard on Android) follows the theme
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors]);

  const navTheme = useMemo(() => {
    const base = colors.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
    };
  }, [colors]);

  useEffect(() => {
    setupNotifications();
    hydrate();
  }, []);

  // Tapping a reminder opens the relevant screen (Plan for sessions, Focus for the timer).
  useEffect(() => {
    if (!hydrated) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string') setTimeout(() => router.push(url as any), 50);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={colors.dark ? 'light' : 'dark'} />
        {!hydrated ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ThemeProvider value={navTheme}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="breathe" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            </Stack>
          </ThemeProvider>
        )}
        <Toast />
        <KeyboardDoneBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
