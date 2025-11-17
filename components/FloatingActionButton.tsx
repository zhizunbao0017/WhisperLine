import React, { useRef } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FloatingActionButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, onLongPress, style }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const longPressTriggered = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 300,
    });
    // Light haptic feedback on press down
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    if (!longPressTriggered.current) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }
    longPressTriggered.current = false;
  };

  const handlePress = () => {
    if (!longPressTriggered.current) {
      // Success haptic feedback for short press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      onPress();
    }
  };

  const handleLongPress = () => {
    longPressTriggered.current = true;
    // Success notification haptic feedback for long press
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    
    // Visual feedback: scale down then bounce back with rotation
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1.1, {
        damping: 8,
        stiffness: 400,
      }),
      withSpring(1, {
        damping: 15,
        stiffness: 300,
      })
    );
    
    // Subtle rotation animation
    rotation.value = withSequence(
      withTiming(15, { duration: 100 }),
      withSpring(0, {
        damping: 10,
        stiffness: 200,
      })
    );

    if (onLongPress) {
      onLongPress();
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={250}
      style={[
        styles.button,
        {
          backgroundColor: colors.primary ?? '#4a6cf7',
          shadowColor: colors.primary ?? '#4a6cf7',
        },
        animatedStyle,
        style,
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </AnimatedPressable>
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

