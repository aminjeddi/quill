import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  getSavedReminder,
  scheduleReminder,
  cancelReminder,
  requestPermission,
  formatTime,
  ReminderTime,
} from '../notifications/reminders';

const DailyReminderScreen = () => {
  const navigation = useNavigation();

  const [enabled, setEnabled] = useState(false);
  const [reminder, setReminder] = useState<ReminderTime | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    getSavedReminder().then((saved) => {
      setReminder(saved);
      setEnabled(!!saved);
      if (saved) {
        const d = new Date();
        d.setHours(saved.hour, saved.minute, 0, 0);
        setPickerDate(d);
      }
      setLoading(false);
    });
  }, []));

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Request permission first
      let granted = false;
      try {
        granted = await requestPermission();
      } catch {
        granted = false;
      }

      if (!granted) {
        Alert.alert(
          'Notifications off',
          'Enable notifications for Quill in your device Settings to use daily reminders.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Schedule at current pickerDate time
      try {
        await scheduleReminder(pickerDate.getHours(), pickerDate.getMinutes());
      } catch {}

      const newReminder = { hour: pickerDate.getHours(), minute: pickerDate.getMinutes() };
      setReminder(newReminder);
      setEnabled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      try {
        await cancelReminder();
      } catch {}
      setReminder(null);
      setEnabled(false);
      setShowPicker(false);
      Haptics.selectionAsync();
    }
  };

  const handleTimeChange = async (_: any, selected?: Date) => {
    // On Android the picker dismisses itself; on iOS it stays open
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selected) return;

    setPickerDate(selected);

    // Only reschedule if reminder is already on
    if (enabled) {
      try {
        await scheduleReminder(selected.getHours(), selected.getMinutes());
      } catch {}
      setReminder({ hour: selected.getHours(), minute: selected.getMinutes() });
    }
  };

  if (loading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ Settings</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Daily reminder</Text>
        <Text style={styles.subtitle}>
          Get a nudge to open Quill and write at a time that works for you.
        </Text>

        {/* Toggle row */}
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Remind me daily</Text>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#e5e5e5', true: '#1a1a1a' }}
              thumbColor="#fff"
            />
          </View>

          {enabled && (
            <>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => setShowPicker((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>Time</Text>
                <View style={styles.timeRight}>
                  <Text style={styles.timeValue}>
                    {reminder ? formatTime(reminder.hour, reminder.minute) : formatTime(pickerDate.getHours(), pickerDate.getMinutes())}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Time picker — shown inline on iOS, as dialog on Android */}
        {showPicker && enabled && (
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={false}
              onChange={handleTimeChange}
              style={styles.picker}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {enabled && (
          <Text style={styles.hint}>
            You'll receive a notification every day at {reminder ? formatTime(reminder.hour, reminder.minute) : '—'}.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  back: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 4 },
  backText: { fontSize: 16, color: '#999' },
  content: { padding: 24, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#999', lineHeight: 20, marginBottom: 28 },
  group: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
    marginBottom: 16,
  },
  separator: { height: 1, backgroundColor: '#f0f0ee', marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  timeRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeValue: { fontSize: 15, color: '#999' },
  chevron: { fontSize: 20, color: '#ccc' },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
    marginBottom: 16,
  },
  picker: { width: '100%' },
  doneButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  doneText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  hint: { fontSize: 13, color: '#bbb', textAlign: 'center', lineHeight: 18 },
});

export default DailyReminderScreen;
