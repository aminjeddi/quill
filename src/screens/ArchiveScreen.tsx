import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllEntries, toggleStarEntry, Entry } from '../db/database';
import { ArchiveStackParamList } from '../navigation/TabNavigator';
import { useTheme, Colors } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';
import * as Haptics from 'expo-haptics';

type NavProp = NativeStackNavigationProp<ArchiveStackParamList, 'ArchiveList'>;
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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Animate search bar in
  const searchOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await getAllEntries();
        if (active) {
          setEntries(all);
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
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, starred: newStarred } : e));
    await toggleStarEntry(entry.id, newStarred);
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
        <Text style={styles.count}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
      </View>

      {/* Search bar */}
      <Animated.View style={[styles.searchWrap, { opacity: searchOpacity }]}>
        <View style={styles.searchBar}>
          <TextInput
            style={[styles.searchInput, { color: colors.primary }]}
            placeholder="Search entries…"
            placeholderTextColor="#8E8E93"
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
            <View style={styles.rowWrap}>
              {/* Tap text area → navigate */}
              <ScalePressable
                scaleTo={0.985}
                style={styles.rowContent}
                onPress={() => navigation.navigate('EntryDetail', { entry: item })}
              >
                <Text style={[styles.rowDate, { color: colors.secondaryText }]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.rowPrompt, { color: colors.primary }]} numberOfLines={1}>
                  {item.prompt || 'Free write'}
                </Text>
                <Text style={[styles.rowPreview, { color: colors.bodyText }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </ScalePressable>

              {/* Star button — outside list padding so it's never clipped */}
              <ScalePressable
                scaleTo={0.8}
                style={styles.starBtn}
                onPress={() => handleToggleStar(item)}
              >
                <Text style={[styles.starIcon, { color: item.starred ? '#f59e0b' : colors.border }]}>
                  ★
                </Text>
              </ScalePressable>
            </View>
          )}
        />
      )}
    </View>
  );
};

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
  header: { fontSize: 28, fontWeight: '700', color: c.primary },
  count: { fontSize: 13, color: c.secondaryText },
  searchWrap: { paddingHorizontal: 24, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#E4E3E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, color: '#1a1a1a' },
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
  rowContent: { flex: 1, paddingVertical: 16 },
  rowDate: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowPrompt: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rowPreview: { fontSize: 14, lineHeight: 20 },
  starBtn: { width: 36, alignItems: 'center', paddingVertical: 12, marginLeft: 8 },
  starIcon: { fontSize: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default ArchiveScreen;
