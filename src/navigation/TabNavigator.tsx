import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WritingFocusScreen from '../screens/WritingFocusScreen';
import DailyReminderScreen from '../screens/DailyReminderScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import WritingGoalScreen from '../screens/WritingGoalScreen';
import { Entry } from '../db/database';
import { Category } from '../data/categoryPrompts';
import { useTheme } from '../context/ThemeContext';

export type ArchiveStackParamList = {
  ArchiveList: undefined;
  EntryDetail: { entry: Entry };
};

export type TodayStackParamList = {
  TodayMain: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  WritingFocus: undefined;
  DailyReminder: undefined;
  WritingGoal: undefined;
  Appearance: undefined;
};

interface TabNavigatorProps {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

const Tab = createBottomTabNavigator();
const ArchiveStack = createNativeStackNavigator<ArchiveStackParamList>();
const TodayStack = createNativeStackNavigator<TodayStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const ArchiveNavigator = () => (
  <ArchiveStack.Navigator screenOptions={{ headerShown: false }}>
    <ArchiveStack.Screen name="ArchiveList" component={ArchiveScreen} />
    <ArchiveStack.Screen name="EntryDetail" component={EntryDetailScreen} />
  </ArchiveStack.Navigator>
);

const makeTodayNavigator = (categories: Category[]) => {
  const TodayNavigator = () => (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayMain">
        {(props) => <TodayScreen {...props} categories={categories} />}
      </TodayStack.Screen>
    </TodayStack.Navigator>
  );
  return TodayNavigator;
};

const makeSettingsNavigator = (
  categories: Category[],
  onCategoriesChange: (c: Category[]) => void
) => {
  const SettingsNavigator = () => (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain">
        {(props) => (
          <SettingsScreen
            {...props}
            currentCategories={categories}
          />
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="WritingFocus">
        {(props) => (
          <WritingFocusScreen
            {...props}
            currentCategories={categories}
            onCategoryChange={onCategoriesChange}
          />
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="DailyReminder" component={DailyReminderScreen} />
      <SettingsStack.Screen name="WritingGoal" component={WritingGoalScreen} />
      <SettingsStack.Screen name="Appearance" component={AppearanceScreen} />
    </SettingsStack.Navigator>
  );
  return SettingsNavigator;
};

const TabNavigator = ({ categories, onCategoriesChange }: TabNavigatorProps) => {
  const { colors } = useTheme();
  const TodayNavigator = makeTodayNavigator(categories);
  const SettingsNavigator = makeSettingsNavigator(categories, onCategoriesChange);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayNavigator}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>✦</Text> }}
      />
      <Tab.Screen
        name="Archive"
        component={ArchiveNavigator}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>☰</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙</Text> }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
