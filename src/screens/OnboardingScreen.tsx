import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, Category } from '../data/categoryPrompts';

interface Props {
  onComplete: (category: Category) => void;
}

const OnboardingScreen = ({ onComplete }: Props) => {
  const [selected, setSelected] = useState<Category | null>(null);

  const handleSelect = (key: Category) => {
    setSelected(key);
    Haptics.selectionAsync();
  };

  const handleStart = async () => {
    if (!selected) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(selected);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>Quill</Text>
        <Text style={styles.tagline}>One prompt. Every day.</Text>

        <Text style={styles.heading}>What kind of writer are you?</Text>
        <Text style={styles.subheading}>Pick a focus — you can always change it later.</Text>

        <View style={styles.cards}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(cat.key)}
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
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: { fontSize: 15, color: '#999', marginBottom: 40 },
  heading: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', lineHeight: 30, marginBottom: 8 },
  subheading: { fontSize: 14, color: '#999', marginBottom: 28 },
  cards: { gap: 12, marginBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  cardSelected: {
    borderColor: '#1a1a1a',
    backgroundColor: '#f5f5f3',
  },
  cardIcon: { fontSize: 24, marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  cardLabelSelected: { color: '#1a1a1a' },
  cardDescription: { fontSize: 13, color: '#999' },
  checkmark: { fontSize: 16, color: '#1a1a1a', fontWeight: '700', marginLeft: 8 },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default OnboardingScreen;
