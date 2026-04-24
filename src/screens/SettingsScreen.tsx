import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, Category } from '../data/categoryPrompts';
import {
  getSavedReminder,
  scheduleReminder,
  cancelReminder,
  requestPermission,
  formatTime,
  ReminderTime,
} from '../notifications/reminders';

interface Props {
  currentCategories: Category[];
  onCategoryChange: (categories: Category[]) => void;
}

const SettingsScreen = ({ currentCategories, onCategoryChange }: Props) => {
  const [selected, setSelected] = useState<Category[]>(currentCategories);
  const [reminder, setReminder] = useState<ReminderTime | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  useFocusEffect(useCallback(() => {
    setSelected(currentCategories);
    getSavedReminder().then((saved) => {
      setReminder(saved);
      if (saved) {
        const d = new Date();
        d.setHours(saved.hour, saved.minute, 0, 0);
        setPickerDate(d);
      }
    });
  }, [currentCategories]));

  // ── Writing focus ──────────────────────────────────────────────────────────

  const handleToggleCategory = (key: Category) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    Haptics.selectionAsync();
  };

  const hasChanged = JSON.stringify([...selected].sort()) !== JSON.stringify([...currentCategories].sort());

  const handleSaveCategories = async () => {
    if (selected.length === 0) return;
    await AsyncStorage.setItem('quill_categories', JSON.stringify(selected));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCategoryChange(selected);
  };

  // ── Daily reminder ─────────────────────────────────────────────────────────

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) return;
      try {
        await scheduleReminder(pickerDate.getHours(), pickerDate.getMinutes());
      } catch {}
      setReminder({ hour: pickerDate.getHours(), minute: pickerDate.getMinutes() });
    } else {
      try {
        await cancelReminder();
      } catch {}
      setReminder(null);
    }
  };

  const handleTimeChange = async (_: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (!selected) return;
    setPickerDate(selected);
    if (reminder) {
      try {
        await scheduleReminder(selected.getHours(), selected.getMinutes());
      } catch {}
      setReminder({ hour: selected.getHours(), minute: selected.getMinutes() });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      {/* ── Writing focus ── */}
      <Text style={styles.sectionTitle}>Writing focus</Text>
      <Text style={styles.sectionSubtitle}>Select one or more to mix prompts from different styles.</Text>

      <View style={styles.cards}>
        {CATEGORIES.map((cat) => {
          const isSelected = selected.includes(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleToggleCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{cat.icon}</Text>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {cat.label}
                </Text>
                <Text style={styles.cardDescription}>{cat.description}</Text>
              </View>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (!hasChanged || selected.length === 0) && styles.buttonDisabled]}
        onPress={handleSaveCategories}
        disabled={!hasChanged || selected.length === 0}
      >
        <Text style={styles.saveButtonText}>Save focus</Text>
      </TouchableOpacity>

      {/* ── Daily reminder ── */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Daily reminder</Text>
      <Text style={styles.sectionSubtitle}>Get a nudge to write at a time that works for you.</Text>

      <View style={styles.reminderRow}>
        <Text style={styles.reminderLabel}>Remind me daily</Text>
        <Switch
          value={!!reminder}
          onValueChange={handleReminderToggle}
          trackColor={{ false: '#e5e5e5', true: '#1a1a1a' }}
          thumbColor="#fff"
        />
      </View>

      {reminder && (
        <TouchableOpacity style={styles.timeRow} onPress={() => setShowPicker(true)}>
          <Text style={styles.timeLabel}>Time</Text>
          <Text style={styles.timeValue}>{formatTime(reminder.hour, reminder.minute)} ›</Text>
        </TouchableOpacity>
      )}

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour={false}
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 24, paddingTop: 64 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#999', marginBottom: 20 },
  cards: { gap: 10, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    padding: 14,
  },
  cardSelected: { borderColor: '#1a1a1a', backgroundColor: '#f5f5f3' },
  cardIcon: { fontSize: 22, marginRight: 12 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 1 },
  cardLabelSelected: { color: '#1a1a1a' },
  cardDescription: { fontSize: 12, color: '#999' },
  checkmark: { fontSize: 15, color: '#1a1a1a', fontWeight: '700', marginLeft: 8 },
  saveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#efefed', marginVertical: 32 },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
    marginBottom: 10,
  },
  reminderLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  timeLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  timeValue: { fontSize: 15, color: '#999' },
  bottomPadding: { height: 48 },
});

export default SettingsScreen;
