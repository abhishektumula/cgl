import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  Animated as RNAnimated, InputAccessoryView, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { priorityMeta, radius } from '../lib/theme';
import { undoToast, useToast } from '../lib/toast';
import { Priority } from '../lib/types';
import { useColors } from '../lib/useTheme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const tap = () => Haptics.selectionAsync().catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

/* ---------------- Header ---------------- */

export function Header({ title, subtitle, back, right, color }: {
  title: string; subtitle?: string; back?: boolean; right?: ReactNode; color?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + (back ? 4 : 14), paddingHorizontal: 20, paddingBottom: 10, gap: 2 }}>
      {back && (
        <Pressable hitSlop={12} onPress={() => router.back()} style={{ marginLeft: -6, marginBottom: 6, alignSelf: 'flex-start' }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {color && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />}
        <Text style={{ flex: 1, fontSize: 30, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      {!!subtitle && <Text style={{ fontSize: 14, color: colors.sub }}>{subtitle}</Text>}
    </View>
  );
}

/* ---------------- Containers ---------------- */

export function Group({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useColors();
  return (
    <View style={[{
      backgroundColor: colors.card, borderRadius: radius, overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    }, style]}>
      {children}
    </View>
  );
}

export function Divider({ inset = 16 }: { inset?: number }) {
  const colors = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

export function Row({ children, onPress, onLongPress, style }: {
  children: ReactNode; onPress?: () => void; onLongPress?: () => void; style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.card },
        pressed && { backgroundColor: colors.muted },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 2, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.sub }}>{children}</Text>
      {right}
    </View>
  );
}

/* ---------------- Controls ---------------- */

export function Button({ title, onPress, icon, variant = 'primary', style, disabled }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle; disabled?: boolean;
}) {
  const colors = useColors();
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.muted, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.sub },
    danger: { bg: 'transparent', fg: colors.danger },
  }[variant];
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, paddingHorizontal: 20, borderRadius: 999, backgroundColor: v.bg,
        opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
      }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={v.fg} />}
      <Text style={{ fontSize: 16, fontWeight: '600', color: v.fg }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color, size = 22, style }: {
  icon: IconName; onPress: () => void; color?: string; size?: number; style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <Pressable hitSlop={10} onPress={onPress} style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.5 : 1 }, style]}>
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

export function Fab({ onPress, icon = 'add' }: { onPress: () => void; icon?: IconName }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: colors.shadow, shadowOpacity: colors.dark ? 0 : 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
      })}
    >
      <Ionicons name={icon} size={28} color={colors.onPrimary} />
    </Pressable>
  );
}

/** Round checkbox with a little bounce + ripple ring when completed. */
export function Checkbox({ checked, onToggle, color, size = 24 }: {
  checked: boolean; onToggle: () => void; color?: string; size?: number;
}) {
  const colors = useColors();
  const c = color ?? colors.primary;
  const fill = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(checked ? 1 : 0, { duration: 220 });
  }, [checked, fill]);

  const press = () => {
    if (!checked) {
      success();
      scale.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 260 }));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 550 });
    } else tap();
    onToggle();
  };

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value, transform: [{ scale: 0.4 + 0.6 * fill.value }] }));
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value > 0 && ring.value < 1 ? 0.6 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 1.1 }],
  }));

  return (
    <Pressable hitSlop={12} onPress={press}>
      <Animated.View style={[{ width: size, height: size }, boxStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: c }, ringStyle]} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 1.5, borderColor: checked ? c : colors.faint }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }, fillStyle]}>
          <Ionicons name="checkmark" size={size - 8} color={colors.card} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color, icon, dot }: {
  label: string; active?: boolean; onPress?: () => void; color?: string; icon?: IconName; dot?: string;
}) {
  const colors = useColors();
  const c = color ?? colors.primary;
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: active ? c + (colors.dark ? '33' : '1F') : colors.muted, maxWidth: 240,
      }}
    >
      {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}
      {icon && <Ionicons name={icon} size={14} color={active ? c : colors.sub} />}
      <Text style={{ fontSize: 14, fontWeight: active ? '600' : '500', color: active ? c : colors.sub }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function PriorityFlag({ priority, size = 12 }: { priority: Priority; size?: number }) {
  const colors = useColors();
  if (priority === 'none') return null;
  return <Ionicons name="flag" size={size} color={priorityMeta(priority, colors).color} />;
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const colors = useColors();
  return (
    <View style={layout.row}>
      {(['high', 'medium', 'low', 'none'] as Priority[]).map((p) => (
        <Chip key={p} label={p === 'none' ? 'None' : priorityMeta(p, colors).label} active={value === p}
          color={p === 'none' ? colors.sub : priorityMeta(p, colors).color} icon={p === 'none' ? undefined : 'flag'} onPress={() => onChange(p)} />
      ))}
    </View>
  );
}

export function ProgressBar({ value, color, height = 3 }: { value: number; color?: string; height?: number }) {
  const colors = useColors();
  const w = useSharedValue(value);
  useEffect(() => { w.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 400 }); }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, backgroundColor: colors.muted, borderRadius: height, overflow: 'hidden' }}>
      <Animated.View style={[{ height, backgroundColor: color ?? colors.primary, borderRadius: height }, style]} />
    </View>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const colors = useColors();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label && <Label>{label}</Label>}
      <TextInput
        placeholderTextColor={colors.faint}
        keyboardAppearance={colors.dark ? 'dark' : 'light'} inputAccessoryViewID={KEYBOARD_DONE_ID}
        style={[{
          backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text,
        }, rest.multiline && { minHeight: 80, textAlignVertical: 'top' }, style]}
        {...rest}
      />
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={{ fontSize: 13, fontWeight: '600', color: colors.sub }}>{children}</Text>;
}

