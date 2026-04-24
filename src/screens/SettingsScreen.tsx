import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsStackParamList } from '../navigation/TabNavigator';
import { Category, CATEGORIES } from '../data/categoryPrompts';
import { getSavedReminder, formatTime } from '../notifications/reminders';

type NavProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

interface Props {
  currentCategories: Category[];
}

const SettingsScreen = ({ currentCategories }: Props) => {
  const navigation = useNavigation<NavProp>();
  const [reminderSubtitle, setReminderSubtitle] = useState('Off');
  const [focusSubtitle, setFocusSubtitle] = useState('');

  useFocusEffect(useCallback(() => {
    // Reminder subtitle
    getSavedReminder().then((r) => {
      setReminderSubtitle(r ? formatTime(r.hour, r.minute) : 'Off');
    });

    // Focus subtitle
    const labels = currentCategories
      .map((k) => CATEGORIES.find((c) => c.key === k)?.label ?? '')
      .filter(Boolean);
    setFocusSubtitle(
      labels.length === 0 ? 'None'
      : labels.length <= 2 ? labels.join(', ')
      : `${labels.length} focuses`
    );
  }, [currentCategories]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.group}>
        <Row
          label="Writing focus"
          subtitle={focusSubtitle}
          onPress={() => navigation.navigate('WritingFocus')}
        />
        <View style={styles.separator} />
        <Row
          label="Daily reminder"
          subtitle={reminderSubtitle}
          onPress={() => navigation.navigate('DailyReminder')}
        />
      </View>
    </ScrollView>
  );
};

const Row = ({
  label,
  subtitle,
  onPress,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.rowLeft}>
      <Text style={styles.rowLabel}>{label}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 32 },
  group: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: '#f0f0ee', marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  rowSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  chevron: { fontSize: 20, color: '#ccc', marginLeft: 8 },
});

export default SettingsScreen;
