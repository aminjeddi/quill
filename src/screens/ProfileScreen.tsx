import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries } from '../db/database';
import { computeStats, formatWritingSince, formatNumber } from '../utils/stats';
import { CATEGORIES, Category } from '../data/categoryPrompts';
import { useTheme, Colors } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { DISPLAY_NAME_KEY } from './OnboardingNameScreen';
import ScalePressable from '../components/ScalePressable';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
const useNativeDriver = Platform.OS !== 'web';

// ─── Avatar data ──────────────────────────────────────────────────────────────

export const AVATAR_KEY = 'quill_avatar';

const AVATARS = [
  { key: 'penguin',  emoji: '🐧', label: 'Penguin'  },
  { key: 'alien',    emoji: '👽', label: 'Alien'    },
  { key: 'elephant', emoji: '🐘', label: 'Elephant' },
  { key: 'cat',      emoji: '🐱', label: 'Cat'      },
  { key: 'fox',      emoji: '🦊', label: 'Fox'      },
  { key: 'bear',     emoji: '🐻', label: 'Bear'     },
  { key: 'lion',     emoji: '🦁', label: 'Lion'     },
  { key: 'robot',    emoji: '🤖', label: 'Robot'    },
  { key: 'rabbit',   emoji: '🐰', label: 'Rabbit'   },
  { key: 'koala',    emoji: '🐨', label: 'Koala'    },
  { key: 'panda',    emoji: '🐼', label: 'Panda'    },
  { key: 'frog',     emoji: '🐸', label: 'Frog'     },
];

const DEFAULT_AVATAR = AVATARS[0];

// ─── Profile screen ───────────────────────────────────────────────────────────

const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [displayName, setDisplayName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [avatarKey, setAvatarKey] = useState(DEFAULT_AVATAR.key);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalWords: 0,
    currentStreak: 0,
    longestStreak: 0,
    avgWordsPerEntry: 0,
    favoriteDay: null as string | null,
    writingSince: null as string | null,
  });

  const contentAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [entries, name, storedCats, storedAvatar] = await Promise.all([
      getAllEntries(),
      AsyncStorage.getItem(DISPLAY_NAME_KEY),
      AsyncStorage.getItem('quill_categories'),
      AsyncStorage.getItem(AVATAR_KEY),
    ]);
    setDisplayName(name ?? '');
    setCategories(storedCats ? JSON.parse(storedCats) : []);
    setAvatarKey(storedAvatar ?? DEFAULT_AVATAR.key);
    setStats(computeStats(entries));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      Animated.spring(contentAnim, {
        toValue: 1,
        speed: 14,
        bounciness: 2,
        useNativeDriver,
      }).start();
      return () => contentAnim.setValue(0);
    }, [])
  );

  const handleSelectAvatar = async (key: string) => {
    setAvatarKey(key);
    await AsyncStorage.setItem(AVATAR_KEY, key);
  };

  const currentAvatar = AVATARS.find(a => a.key === avatarKey) ?? DEFAULT_AVATAR;

  const categoryLabels = useMemo(() => {
    return categories
      .map((key) => CATEGORIES.find((c) => c.key === key))
      .filter(Boolean)
      .map((c) => `${c!.icon} ${c!.label}`)
      .join('  ·  ');
  }, [categories]);

  return (
    <View style={styles.container}>
      {/* Settings gear — top right */}
      <View style={styles.settingsBtnWrap}>
        <ScalePressable
          scaleTo={0.85}
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </ScalePressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <ScalePressable scaleTo={0.92} onPress={() => setPickerOpen(true)}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.card }]}>
                <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
              </View>
            </ScalePressable>
          </View>

          {/* Name */}
          <Text style={styles.name}>
            {displayName || 'Your Profile'}
          </Text>
          {stats.writingSince && (
            <Text style={styles.since}>
              Writing since {formatWritingSince(stats.writingSince)}
            </Text>
          )}

          {/* Top 3 stat cards */}
          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statValue}>{formatNumber(stats.totalEntries)}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statValue}>{formatNumber(stats.totalWords)}</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>

          {/* Secondary stats */}
          <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <StatRow
              label="Longest streak"
              value={stats.longestStreak > 0 ? `${stats.longestStreak} days` : '—'}
              colors={colors}
            />
            <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />
            <StatRow
              label="Avg. words per entry"
              value={stats.avgWordsPerEntry > 0 ? formatNumber(stats.avgWordsPerEntry) : '—'}
              colors={colors}
            />
            {stats.favoriteDay && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />
                <StatRow
                  label="Favourite writing day"
                  value={stats.favoriteDay}
                  colors={colors}
                />
              </>
            )}
          </View>

          {/* Writing focus */}
          {categoryLabels.length > 0 && (
            <View style={[styles.focusCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.focusHeading, { color: colors.secondaryText }]}>
                WRITING FOCUS
              </Text>
              <Text style={[styles.focusValue, { color: colors.primary }]}>
                {categoryLabels}
              </Text>
            </View>
          )}

          {/* Empty state */}
          {stats.totalEntries === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                Start writing to see your stats here.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Avatar picker */}
      <AvatarPicker
        visible={pickerOpen}
        currentKey={avatarKey}
        colors={colors}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
};

// ─── Avatar picker ────────────────────────────────────────────────────────────

