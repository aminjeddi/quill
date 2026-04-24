import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { Category } from './src/data/categoryPrompts';

export default function App() {
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
      <View style={{ flex: 1, backgroundColor: '#fafaf8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#1a1a1a" />
      </View>
    );
  }

  if (!categories) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <TabNavigator categories={categories} onCategoriesChange={handleCategoriesChange} />
    </NavigationContainer>
  );
}
