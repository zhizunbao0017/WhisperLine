// app/(tabs)/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext'; // 注意路径变成了 ../../

export default function TabLayout() {
  const { colors, theme } = useContext(ThemeContext);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: colors.background,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timeline',
          headerShown: false, // 我们将使用根 _layout.js 里的 header
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}