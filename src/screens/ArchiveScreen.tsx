import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries, toggleStarEntry, deleteEntry, Entry } from '../db/database';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, Colors } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';
import CalendarView from '../components/CalendarView';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const ENTRY_NAME_PREFIX = 'quill_entry_name_';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type Filter = 'all' | 'starred';

const useNativeDriver = Platform.OS !== 'web';

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
};

const ArchiveScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryNames, setEntryNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // List / calendar transition — snappy fade-out, springy fade-in (Emil Kowalski-style)
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listScale   = useRef(new Animated.Value(1)).current;
  const calOpacity  = useRef(new Animated.Value(0)).current;
  const calScale    = useRef(new Animated.Value(0.96)).current;

  const toggleView = () => {
    Haptics.selectionAsync();
    const next = viewMode === 'list' ? 'calendar' : 'list';
    setViewMode(next);

    const goingToCal = next === 'calendar';
    const outOpacity = goingToCal ? listOpacity : calOpacity;
    const outScale   = goingToCal ? listScale   : calScale;
    const inOpacity  = goingToCal ? calOpacity  : listOpacity;
    const inScale    = goingToCal ? calScale    : listScale;

    Animated.parallel([
      // Out — fast & curt
      Animated.timing(outOpacity, { toValue: 0,    duration: 110, useNativeDriver }),
      Animated.timing(outScale,   { toValue: 0.98, duration: 110, useNativeDriver }),
      // In — spring with a touch of overshoot, slightly delayed so layers don't overlap muddily
      Animated.spring(inOpacity, {
        toValue: 1, speed: 22, bounciness: 6, delay: 70, useNativeDriver,
      }),
      Animated.spring(inScale, {
        toValue: 1, speed: 18, bounciness: 8, delay: 70, useNativeDriver,
      }),
    ]).start();
  };

  // Undo toast
  const [toastVisible, setToastVisible] = useState(false);
  const toastEntryRef = useRef<Entry | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSlideY  = useRef(new Animated.Value(80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Animate search bar in
  const searchOpacity = useRef(new Animated.Value(0)).current;

  // Commit any pending delete on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastEntryRef.current) {
        deleteEntry(toastEntryRef.current.id);
        if (!toastEntryRef.current.prompt)
          AsyncStorage.removeItem(ENTRY_NAME_PREFIX + toastEntryRef.current.id);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await getAllEntries();
        const names: Record<string, string> = {};
        await Promise.all(
          all.filter(e => !e.prompt).map(async (e) => {
            const name = await AsyncStorage.getItem(ENTRY_NAME_PREFIX + e.id);
            if (name) names[e.id] = name;
          })
        );
        if (active) {
          setEntries(all);
          setEntryNames(names);
          setLoading(false);
          Animated.timing(searchOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver,
          }).start();
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const handleToggleStar = async (entry: Entry) => {
    const newStarred = !entry.starred;
    Haptics.selectionAsync();
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, starred: newStarred } : e));
    await toggleStarEntry(entry.id, newStarred);
  };

  const showToast = (entry: Entry) => {
    // If another toast is already up, commit that delete immediately
    if (toastEntryRef.current) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      deleteEntry(toastEntryRef.current.id);
      if (!toastEntryRef.current.prompt)
        AsyncStorage.removeItem(ENTRY_NAME_PREFIX + toastEntryRef.current.id);
    }
    toastEntryRef.current = entry;
    setToastVisible(true);
    toastSlideY.setValue(80);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastSlideY, { toValue: 0, speed: 22, bounciness: 6, useNativeDriver }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver }),
    ]).start();
    toastTimerRef.current = setTimeout(commitToastDelete, 4000);
  };

  const dismissToast = (onDone?: () => void) => {
    Animated.parallel([
      Animated.spring(toastSlideY, { toValue: 80, speed: 30, bounciness: 0, useNativeDriver }),
      Animated.timing(toastOpacity, { toValue: 0, duration: 180, useNativeDriver }),
    ]).start(() => { setToastVisible(false); onDone?.(); });
  };

  const commitToastDelete = () => {
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
    const entry = toastEntryRef.current;
    toastEntryRef.current = null;
    dismissToast(async () => {
      if (!entry) return;
      await deleteEntry(entry.id);
      if (!entry.prompt) await AsyncStorage.removeItem(ENTRY_NAME_PREFIX + entry.id);
    });
  };

  const handleUndoDelete = () => {
    Haptics.selectionAsync();
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
    const entry = toastEntryRef.current;
    toastEntryRef.current = null;
    if (entry) {
      setEntries(prev =>
        [...prev, entry].sort((a, b) =>
          b.date !== a.date ? b.date.localeCompare(a.date) : 0
        )
      );
    }
    dismissToast();
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const toDelete = pendingDelete;
    setPendingDelete(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setEntries(prev => prev.filter(e => e.id !== toDelete.id));
    showToast(toDelete);
  };

  // Filter + search
  const filtered = useMemo(() => {
    let result = entries;
    if (filter === 'starred') result = result.filter(e => e.starred);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(e =>
        e.prompt.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, filter, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Archive</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
          <ScalePressable scaleTo={0.85} onPress={toggleView} style={styles.viewToggle}>
            <Ionicons
              name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'}
              size={22}
              color={colors.secondaryText}
            />
          </ScalePressable>
        </View>
      </View>

      <View style={styles.viewStack}>
        {/* LIST view */}
        <Animated.View
          style={[
            styles.viewLayer,
            { opacity: listOpacity, transform: [{ scale: listScale }] },
          ]}
          pointerEvents={viewMode === 'list' ? 'auto' : 'none'}
        >
          {/* Search bar */}
          <Animated.View style={[styles.searchWrap, { opacity: searchOpacity }]}>
            <View style={styles.searchBar}>
              <TextInput
                style={[styles.searchInput, { color: colors.primary }]}
                placeholder="Search entries…"
                placeholderTextColor={colors.secondaryText}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <ScalePressable scaleTo={0.85} onPress={() => setQuery('')} style={styles.clearBtn}>
                  <Text style={[styles.clearIcon, { color: colors.secondaryText }]}>✕</Text>
                </ScalePressable>
              )}
            </View>
          </Animated.View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(['all', 'starred'] as Filter[]).map((f) => (
              <ScalePressable
                key={f}
                scaleTo={0.95}
                style={[
                  styles.filterTab,
                  { borderColor: colors.border },
                  filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
              >
                <Text style={[
                  styles.filterText,
                  { color: colors.secondaryText },
                  filter === f && { color: colors.background },
                ]}>
                  {f === 'all' ? 'All' : '★  Starred'}
                </Text>
              </ScalePressable>
            ))}
          </View>

          {/* List */}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                {filter === 'starred' ? 'No starred entries yet.' : 'No results found.'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                {filter === 'starred'
                  ? 'Tap the ★ on any entry to save it here.'
                  : 'Try a different search term.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
              renderItem={({ item }) => (
                <SwipeableRow
                  item={item}
                  freeformLabel={item.prompt || entryNames[item.id] || 'Untitled'}
                  colors={colors}
                  styles={styles}
                  onPress={() => navigation.navigate('EntryDetail', {
                    entry: {
                      ...item,
                      prompt: item.prompt || entryNames[item.id] || 'Untitled',
                    },
                  })}
                  onStar={() => handleToggleStar(item)}
                  onDelete={() => setPendingDelete(item)}
                />
              )}
            />
          )}
        </Animated.View>

        {/* CALENDAR view */}
        <Animated.View
          style={[
            styles.viewLayer,
            { opacity: calOpacity, transform: [{ scale: calScale }] },
          ]}
          pointerEvents={viewMode === 'calendar' ? 'auto' : 'none'}
        >
          <CalendarView
            active={viewMode === 'calendar'}
            entries={entries}
            entryNames={entryNames}
            colors={colors}
            onSelectEntry={(entry) =>
              navigation.navigate('EntryDetail', {
                entry: {
                  ...entry,
                  prompt: entry.prompt || entryNames[entry.id] || 'Untitled',
                },
              })
            }
          />
        </Animated.View>
      </View>

      <DeleteSheet
        entry={pendingDelete}
        colors={colors}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Undo toast */}
      {toastVisible && (
        <Animated.View
          style={[
            toastStyles.container,
            { opacity: toastOpacity, transform: [{ translateY: toastSlideY }] },
          ]}
          pointerEvents="box-none"
        >
          <Text style={toastStyles.message}>Entry deleted</Text>
          <ScalePressable scaleTo={0.88} onPress={handleUndoDelete} style={toastStyles.undoBtn}>
            <Text style={toastStyles.undoText}>Undo</Text>
          </ScalePressable>
        </Animated.View>
      )}
    </View>
  );
};

