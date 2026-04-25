import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Entry } from '../db/database';
import { Category } from '../data/categoryPrompts';
import SwipePages from './SwipePages';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WritingFocusScreen from '../screens/WritingFocusScreen';
import DailyReminderScreen from '../screens/DailyReminderScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import WritingGoalScreen from '../screens/WritingGoalScreen';

export type RootStackParamList = {
  Main: undefined;
  EntryDetail: { entry: Entry };
  Settings: undefined;
  WritingFocus: undefined;
  DailyReminder: undefined;
  WritingGoal: undefined;
  Appearance: undefined;
};

// Keep for backwards compat with EntryDetailScreen
export type ArchiveStackParamList = {
  ArchiveList: undefined;
  EntryDetail: { entry: Entry };
};

interface Props {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = ({ categories, onCategoriesChange }: Props) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Main"
        options={{ animation: 'none' }}
      >
        {() => <SwipePages categories={categories} />}
      </Stack.Screen>

      {/* Archive entry — slide from right */}
      <Stack.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Settings"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <SettingsScreen {...props} currentCategories={categories} />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="WritingFocus"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <WritingFocusScreen
            {...props}
            currentCategories={categories}
            onCategoryChange={onCategoriesChange}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="DailyReminder" component={DailyReminderScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WritingGoal" component={WritingGoalScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Appearance" component={AppearanceScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
