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

const ENTRY_NAME_PREFIX = 'quill_entry_name_';

const TodayScreen = ({ categories }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Prompted mode
  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState('');

  // Freeform mode
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [entryNames, setEntryNames] = useState<Record<string, string>>({});

  // New/edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditTarget, setModalEditTarget] = useState<Entry | null>(null);
  const [modalMode, setModalMode] = useState<'freeform' | 'prompted'>('freeform');

  // Shared
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [shareVisible, setShareVisible] = useState(false);
  const [shareEntry, setShareEntry] = useState<Entry | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsEntry, setOptionsEntry] = useState<Entry | null>(null);
  const [optionsEntryIsFreeform, setOptionsEntryIsFreeform] = useState(false);

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

  const loadFreeformEntries = async () => {
    const todays = await getTodayAll();
    const filtered = todays.filter(e => !e.prompt);
    setTodayEntries(filtered);
    const names: Record<string, string> = {};
    await Promise.all(
      filtered.map(async (e) => {
        const name = await AsyncStorage.getItem(ENTRY_NAME_PREFIX + e.id);
        if (name) names[e.id] = name;
      })
    );
    setEntryNames(names);
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
      // Pure freeform
      await loadFreeformEntries();
      setEntry(null);
      setBody('');
    } else {
      // Prompted (may also have freeform alongside)
      const todayStr = getTodayDateString();
      const existing = allEntries.find(e => e.date === todayStr && !!e.prompt) ?? null;
      setEntry(existing);
      setBody(existing?.body ?? '');
      // Also load freeform entries if freeform is selected alongside the prompt
      if (categories.includes('freeform')) {
        await loadFreeformEntries();
      } else {
        setTodayEntries([]);
      }
    }

    setStreak(calculateStreak(allEntries));
    setGoal(savedGoal ? parseInt(savedGoal, 10) : 0);
    setDisplayName(savedName ?? '');
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [categories]));
  useEffect(() => { if (!loading) animateIn(); }, [loading]);

  // Prompted mode save
  const handleSavePrompted = async (bodyText: string) => {
    if (!bodyText.trim()) return;
    if (entry) {
      await updateEntry(entry.id, bodyText.trim(), prompt);
    } else {
      await createEntry(prompt, bodyText.trim());
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await load();
  };

  // Modal save — handles both freeform and prompted entries
  const handleModalSave = async (title: string, bodyText: string, editTarget: Entry | null, mode: 'freeform' | 'prompted') => {
    if (!bodyText.trim()) return;
    if (mode === 'prompted') {
      if (editTarget) {
        await updateEntry(editTarget.id, bodyText.trim(), prompt);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } else {
      let savedId: string;
      if (editTarget) {
        await updateEntry(editTarget.id, bodyText.trim());
        savedId = editTarget.id;
      } else {
        const created = await createEntry('', bodyText.trim());
        savedId = created.id;
      }
      if (title.trim()) {
        await AsyncStorage.setItem(ENTRY_NAME_PREFIX + savedId, title.trim());
      } else {
        await AsyncStorage.removeItem(ENTRY_NAME_PREFIX + savedId);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadFreeformEntries();
    }
  };

  const handleDeleteFreeform = async (target: Entry) => {
    setOptionsVisible(false);
    setTodayEntries(prev => prev.filter(e => e.id !== target.id));
    await deleteEntry(target.id);
    await AsyncStorage.removeItem(ENTRY_NAME_PREFIX + target.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const openOptions = (e: Entry) => {
    setOptionsEntry(e);
    setOptionsEntryIsFreeform(!e.prompt); // freeform entries have empty prompt
    setOptionsVisible(true);
  };

  const handleOptionsEdit = () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    if (!optionsEntry.prompt) {
      // Freeform entry
      setModalMode('freeform');
    } else {
      // Prompted entry
      setModalMode('prompted');
    }
    setModalEditTarget(optionsEntry);
    setModalVisible(true);
  };



  const handleOptionsShare = () => {
    setOptionsVisible(false);
    setShareEntry(optionsEntry);
    setShareVisible(true);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return displayName ? `${base}, ${displayName}.` : `${base}.`;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const isFreeform = !prompt;
  const hasFreeform = categories.includes('freeform');
  const words = wordCount(body);
  const streakLabel = formatStreak(streak);
  const goalProgress = goal > 0 ? Math.min(words / goal, 1) : 0;
  const goalReached = goal > 0 && words >= goal;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, hasFreeform && styles.containerFreeform]}
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
              {todayEntries.length === 0 && (
                <Text style={styles.freeformLabel}>Tap + to start writing.</Text>
              )}
              {todayEntries.map((e, i) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  label={entryNames[e.id] || `Entry ${i + 1}`}
                  colors={colors}
                  styles={styles}
                  onOptions={() => openOptions(e)}
                />
              ))}
            </>

          ) : (
          /* ── PROMPTED MODE ────────────────────────────────────── */
            <>
              <Text style={styles.prompt}>{prompt}</Text>

              {!entry ? (
                /* No entry yet — inline editor */
                <>
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Start writing…"
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
                    onPress={() => handleSavePrompted(body)}
                    disabled={!body.trim()}
                  >
                    <Text style={[styles.buttonText, { color: body.trim() ? colors.background : colors.secondaryText }]}>
                      Save
                    </Text>
                  </ScalePressable>
                </>
              ) : (
                /* Entry exists — show as card (consistent with freeform) */
                <EntryCard
                  entry={entry}
                  label={null}
                  colors={colors}
                  styles={styles}
                  onOptions={() => openOptions(entry)}
                />
              )}

              {/* Freeform entries alongside prompted entry */}
              {hasFreeform && todayEntries.map((e, i) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  label={entryNames[e.id] || `Entry ${i + 1}`}
                  colors={colors}
                  styles={styles}
                  onOptions={() => openOptions(e)}
                />
              ))}
            </>
          )}

        </Animated.View>
      </ScrollView>

      {/* Floating + button — shown whenever freeform is a selected category */}
      {hasFreeform && (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <ScalePressable
            scaleTo={0.92}
            style={styles.fab}
            onPress={() => { setModalEditTarget(null); setModalVisible(true); }}
          >
            <Text style={styles.fabPlus}>+</Text>
          </ScalePressable>
        </View>
      )}

      {/* New/edit entry modal */}
      <NewEntryModal
        visible={modalVisible}
        mode={modalMode}
        promptText={prompt}
        editTarget={modalEditTarget}
        initialTitle={modalEditTarget && !modalEditTarget.prompt ? (entryNames[modalEditTarget.id] || '') : ''}
        initialBody={modalEditTarget?.body || ''}
        colors={colors}
        goal={goal}
        onSave={async (title, bodyText) => {
          const target = modalEditTarget;
          const mode = modalMode;
          setModalVisible(false);
          setModalEditTarget(null);
          await handleModalSave(title, bodyText, target, mode);
        }}
        onClose={() => { setModalVisible(false); setModalEditTarget(null); }}
      />

      <OptionsSheet
        visible={optionsVisible}
        colors={colors}
        isFreeform={optionsEntryIsFreeform}
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

