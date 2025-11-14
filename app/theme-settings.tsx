import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import ThemeSelector from '@/components/ThemeSelector';
import { getThemeDefinition } from '@/constants/themes';
import { ThemeContext } from '@/context/ThemeContext';

const ThemeSettingsScreen: React.FC = () => {
  const themeContext = useContext(ThemeContext);
  const [isSaving, setIsSaving] = useState(false);

  if (!themeContext) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { theme, setTheme, colors } = themeContext;
  const themeDefinition = getThemeDefinition(theme);

  const handleSelectTheme = useCallback(
    async (themeName) => {
      if (themeName === theme) {
        return;
      }
      setIsSaving(true);
      try {
        await setTheme(themeName);
      } finally {
        setIsSaving(false);
      }
    },
    [setTheme, theme]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Choose Your Theme</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Pick a look that matches your mood. You can change this anytime.
      </Text>

      <ThemeSelector selectedTheme={theme} onSelectTheme={handleSelectTheme} />

      <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.previewTitle, { color: colors.text }]}>
          {themeDefinition.displayName}
        </Text>
        <Text style={[styles.previewDescription, { color: colors.secondaryText }]}>
          {themeDefinition.description}
        </Text>
        <View style={styles.previewRow}>
          <View
            style={[
              styles.previewSwatch,
              { backgroundColor: themeDefinition.palette.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.secondaryText }]}>Background</Text>
          </View>
          <View
            style={[
              styles.previewSwatch,
              { backgroundColor: themeDefinition.palette.primary, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.primaryText || '#FFFFFF' }]}>
              Primary
            </Text>
          </View>
          <View
            style={[
              styles.previewSwatch,
              { backgroundColor: themeDefinition.palette.accent, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.text }]}>Accent</Text>
          </View>
        </View>
        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.savingText, { color: colors.secondaryText }]}>
              Applying theme…
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 24,
  },
  previewCard: {
    marginTop: 32,
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewSwatch: {
    flex: 1,
    marginRight: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  savingText: {
    fontSize: 13,
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeSettingsScreen;

