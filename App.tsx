import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { Category } from './src/data/categoryPrompts';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const AppContent = () => {
  const { colors } = useTheme();
  // undefined = loading, null = onboarding needed, array = ready
  const [categories, setCategories] = useState<Category[] | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem('quill_categories').then((stored) => {
      if (stored) {
        setCategories(JSON.parse(stored) as Category[]);
      } else {
        // Migrate old single-category storage
        AsyncStorage.getItem('quill_category').then((legacy) => {
          setCategories(legacy ? [legacy as Category] : null);
        });
      }
    });
  }, []);

  const handleOnboardingComplete = async (chosen: Category[]) => {
    await AsyncStorage.setItem('quill_categories', JSON.stringify(chosen));
    setCategories(chosen);
  };

  const handleCategoriesChange = (updated: Category[]) => {
    setCategories(updated);
  };

  if (categories === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!categories) {
    return (
      <>
        <StatusBar style={colors.statusBar} />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={colors.statusBar} />
      <TabNavigator categories={categories} onCategoriesChange={handleCategoriesChange} />
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
