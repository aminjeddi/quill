import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

export const WORD_GOAL_KEY = 'quill_word_goal';

const OPTIONS = [
  { value: 0, label: 'No goal', desc: 'Write freely, no target' },
  { value: 50, label: '50 words', desc: 'A quick reflection' },
  { value: 100, label: '100 words', desc: 'A short, focused entry' },
  { value: 200, label: '200 words', desc: 'A deeper write' },
  { value: 500, label: '500 words', desc: 'A full session' },
];

const WritingGoalScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [goal, setGoal] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(WORD_GOAL_KEY).then((val) => {
      if (val !== null) setGoal(parseInt(val, 10));
    });
  }, []);

  const handleSelect = async (value: number) => {
    setGoal(value);
    await AsyncStorage.setItem(WORD_GOAL_KEY, String(value));
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScalePressable scaleTo={0.97} style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: colors.secondaryText }]}>‹ Settings</Text>
      </ScalePressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>Writing goal</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Set a daily word count target. A progress bar will appear while you write.
        </Text>

        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.value}>
              {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
              <ScalePressable
                scaleTo={0.985}
                onPress={() => handleSelect(opt.value)}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, { color: colors.primary }]}>{opt.label}</Text>
                  <Text style={[styles.rowDesc, { color: colors.secondaryText }]}>{opt.desc}</Text>
                </View>
                {goal === opt.value && (
                  <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                )}
              </ScalePressable>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 4 },
  backText: { fontSize: 16 },
  content: { padding: 24, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 28 },
  group: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  separator: { height: 1, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  rowDesc: { fontSize: 12 },
  check: { fontSize: 18, fontWeight: '600' },
});

export default WritingGoalScreen;
