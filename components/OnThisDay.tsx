// components/OnThisDay.tsx

import React, { useContext, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserState } from '../context/UserStateContext';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText } from './ThemedText';
import { EmotionType } from '../models/PIE';

// Helper function to extract plain text from HTML
const extractTextFromHTML = (html: string): string => {
  if (!html) return '';
  // Remove HTML tags
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Emotion icon mapping
const emotionIcons: Record<EmotionType, keyof typeof Ionicons.glyphMap> = {
  excited: 'flash',
  happy: 'happy',
  calm: 'leaf',
  tired: 'moon',
  sad: 'sad',
  angry: 'flame',
};

// Emotion color mapping
const emotionColors: Record<EmotionType, string> = {
  excited: '#E91E63',
  happy: '#4CAF50',
  calm: '#2196F3',
  tired: '#9E9E9E',
  sad: '#2196F3',
  angry: '#F44336',
};

const OnThisDay: React.FC = () => {
  const router = useRouter();
  const { allRichEntries, userState } = useUserState();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const diaries = diaryContext?.diaries || [];
  const { colors } = themeContext || { colors: {} };

  const historicEntryData = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Find entries from past years on the same month and day
    const pastEntries = Object.values(allRichEntries).filter((entry) => {
      if (!entry || !entry.createdAt) return false;
      const entryDate = new Date(entry.createdAt);
      if (Number.isNaN(entryDate.getTime())) return false;

      return (
        entryDate.getMonth() === currentMonth &&
        entryDate.getDate() === currentDay &&
        entryDate.getFullYear() < today.getFullYear()
      );
    });

    if (pastEntries.length === 0) {
      return null;
    }

    // Sort by date and get the oldest entry
    const sortedEntries = pastEntries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const selectedEntry = sortedEntries[0];

    // Find the corresponding DiaryEntry from DiaryContext for navigation
    const diaryEntry = diaries.find((d) => d.id === selectedEntry.id);

    if (!diaryEntry) {
      return null;
    }

    // Calculate years ago
    const entryDate = new Date(selectedEntry.createdAt);
    const yearsAgo = today.getFullYear() - entryDate.getFullYear();

    // Get emotion
    const emotion = selectedEntry.metadata?.detectedEmotion?.primary || 'calm';

    // Get chapter info (get the first chapter if multiple)
    const chapterIds = selectedEntry.chapterIds || [];
    let chapterName = null;
    if (chapterIds.length > 0) {
      const chapterId = chapterIds[0];
      // Try to get chapter from userState
      if (userState?.chapters?.[chapterId]) {
        chapterName = userState.chapters[chapterId].title;
      } else {
        // Fallback: extract from chapterId format (e.g., "theme-work" -> "Work")
        if (chapterId.startsWith('theme-')) {
          const themeName = chapterId.replace('theme-', '');
          chapterName = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        } else if (chapterId.startsWith('companion-')) {
          chapterName = 'Companion';
        }
      }
    }

    // Extract preview text from content
    const contentPreview = extractTextFromHTML(diaryEntry.content || diaryEntry.contentHTML || '');
    const previewText = contentPreview.length > 120 ? contentPreview.slice(0, 120) + '...' : contentPreview;

    return {
      entry: diaryEntry,
      richEntry: selectedEntry,
      yearsAgo,
      emotion,
      chapterName,
      previewText,
      entryDate,
    };
  }, [allRichEntries, diaries, userState]);

  if (!historicEntryData) {
    return null;
  }

  const { entry, yearsAgo, emotion, chapterName, previewText, entryDate } = historicEntryData;

  const handlePress = () => {
    router.push({
      pathname: '/diary-detail',
      params: { diary: JSON.stringify(entry) },
    });
  };

  const emotionIcon = emotionIcons[emotion] || 'leaf';
  const emotionColor = emotionColors[emotion] || '#2196F3';

  // Format date
  const formattedDate = entryDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, { backgroundColor: colors.card || '#ffffff' }]}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[emotionColor + '15', emotionColor + '05']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Time capsule icon */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: emotionColor + '20' }]}>
            <Ionicons name="time" size={24} color={emotionColor} />
          </View>
        </View>

        {/* Title */}
        <ThemedText style={[styles.title, { color: colors.text || '#111111' }]}>
          On This Day, {yearsAgo} Year{yearsAgo > 1 ? 's' : ''} Ago...
        </ThemedText>

        {/* Date */}
        <ThemedText style={[styles.date, { color: colors.secondaryText || '#6b7280' }]}>
          {formattedDate}
        </ThemedText>

        {/* Preview text */}
        <ThemedText style={[styles.preview, { color: colors.text || '#111111' }]} numberOfLines={3}>
          {previewText || 'A memory from the past...'}
        </ThemedText>

        {/* Footer with emotion and chapter */}
        <View style={styles.footer}>
          {chapterName && (
            <View style={[styles.tag, { backgroundColor: colors.tagBackground || '#eef2ff' }]}>
              <ThemedText style={[styles.tagText, { color: colors.tagText || '#2945b5' }]}>
                {chapterName}
              </ThemedText>
            </View>
          )}
          <View style={styles.emotionBadge}>
            <Ionicons name={emotionIcon} size={16} color={emotionColor} />
            <ThemedText style={[styles.emotionText, { color: emotionColor }]}>
              {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  preview: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emotionText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default OnThisDay;

