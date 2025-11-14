import React, { useContext, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const FALLBACK_COLORS = [
  '#6C5CE7',
  '#E17055',
  '#00CEC9',
  '#0984E3',
  '#FF7675',
  '#00B894',
  '#FAB1A0',
  '#74B9FF',
  '#D63031',
  '#636EFA',
];

const getFallbackColor = (name = '') => {
  if (!name) return FALLBACK_COLORS[0];
  const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[code % FALLBACK_COLORS.length];
};

const CompanionAvatarItem = ({ companion, isSelected, onPress }) => {
  const themeContext = useContext(ThemeContext);
  const isChildTheme = themeContext?.theme === 'child';
  const initials = useMemo(() => {
    if (!companion?.name) return '?';
    return companion.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [companion?.name]);

  const fallbackColor = useMemo(() => getFallbackColor(companion?.name), [companion?.name]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isSelected && styles.containerSelected,
        pressed && styles.containerPressed,
      ]}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.avatarWrapper,
          { borderColor: isSelected ? styles.selectedBorder.borderColor : 'transparent' },
        ]}
      >
        {companion?.avatarIdentifier ? (
          <Image source={{ uri: companion.avatarIdentifier }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: fallbackColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectionBadge}>
            <Text style={styles.selectionBadgeText}>✓</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.name, isChildTheme && { color: '#7090AC' }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {companion?.name || 'Unnamed'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 78,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  containerPressed: {
    opacity: 0.8,
  },
  containerSelected: {},
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  selectedBorder: {
    borderColor: '#4A6CF7',
  },
  selectionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4A6CF7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectionBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  name: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CompanionAvatarItem;

