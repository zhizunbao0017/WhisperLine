// components/TemplatePickerModal.tsx

import React from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';

type TemplateOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
};

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'freestyle',
    title: 'Freestyle',
    description: 'Write freely about your thoughts, feelings, and experiences',
    icon: 'create-outline',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: 'weekly-reflection',
    title: 'Weekly Reflection',
    description: 'Structured reflection on wins, challenges, and goals',
    icon: 'calendar-outline',
    gradient: ['#f093fb', '#f5576c'],
  },
];

type TemplatePickerModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSelectTemplate: (templateId: string) => void;
  colors: {
    background: string;
    card: string;
    text: string;
    border: string;
    primary: string;
  };
};

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  visible,
  onDismiss,
  onSelectTemplate,
  colors,
}) => {
  const translateY = React.useRef(new Animated.Value(500)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const handleSelect = (templateId: string) => {
    onSelectTemplate(templateId);
    onDismiss();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: colors.background,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.header}>
                <ThemedText style={[styles.title, { color: colors.text }]}>
                  What would you like to write?
                </ThemedText>
                <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {TEMPLATE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    activeOpacity={0.85}
                    style={styles.optionCard}
                  >
                    <LinearGradient
                      colors={option.gradient}
                      style={styles.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.iconContainer}>
                        <Ionicons name={option.icon} size={32} color="#fff" />
                      </View>
                      <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
                      <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  gradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TemplatePickerModal;

