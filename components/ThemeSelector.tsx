import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

import { AVAILABLE_THEMES, type ThemeDefinition, type ThemeName } from '@/constants/themes';

interface ThemeSelectorProps {
  selectedTheme?: ThemeName | null;
  onSelectTheme: (themeName: ThemeName) => void;
  containerStyle?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedTheme,
  onSelectTheme,
  containerStyle,
  itemStyle,
}) => {
  const handleSelect = (theme: ThemeDefinition) => {
    onSelectTheme(theme.id);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {AVAILABLE_THEMES.map((theme) => {
        const isSelected = theme.id === selectedTheme;
        return (
          <TouchableOpacity
            key={theme.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => handleSelect(theme)}
            style={[
              styles.themeCard,
              {
                borderColor: isSelected ? theme.palette.primary : '#E2E8F0',
                shadowOpacity: isSelected ? theme.shadow.opacity : 0.05,
              },
              itemStyle,
            ]}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.preview,
                {
                  backgroundColor: theme.previewGradient[0],
                },
              ]}
            >
              <View
                style={[
                  styles.previewAccent,
                  {
                    backgroundColor: theme.previewGradient[1],
                  },
                ]}
              />
              <View
                style={[
                  styles.previewPrimary,
                  {
                    backgroundColor: theme.palette.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.themeTitle}>{theme.displayName}</Text>
            <Text style={styles.themeDescription}>{theme.description}</Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  styles.badgeSpacing,
                  {
                    backgroundColor: theme.palette.tagBackground,
                    borderColor: theme.palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badgeSwatch,
                    {
                      backgroundColor: theme.palette.primary,
                    },
                  ]}
                />
                <Text style={[styles.badgeText, { color: theme.palette.tagText }]}>Primary</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  styles.lastBadge,
                  {
                    backgroundColor: theme.palette.card,
                    borderColor: theme.palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badgeSwatch,
                    {
                      backgroundColor: theme.palette.accent,
                    },
                  ]}
                />
                <Text style={[styles.badgeText, { color: theme.palette.text }]}>Accent</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    flexBasis: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  preview: {
    height: 120,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
  },
  previewAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    opacity: 0.7,
  },
  previewPrimary: {
    alignSelf: 'flex-start',
    width: 72,
    height: 28,
    borderRadius: 14,
    opacity: 0.9,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1F2937',
  },
  themeDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeSpacing: {
    marginRight: 10,
  },
  lastBadge: {
    marginRight: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
});

export default ThemeSelector;