const AvatarPicker = ({
  visible,
  currentKey,
  colors,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentKey: string;
  colors: Colors;
  onSelect: (key: string) => void;
  onClose: () => void;
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY      = useRef(new Animated.Value(400)).current;
  const bigScale    = useRef(new Animated.Value(0.4)).current;
  const nativeDriver = Platform.OS !== 'web';

  const [selectedKey, setSelectedKey] = useState(currentKey);
  const flatListRef = useRef<FlatList>(null);

  // Sync selection when picker opens
  useEffect(() => {
    if (visible) {
      setSelectedKey(currentKey);
      overlayOpacity.setValue(0);
      sheetY.setValue(400);
      bigScale.setValue(0.4);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1, duration: 220, useNativeDriver: nativeDriver,
        }),
        Animated.spring(sheetY, {
          toValue: 0, speed: 16, bounciness: 5, useNativeDriver: nativeDriver,
        }),
        Animated.spring(bigScale, {
          toValue: 1, speed: 12, bounciness: 12, useNativeDriver: nativeDriver,
        }),
      ]).start(() => {
        const idx = AVATARS.findIndex(a => a.key === currentKey);
        if (idx >= 0) {
          flatListRef.current?.scrollToIndex({
            index: idx, animated: false, viewPosition: 0.5,
          });
        }
      });
    }
  }, [visible]);

  const handleSelect = (avatar: typeof AVATARS[0]) => {
    if (avatar.key === selectedKey) return;
    setSelectedKey(avatar.key);
    onSelect(avatar.key);

    // Pulse the big emoji
    Animated.sequence([
      Animated.spring(bigScale, {
        toValue: 1.15, speed: 28, bounciness: 14, useNativeDriver: nativeDriver,
      }),
      Animated.spring(bigScale, {
        toValue: 1, speed: 22, bounciness: 5, useNativeDriver: nativeDriver,
      }),
    ]).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 180, useNativeDriver: nativeDriver,
      }),
      Animated.spring(sheetY, {
        toValue: 400, speed: 28, bounciness: 0, useNativeDriver: nativeDriver,
      }),
    ]).start(() => onClose());
  };

  const currentAvatarData = AVATARS.find(a => a.key === selectedKey) ?? DEFAULT_AVATAR;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Dimmed backdrop */}
      <Animated.View style={[pickerStyles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          pickerStyles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY: sheetY }] },
        ]}
      >
        {/* Drag handle */}
        <View style={[pickerStyles.handle, { backgroundColor: colors.border }]} />

        {/* Large emoji + label */}
        <Animated.View style={{ transform: [{ scale: bigScale }], alignItems: 'center' }}>
          <Text style={pickerStyles.bigEmoji}>{currentAvatarData.emoji}</Text>
        </Animated.View>
        <Text style={[pickerStyles.bigLabel, { color: colors.secondaryText }]}>
          {currentAvatarData.label}
        </Text>

        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={AVATARS}
          horizontal
          keyExtractor={item => item.key}
          extraData={selectedKey}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={pickerStyles.carouselContent}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => {
            const isSel = item.key === selectedKey;
            return (
              <ScalePressable
                scaleTo={0.85}
                onPress={() => handleSelect(item)}
                style={[
                  pickerStyles.carouselItem,
                  { backgroundColor: colors.inputBg },
                  isSel && {
                    backgroundColor: colors.cardSelected,
                    borderColor: colors.primary,
                    borderWidth: 2,
                  },
                ]}
              >
                <Text style={pickerStyles.carouselEmoji}>{item.emoji}</Text>
              </ScalePressable>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
};

// ─── Stat row ─────────────────────────────────────────────────────────────────

const StatRow = ({
  label, value, colors,
}: {
  label: string; value: string; colors: Colors;
}) => (
  <View style={statRowStyles.row}>
    <Text style={[statRowStyles.label, { color: colors.secondaryText }]}>{label}</Text>
    <Text style={[statRowStyles.value, { color: colors.primary }]}>{value}</Text>
  </View>
);

const statRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  label: { fontSize: 15 },
  value: { fontSize: 15, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  settingsBtnWrap: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  settingsBtn: { padding: 8 },
  settingsIcon: { fontSize: 22, color: c.secondaryText },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 92, height: 92, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 54 },

  // Name / since
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: -0.7,
    marginBottom: 4,
    textAlign: 'center',
  },
  since: { fontSize: 14, color: c.secondaryText, marginBottom: 32, textAlign: 'center' },

  // Stats
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  statValue: {
    fontSize: 26, fontWeight: '700', color: c.primary,
    marginBottom: 4, letterSpacing: -0.4,
  },
  statLabel: { fontSize: 12, color: c.secondaryText, textAlign: 'center' },
  detailCard: { borderRadius: 14, paddingHorizontal: 16, marginBottom: 12 },
  detailDivider: { height: 1 },
  focusCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  focusHeading: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8 },
  focusValue: { fontSize: 15, lineHeight: 22 },
  empty: { marginTop: 16, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 48,
    alignItems: 'center',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    marginBottom: 24,
  },
  bigEmoji: { fontSize: 88, lineHeight: 104 },
  bigLabel: {
    fontSize: 15, fontWeight: '500',
    letterSpacing: -0.2, marginTop: 4, marginBottom: 24,
  },
  carouselContent: { paddingHorizontal: 20, gap: 12 },
  carouselItem: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
  },
  carouselEmoji: { fontSize: 34 },
});

export default ProfileScreen;
