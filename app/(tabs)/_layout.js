// app/(tabs)/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors } = useContext(ThemeContext);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timeline',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chapters"
        options={{
          title: 'Chapters',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}