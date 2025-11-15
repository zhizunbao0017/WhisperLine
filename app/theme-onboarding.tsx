import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';

import ThemeSelector from '@/components/ThemeSelector';
import { ThemeContext } from '@/context/ThemeContext';
import { ThemedText as Text } from '@/components/ThemedText';

const ThemeOnboardingScreen: React.FC = () => {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    themeContext?.hasSelectedTheme ? themeContext.theme : null
  );

  if (!themeContext) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { setTheme, colors, theme } = themeContext;

  const handleSelectTheme = useCallback(
    async (themeName: string) => {
      setSelectedTheme(themeName);
      setIsSaving(true);
      try {
        await setTheme(themeName);
        router.replace('/(tabs)');
      } finally {
        setIsSaving(false);
      }
    },
    [router, setTheme]
  );

  const helperText = useMemo(() => {
    if (selectedTheme) {
      return 'Theme applied! You can always change this later in Settings.';
    }
    return 'Pick the style that feels right for you. You can preview them before diving in.';
  }, [selectedTheme]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to WhisperLine</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Let’s start by choosing a theme for your journal. This sets the mood for your stories.
          </Text>
        </View>

        <ThemeSelector selectedTheme={selectedTheme} onSelectTheme={handleSelectTheme} />

        <View style={styles.footer}>
          {isSaving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.savingText, { color: colors.secondaryText }]}>
                Applying your theme…
              </Text>
            </View>
          ) : (
            <Text style={[styles.helperText, { color: colors.secondaryText }]}>{helperText}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    marginTop: 40,
  },
  helperText: {
    fontSize: 15,
    textAlign: 'center',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    fontSize: 15,
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeOnboardingScreen;

