// src/components/AnalysisFeedbackModal.tsx
// Instant Gratification Modal - appears after saving diary entry
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { AnalysisResult } from '../services/analysisEngine';

// Conditionally import BlurView for iOS
let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // BlurView not available, will use regular View
}

interface AnalysisFeedbackModalProps {
  visible: boolean;
  analysisResult: AnalysisResult | null;
  onClose: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export const AnalysisFeedbackModal: React.FC<AnalysisFeedbackModalProps> = ({
  visible,
  analysisResult,
  onClose,
  autoDismiss = true,
  autoDismissDelay = 3000,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoDismissDelay);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!analysisResult) return null;

  // Generate dynamic feedback message using new NLP-based structure
  const generateFeedbackMessage = (): { headline: string; body: string } => {
    // Safely extract arrays with null checks
    const people = (Array.isArray(analysisResult?.people) ? analysisResult.people : []) ||
                   (Array.isArray(analysisResult?.detectedPeople) ? analysisResult.detectedPeople : []) ||
                   [];
    const activities = (Array.isArray(analysisResult?.activities) ? analysisResult.activities : []) ||
                       (Array.isArray(analysisResult?.detectedActivities) ? analysisResult.detectedActivities : []) ||
                       [];
    const moods = (Array.isArray(analysisResult?.moods) ? analysisResult.moods : []) ||
                  (Array.isArray(analysisResult?.detectedMoods) ? analysisResult.detectedMoods : []) ||
                  [];
    const sentimentSummary = (typeof analysisResult?.sentimentSummary === 'string' 
                              ? analysisResult.sentimentSummary 
                              : 'neutral') || 'neutral';

    // Helper to safely get string value
    const safeString = (value: any): string => {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      return '';
    };

    // Priority 1: People detected
    if (people.length > 0 && people[0]) {
      const personName = safeString(people[0]);
      if (personName) {
        return {
          headline: 'Moment Captured ✨',
          body: `Connected with ${personName}.`,
        };
      }
    }

    // Priority 2: Activities detected
    if (activities.length > 0 && activities[0]) {
      const activity = safeString(activities[0]);
      if (activity) {
        return {
          headline: 'Moment Captured ✨',
          body: `Spent time ${activity}.`,
        };
      }
    }

    // Priority 3: Moods detected
    if (moods.length > 0 && moods[0]) {
      const mood = safeString(moods[0]);
      if (mood) {
        // Capitalize first letter for better presentation
        const moodText = mood.charAt(0).toUpperCase() + mood.slice(1);
        return {
          headline: 'Moment Captured ✨',
          body: `Feeling ${moodText}.`,
        };
      }
    }

    // Sentiment-based fallback
    if (sentimentSummary === 'positive') {
      return {
        headline: 'Moment Captured ✨',
        body: 'Your positive moment has been safely stored.',
      };
    } else if (sentimentSummary === 'negative') {
      return {
        headline: 'Moment Captured ✨',
        body: 'Your thoughts have been safely stored.',
      };
    }

    // Default
    return {
      headline: 'Moment Captured ✨',
      body: 'Your day has been safely stored.',
    };
  };

  const feedback = generateFeedbackMessage();
  
  // Ensure feedback values are always valid strings
  const safeHeadline = (typeof feedback?.headline === 'string' && feedback.headline.trim()) 
    ? feedback.headline.trim() 
    : 'Moment Captured ✨';
  const safeBody = (typeof feedback?.body === 'string' && feedback.body.trim()) 
    ? feedback.body.trim() 
    : 'Your day has been safely stored.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {Platform.OS === 'ios' && BlurView ? (
            <BlurView intensity={80} style={styles.blurContainer}>
              <View style={styles.content}>
                <Text style={styles.headline}>{safeHeadline}</Text>
                <Text style={styles.body}>{safeBody}</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>Nice</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.blurContainer, styles.androidContainer]}>
              <View style={styles.content}>
                <Text style={styles.headline}>{safeHeadline}</Text>
                <Text style={styles.body}>{safeBody}</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>Nice</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  androidContainer: {
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4a6cf7',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 100,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

