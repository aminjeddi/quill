import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllEntries, Entry } from '../db/database';
import { ArchiveStackParamList } from '../navigation/TabNavigator';

type NavProp = NativeStackNavigationProp<ArchiveStackParamList, 'ArchiveList'>;

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const ArchiveScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await getAllEntries();
        if (active) { setEntries(all); setLoading(false); }
      })();
      return () => { active = false; };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1a1a1a" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Nothing here yet.</Text>
        <Text style={styles.emptySubtitle}>Write your first entry on the Today tab.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Archive</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('EntryDetail', { entry: item })}
            activeOpacity={0.7}
          >
            <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
            <Text style={styles.rowPrompt} numberOfLines={1}>{item.prompt}</Text>
            <Text style={styles.rowPreview} numberOfLines={2}>{item.body}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafaf8', padding: 32 },
  header: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16 },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: '#efefed', marginVertical: 4 },
  row: { paddingVertical: 16 },
  rowDate: { fontSize: 12, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowPrompt: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  rowPreview: { fontSize: 14, color: '#888', lineHeight: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#999', textAlign: 'center' },
});

export default ArchiveScreen;
