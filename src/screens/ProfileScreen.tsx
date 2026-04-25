import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
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

const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [displayName, setDisplayName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
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
    const [entries, name, storedCats] = await Promise.all([
      getAllEntries(),
      AsyncStorage.getItem(DISPLAY_NAME_KEY),
      AsyncStorage.getItem('quill_categories'),
    ]);
    setDisplayName(name ?? '');
    setCategories(storedCats ? JSON.parse(storedCats) : []);
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
    </View>
  );
};

const StatRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Colors;
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

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  settingsBtnWrap: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  settingsBtn: { padding: 8 },
  settingsIcon: { fontSize: 22, color: c.secondaryText },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
    marginRight: 44, // avoid overlapping settings icon
  },
  since: { fontSize: 14, color: c.secondaryText, marginBottom: 32 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '700', color: c.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: c.secondaryText, textAlign: 'center' },
  detailCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailDivider: { height: 1 },
  focusCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  focusHeading: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8 },
  focusValue: { fontSize: 15, lineHeight: 22 },
  empty: { marginTop: 16, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default ProfileScreen;
