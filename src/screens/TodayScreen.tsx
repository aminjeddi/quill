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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getPromptForCategories, Category } from '../data/categoryPrompts';
import { getToday, getAllEntries, createEntry, updateEntry, Entry } from '../db/database';
import { calculateStreak, formatStreak } from '../utils/streak';
import ShareCard from '../components/ShareCard';

interface Props {
  categories: Category[];
}

const wordCount = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

const TodayScreen = ({ categories }: Props) => {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);

  const load = async () => {
    setLoading(true);
    const [existing, allEntries] = await Promise.all([
      getToday(),
      getAllEntries(),
    ]);
    setPrompt(getPromptForCategories(categories));
    setEntry(existing);
    setBody(existing?.body ?? '');
    setIsEditing(false);
    setStreak(calculateStreak(allEntries));
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [categories]));

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
  const streakLabel = formatStreak(streak);

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
        {/* Header row: date + streak */}
        <View style={styles.headerRow}>
          <Text style={styles.dateLabel}>{today}</Text>
          {streakLabel ? <Text style={styles.streakBadge}>{streakLabel}</Text> : null}
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
            <View style={styles.shareSection}>
              <ShareCard entry={entry!} />
            </View>
          </>
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
  streakBadge: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
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
  button: { backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 12 },
  cancelText: { color: '#999', fontSize: 15 },
  savedBody: { fontSize: 16, color: '#333', lineHeight: 26, marginBottom: 20 },
  editButton: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 4,
  },
  editButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '500' },
  shareSection: { marginTop: 24 },
});

export default TodayScreen;
