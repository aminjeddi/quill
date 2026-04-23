import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArchiveStackParamList } from '../navigation/TabNavigator';

type Props = NativeStackScreenProps<ArchiveStackParamList, 'EntryDetail'>;

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const EntryDetailScreen = ({ route, navigation }: Props) => {
  const { entry } = route.params;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <Text style={styles.prompt}>{entry.prompt}</Text>
        <View style={styles.divider} />
        <Text style={styles.body}>{entry.body}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  back: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  backText: { fontSize: 16, color: '#999' },
  content: { padding: 24, paddingTop: 8 },
  date: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  prompt: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', lineHeight: 30, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#e5e5e5', marginBottom: 20 },
  body: { fontSize: 16, color: '#333', lineHeight: 26 },
});

export default EntryDetailScreen;