// ─── Long-press row ───────────────────────────────────────────────────────────

const SwipeableRow = ({
  item, freeformLabel, colors, styles, onPress, onStar, onDelete,
}: {
  item: Entry;
  freeformLabel: string;
  colors: Colors;
  styles: any;
  onPress: () => void;
  onStar: () => void;
  onDelete: () => void;
}) => {
  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <View style={styles.rowWrap}>
      <View style={styles.rowFlex}>
        <ScalePressable
          scaleTo={0.985}
          style={styles.rowContent}
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={350}
        >
          <Text style={[styles.rowDate, { color: colors.secondaryText }]}>
            {formatDate(item.date)}
          </Text>
          <Text style={[styles.rowPrompt, { color: colors.primary }]} numberOfLines={1}>
            {freeformLabel}
          </Text>
          <Text style={[styles.rowPreview, { color: colors.bodyText }]} numberOfLines={2}>
            {item.body}
          </Text>
        </ScalePressable>
      </View>
      <ScalePressable scaleTo={0.8} style={styles.starBtn} onPress={onStar}>
        <Text style={[styles.starIcon, { color: item.starred ? '#f59e0b' : colors.border }]}>★</Text>
      </ScalePressable>
    </View>
  );
};

// ─── Delete sheet ─────────────────────────────────────────────────────────────

