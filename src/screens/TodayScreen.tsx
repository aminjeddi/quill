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
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const useNativeDriver = Platform.OS !== 'web';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPromptForCategories, Category } from '../data/categoryPrompts';
import {
  getTodayAll,
  getAllEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  Entry,
  getTodayDateString,
} from '../db/database';
import { calculateStreak, formatStreak } from '../utils/streak';
import ShareSheet from '../components/ShareSheet';
import ScalePressable from '../components/ScalePressable';
import { useTheme, Colors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { WORD_GOAL_KEY } from './WritingGoalScreen';
import { DISPLAY_NAME_KEY } from './OnboardingNameScreen';

interface Props {
  categories: Category[];
}

const wordCount = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
};

const TodayScreen = ({ categories }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Prompted mode
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Freeform mode
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Shared
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [shareVisible, setShareVisible] = useState(false);
  const [shareEntry, setShareEntry] = useState<Entry | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsEntry, setOptionsEntry] = useState<Entry | null>(null);

  // Entrance animation
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(10)).current;

  const animateIn = () => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver }),
      Animated.spring(contentTranslateY, { toValue: 0, speed: 14, bounciness: 2, useNativeDriver }),
    ]).start();
  };

  const load = async () => {
    setLoading(true);
    const [allEntries, savedGoal, savedName] = await Promise.all([
      getAllEntries(),
      AsyncStorage.getItem(WORD_GOAL_KEY),
      AsyncStorage.getItem(DISPLAY_NAME_KEY),
    ]);

    const promptStr = getPromptForCategories(categories);
    setPrompt(promptStr);

    if (!promptStr) {
      // Freeform mode: multiple entries per day (getTodayAll uses rowid ASC = insertion order)
      const todays = await getTodayAll();
      setTodayEntries(todays.filter(e => !e.prompt));
      setEntry(null);
      setIsEditing(false);
      if (!editingEntry) setBody('');
    } else {
      // Prompted mode: one entry per day
      const todayStr = getTodayDateString();
      const existing = allEntries.find(e => e.date === todayStr && !!e.prompt) ?? null;
      setEntry(existing);
      setBody(existing?.body ?? '');
      setIsEditing(false);
      setTodayEntries([]);
      setEditingEntry(null);
    }

    setStreak(calculateStreak(allEntries));
    setGoal(savedGoal ? parseInt(savedGoal, 10) : 0);
    setDisplayName(savedName ?? '');
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [categories]));

  useEffect(() => {
    if (!loading) animateIn();
  }, [loading]);

  const handleSave = async () => {
    if (!body.trim()) return;

    if (!prompt) {
      // Freeform
      if (editingEntry) {
        await updateEntry(editingEntry.id, body.trim());
        setEditingEntry(null);
      } else {
        await createEntry('', body.trim());
      }
      setBody('');
      // Reload today's freeform entries (rowid ASC = insertion order)
      const todays = await getTodayAll();
      setTodayEntries(todays.filter(e => !e.prompt));
    } else {
      // Prompted
      if (entry) {
        await updateEntry(entry.id, body.trim(), prompt);
      } else {
        await createEntry(prompt, body.trim());
      }
      await load();
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteFreeform = async (target: Entry) => {
    setOptionsVisible(false);
    setTodayEntries(prev => prev.filter(e => e.id !== target.id));
    await deleteEntry(target.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const openOptions = (e: Entry) => {
    setOptionsEntry(e);
    setOptionsVisible(true);
  };

  const handleOptionsEdit = () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    if (!prompt) {
      // Freeform: populate editor with this entry
      setEditingEntry(optionsEntry);
      setBody(optionsEntry.body);
    } else {
      setIsEditing(true);
    }
  };

  const handleOptionsShare = () => {
    setOptionsVisible(false);
    setShareEntry(optionsEntry);
    setShareVisible(true);
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return displayName ? `${base}, ${displayName}.` : `${base}.`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isFreeform = !prompt;
  const showEditor = isFreeform || !entry || isEditing;
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
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.dateLabel}>{today.toUpperCase()}</Text>
            </View>
            {streakLabel ? <Text style={styles.streakBadge}>{streakLabel}</Text> : null}
          </View>

          {/* ── FREEFORM MODE ─────────────────────────────────────── */}
          {isFreeform ? (
            <>
              {/* Saved entry cards */}
              {todayEntries.map((e, i) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  label={`Entry ${i + 1}`}
                  colors={colors}
                  styles={styles}
                  onOptions={() => openOptions(e)}
                />
              ))}

              {/* Editor */}
              <Text style={styles.freeformLabel}>
                {editingEntry
                  ? 'Editing…'
                  : todayEntries.length > 0
                  ? 'Write another…'
                  : 'Write freely.'}
              </Text>

              <TextInput
                style={styles.input}
                multiline
                placeholder="What's on your mind?"
                placeholderTextColor={colors.placeholder}
                value={body}
                onChangeText={setBody}
                textAlignVertical="top"
              />

              <View style={styles.wordCountRow}>
                <Text style={styles.wordCount}>{words} {words === 1 ? 'word' : 'words'}</Text>
                {goal > 0 && (
                  <Text style={[styles.goalLabel, goalReached && styles.goalReachedLabel]}>
                    {goalReached ? '🎉 Goal reached!' : `/ ${goal}`}
                  </Text>
                )}
              </View>

              {goal > 0 && (
                <View style={styles.goalBarTrack}>
                  <View style={[styles.goalBarFill, { width: `${goalProgress * 100}%` as any, backgroundColor: goalReached ? '#4ade80' : colors.primary }]} />
                </View>
              )}

              <ScalePressable
                style={[styles.button, !body.trim() && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!body.trim()}
              >
                <Text style={[styles.buttonText, { color: body.trim() ? colors.background : colors.secondaryText }]}>
                  {editingEntry ? 'Save changes' : 'Save'}
                </Text>
              </ScalePressable>

              {editingEntry && (
                <ScalePressable
                  style={styles.cancelButton}
                  onPress={() => { setEditingEntry(null); setBody(''); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </ScalePressable>
              )}
            </>

          ) : (
          /* ── PROMPTED MODE ────────────────────────────────────── */
            <>
              <Text style={styles.prompt}>{prompt}</Text>

              {showEditor ? (
                <>
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Start writing…"
                    placeholderTextColor={colors.placeholder}
                    value={body}
                    onChangeText={setBody}
                    autoFocus={isEditing}
                    textAlignVertical="top"
                  />

                  <View style={styles.wordCountRow}>
                    <Text style={styles.wordCount}>{words} {words === 1 ? 'word' : 'words'}</Text>
                    {goal > 0 && (
                      <Text style={[styles.goalLabel, goalReached && styles.goalReachedLabel]}>
                        {goalReached ? '🎉 Goal reached!' : `/ ${goal}`}
                      </Text>
                    )}
                  </View>

                  {goal > 0 && (
                    <View style={styles.goalBarTrack}>
                      <View style={[styles.goalBarFill, { width: `${goalProgress * 100}%` as any, backgroundColor: goalReached ? '#4ade80' : colors.primary }]} />
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
                /* Saved card */
                entry && (
                  <EntryCard
                    entry={entry}
                    label={prompt}
                    colors={colors}
                    styles={styles}
                    onOptions={() => openOptions(entry)}
                  />
                )
              )}
            </>
          )}

        </Animated.View>
      </ScrollView>

      <OptionsSheet
        visible={optionsVisible}
        colors={colors}
        showDelete={isFreeform}
        onEdit={handleOptionsEdit}
        onShare={handleOptionsShare}
        onDelete={() => optionsEntry && handleDeleteFreeform(optionsEntry)}
        onClose={() => setOptionsVisible(false)}
      />

      <ShareSheet
        visible={shareVisible}
        entry={shareEntry}
        onClose={() => setShareVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

// ─── Entry Card ───────────────────────────────────────────────────────────────

const EntryCard = ({
  entry,
  label,
  colors,
  styles,
  onOptions,
}: {
  entry: Entry;
  label: string;
  colors: Colors;
  styles: any;
  onOptions: () => void;
}) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.cardTitle, { color: colors.primary }]} numberOfLines={2}>{label}</Text>
    <Text style={[styles.cardBody, { color: colors.bodyText }]}>{entry.body}</Text>
    <View style={styles.cardFooter}>
      <Text style={[styles.cardDate, { color: colors.tertiaryText }]}>{formatDate(entry.date)}</Text>
      <ScalePressable scaleTo={0.8} onPress={onOptions} style={styles.cardDots}>
        <Text style={[styles.cardDotsText, { color: colors.secondaryText }]}>···</Text>
      </ScalePressable>
    </View>
  </View>
);

// ─── Options Sheet ────────────────────────────────────────────────────────────

const OptionsSheet = ({
  visible,
  colors,
  showDelete,
  onEdit,
  onShare,
  onDelete,
  onClose,
}: {
  visible: boolean;
  colors: Colors;
  showDelete: boolean;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
}) => {
  const slideY = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      slideY.setValue(300);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 6, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 300, speed: 28, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[optionStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[optionStyles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideY }] }]}>
        <View style={optionStyles.handleWrap}>
          <View style={optionStyles.handle} />
        </View>

        <ScalePressable style={optionStyles.row} onPress={onEdit}>
          <Text style={[optionStyles.rowIcon, { color: colors.primary }]}>✎</Text>
          <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Edit</Text>
        </ScalePressable>

        <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />

        <ScalePressable style={optionStyles.row} onPress={onShare}>
          <View style={optionStyles.rowIconWrap}>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Share</Text>
        </ScalePressable>

        {showDelete && (
          <>
            <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />
            <ScalePressable style={optionStyles.row} onPress={onDelete}>
              <Text style={[optionStyles.rowIcon, { color: '#ef4444' }]}>🗑</Text>
              <Text style={[optionStyles.rowLabel, { color: '#ef4444' }]}>Delete</Text>
            </ScalePressable>
          </>
        )}
      </Animated.View>
    </Modal>
  );
};

const optionStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 48,
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, marginBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    gap: 14,
  },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowIconWrap: { width: 24, alignItems: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 24 },
});

const makeStyles = (c: Colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  container: { padding: 24, paddingTop: 64, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 4 },
  dateLabel: { fontSize: 12, color: c.secondaryText, letterSpacing: 0.5 },
  streakBadge: { fontSize: 13, color: c.primary, fontWeight: '600' },
  prompt: { fontSize: 22, fontWeight: '600', color: c.primary, lineHeight: 32, marginBottom: 24 },
  freeformLabel: { fontSize: 15, color: c.secondaryText, marginBottom: 16, fontStyle: 'italic' },
  input: {
    minHeight: 160,
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
  // Entry card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 22 },
  cardBody: { fontSize: 15, lineHeight: 23, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12 },
  cardDots: { padding: 4 },
  cardDotsText: { fontSize: 17, letterSpacing: 2 },
});

export default TodayScreen;
