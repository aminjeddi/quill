import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { Category } from './src/data/categoryPrompts';

export default function App() {
  // undefined = still loading, null = no category yet, string = ready
  const [category, setCategory] = useState<Category | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem('quill_category').then((stored) => {
      setCategory((stored as Category) ?? null);
    });
  }, []);

  const handleOnboardingComplete = async (chosen: Category) => {
    await AsyncStorage.setItem('quill_category', chosen);
    setCategory(chosen);
  };

  const handleCategoryChange = (updated: Category) => {
    setCategory(updated);
  };

  if (category === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fafaf8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#1a1a1a" />
      </View>
    );
  }

  if (!category) {
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
      <TabNavigator category={category} onCategoryChange={handleCategoryChange} />
    </NavigationContainer>
  );
}
