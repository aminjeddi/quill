import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, Category } from '../data/categoryPrompts';

interface Props {
  currentCategories: Category[];
  onCategoryChange: (categories: Category[]) => void;
}

const WritingFocusScreen = ({ currentCategories, onCategoryChange }: Props) => {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Category[]>(currentCategories);

  const handleToggle = (key: Category) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
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
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ Settings</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Writing focus</Text>
        <Text style={styles.subtitle}>Select one or more. Your prompts will be drawn from all selected styles.</Text>

        <View style={styles.cards}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.key);
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleToggle(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardIcon}>{cat.icon}</Text>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.cardDescription}>{cat.description}</Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.button, (!hasChanged || selected.length === 0) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!hasChanged || selected.length === 0}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  back: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 4 },
  backText: { fontSize: 16, color: '#999' },
  scroll: { padding: 24, paddingTop: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 24, lineHeight: 20 },
  cards: { gap: 10, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    padding: 14,
  },
  cardSelected: { borderColor: '#1a1a1a', backgroundColor: '#f5f5f3' },
  cardIcon: { fontSize: 22, marginRight: 12 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 1 },
  cardLabelSelected: { color: '#1a1a1a' },
  cardDescription: { fontSize: 12, color: '#999' },
  checkmark: { fontSize: 15, color: '#1a1a1a', fontWeight: '700', marginLeft: 8 },
  button: { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default WritingFocusScreen;
