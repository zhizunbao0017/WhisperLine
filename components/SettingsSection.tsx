// components/SettingsSection.tsx
import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { ThemeContext } from '../context/ThemeContext';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * SettingsSection - A visually grouped section for settings
 * Provides a clear title header and groups related settings together
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const themeContext = useContext(ThemeContext);
  const colors = themeContext?.colors || { text: '#000' };

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingLeft: 2,
  },
  sectionContent: {
    // Content container for grouped settings
  },
});