// ─── New Entry Modal ──────────────────────────────────────────────────────────

const NewEntryModal = ({
  visible, mode, promptText, editTarget, initialTitle, initialBody, colors, goal, onSave, onClose,
}: {
  visible: boolean;
  mode: 'freeform' | 'prompted';
  promptText: string;
  editTarget: Entry | null;
  initialTitle: string;
  initialBody: string;
  colors: Colors;
  goal: number;
  onSave: (title: string, body: string) => void;
  onClose: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setBody(initialBody);
    }
  }, [visible]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const words = body.trim() === '' ? 0 : body.trim().split(/\s+/).length;
  const goalProgress = goal > 0 ? Math.min(words / goal, 1) : 0;
  const goalReached = goal > 0 && words >= goal;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[modalStyles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[modalStyles.headerDate, { color: colors.secondaryText }]}>{today}</Text>
          <ScalePressable scaleTo={0.9} style={modalStyles.doneBtn} onPress={() => onSave(title, body)}>
            <Text style={modalStyles.doneBtnText}>Done</Text>
          </ScalePressable>
        </View>

        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {mode === 'freeform' ? (
            /* Freeform: editable title + body */
            <>
              <TextInput
                style={[modalStyles.titleInput, { color: colors.primary }]}
                placeholder="Title"
                placeholderTextColor={colors.placeholder}
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="next"
              />
              <View style={[modalStyles.titleDivider, { backgroundColor: colors.border }]} />
            </>
          ) : (
            /* Prompted: show prompt as header, no title field */
            <>
              <Text style={[modalStyles.promptHeader, { color: colors.primary }]}>{promptText}</Text>
              <View style={[modalStyles.titleDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          <TextInput
            style={[modalStyles.bodyInput, { color: colors.primary }]}
            placeholder="Start writing…"
            placeholderTextColor={colors.placeholder}
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus={mode === 'prompted'}
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Footer: word count + goal bar */}
        <View style={[modalStyles.footer, { borderTopColor: colors.border }]}>
          {goal > 0 && (
            <View style={[modalStyles.goalBarTrack, { backgroundColor: colors.border }]}>
              <View style={[modalStyles.goalBarFill, { width: `${goalProgress * 100}%` as any, backgroundColor: goalReached ? '#4ade80' : '#A2D2FF' }]} />
            </View>
          )}
          <Text style={[modalStyles.wordCount, { color: colors.tertiaryText }]}>
            {words} {words === 1 ? 'word' : 'words'}
            {goal > 0 ? (goalReached ? '  🎉 Goal reached!' : `  / ${goal}`) : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerDate: { fontSize: 14, fontWeight: '500' },
  doneBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: '#A2D2FF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  titleInput: { fontSize: 24, fontWeight: '700', marginBottom: 12, padding: 0 },
  promptHeader: { fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: 12 },
  titleDivider: { height: 1, marginBottom: 16 },
  bodyInput: { fontSize: 17, lineHeight: 28, minHeight: 300, padding: 0 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  goalBarTrack: { height: 2, borderRadius: 1, marginBottom: 8, overflow: 'hidden' },
  goalBarFill: { height: 2, borderRadius: 1 },
  wordCount: { fontSize: 12 },
});

// ─── Entry Card ───────────────────────────────────────────────────────────────

const EntryCard = ({
  entry, label, colors, styles, onOptions,
}: {
  entry: Entry; label: string | null; colors: Colors; styles: any; onOptions: () => void;
}) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    {label ? <Text style={[styles.cardTitle, { color: colors.primary }]} numberOfLines={2}>{label}</Text> : null}
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
  visible, colors, isFreeform, onEdit, onShare, onDelete, onClose,
}: {
  visible: boolean; colors: Colors; isFreeform: boolean;
  onEdit: () => void; onShare: () => void;
  onDelete: () => void; onClose: () => void;
}) => {
  const slideY = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      slideY.setValue(300); overlayOpacity.setValue(0);
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
        <View style={optionStyles.handleWrap}><View style={optionStyles.handle} /></View>

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

        {isFreeform && (
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 48 },
  handleWrap: { alignItems: 'center', paddingTop: 12, marginBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, gap: 14 },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowIconWrap: { width: 24, alignItems: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 24 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const makeStyles = (c: Colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  container: { padding: 24, paddingTop: 64, flexGrow: 1 },
  containerFreeform: { paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 4 },
  dateLabel: { fontSize: 12, color: c.secondaryText, letterSpacing: 0.5 },
  streakBadge: { fontSize: 13, color: c.primary, fontWeight: '600' },
  prompt: { fontSize: 22, fontWeight: '600', color: c.primary, lineHeight: 32, marginBottom: 24 },
  freeformLabel: { fontSize: 15, color: c.secondaryText, marginBottom: 16, fontStyle: 'italic' },
  input: { minHeight: 160, backgroundColor: c.card, borderRadius: 12, padding: 16, fontSize: 16, color: c.primary, lineHeight: 24, borderWidth: 1, borderColor: c.border, marginBottom: 8 },
  wordCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  wordCount: { fontSize: 13, color: c.tertiaryText },
  goalLabel: { fontSize: 13, color: c.secondaryText },
  goalReachedLabel: { color: '#4ade80' },
  goalBarTrack: { height: 3, backgroundColor: c.border, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  goalBarFill: { height: 3, borderRadius: 2 },
  button: { backgroundColor: c.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: c.disabled },
  buttonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  cancelText: { color: c.secondaryText, fontSize: 15 },
  responseDivider: { height: 1, marginBottom: 20 },
  responseBody: { fontSize: 17, lineHeight: 28, marginBottom: 20 },
  responseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  responseDate: { fontSize: 12 },
  responseDotsBtn: { padding: 4 },
  responseDotsText: { fontSize: 17, letterSpacing: 2 },
  card: { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 22 },
  cardBody: { fontSize: 15, lineHeight: 23, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12 },
  cardDots: { padding: 4 },
  cardDotsText: { fontSize: 17, letterSpacing: 2 },
  fabWrap: { position: 'absolute', bottom: 40, right: 24 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#A2D2FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A2D2FF', shadowOpacity: 0.45, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  fabPlus: { fontSize: 30, color: '#fff', lineHeight: 34, fontWeight: '300' },
});

export default TodayScreen;
