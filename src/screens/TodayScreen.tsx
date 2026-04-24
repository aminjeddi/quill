import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { getPromptForCategory } from '../data/categoryPrompts';
import { getToday, createEntry, updateEntry, Entry } from '../db/database';
import {
  getSavedReminder,
  scheduleReminder,
  cancelReminder,
  requestPermission,
  formatTime,
  ReminderTime,
} from '../notifications/reminders';
import { TodayStackParamList } from '../navigation/TabNavigator';

type NavProp = NativeStackNavigationProp<TodayStackParamList, 'TodayMain'>;

interface Props {
  category: string;
}

const wordCount = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

const TodayScreen = ({ category }: Props) => {
  const navigation = useNavigation<NavProp>();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');

  const [reminder, setReminder] = useState<ReminderTime | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const load = async () => {
    setLoading(true);
    const [existing, savedReminder] = await Promise.all([getToday(), getSavedReminder()]);
    setPrompt(getPromptForCategory(category));
    setEntry(existing);
    setBody(existing?.body ?? '');
    setIsEditing(false);
    setReminder(savedReminder);
    if (savedReminder) {
      const d = new Date();
      d.setHours(savedReminder.hour, savedReminder.minute, 0, 0);
      setPickerDate(d);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [category]));

  const handleSave = async () => {
    if (!body.trim()) return;
    if (entry) {
      await updateEntry(entry.id, body.trim());
    } else {
      await createEntry(prompt, body.trim());
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await load();
  };

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) return;
      await scheduleReminder(pickerDate.getHours(), pickerDate.getMinutes());
      setReminder({ hour: pickerDate.getHours(), minute: pickerDate.getMinutes() });
    } else {
      await cancelReminder();
      setReminder(null);
    }
  };

  const handleTimeChange = async (_: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (!selected) return;
    setPickerDate(selected);
    if (reminder) {
      await scheduleReminder(selected.getHours(), selected.getMinutes());
      setReminder({ hour: selected.getHours(), minute: selected.getMinutes() });
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1a1a1a" />
      </View>
    );
  }

  const showEditor = !entry || isEditing;
  const words = wordCount(body);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header row: date + settings */}
        <View style={styles.headerRow}>
          <Text style={styles.dateLabel}>{today}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.prompt}>{prompt}</Text>

        {showEditor ? (
          <>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Start writing…"
              placeholderTextColor="#bbb"
              value={body}
              onChangeText={setBody}
              autoFocus={isEditing}
              textAlignVertical="top"
            />
            <Text style={styles.wordCount}>{words} {words === 1 ? 'word' : 'words'}</Text>
            <TouchableOpacity
              style={[styles.button, !body.trim() && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!body.trim()}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setBody(entry?.body ?? ''); setIsEditing(false); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.savedBody}>{entry!.body}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.reminderSection}>
          <View style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>Daily reminder</Text>
            <Switch
              value={!!reminder}
              onValueChange={handleReminderToggle}
              trackColor={{ false: '#e5e5e5', true: '#1a1a1a' }}
              thumbColor="#fff"
            />
          </View>
          {reminder && (
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.reminderTime}>
                {formatTime(reminder.hour, reminder.minute)} — tap to change
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showPicker && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={false}
            onChange={handleTimeChange}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fafaf8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafaf8' },
  container: { padding: 24, paddingTop: 64, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateLabel: { fontSize: 13, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase' },
  settingsIcon: { fontSize: 18, color: '#bbb' },
  prompt: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', lineHeight: 32, marginBottom: 28 },
  input: {
    minHeight: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 8,
  },
  wordCount: { fontSize: 13, color: '#bbb', textAlign: 'right', marginBottom: 16 },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 12 },
  cancelText: { color: '#999', fontSize: 15 },
  savedBody: { fontSize: 16, color: '#333', lineHeight: 26, marginBottom: 28 },
  editButton: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  editButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '500' },
  reminderSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#efefed',
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  reminderTime: { fontSize: 13, color: '#999', marginTop: 8 },
});

export default TodayScreen;
