// components/SettingRow.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface SettingRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  colors: {
    text: string;
    secondaryText: string;
    border: string;
    primary: string;
    background: string;
    card: string;
  };
}

/**
 * SettingRow - A reusable row component for settings
 * Supports disabled state with visual feedback
 */
export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  rightElement,
  onPress,
  disabled = false,
  colors,
}) => {
  const textColor = disabled ? colors.secondaryText : colors.text;
  const subtitleColor = disabled ? colors.secondaryText : colors.secondaryText;
  const iconColorFinal = disabled ? colors.secondaryText : (iconColor || colors.primary);
  const opacity = disabled ? 0.5 : 1;

  const content = (
    <View style={[styles.row, { borderBottomColor: colors.border, opacity }]}>
      {icon && (
        <Ionicons
          name={icon}
          size={22}
          color={iconColorFinal}
          style={{ marginRight: 12 }}
        />
      )}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.rowText, { color: textColor }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.rowSubText, { color: subtitleColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 17,
    flexShrink: 1,
  },
  rowSubText: {
    fontSize: 13,
    marginTop: 4,
  },
});