const DeleteSheet = ({
  entry,
  colors,
  onConfirm,
  onCancel,
}: {
  entry: Entry | null;
  colors: Colors;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const slideY = useRef(new Animated.Value(400)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (entry) {
      // Reset to start position before every open so animation is always fresh
      slideY.setValue(400);
      scale.setValue(0.94);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 7, useNativeDriver: nativeDriver }),
        Animated.spring(scale, { toValue: 1, speed: 16, bounciness: 7, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 400, speed: 28, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.spring(scale, { toValue: 0.94, speed: 28, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
      ]).start();
    }
  }, [entry]);

  return (
    <Modal visible={!!entry} transparent animationType="none" onRequestClose={onCancel}>
      {/* Dim overlay */}
      <Animated.View style={[deleteSheetStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          deleteSheetStyles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY: slideY }, { scale }] },
        ]}
      >
        <Text style={[deleteSheetStyles.title, { color: colors.primary }]}>Delete this entry?</Text>
        <Text style={[deleteSheetStyles.warning, { color: colors.secondaryText }]}>
          This cannot be undone.
        </Text>

        <ScalePressable style={deleteSheetStyles.deleteBtn} onPress={onConfirm}>
          <Text style={deleteSheetStyles.deleteBtnText}>Delete</Text>
        </ScalePressable>

        <ScalePressable
          style={[deleteSheetStyles.cancelBtn, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Text style={[deleteSheetStyles.cancelBtnText, { color: colors.secondaryText }]}>Cancel</Text>
        </ScalePressable>
      </Animated.View>
    </Modal>
  );
};

const deleteSheetStyles = StyleSheet.create({
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
    padding: 24,
    paddingBottom: 48,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  warning: { fontSize: 13, marginBottom: 28 },
  deleteBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '500' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 12,
  },
  header: { fontSize: 28, fontWeight: '700', color: c.primary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { fontSize: 13, color: c.secondaryText },
  viewToggle: { padding: 4 },
  viewStack: { flex: 1, position: 'relative' },
  viewLayer: { ...StyleSheet.absoluteFillObject },
  searchWrap: { paddingHorizontal: 24, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: c.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, backgroundColor: 'transparent' },
  clearBtn: { padding: 2 },
  clearIcon: { fontSize: 13, fontWeight: '600', color: '#888' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  list: { paddingBottom: 32 },
  separator: { height: 1, marginVertical: 4, marginLeft: 24 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 24 },
  rowFlex: { flex: 1 },
  rowContent: { paddingVertical: 16 },
  rowDate: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowPrompt: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rowPreview: { fontSize: 14, lineHeight: 20 },
  starBtn: { width: 36, alignItems: 'center', paddingVertical: 12, marginLeft: 8 },
  starIcon: { fontSize: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  message: { color: '#f0f0f0', fontSize: 15, fontWeight: '500' },
  undoBtn: { paddingVertical: 4, paddingLeft: 16 },
  undoText: { color: '#A2D2FF', fontSize: 15, fontWeight: '700' },
});

export default ArchiveScreen;
