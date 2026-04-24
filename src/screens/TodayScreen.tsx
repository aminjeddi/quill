import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const useNativeDriver = Platform.OS !== 'web';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPromptForCategories, Category } from '../data/categoryPrompts';
import { getToday, getAllEntries, createEntry, updateEntry, Entry } from '../db/database';
import { calculateStreak, formatStreak } from '../utils/streak';
import ShareCard from '../components/ShareCard';
import ScalePressable from '../components/ScalePressable';
import { useTheme, Colors } from '../context/ThemeContext';
import { WORD_GOAL_KEY } from './WritingGoalScreen';

interface Props {
  categories: Category[];
}

const wordCount = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

const TodayScreen = ({ categories }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState(0);

  // Entrance animation — fades in + slides up once per screen visit
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(10)).current;

  const animateIn = () => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        speed: 14,
        bounciness: 2,
        useNativeDriver,
      }),
    ]).start();
  };

  const load = async () => {
    setLoading(true);
    const [existing, allEntries, savedGoal] = await Promise.all([
      getToday(),
      getAllEntries(),
      AsyncStorage.getItem(WORD_GOAL_KEY),
    ]);
    setPrompt(getPromptForCategories(categories));
    setEntry(existing);
    setBody(existing?.body ?? '');
    setIsEditing(false);
    setStreak(calculateStreak(allEntries));
    setGoal(savedGoal ? parseInt(savedGoal, 10) : 0);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [categories]));

  // Animate content in after loading finishes
  useEffect(() => {
    if (!loading) animateIn();
  }, [loading]);

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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const showEditor = !entry || isEditing;
  const words = wordCount(body);
  const streakLabel = formatStreak(streak);
  const goalProgress = goal > 0 ? Math.min(words / goal, 1) : 0;
  const goalReached = goal > 0 && words >= goal;

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
        {/* Animate the whole content in */}
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.dateLabel}>{today.toUpperCase()}</Text>
            {streakLabel ? <Text style={styles.streakBadge}>{streakLabel}</Text> : null}
          </View>

          {prompt ? (
            <Text style={styles.prompt}>{prompt}</Text>
          ) : (
            <Text style={styles.freeformLabel}>Write freely.</Text>
          )}

          {showEditor ? (
            <>
              <TextInput
                style={styles.input}
                multiline
                placeholder={prompt ? 'Start writing…' : 'What\'s on your mind?'}
                placeholderTextColor={colors.placeholder}
                value={body}
                onChangeText={setBody}
                autoFocus={isEditing}
                textAlignVertical="top"
              />

              {/* Word count + goal */}
              <View style={styles.wordCountRow}>
                <Text style={styles.wordCount}>
                  {words} {words === 1 ? 'word' : 'words'}
                </Text>
                {goal > 0 && (
                  <Text style={[styles.goalLabel, goalReached && styles.goalReachedLabel]}>
                    {goalReached ? '🎉 Goal reached!' : `/ ${goal}`}
                  </Text>
                )}
              </View>

              {goal > 0 && (
                <View style={styles.goalBarTrack}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${goalProgress * 100}%` as any,
                        backgroundColor: goalReached ? '#4ade80' : colors.primary,
                      },
                    ]}
                  />
                </View>
              )}

              <ScalePressable
                style={[styles.button, !body.trim() && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!body.trim()}
              >
                <Text style={[styles.buttonText, { color: body.trim() ? colors.background : colors.secondaryText }]}>
                  Save
                </Text>
              </ScalePressable>

              {isEditing && (
                <ScalePressable
                  style={styles.cancelButton}
                  onPress={() => { setBody(entry?.body ?? ''); setIsEditing(false); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </ScalePressable>
              )}
            </>
          ) : (
            <>
              <Text style={styles.savedBody}>{entry!.body}</Text>

              <ScalePressable
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </ScalePressable>

              <View style={styles.shareSection}>
                <ShareCard entry={entry!} />
              </View>
            </>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  container: { padding: 24, paddingTop: 64, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateLabel: { fontSize: 13, color: c.secondaryText, letterSpacing: 0.5 },
  streakBadge: { fontSize: 13, color: c.primary, fontWeight: '600' },
  prompt: { fontSize: 22, fontWeight: '600', color: c.primary, lineHeight: 32, marginBottom: 28 },
  freeformLabel: { fontSize: 15, color: c.secondaryText, marginBottom: 28, fontStyle: 'italic' },
  input: {
    minHeight: 180,
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: c.primary,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
  },
  wordCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordCount: { fontSize: 13, color: c.tertiaryText },
  goalLabel: { fontSize: 13, color: c.secondaryText },
  goalReachedLabel: { color: '#4ade80' },
  goalBarTrack: {
    height: 3,
    backgroundColor: c.border,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  goalBarFill: { height: 3, borderRadius: 2 },
  button: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: c.disabled },
  buttonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  cancelText: { color: c.secondaryText, fontSize: 15 },
  savedBody: { fontSize: 16, color: c.bodyText, lineHeight: 26, marginBottom: 20 },
  editButton: {
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 4,
  },
  editButtonText: { color: c.primary, fontSize: 16, fontWeight: '500' },
  shareSection: { marginTop: 24 },
});

export default TodayScreen;
