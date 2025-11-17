// app/(tabs)/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { getThemeStyles } from '../../hooks/useThemeStyles';

export default function TabLayout() {
  const themeContext = useContext(ThemeContext);
  const { colors } = themeContext;
  const theme = themeContext?.theme ?? 'default';
  const themeStyles = getThemeStyles(theme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: colors.background,
        },
        tabBarLabelStyle: {
          fontFamily: themeStyles.fontFamily,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size || 26} color={color} />,
        }}
      />
    </Tabs>
  );
}