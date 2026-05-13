import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, Category } from '../data/categoryPrompts';
import { useTheme, Colors } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

interface Props {
  currentCategories: Category[];
  onCategoryChange: (categories: Category[]) => void;
}

const WritingFocusScreen = ({ currentCategories, onCategoryChange }: Props) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<Category[]>(currentCategories);

  const handleToggle = (key: Category) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (key === 'freeform') return ['freeform']; // freeform clears all others
      return [...prev.filter((k) => k !== 'freeform'), key]; // others clear freeform
    });
    Haptics.selectionAsync();
  };

  const hasChanged =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...currentCategories].sort());

  const handleSave = async () => {
    if (selected.length === 0) return;
    await AsyncStorage.setItem('quill_categories', JSON.stringify(selected));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCategoryChange(selected);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScalePressable scaleTo={0.85} style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color={colors.primary} />
      </ScalePressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Writing focus</Text>
        <Text style={styles.subtitle}>Select one or more. Your prompts will be drawn from all selected styles.</Text>

        <View style={styles.cards}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.key);
            return (
              <ScalePressable
                key={cat.key}
                scaleTo={0.98}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleToggle(cat.key)}
              >
                <Text style={styles.cardIcon}>{cat.icon}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{cat.label}</Text>
                  <Text style={styles.cardDescription}>{cat.description}</Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </ScalePressable>
            );
          })}
        </View>

        <ScalePressable
          style={[styles.button, (!hasChanged || selected.length === 0) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!hasChanged || selected.length === 0}
        >
          <Text style={[styles.buttonText, { color: (hasChanged && selected.length > 0) ? colors.background : colors.secondaryText }]}>
            Save
          </Text>
        </ScalePressable>
      </ScrollView>
    </View>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  back: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 4, alignSelf: 'flex-start' },
  scroll: { padding: 24, paddingTop: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '600', color: c.primary, marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: c.secondaryText, marginBottom: 24, lineHeight: 20 },
  cards: { gap: 10, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    padding: 14,
  },
  cardSelected: { borderColor: c.primary, backgroundColor: c.cardSelected },
  cardIcon: { fontSize: 22, marginRight: 12 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: c.primary, marginBottom: 1 },
  cardDescription: { fontSize: 12, color: c.secondaryText },
  checkmark: { fontSize: 15, color: c.primary, fontWeight: '700', marginLeft: 8 },
  button: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: c.disabled },
  buttonText: { fontSize: 15, fontWeight: '600' },
});

export default WritingFocusScreen;
