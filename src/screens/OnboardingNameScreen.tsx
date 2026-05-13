import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Colors } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

export const DISPLAY_NAME_KEY = 'quill_display_name';

const useNativeDriver = Platform.OS !== 'web';

interface Props {
  onComplete: (name: string) => void;
  onBack?: () => void;
}

const OnboardingNameScreen = ({ onComplete, onBack }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');

  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(contentAnim, {
      toValue: 1,
      speed: 12,
      bounciness: 3,
      useNativeDriver,
    }).start();
  }, []);

  const handleContinue = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(name.trim());
  };

  const canContinue = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {onBack && (
        <ScalePressable scaleTo={0.95} style={styles.backBtn} onPress={onBack}>
          <Text style={[styles.backText, { color: colors.secondaryText }]}>← Back</Text>
        </ScalePressable>
      )}
      <Animated.View
        style={[
          styles.inner,
          {
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.appName}>Quill</Text>
        <Text style={styles.heading}>What should we{'\n'}call you?</Text>
        <Text style={styles.subheading}>
          We'll use your name to personalise your daily experience.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => canContinue && handleContinue()}
        />

        <ScalePressable
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={[styles.buttonText, { color: canContinue ? colors.background : colors.secondaryText }]}>
            Continue
          </Text>
        </ScalePressable>

        <ScalePressable style={styles.skip} onPress={() => onComplete('')}>
          <Text style={[styles.skipText, { color: colors.secondaryText }]}>Skip for now</Text>
        </ScalePressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (c: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  backBtn: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  backText: { fontSize: 16 },
  inner: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: -0.6,
    marginBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: c.primary,
    lineHeight: 36,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    color: c.secondaryText,
    lineHeight: 22,
    marginBottom: 36,
  },
  input: {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: c.primary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: c.disabled,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 15,
  },
});

export default OnboardingNameScreen;
