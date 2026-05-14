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
import ShareSheet from '../components/ShareSheet';
import ScalePressable from '../components/ScalePressable';
import { useTheme, Colors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { WORD_GOAL_KEY } from './WritingGoalScreen';
import { exportEntryAsPdf } from '../utils/exportPdf';

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
const MAX_REFRESHES = 3;
const REFRESH_OFFSET_KEY = (d: string) => `quill_refresh_offset_${d}`;
const REFRESH_COUNT_KEY  = (d: string) => `quill_refresh_count_${d}`;

const TodayScreen = ({ categories }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Main prompted entry
  const [entry, setEntry] = useState<Entry | null>(null);
  const [body, setBody] = useState('');

  // Additional entries (freeform + extra prompted via + button)
  const [additionalEntries, setAdditionalEntries] = useState<Entry[]>([]);
  const [entryNames, setEntryNames] = useState<Record<string, string>>({});

  // Modals
  const [choiceVisible, setChoiceVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditTarget, setModalEditTarget] = useState<Entry | null>(null);
  const [modalMode, setModalMode] = useState<'freeform' | 'prompted'>('freeform');
  const [modalPrompt, setModalPrompt] = useState('');

  // Shared
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [goal, setGoal] = useState(0);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareEntry, setShareEntry] = useState<Entry | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsEntry, setOptionsEntry] = useState<Entry | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameEntry, setRenameEntry] = useState<Entry | null>(null);

  // Prompt refresh
  const [promptOffset, setPromptOffset] = useState(0);
  const [refreshesLeft, setRefreshesLeft] = useState(MAX_REFRESHES);

  // Refresh animations
  const iconRotAnim     = useRef(new Animated.Value(0)).current;
  const rotCount        = useRef(0);
  const promptOpacityAnim = useRef(new Animated.Value(1)).current;
  const promptSlideAnim   = useRef(new Animated.Value(0)).current;
  const iconSpin = iconRotAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  // Entrance animation
  const contentOpacity   = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(10)).current;

  const animateIn = () => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver }),
      Animated.spring(contentTranslateY, { toValue: 0, speed: 14, bounciness: 2, useNativeDriver }),
    ]).start();
  };

  // Load all additional entries for today (everything except the main prompted entry)
  const loadAdditionalEntries = async (mainEntryId?: string) => {
    const todays = await getTodayAll();
    const others = mainEntryId ? todays.filter(e => e.id !== mainEntryId) : todays;
    setAdditionalEntries(others);
    const names: Record<string, string> = {};
    await Promise.all(
      others.map(async (e) => {
        const name = await AsyncStorage.getItem(ENTRY_NAME_PREFIX + e.id);
        if (name) names[e.id] = name;
      })
    );
    setEntryNames(names);
  };

  const load = async () => {
    setLoading(true);
    const todayStr = getTodayDateString();
    const [allEntries, savedGoal, savedOffset, savedCount] = await Promise.all([
      getAllEntries(),
      AsyncStorage.getItem(WORD_GOAL_KEY),
      AsyncStorage.getItem(REFRESH_OFFSET_KEY(todayStr)),
      AsyncStorage.getItem(REFRESH_COUNT_KEY(todayStr)),
    ]);

    const offsetRaw = savedOffset ? parseInt(savedOffset, 10) : 0;
    const countRaw  = savedCount  ? parseInt(savedCount,  10) : 0;
    setPromptOffset(offsetRaw);
    setRefreshesLeft(MAX_REFRESHES - countRaw);

    const promptStr = getPromptForCategories(categories, offsetRaw);
    setPrompt(promptStr);

    const existing = allEntries.find(e => e.date === todayStr && !!e.prompt) ?? null;
    setEntry(existing);
    setBody(existing?.body ?? '');

    await loadAdditionalEntries(existing?.id);

    setGoal(savedGoal ? parseInt(savedGoal, 10) : 0);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [categories]));
  useEffect(() => { if (!loading) animateIn(); }, [loading]);

  // Save the main inline prompted entry
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

  // Save from the modal (handles both freeform and extra prompted entries)
  const handleModalSave = async (title: string, bodyText: string, editTarget: Entry | null, mode: 'freeform' | 'prompted', mPrompt: string) => {
    if (!bodyText.trim()) return;
    if (mode === 'prompted') {
      if (editTarget) {
        await updateEntry(editTarget.id, bodyText.trim(), mPrompt);
      } else {
        await createEntry(mPrompt, bodyText.trim());
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
      await loadAdditionalEntries(entry?.id);
    }
  };

  const handleDelete = async () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    if (!optionsEntry.prompt) {
      // Freeform / additional entry
      setAdditionalEntries(prev => prev.filter(e => e.id !== optionsEntry.id));
      await deleteEntry(optionsEntry.id);
      await AsyncStorage.removeItem(ENTRY_NAME_PREFIX + optionsEntry.id);
    } else {
      // Main prompted entry
      await deleteEntry(optionsEntry.id);
      setEntry(null);
      setBody('');
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const openOptions = (e: Entry) => {
    setOptionsEntry(e);
    setOptionsVisible(true);
  };

  const openOptionsWithHaptic = (e: Entry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openOptions(e);
  };

  const handleOptionsEdit = () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    if (!optionsEntry.prompt) {
      setModalMode('freeform');
      setModalPrompt('');
    } else {
      setModalMode('prompted');
      setModalPrompt(optionsEntry.prompt);
    }
    setModalEditTarget(optionsEntry);
    setModalVisible(true);
  };

  const handleOptionsShare = () => {
    setOptionsVisible(false);
    setShareEntry(optionsEntry);
    setShareVisible(true);
  };

  const handleOptionsRename = () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    setRenameEntry(optionsEntry);
    setRenameVisible(true);
  };

  const handleRenameSave = async (newTitle: string) => {
    if (!renameEntry) return;
    setRenameVisible(false);
    const trimmed = newTitle.trim();
    if (trimmed) {
      await AsyncStorage.setItem(ENTRY_NAME_PREFIX + renameEntry.id, trimmed);
    } else {
      await AsyncStorage.removeItem(ENTRY_NAME_PREFIX + renameEntry.id);
    }
    setEntryNames(prev => ({ ...prev, [renameEntry.id]: trimmed }));
    setRenameEntry(null);
  };

  const handleOptionsExportPdf = async () => {
    if (!optionsEntry) return;
    setOptionsVisible(false);
    const title = !optionsEntry.prompt ? (entryNames[optionsEntry.id] || '') : undefined;
    await exportEntryAsPdf(optionsEntry, title);
  };

  // Pick the next prompt for an additional prompted entry
  const getNextPrompt = () => {
    const extraCount = additionalEntries.filter(e => !!e.prompt).length;
    return getPromptForCategories(categories, promptOffset + extraCount + 1);
  };

  // Open modal from the + choice sheet
  const handleChoicePrompt = () => {
    setChoiceVisible(false);
    setModalPrompt(getNextPrompt());
    setModalMode('prompted');
    setModalEditTarget(null);
    setModalVisible(true);
  };

  const handleChoiceFreeform = () => {
    setChoiceVisible(false);
    setModalPrompt('');
    setModalMode('freeform');
    setModalEditTarget(null);
    setModalVisible(true);
  };

  const applyNewPrompt = (newOffset: number, newLeft: number) => {
    const newPrompt = getPromptForCategories(categories, newOffset);
    setPromptOffset(newOffset);
    setPrompt(newPrompt);
    setRefreshesLeft(newLeft);
  };

  const handleRefresh = () => {
    if (refreshesLeft <= 0 || !!entry) return;
    Haptics.selectionAsync();

    const newOffset = promptOffset + 1;
    const newLeft   = refreshesLeft - 1;
    const todayStr  = getTodayDateString();

    AsyncStorage.setItem(REFRESH_OFFSET_KEY(todayStr), String(newOffset));
    AsyncStorage.setItem(REFRESH_COUNT_KEY(todayStr),  String(MAX_REFRESHES - newLeft));

    rotCount.current += 1;
    Animated.spring(iconRotAnim, {
      toValue: rotCount.current * 360,
      speed: 14, bounciness: 4, useNativeDriver,
    }).start();

    Animated.timing(promptOpacityAnim, { toValue: 0, duration: 150, useNativeDriver }).start(() => {
      applyNewPrompt(newOffset, newLeft);
      promptSlideAnim.setValue(10);
      Animated.parallel([
        Animated.timing(promptOpacityAnim, { toValue: 1, duration: 220, useNativeDriver }),
        Animated.spring(promptSlideAnim, { toValue: 0, speed: 18, bounciness: 3, useNativeDriver }),
      ]).start();
    });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const words = wordCount(body);
  const goalProgress = goal > 0 ? Math.min(words / goal, 1) : 0;
  const goalReached = goal > 0 && words >= goal;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>

          {/* Daily prompt */}
          <Animated.View style={{ opacity: promptOpacityAnim, transform: [{ translateY: promptSlideAnim }] }}>
            <Text style={styles.prompt}>{prompt}</Text>
          </Animated.View>

          {/* Refresh — only before entry saved */}
          {!entry && (
            <View style={styles.refreshRow}>
              <ScalePressable
                scaleTo={0.88}
                style={[styles.refreshBtn, refreshesLeft === 0 && styles.refreshBtnDim]}
                onPress={handleRefresh}
                disabled={refreshesLeft === 0}
              >
                <Animated.View style={{ transform: [{ rotate: iconSpin }] }}>
                  <Ionicons name="refresh" size={13} color={colors.secondaryText} />
                </Animated.View>
                <Text style={styles.refreshText}>
                  {refreshesLeft === 0 ? 'No more today' : `New prompt · ${refreshesLeft} left`}
                </Text>
              </ScalePressable>
            </View>
          )}

          {/* Inline editor or saved card for main entry */}
          {!entry ? (
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
            <EntryCard
              entry={entry}
              label={null}
              colors={colors}
              styles={styles}
              onOptions={() => openOptions(entry)}
              onLongPress={() => openOptionsWithHaptic(entry)}
            />
          )}

          {/* Additional entries (freeform + extra prompted) */}
          {additionalEntries.map((e, i) => (
            <EntryCard
              key={e.id}
              entry={e}
              label={!e.prompt ? (entryNames[e.id] || 'Untitled') : null}
              colors={colors}
              styles={styles}
              onOptions={() => openOptions(e)}
              onLongPress={() => openOptionsWithHaptic(e)}
            />
          ))}

        </Animated.View>
      </ScrollView>

      {/* Floating + button — always visible */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <ScalePressable
          scaleTo={0.92}
          style={styles.fab}
          onPress={() => setChoiceVisible(true)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </ScalePressable>
      </View>

      {/* Entry type choice sheet */}
      <EntryTypeSheet
        visible={choiceVisible}
        colors={colors}
        onPrompt={handleChoicePrompt}
        onFreeform={handleChoiceFreeform}
        onClose={() => setChoiceVisible(false)}
      />

      {/* New/edit entry modal */}
      <NewEntryModal
        visible={modalVisible}
        mode={modalMode}
        promptText={modalPrompt}
        editTarget={modalEditTarget}
        initialTitle={modalEditTarget && !modalEditTarget.prompt ? (entryNames[modalEditTarget.id] || '') : ''}
        initialBody={modalEditTarget?.body || ''}
        colors={colors}
        goal={goal}
        onSave={async (title, bodyText) => {
          const target = modalEditTarget;
          const mode = modalMode;
          const mPrompt = modalPrompt;
          setModalVisible(false);
          setModalEditTarget(null);
          await handleModalSave(title, bodyText, target, mode, mPrompt);
        }}
        onClose={() => { setModalVisible(false); setModalEditTarget(null); }}
      />

      <OptionsSheet
        visible={optionsVisible}
        colors={colors}
        isFreeform={!!optionsEntry && !optionsEntry.prompt}
        onEdit={handleOptionsEdit}
        onRename={handleOptionsRename}
        onShare={handleOptionsShare}
        onExportPdf={handleOptionsExportPdf}
        onDelete={handleDelete}
        onClose={() => setOptionsVisible(false)}
      />

      <RenameSheet
        visible={renameVisible}
        colors={colors}
        initialTitle={renameEntry ? (entryNames[renameEntry.id] || '') : ''}
        onSave={handleRenameSave}
        onClose={() => { setRenameVisible(false); setRenameEntry(null); }}
      />

      <ShareSheet
        visible={shareVisible}
        entry={shareEntry}
        onClose={() => setShareVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

// ─── Entry Type Choice Sheet ──────────────────────────────────────────────────

const EntryTypeSheet = ({
  visible, colors, onPrompt, onFreeform, onClose,
}: {
  visible: boolean; colors: Colors;
  onPrompt: () => void; onFreeform: () => void; onClose: () => void;
}) => {
  const slideY         = useRef(new Animated.Value(320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver   = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      slideY.setValue(320); overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 320, speed: 30, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[choiceStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[choiceStyles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideY }] }]}>
        <View style={choiceStyles.handleWrap}>
          <View style={[choiceStyles.handle, { backgroundColor: colors.border }]} />
        </View>
        <Text style={[choiceStyles.sheetTitle, { color: colors.secondaryText }]}>New entry</Text>

        {/* Option 1: prompted */}
        <ScalePressable scaleTo={0.97} style={[choiceStyles.option, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onPrompt}>
          <View style={choiceStyles.optionIconWrap}>
            <Text style={choiceStyles.optionIcon}>💡</Text>
          </View>
          <View style={choiceStyles.optionText}>
            <Text style={[choiceStyles.optionTitle, { color: colors.primary }]}>Write with a prompt</Text>
            <Text style={[choiceStyles.optionSub, { color: colors.secondaryText }]}>Get a prompt from your categories</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </ScalePressable>

        {/* Option 2: freeform */}
        <ScalePressable scaleTo={0.97} style={[choiceStyles.option, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onFreeform}>
          <View style={choiceStyles.optionIconWrap}>
            <Text style={choiceStyles.optionIcon}>✏️</Text>
          </View>
          <View style={choiceStyles.optionText}>
            <Text style={[choiceStyles.optionTitle, { color: colors.primary }]}>Freeform</Text>
            <Text style={[choiceStyles.optionSub, { color: colors.secondaryText }]}>No prompt. Just write.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </ScalePressable>
      </Animated.View>
    </Modal>
  );
};

const choiceStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 48, paddingHorizontal: 20,
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, marginBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 16, marginTop: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  optionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A2D2FF22', alignItems: 'center', justifyContent: 'center' },
  optionIcon: { fontSize: 18 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  optionSub: { fontSize: 13 },
});

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
  const hasContent = body.trim().length > 0 && (mode !== 'freeform' || title.trim().length > 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[modalStyles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[modalStyles.headerDate, { color: colors.secondaryText }]}>{today}</Text>
          <ScalePressable scaleTo={0.9} style={modalStyles.doneBtn} onPress={() => onSave(title, body)}>
            <Text style={[modalStyles.doneBtnText, { color: hasContent ? (colors.statusBar === 'light' ? '#A2D2FF' : '#1a6eb5') : (colors.statusBar === 'light' ? '#3a5a75' : '#A2D2FF') }]}>Done</Text>
          </ScalePressable>
        </View>

        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {mode === 'freeform' ? (
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
  doneBtnText: { fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  titleInput: { fontSize: 24, fontWeight: '600', marginBottom: 12, padding: 0, letterSpacing: -0.4 },
  promptHeader: { fontSize: 20, fontWeight: '600', lineHeight: 28, marginBottom: 12, letterSpacing: -0.3 },
  titleDivider: { height: 1, marginBottom: 16 },
  bodyInput: { fontSize: 17, lineHeight: 28, minHeight: 300, padding: 0 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1 },
  goalBarTrack: { height: 2, borderRadius: 1, marginBottom: 8, overflow: 'hidden' },
  goalBarFill: { height: 2, borderRadius: 1 },
  wordCount: { fontSize: 12 },
});

// ─── Entry Card ───────────────────────────────────────────────────────────────

const EntryCard = ({
  entry, label, colors, styles, onOptions, onLongPress,
}: {
  entry: Entry; label: string | null; colors: Colors; styles: any;
  onOptions: () => void; onLongPress: () => void;
}) => (
  <ScalePressable
    scaleTo={0.98}
    onLongPress={onLongPress}
    delayLongPress={300}
    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
  >
    {label ? <Text style={[styles.cardTitle, { color: colors.primary }]} numberOfLines={2}>{label}</Text> : null}
    <Text style={[styles.cardBody, { color: colors.bodyText }]}>{entry.body}</Text>
    <View style={styles.cardFooter}>
      <Text style={[styles.cardDate, { color: colors.tertiaryText }]}>{formatDate(entry.date)}</Text>
      <ScalePressable scaleTo={0.8} onPress={onOptions} style={styles.cardDots}>
        <Text style={[styles.cardDotsText, { color: colors.secondaryText }]}>···</Text>
      </ScalePressable>
    </View>
  </ScalePressable>
);

// ─── Options Sheet ────────────────────────────────────────────────────────────

const OptionsSheet = ({
  visible, colors, isFreeform, onEdit, onRename, onShare, onExportPdf, onDelete, onClose,
}: {
  visible: boolean; colors: Colors; isFreeform: boolean;
  onEdit: () => void; onRename: () => void; onShare: () => void;
  onExportPdf: () => void; onDelete: () => void; onClose: () => void;
}) => {
  const slideY         = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver   = Platform.OS !== 'web';

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
          <View style={optionStyles.rowIconWrap}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Edit</Text>
        </ScalePressable>

        {isFreeform && (
          <>
            <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />
            <ScalePressable style={optionStyles.row} onPress={onRename}>
              <View style={optionStyles.rowIconWrap}>
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Rename</Text>
            </ScalePressable>
          </>
        )}

        <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />
        <ScalePressable style={optionStyles.row} onPress={onShare}>
          <View style={optionStyles.rowIconWrap}>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Share</Text>
        </ScalePressable>

        <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />
        <ScalePressable style={optionStyles.row} onPress={onExportPdf}>
          <View style={optionStyles.rowIconWrap}>
            <Ionicons name="document-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[optionStyles.rowLabel, { color: colors.primary }]}>Export PDF</Text>
        </ScalePressable>

        <View style={[optionStyles.divider, { backgroundColor: colors.border }]} />
        <ScalePressable style={optionStyles.row} onPress={onDelete}>
          <View style={optionStyles.rowIconWrap}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </View>
          <Text style={[optionStyles.rowLabel, { color: '#ef4444' }]}>Delete</Text>
        </ScalePressable>
      </Animated.View>
    </Modal>
  );
};

// ─── Rename Sheet ─────────────────────────────────────────────────────────────

const RenameSheet = ({
  visible, colors, initialTitle, onSave, onClose,
}: {
  visible: boolean; colors: Colors; initialTitle: string;
  onSave: (title: string) => void; onClose: () => void;
}) => {
  const [value, setValue] = useState('');
  const slideY         = useRef(new Animated.Value(260)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver   = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      setValue(initialTitle);
      slideY.setValue(260); overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 5, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 260, speed: 28, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[optionStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined} style={{ justifyContent: 'flex-end' }}>
        <Animated.View style={[renameStyles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideY }] }]}>
          <View style={optionStyles.handleWrap}><View style={optionStyles.handle} /></View>
          <Text style={[renameStyles.label, { color: colors.secondaryText }]}>RENAME ENTRY</Text>
          <TextInput
            style={[renameStyles.input, { color: colors.primary, backgroundColor: colors.background, borderColor: colors.border }]}
            value={value}
            onChangeText={setValue}
            placeholder="Entry title"
            placeholderTextColor={colors.placeholder}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(value)}
          />
          <ScalePressable
            style={[renameStyles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => onSave(value)}
          >
            <Text style={[renameStyles.saveBtnText, { color: colors.background }]}>Save</Text>
          </ScalePressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const renameStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingBottom: 48,
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 12 },
  input: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, marginBottom: 14,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
});

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
  container: { padding: 24, paddingTop: 64, paddingBottom: 120, flexGrow: 1 },
  prompt: { fontSize: 22, fontWeight: '600', color: c.primary, lineHeight: 32, marginBottom: 12, letterSpacing: -0.3 },
  refreshRow: { marginBottom: 20 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1, borderColor: c.border,
  },
  refreshBtnDim: { opacity: 0.4 },
  refreshText: { fontSize: 12, color: c.secondaryText, fontWeight: '500' },
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
  },
});

export default TodayScreen;
