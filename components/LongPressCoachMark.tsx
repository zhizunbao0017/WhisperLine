// components/LongPressCoachMark.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// FAB position constants (matching FloatingActionButton styles)
const FAB_SIZE = 64;
const FAB_RIGHT = 25;
const FAB_BOTTOM = 25;
const FAB_CENTER_X = SCREEN_WIDTH - FAB_RIGHT - FAB_SIZE / 2;
const FAB_CENTER_Y = SCREEN_HEIGHT - FAB_BOTTOM - FAB_SIZE / 2;

interface LongPressCoachMarkProps {
  visible: boolean;
  onDismiss: () => void;
}

const LongPressCoachMark: React.FC<LongPressCoachMarkProps> = ({ visible, onDismiss }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the FAB highlight
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);
    }
  }, [visible, fadeAnim, scaleAnim, pulseAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) {
    return null;
  }

  const animatedOverlayStyle = {
    opacity: fadeAnim,
  };

  const animatedBubbleStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }],
  };

  const animatedPulseStyle = {
    transform: [{ scale: pulseAnim }],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        {/* Semi-transparent overlay */}
        <Animated.View style={[styles.overlay, animatedOverlayStyle]} />

        {/* FAB Highlight Circle with pulse animation */}
        <Animated.View
          style={[
            styles.fabHighlight,
            {
              left: FAB_CENTER_X - FAB_SIZE / 2 - 10,
              top: FAB_CENTER_Y - FAB_SIZE / 2 - 10,
            },
            animatedPulseStyle,
          ]}
        >
          <View
            style={[
              styles.fabHighlightInner,
              {
                backgroundColor: colors.primary || '#4a6cf7',
              },
            ]}
          />
        </Animated.View>

        {/* Speech Bubble */}
        <Animated.View
          style={[
            styles.bubbleContainer,
            {
              bottom: SCREEN_HEIGHT - FAB_CENTER_Y + FAB_SIZE / 2 + 40,
              right: SCREEN_WIDTH - FAB_CENTER_X + 20,
            },
            animatedBubbleStyle,
          ]}
        >
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: colors.card || '#ffffff',
                shadowColor: colors.text || '#000',
              },
            ]}
          >
            {/* Arrow pointing to FAB */}
            <View
              style={[
                styles.bubbleArrow,
                {
                  borderTopColor: colors.card || '#ffffff',
                },
              ]}
            />

            <View style={styles.bubbleContent}>
              <View style={styles.bubbleHeader}>
                <Ionicons name="hand-left-outline" size={24} color={colors.primary || '#4a6cf7'} />
                <Text
                  style={[
                    styles.bubbleTitle,
                    {
                      color: colors.text || '#111111',
                    },
                  ]}
                >
                  Long Press for More Options
                </Text>
              </View>
              <Text
                style={[
                  styles.bubbleText,
                  {
                    color: colors.text || '#111111',
                  },
                ]}
              >
                Hold the + button to access Quick Capture and Weekly Reflection templates.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={[
            styles.dismissButton,
            {
              backgroundColor: colors.primary || '#4a6cf7',
              top: insets.top + 20,
            },
          ]}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissButtonText}>Got It</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  fabHighlight: {
    position: 'absolute',
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    borderRadius: (FAB_SIZE + 20) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabHighlightInner: {
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    borderRadius: (FAB_SIZE + 20) / 2,
    opacity: 0.3,
  },
  bubbleContainer: {
    position: 'absolute',
    maxWidth: SCREEN_WIDTH - 40,
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    padding: 16,
    minWidth: 280,
    maxWidth: SCREEN_WIDTH - 80,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -8,
    right: 40,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleContent: {
    gap: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bubbleTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  dismissButton: {
    position: 'absolute',
    right: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LongPressCoachMark;

