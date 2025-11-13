import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

type FloatingActionButtonProps = {
  onPress: () => void;
  style?: ViewStyle;
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, style }) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primary ?? '#4a6cf7',
          transform: [{ scale: pressed ? 0.95 : 1 }],
          shadowColor: colors.primary ?? '#4a6cf7',
        },
        style,
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: 'absolute',
    right: 25,
    bottom: 25,
    zIndex: 50,
  },
});

export default FloatingActionButton;

