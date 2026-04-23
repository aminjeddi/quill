import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import TodayScreen from '../screens/TodayScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import { Entry } from '../db/database';

export type ArchiveStackParamList = {
  ArchiveList: undefined;
  EntryDetail: { entry: Entry };
};

const Tab = createBottomTabNavigator();
const ArchiveStack = createNativeStackNavigator<ArchiveStackParamList>();

const ArchiveNavigator = () => (
  <ArchiveStack.Navigator screenOptions={{ headerShown: false }}>
    <ArchiveStack.Screen name="ArchiveList" component={ArchiveScreen} />
    <ArchiveStack.Screen name="EntryDetail" component={EntryDetailScreen} />
  </ArchiveStack.Navigator>
);

const TabNavigator = () => (
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
      component={TodayScreen}
      options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>✦</Text> }}
    />
    <Tab.Screen
      name="Archive"
      component={ArchiveNavigator}
      options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>☰</Text> }}
    />
  </Tab.Navigator>
);

export default TabNavigator;
