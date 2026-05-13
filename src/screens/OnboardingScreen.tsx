import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { CATEGORIES, Category } from '../data/categoryPrompts';

const useNativeDriver = Platform.OS !== 'web';
import { useTheme, Colors } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

interface Props {
  onComplete: (categories: Category[]) => void;
}

const OnboardingScreen = ({ onComplete }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<Category[]>([]);

  // Staggered entrance — header then each card in sequence
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(CATEGORIES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Header fades in first, then cards stagger in
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver,
      }),
      Animated.stagger(
        55,
        cardAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            speed: 14,
            bounciness: 3,
            useNativeDriver,
          })
        )
      ),
    ]).start();
  }, []);

  const handleToggle = (key: Category) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (key === 'freeform') return ['freeform']; // freeform clears all others
      return [...prev.filter((k) => k !== 'freeform'), key]; // others clear freeform
    });
    Haptics.selectionAsync();
  };

  const handleStart = async () => {
    if (selected.length === 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(selected);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header animates in first */}
        <Animated.View style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}>
          <Text style={styles.heading}>What kind of writer are you?</Text>
          <Text style={styles.subheading}>Pick one or more — you can always change later.</Text>
        </Animated.View>

        {/* Cards stagger in */}
        <View style={styles.cards}>
          {CATEGORIES.map((cat, index) => {
            const isSelected = selected.includes(cat.key);
            const anim = cardAnims[index];
            return (
              <Animated.View
                key={cat.key}
                style={{
                  opacity: anim,
                  transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                }}
              >
                <ScalePressable
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
              </Animated.View>
            );
          })}
        </View>

        <ScalePressable
          style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={selected.length === 0}
        >
          <Text style={[styles.buttonText, { color: selected.length > 0 ? colors.background : colors.secondaryText }]}>
            {selected.length === 0
              ? 'Get started'
              : `Get started with ${selected.length} focus${selected.length > 1 ? 'es' : ''}`}
          </Text>
        </ScalePressable>

      </ScrollView>
    </View>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  appName: { fontSize: 32, fontWeight: '700', color: c.primary, letterSpacing: -0.5, marginBottom: 4 },
  tagline: { fontSize: 15, color: c.secondaryText, marginBottom: 40 },
  heading: { fontSize: 22, fontWeight: '600', color: c.primary, lineHeight: 30, marginBottom: 8 },
  subheading: { fontSize: 14, color: c.secondaryText, marginBottom: 28 },
  cards: { gap: 12, marginBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    padding: 16,
  },
  cardSelected: { borderColor: c.primary, backgroundColor: c.cardSelected },
  cardIcon: { fontSize: 24, marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: c.primary, marginBottom: 2 },
  cardDescription: { fontSize: 13, color: c.secondaryText },
  checkmark: { fontSize: 16, color: c.primary, fontWeight: '700', marginLeft: 8 },
  button: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: c.disabled },
  buttonText: { fontSize: 16, fontWeight: '600' },
});

export default OnboardingScreen;
