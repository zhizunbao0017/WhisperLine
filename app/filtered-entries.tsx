import React, { useContext, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmotionType } from '../models/PIE';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import DiarySummaryCard from '../components/DiarySummaryCard';

type FilteredEntriesParams = {
  chapterId?: string;
  emotion?: string; // EmotionType as string
};

const FALLBACK_COLORS = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111111',
  border: '#e5e5e5',
  primary: '#4a6cf7',
};

// Emotion label mapping
const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: 'Happy',
  excited: 'Excited',
  calm: 'Calm',
  tired: 'Tired',
  sad: 'Sad',
  angry: 'Angry',
};

const FilteredEntriesScreen: React.FC = () => {
  const { chapterId, emotion } = useLocalSearchParams<FilteredEntriesParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const { userState, allRichEntries } = useUserState();

  const colors = themeContext?.colors ?? FALLBACK_COLORS;
  const diaries = diaryContext?.diaries ?? [];

  // Get chapter from UserStateModel
  const chapter = useMemo(() => {
    if (!chapterId || !userState?.chapters) {
      return undefined;
    }
    return userState.chapters[chapterId];
  }, [chapterId, userState?.chapters]);

  // Filter entries by chapter and emotion
  const filteredEntries = useMemo(() => {
    if (!chapter || !Array.isArray(diaries)) {
      return [];
    }

    // Get all entry IDs for this chapter
    const chapterEntryIds = new Set((chapter.entryIds ?? []).map(String));

    // Filter diaries that belong to this chapter
    let chapterEntries = diaries.filter((entry) => chapterEntryIds.has(String(entry.id)));

    // If emotion filter is provided, further filter by emotion
    if (emotion && allRichEntries) {
      const emotionType = emotion as EmotionType;
      chapterEntries = chapterEntries.filter((entry) => {
        const richEntry = allRichEntries[entry.id];
        if (!richEntry || !richEntry.metadata) {
          return false;
        }
        return richEntry.metadata.detectedEmotion?.primary === emotionType;
      });
    }

    // Sort by date (newest first)
    return chapterEntries.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [chapter, diaries, emotion, allRichEntries]);

  // Generate dynamic title
  const title = useMemo(() => {
    if (!chapter) {
      return 'Filtered Entries';
    }
    if (emotion) {
      const emotionLabel = EMOTION_LABELS[emotion as EmotionType] || emotion;
      return `${emotionLabel} Moments in "${chapter.title}"`;
    }
    return `All Moments in "${chapter.title}"`;
  }, [chapter, emotion]);

  if (!chapterId) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Chapter ID missing</Text>
      </SafeAreaView>
    );
  }

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {filteredEntries.length} {filteredEntries.length === 1 ? 'moment' : 'moments'}
          </Text>
        </View>
      </View>

      {/* Entries List */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <DiarySummaryCard
            item={item}
            index={index}
            onPress={() =>
              router.push({
                pathname: '/diary-detail',
                params: { diary: JSON.stringify(item) },
              })
            }
            colors={colors}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredEntries.length === 0 ? styles.listEmpty : null,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No moments found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              {emotion
                ? `No ${EMOTION_LABELS[emotion as EmotionType] || emotion} moments found in this chapter.`
                : 'No moments found for this chapter.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 40,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    opacity: 0.75,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

export default FilteredEntriesScreen;

