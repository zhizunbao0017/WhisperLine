// app/weekly-reflection.tsx

import React, { useContext, useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import { useThemeStyles } from '../hooks/useThemeStyles';
import MoodSelector from '../components/MoodSelector';

// Helper function to escape HTML
const escapeHTML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Helper function to format text with line breaks
const formatTextWithLineBreaks = (text: string): string => {
  if (!text) return '';
  // Replace line breaks with <br> tags and preserve paragraphs
  return text
    .split(/\n\n+/)
    .map((paragraph) => {
      const lines = paragraph.split(/\n/);
      return lines.map((line) => escapeHTML(line.trim())).join('<br>');
    })
    .filter((para) => para.length > 0)
    .map((para) => `<p>${para}</p>`)
    .join('');
};

const WeeklyReflectionScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const themeStyles = useThemeStyles();
  const { addDiary } = diaryContext || {};
  const { colors } = themeContext || {};
  const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';

  // Get date parameter if provided
  const entryDateParam = useMemo(() => {
    const raw = params?.date;
    if (!raw) return undefined;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [goals, setGoals] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const winsInputRef = useRef<TextInput>(null);
  const challengesInputRef = useRef<TextInput>(null);
  const goalsInputRef = useRef<TextInput>(null);

  // Check if we have content to save
  const canSave = useMemo(() => {
    return (
      selectedMood &&
      (wins.trim().length > 0 || challenges.trim().length > 0 || goals.trim().length > 0)
    );
  }, [wins, challenges, goals, selectedMood]);

  const handleSave = async () => {
    if (!canSave || !addDiary) {
      Alert.alert(
        'Incomplete Entry',
        'Please select a mood and fill in at least one section (Wins, Challenges, or Goals).'
      );
      return;
    }

    setIsSaving(true);

    try {
      // Combine the structured content into a single HTML string
      const combinedContent = `
        <h1>Weekly Reflection</h1>
        ${wins.trim() ? `<h2>This Week's Wins</h2>${formatTextWithLineBreaks(wins)}` : ''}
        ${challenges.trim() ? `<h2>Challenges Faced</h2>${formatTextWithLineBreaks(challenges)}` : ''}
        ${goals.trim() ? `<h2>Goals for Next Week</h2>${formatTextWithLineBreaks(goals)}` : ''}
      `.trim();

      // Handle date parameter
      let createdAtOverride = undefined;
      if (entryDateParam) {
        try {
          const dateParts = entryDateParam.split('-');
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const day = parseInt(dateParts[2], 10);
            const date = new Date(year, month, day, 12, 0, 0, 0);
            createdAtOverride = date.toISOString();
          }
        } catch (error) {
          console.warn('Failed to parse entryDateParam:', entryDateParam, error);
        }
      }

      // Format title with date
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

      const title = `Weekly Reflection - ${weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      const diaryData = {
        title,
        content: combinedContent,
        mood: selectedMood,
        weather: null,
        companionIDs: [],
        themeID: null,
      };

      if (createdAtOverride) {
        await addDiary({ ...diaryData, createdAt: createdAtOverride });
      } else {
        await addDiary(diaryData);
      }

      // Navigate back
      router.back();
    } catch (error) {
      console.error('Failed to save weekly reflection:', error);
      Alert.alert('Error', 'Failed to save your reflection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sectionInputStyle = [
    styles.sectionInput,
    {
      backgroundColor: colors?.card || '#ffffff',
      color: colors?.text || '#111111',
      borderColor: colors?.border || '#e3e8f0',
      fontFamily: themeStyles.bodyFontFamily,
    },
  ];

  const labelStyle = [
    styles.sectionLabel,
    {
      color: colors?.text || '#111111',
      fontFamily: themeStyles.headingFontFamily,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors?.background || '#ffffff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors?.card || '#ffffff',
            borderBottomColor: colors?.border || '#e3e8f0',
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors?.text || '#111111'} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors?.text || '#111111' }]}>
          Weekly Reflection
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave || isSaving}
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave ? colors?.primary || '#4a6cf7' : colors?.border || '#e3e8f0',
              opacity: canSave && !isSaving ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText style={styles.saveButtonText}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mood Selector */}
        <View style={styles.moodSection}>
          <MoodSelector
            onSelectMood={(mood) => {
              // Handle both string and object mood formats
              const moodName = typeof mood === 'string' ? mood : mood?.name || null;
              setSelectedMood(moodName);
            }}
            selectedMood={selectedMood}
            hideTitle={false}
          />
        </View>

        {/* Section 1: This Week's Wins */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={colors?.primary || '#4a6cf7'} />
            <ThemedText style={labelStyle}>This Week's Wins</ThemedText>
          </View>
          <TextInput
            ref={winsInputRef}
            style={sectionInputStyle}
            placeholder="What went well this week? What achievements or positive moments did you experience?"
            placeholderTextColor={(colors?.secondaryText || '#6b7280') + '80'}
            value={wins}
            onChangeText={setWins}
            multiline
            textAlignVertical="top"
            numberOfLines={6}
          />
        </View>

        {/* Section 2: Challenges Faced */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color={colors?.primary || '#4a6cf7'} />
            <ThemedText style={labelStyle}>Challenges Faced</ThemedText>
          </View>
          <TextInput
            ref={challengesInputRef}
            style={sectionInputStyle}
            placeholder="What obstacles or difficulties did you encounter? How did you handle them?"
            placeholderTextColor={(colors?.secondaryText || '#6b7280') + '80'}
            value={challenges}
            onChangeText={setChallenges}
            multiline
            textAlignVertical="top"
            numberOfLines={6}
          />
        </View>

        {/* Section 3: Goals for Next Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag" size={20} color={colors?.primary || '#4a6cf7'} />
            <ThemedText style={labelStyle}>Goals for Next Week</ThemedText>
          </View>
          <TextInput
            ref={goalsInputRef}
            style={sectionInputStyle}
            placeholder="What do you want to focus on next week? What are your priorities?"
            placeholderTextColor={(colors?.secondaryText || '#6b7280') + '80'}
            value={goals}
            onChangeText={setGoals}
            multiline
            textAlignVertical="top"
            numberOfLines={6}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  moodSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
});

export default WeeklyReflectionScreen;

