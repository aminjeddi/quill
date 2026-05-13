import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Category, CATEGORIES } from '../data/categoryPrompts';
import { getSavedReminder, formatTime } from '../notifications/reminders';
import { useTheme } from '../context/ThemeContext';
import { WORD_GOAL_KEY } from './WritingGoalScreen';
import ScalePressable from '../components/ScalePressable';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://aminjeddi.github.io/quill/privacy-policy.html';

interface Props {
  currentCategories: Category[];
}

const SettingsScreen = ({ currentCategories }: Props) => {
  const navigation = useNavigation<NavProp>();
  const { colors, mode } = useTheme();
  const [reminderSubtitle, setReminderSubtitle] = useState('Off');
  const [focusSubtitle, setFocusSubtitle] = useState('');
  const [goalSubtitle, setGoalSubtitle] = useState('Off');
  const [appearanceSubtitle, setAppearanceSubtitle] = useState('System');

  useFocusEffect(useCallback(() => {
    getSavedReminder().then((r) => {
      setReminderSubtitle(r ? formatTime(r.hour, r.minute) : 'Off');
    });

    const labels = currentCategories
      .map((k) => CATEGORIES.find((c) => c.key === k)?.label ?? '')
      .filter(Boolean);
    setFocusSubtitle(
      labels.length === 0 ? 'None'
      : labels.length <= 2 ? labels.join(', ')
      : `${labels.length} focuses`
    );

    AsyncStorage.getItem(WORD_GOAL_KEY).then((val) => {
      const n = val ? parseInt(val, 10) : 0;
      setGoalSubtitle(n > 0 ? `${n} words` : 'Off');
    });

    setAppearanceSubtitle(mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System');
  }, [currentCategories, mode]));

  const handlePrivacyPolicy = async () => {
    const supported = await Linking.canOpenURL(PRIVACY_URL);
    if (supported) {
      await Linking.openURL(PRIVACY_URL);
    } else {
      Alert.alert('Could not open link', 'Visit: ' + PRIVACY_URL);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      {/* Back button */}
      <ScalePressable scaleTo={0.95} style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: colors.secondaryText }]}>← Back</Text>
      </ScalePressable>

      <Text style={[styles.title, { color: colors.primary }]}>Settings</Text>

      <Text style={[styles.groupLabel, { color: colors.secondaryText }]}>WRITING</Text>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="✍️" label="Writing focus" subtitle={focusSubtitle} colors={colors}
          onPress={() => navigation.navigate('WritingFocus')} />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <Row icon="🎯" label="Writing goal" subtitle={goalSubtitle} colors={colors}
          onPress={() => navigation.navigate('WritingGoal')} />
      </View>

      <Text style={[styles.groupLabel, { color: colors.secondaryText }]}>PREFERENCES</Text>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="🔔" label="Daily reminder" subtitle={reminderSubtitle} colors={colors}
          onPress={() => navigation.navigate('DailyReminder')} />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <Row icon="🌙" label="Appearance" subtitle={appearanceSubtitle} colors={colors}
          onPress={() => navigation.navigate('Appearance')} />
      </View>

      <Text style={[styles.groupLabel, { color: colors.secondaryText }]}>ABOUT</Text>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="🔒" label="Privacy policy" colors={colors}
          onPress={handlePrivacyPolicy} isExternal />
      </View>
    </ScrollView>
  );
};

const Row = ({
  icon, label, subtitle, colors, onPress, isExternal,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  colors: any;
  onPress: () => void;
  isExternal?: boolean;
}) => (
  <ScalePressable
    scaleTo={0.985}
    style={styles.row}
    onPress={onPress}
  >
    <Text style={styles.icon}>{icon}</Text>
    <View style={styles.rowLeft}>
      <Text style={[styles.rowLabel, { color: colors.primary }]}>{label}</Text>
      {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text> : null}
    </View>
    <Text style={[styles.chevron, { color: colors.tertiaryText }]}>
      {isExternal ? '↗' : '›'}
    </Text>
  </ScalePressable>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 28, letterSpacing: -0.5 },
  groupLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  separator: { height: 1, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  icon: { fontSize: 20, width: 30, textAlign: 'center' },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 20, marginLeft: 4 },
});

export default SettingsScreen;
