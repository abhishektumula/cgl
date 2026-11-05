import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { formatDate, formatTime, fromKey, toHHMM, toKey } from '../lib/dates';
import { useColors } from '../lib/useTheme';
import { Button, tap } from './ui';

/**
 * Opens the native date / time picker. `variant="chip"` renders a small pill (used in compact toolbars),
 * otherwise a full-width field.
 */
export function DateField({ mode = 'date', value, onChange, placeholder = 'Date', clearable, variant = 'field' }: {
  mode?: 'date' | 'time';
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  clearable?: boolean;
  variant?: 'field' | 'chip';
}) {
  const colors = useColors();
  const [iosOpen, setIosOpen] = useState(false);
  const toDate = () => {
    if (mode === 'date') return value ? fromKey(value) : new Date();
    const d = new Date();
    if (value) {
      const [h, m] = value.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  };
  const [temp, setTemp] = useState<Date>(toDate());
  const emit = (d: Date) => onChange(mode === 'date' ? toKey(d) : toHHMM(d));

  const open = () => {
    tap();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(), mode, is24Hour: false,
        onChange: (e, d) => { if (e.type === 'set' && d) emit(d); },
      });
    } else {
      setTemp(toDate());
      setIosOpen(true);
    }
  };

  const text = value ? (mode === 'date' ? formatDate(value) : formatTime(value)) : placeholder;
  const icon = mode === 'date' ? 'calendar-outline' : 'time-outline';

  return (
    <>
      {variant === 'chip' ? (
        <Pressable onPress={open} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
          backgroundColor: value ? colors.primarySoft : colors.muted,
        }}>
          <Ionicons name={icon} size={14} color={value ? colors.primary : colors.sub} />
          <Text style={{ fontSize: 14, fontWeight: value ? '600' : '500', color: value ? colors.primary : colors.sub }}>{text}</Text>
          {clearable && value && (
            <Pressable hitSlop={10} onPress={() => onChange(undefined)}>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          )}
        </Pressable>
      ) : (
        <Pressable onPress={open} style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}>
          <Ionicons name={icon} size={18} color={value ? colors.text : colors.faint} />
          <Text style={{ flex: 1, fontSize: 16, color: value ? colors.text : colors.faint }}>{text}</Text>
          {clearable && value && (
            <Pressable hitSlop={10} onPress={() => onChange(undefined)}>
              <Ionicons name="close-circle" size={18} color={colors.faint} />
            </Pressable>
          )}
        </Pressable>
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 20 }} onPress={() => setIosOpen(false)}>
            <Pressable style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 }}>
              <DateTimePicker
                value={temp}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                onChange={(_, d) => d && setTemp(d)}
                accentColor={colors.primary}
                themeVariant={colors.dark ? 'dark' : 'light'}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setIosOpen(false)} />
                <Button title="Done" style={{ flex: 1 }} onPress={() => { emit(temp); setIosOpen(false); }} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
