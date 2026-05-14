import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingWelcomeScreen from './src/screens/OnboardingWelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import OnboardingNameScreen, { DISPLAY_NAME_KEY } from './src/screens/OnboardingNameScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { Category } from './src/data/categoryPrompts';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const WELCOME_SEEN_KEY = 'quill_welcome_seen';
type Step = 'loading' | 'welcome' | 'focus' | 'name' | 'ready';

const AppContent = () => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('loading');
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingCategories, setPendingCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      const [savedCats, welcomeSeen] = await Promise.all([
        AsyncStorage.getItem('quill_categories'),
        AsyncStorage.getItem(WELCOME_SEEN_KEY),
      ]);

      if (savedCats) {
        // Returning user — load saved categories and go straight to the app
        const parsed: Category[] = JSON.parse(savedCats);
        setCategories(parsed);
        setStep('ready');
      } else if (welcomeSeen) {
        // Seen welcome but didn't finish — resume at focus picker
        setStep('focus');
      } else {
        // Brand new user — start at welcome
        setStep('welcome');
      }
    })();
  }, []);

  // Step 0: welcome → category picker
  const handleWelcomeDone = async () => {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
    setStep('focus');
  };

  // Step 1: category selection → show name screen
  const handleFocusComplete = (chosen: Category[]) => {
    setPendingCategories(chosen);
    setStep('name');
  };

  // Step 2: name entered or skipped → save everything and enter app
  const handleNameComplete = async (name: string) => {
    await AsyncStorage.setItem('quill_categories', JSON.stringify(pendingCategories));
    if (name) await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
    setCategories(pendingCategories);
    setStep('ready');
  };

  const handleCategoriesChange = (updated: Category[]) => {
    setCategories(updated);
  };

  if (step === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (step === 'welcome') {
    return (
      <>
        <StatusBar style={colors.statusBar} />
        <OnboardingWelcomeScreen onGetStarted={handleWelcomeDone} />
      </>
    );
  }

  if (step === 'focus') {
    return (
      <>
        <StatusBar style={colors.statusBar} />
        <OnboardingScreen onComplete={handleFocusComplete} onBack={() => setStep('welcome')} />
      </>
    );
  }

  if (step === 'name') {
    return (
      <>
        <StatusBar style={colors.statusBar} />
        <OnboardingNameScreen onComplete={handleNameComplete} onBack={() => setStep('focus')} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={colors.statusBar} />
      <RootNavigator categories={categories} onCategoriesChange={handleCategoriesChange} />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
