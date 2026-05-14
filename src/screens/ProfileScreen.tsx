import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  Modal,
  Pressable,
  FlatList,
  Image,
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
  { key: 'penguin',  image: require('../../assets/avatars/penguin.png'),  label: 'Penguin'  },
  { key: 'alien',    image: require('../../assets/avatars/alien.png'),    label: 'Alien'    },
  { key: 'elephant', image: require('../../assets/avatars/elephant.png'), label: 'Elephant' },
  { key: 'cat',      image: require('../../assets/avatars/cat.png'),      label: 'Cat'      },
  { key: 'fox',      image: require('../../assets/avatars/fox.png'),      label: 'Fox'      },
  { key: 'bear',     image: require('../../assets/avatars/bear.png'),     label: 'Bear'     },
  { key: 'lion',     image: require('../../assets/avatars/lion.png'),     label: 'Lion'     },
  { key: 'robot',    image: require('../../assets/avatars/robot.png'),    label: 'Robot'    },
  { key: 'rabbit',   image: require('../../assets/avatars/rabbit.png'),   label: 'Rabbit'   },
  { key: 'koala',    image: require('../../assets/avatars/koala.png'),    label: 'Koala'    },
  { key: 'panda',    image: require('../../assets/avatars/panda.png'),    label: 'Panda'    },
  { key: 'frog',     image: require('../../assets/avatars/frog.png'),     label: 'Frog'     },
];

const DEFAULT_AVATAR = AVATARS.find(a => a.key === 'koala') ?? AVATARS[0];

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
                <Image source={currentAvatar.image} style={styles.avatarImage} />
              </View>
            </ScalePressable>
          </View>

          {/* Name — tap to edit inline */}
          <TextInput
            style={[styles.name, { color: colors.primary }]}
            value={displayName}
            onChangeText={setDisplayName}
            onEndEditing={async (e) => {
              const trimmed = e.nativeEvent.text.trim();
              setDisplayName(trimmed);
              if (trimmed) {
                await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmed);
              } else {
                await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
              }
            }}
            placeholder="Your Name"
            placeholderTextColor={colors.secondaryText}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            selectTextOnFocus
            textAlign="center"
          />
          {stats.writingSince && (
            <Text style={styles.since}>
              Writing since {formatWritingSince(stats.writingSince)}
            </Text>
          )}

          {/* Top 3 stat cards */}
          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statEmoji}>📝</Text>
              <Text style={styles.statValue}>{formatNumber(stats.totalEntries)}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statEmoji}>✍️</Text>
              <Text style={styles.statValue}>{formatNumber(stats.totalWords)}</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>

          {/* Secondary stats */}
          <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <StatRow
              icon="🏆"
              label="Longest streak"
              value={stats.longestStreak > 0 ? `${stats.longestStreak} days` : '—'}
              colors={colors}
            />
            <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />
            <StatRow
              icon="📊"
              label="Avg. words per entry"
              value={stats.avgWordsPerEntry > 0 ? formatNumber(stats.avgWordsPerEntry) : '—'}
              colors={colors}
            />
            {stats.favoriteDay && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />
                <StatRow
                  icon="📅"
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
      <Animated.View style={[pickerStyles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          pickerStyles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY: sheetY }] },
        ]}
      >
        <View style={[pickerStyles.handle, { backgroundColor: colors.border }]} />

        <Animated.View style={{ transform: [{ scale: bigScale }], alignItems: 'center' }}>
          <Image source={currentAvatarData.image} style={pickerStyles.bigImage} />
        </Animated.View>

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
                  isSel && pickerStyles.carouselItemSelected,
                ]}
              >
                <Image source={item.image} style={pickerStyles.carouselImage} />
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
  icon, label, value, colors,
}: {
  icon: string; label: string; value: string; colors: Colors;
}) => (
  <View style={statRowStyles.row}>
    <Text style={statRowStyles.icon}>{icon}</Text>
    <Text style={[statRowStyles.label, { color: colors.secondaryText }]}>{label}</Text>
    <Text style={[statRowStyles.value, { color: colors.primary }]}>{value}</Text>
  </View>
);

const statRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  icon: { fontSize: 16, width: 22, textAlign: 'center' },
  label: { fontSize: 15, flex: 1 },
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
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },

  // Name / since
  name: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 4,
    padding: 0,
  },
  since: { fontSize: 14, color: c.secondaryText, marginBottom: 32, textAlign: 'center' },

  // Stats
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  statEmoji: { fontSize: 20, marginBottom: 6 },
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
  bigImage: { width: 120, height: 120, marginBottom: 24 },
  carouselContent: { paddingHorizontal: 20, gap: 12 },
  carouselItem: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 30, borderWidth: 1.5, borderColor: 'transparent', padding: 3,
  },
  carouselItemSelected: {
    borderColor: '#1a1a1a',
  },
  carouselImage: { width: 44, height: 44 },
});


export default ProfileScreen;
