import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArchiveStackParamList } from '../navigation/TabNavigator';
import ShareCard from '../components/ShareCard';
import ScalePressable from '../components/ScalePressable';
import { useTheme, Colors } from '../context/ThemeContext';
import { toggleStarEntry } from '../db/database';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<ArchiveStackParamList, 'EntryDetail'>;

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
        <ScalePressable scaleTo={0.8} style={styles.starBtn} onPress={handleToggleStar}>
          <Text style={[styles.starIcon, { color: starred ? '#f59e0b' : colors.border }]}>★</Text>
        </ScalePressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <Text style={styles.prompt}>{entry.prompt || 'Free write'}</Text>
        <View style={styles.divider} />
        <Text style={styles.body}>{entry.body}</Text>

        <View style={styles.shareSection}>
          <ShareCard entry={entry} />
        </View>
      </ScrollView>
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
  backText: { fontSize: 16, color: c.secondaryText },
  starBtn: { padding: 8 },
  starIcon: { fontSize: 24 },
  content: { padding: 24, paddingTop: 8, paddingBottom: 48 },
  date: { fontSize: 12, color: c.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  prompt: { fontSize: 20, fontWeight: '600', color: c.primary, lineHeight: 30, marginBottom: 20 },
  divider: { height: 1, backgroundColor: c.border, marginBottom: 20 },
  body: { fontSize: 16, color: c.bodyText, lineHeight: 26, marginBottom: 4 },
  shareSection: { marginTop: 32 },
});

export default EntryDetailScreen;
