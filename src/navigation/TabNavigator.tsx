import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Entry } from '../db/database';
import { Category } from '../data/categoryPrompts';

export type ArchiveStackParamList = {
  ArchiveList: undefined;
  EntryDetail: { entry: Entry };
};

export type TodayStackParamList = {
  TodayMain: undefined;
  Settings: undefined;
};

interface TabNavigatorProps {
  category: Category;
  onCategoryChange: (category: Category) => void;
}

const Tab = createBottomTabNavigator();
const ArchiveStack = createNativeStackNavigator<ArchiveStackParamList>();
const TodayStack = createNativeStackNavigator<TodayStackParamList>();

const ArchiveNavigator = () => (
  <ArchiveStack.Navigator screenOptions={{ headerShown: false }}>
    <ArchiveStack.Screen name="ArchiveList" component={ArchiveScreen} />
    <ArchiveStack.Screen name="EntryDetail" component={EntryDetailScreen} />
  </ArchiveStack.Navigator>
);

const makeTodayNavigator = (category: Category, onCategoryChange: (c: Category) => void) => {
  const TodayNavigator = () => (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayMain">
        {(props) => <TodayScreen {...props} category={category} />}
      </TodayStack.Screen>
      <TodayStack.Screen name="Settings">
        {(props) => (
          <SettingsScreen
            currentCategory={category}
            onCategoryChange={onCategoryChange}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </TodayStack.Screen>
    </TodayStack.Navigator>
  );
  return TodayNavigator;
};

const TabNavigator = ({ category, onCategoryChange }: TabNavigatorProps) => {
  const TodayNavigator = makeTodayNavigator(category, onCategoryChange);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a1a1a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#e5e5e5',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
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
    </Tab.Navigator>
  );
};

export default TabNavigator;