export function EmptyState({ icon, title, action }: { icon: IconName; title: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: 10 }}>
      <Ionicons name={icon} size={28} color={colors.faint} />
      <Text style={{ fontSize: 15, color: colors.sub, textAlign: 'center' }}>{title}</Text>
      {action}
    </View>
  );
}

/** iOS keyboards (number pads, multi-line fields) have no "close" key – this bar adds a Done button above them. */
export const KEYBOARD_DONE_ID = 'keyboard-done';

export function KeyboardDoneBar() {
  const colors = useColors();
  if (Platform.OS !== 'ios') return null; // Android keyboards have their own close / back button
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID} backgroundColor={colors.card}>
      <View style={{
        flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
      }}>
        <Pressable hitSlop={12} onPress={() => Keyboard.dismiss()}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/**
 * Bottom sheet built on Modal – used for every form in the app.
 * Close it with the ✕ button, by tapping outside, by swiping the top bar down, or with Android back.
 */
export function Sheet({ visible, onClose, title, children, footer }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [drag] = useState(() => new RNAnimated.Value(0));

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);

  // swipe the top bar down to dismiss
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 90 || g.vy > 0.8) close();
      else RNAnimated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
    onPanResponderTerminate: () => RNAnimated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, minHeight: 60, backgroundColor: colors.backdrop }} onPress={close} />
        <RNAnimated.View style={{
          backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
          paddingHorizontal: 20, maxHeight: '88%', paddingBottom: Math.max(insets.bottom, 16),
          transform: [{ translateY: drag }],
        }}>
          <View {...pan.panHandlers} style={{ paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={1}>{title ?? ''}</Text>
              <Pressable
                hitSlop={12}
                onPress={close}
                accessibilityLabel="Close"
                style={({ pressed }) => ({
                  width: 30, height: 30, borderRadius: 15, backgroundColor: colors.muted,
                  alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="close" size={18} color={colors.sub} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={{ paddingTop: 12 }}>{footer}</View>}
        </RNAnimated.View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </Modal>
  );
}

/** Floating "Deleted · Undo" toast. Mounted once in the root layout. */
export function Toast() {
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 70, alignItems: 'center' }}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999,
        backgroundColor: colors.dark ? '#EAE9E4' : '#2A2A28',
      }}>
        <Text style={{ color: colors.dark ? '#1D1D1B' : '#F7F6F3', fontSize: 14 }}>{toast.message}</Text>
        {toast.undo && (
          <Pressable hitSlop={10} onPress={undoToast}>
            <Text style={{ color: colors.dark ? colors.onPrimary : '#A9D1C2', fontWeight: '700', fontSize: 14 }}>Undo</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
