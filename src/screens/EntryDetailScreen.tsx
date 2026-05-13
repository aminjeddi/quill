import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import ShareSheet from '../components/ShareSheet';
import ScalePressable from '../components/ScalePressable';
import { useTheme, Colors } from '../context/ThemeContext';
import { toggleStarEntry } from '../db/database';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'EntryDetail'>;

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const EntryDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { entry } = route.params;

  const [starred, setStarred] = useState(entry.starred);
  const [shareVisible, setShareVisible] = useState(false);

  const handleToggleStar = async () => {
    const next = !starred;
    setStarred(next);
    Haptics.selectionAsync();
    await toggleStarEntry(entry.id, next);
  };

  return (
    <View style={styles.container}>
      {/* Header row: back + star */}
      <View style={styles.headerRow}>
        <ScalePressable scaleTo={0.97} style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </ScalePressable>
        <View style={styles.headerActions}>
          <ScalePressable scaleTo={0.85} style={styles.shareBtn} onPress={() => setShareVisible(true)}>
            <Ionicons name="share-outline" size={22} color={colors.secondaryText} />
          </ScalePressable>
          <ScalePressable scaleTo={0.8} style={styles.starBtn} onPress={handleToggleStar}>
            <Text style={[styles.starIcon, { color: starred ? '#f59e0b' : colors.border }]}>★</Text>
          </ScalePressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <Text style={styles.prompt}>{entry.prompt || 'Entry'}</Text>
        <View style={styles.divider} />
        <Text style={styles.body}>{entry.body}</Text>
      </ScrollView>

      <ShareSheet
        visible={shareVisible}
        entry={entry}
        onClose={() => setShareVisible(false)}
      />
    </View>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  back: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, color: c.secondaryText },
  shareBtn: { padding: 8 },
  starBtn: { padding: 8 },
  starIcon: { fontSize: 24 },
  content: { padding: 24, paddingTop: 8, paddingBottom: 48 },
  date: { fontSize: 12, color: c.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  prompt: { fontSize: 20, fontWeight: '600', color: c.primary, lineHeight: 30, marginBottom: 20, letterSpacing: -0.3 },
  divider: { height: 1, backgroundColor: c.border, marginBottom: 20 },
  body: { fontSize: 16, color: c.bodyText, lineHeight: 26, marginBottom: 4 },
});

export default EntryDetailScreen;
