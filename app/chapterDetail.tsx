import React, { useContext, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Chapter, EmotionType, Storyline } from '../models/PIE';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import DiarySummaryCard from '../components/DiarySummaryCard';

type ChapterDetailParams = {
  id?: string;
};

const FALLBACK_COLORS = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111111',
  border: '#e5e5e5',
  primary: '#4a6cf7',
};

// Emotion color mapping
const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD700', // Gold
  excited: '#FF69B4', // Hot Pink
  calm: '#87CEEB', // Sky Blue
  tired: '#A9A9A9', // Dark Gray
  sad: '#483D8B', // Dark Slate Blue
  angry: '#FF4500', // Orange Red
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

const ChapterDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<ChapterDetailParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const { userState, allRichEntries } = useUserState();

  const colors = themeContext?.colors ?? FALLBACK_COLORS;
  const diaries = diaryContext?.diaries ?? [];

  // Get chapter from UserStateModel (which has metrics)
  const chapter: Chapter | undefined = useMemo(() => {
    if (!id || !userState?.chapters) {
      return undefined;
    }
    return userState.chapters[id];
  }, [id, userState?.chapters]);

  // Get entries for this chapter
  const entries = useMemo(() => {
    if (!chapter || !Array.isArray(diaries)) {
      return [];
    }
    const ids = new Set((chapter.entryIds ?? []).map(String));
    return diaries.filter((entry) => ids.has(String(entry.id))).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Sort descending (newest first)
    });
  }, [chapter, diaries]);

  // Get recent entries (last 3)
  const recentEntries = useMemo(() => {
    return entries.slice(0, 3);
  }, [entries]);

  // Get storylines that contain entries from this chapter
  const relatedStorylines = useMemo(() => {
    if (!chapter || !userState?.storylines) {
      return [];
    }
    const chapterEntryIds = new Set((chapter.entryIds ?? []).map(String));
    return userState.storylines.filter((storyline: Storyline) => {
      return storyline.entryIds.some((entryId) => chapterEntryIds.has(String(entryId)));
    });
  }, [chapter, userState?.storylines]);

  // Calculate total emotions for the stacked bar
  const totalEmotions = useMemo(() => {
    if (!chapter?.metrics?.emotionDistribution) {
      return 0;
    }
    return Object.values(chapter.metrics.emotionDistribution).reduce((a, b) => a + b, 0);
  }, [chapter?.metrics?.emotionDistribution]);

  // Format date range for storylines
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  if (!id) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Chapter ID missing</Text>
      </SafeAreaView>
    );
  }

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.notFoundTitle, { color: colors.text, marginTop: 16 }]}>Loading chapter...</Text>
      </SafeAreaView>
    );
  }

  const metrics = chapter.metrics;
  const emotionDistribution = metrics?.emotionDistribution ?? {};

  // Render stacked bar chart for emotion distribution
  const renderEmotionSpectrum = () => {
    if (totalEmotions === 0) {
      return (
        <View style={styles.emptySpectrum}>
          <Text style={[styles.emptySpectrumText, { color: colors.text }]}>No emotion data yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.spectrumSection}>
        <View style={styles.spectrumBar}>
          {Object.entries(emotionDistribution).map(([emotion, count]) => {
            if (count === 0) return null;
            const flexValue = count / totalEmotions;
            return (
              <TouchableOpacity
                key={emotion}
                activeOpacity={0.7}
                onPress={() => {
                  if (chapter?.id) {
                    router.push({
                      pathname: '/filtered-entries',
                      params: {
                        chapterId: chapter.id,
                        emotion: emotion,
                      },
                    });
                  }
                }}
                style={[
                  styles.spectrumSegment,
                  {
                    backgroundColor: EMOTION_COLORS[emotion as EmotionType],
                    flex: flexValue,
                  },
                ]}
              />
            );
          })}
        </View>
        {/* Legend */}
        <View style={styles.legendContainer}>
          {Object.entries(emotionDistribution).map(([emotion, count]) => {
            if (count === 0) return null;
            return (
              <TouchableOpacity
                key={emotion}
                activeOpacity={0.7}
                onPress={() => {
                  if (chapter?.id) {
                    router.push({
                      pathname: '/filtered-entries',
                      params: {
                        chapterId: chapter.id,
                        emotion: emotion,
                      },
                    });
                  }
                }}
                style={styles.legendItem}
              >
                <View
                  style={[styles.legendDot, { backgroundColor: EMOTION_COLORS[emotion as EmotionType], marginRight: 8 }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {EMOTION_LABELS[emotion as EmotionType]}: {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Render overview cards
  const renderOverviewCards = () => {
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, marginRight: 6 }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {metrics?.totalEntries ?? entries.length ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Total Moments</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, marginLeft: 6 }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {metrics?.frequency?.perWeek?.toFixed(1) ?? '0.0'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Per Week</Text>
        </View>
      </View>
    );
  };

  // Render storylines list
  const renderStorylines = () => {
    if (relatedStorylines.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Related Storylines</Text>
        {relatedStorylines.map((storyline: Storyline) => (
          <TouchableOpacity
            key={storyline.id}
            style={[styles.storylineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.storylineHeader}>
              <Ionicons name="book-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.storylineTitle, { color: colors.text }]}>{storyline.title}</Text>
            </View>
            <Text style={[styles.storylineDate, { color: colors.text }]}>
              {formatDateRange(storyline.startDate, storyline.endDate)}
            </Text>
            <Text style={[styles.storylineEntries, { color: colors.text }]}>
              {storyline.entryIds.length} {storyline.entryIds.length === 1 ? 'entry' : 'entries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render recent entries preview
  const renderRecentEntries = () => {
    if (recentEntries.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
          {entries.length > 3 && (
            <TouchableOpacity
              onPress={() => {
                if (chapter?.id) {
                  router.push({
                    pathname: '/filtered-entries',
                    params: {
                      chapterId: chapter.id,
                    },
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllLink, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentEntries.map((entry, index) => (
          <DiarySummaryCard
            key={entry.id}
            item={entry}
            index={index}
            onPress={() => router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(entry) } })}
            colors={colors}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={[styles.title, { color: colors.text }]}>{chapter.title}</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {chapter.type.charAt(0).toUpperCase() + chapter.type.slice(1)} Chapter
            </Text>
          </View>
        </View>

        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Emotion Spectrum */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Emotional Spectrum</Text>
          {renderEmotionSpectrum()}
        </View>

        {/* Storylines */}
        {renderStorylines()}

        {/* Recent Entries */}
        {renderRecentEntries()}

        {/* All Entries Section */}
        {entries.length > 3 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>All Entries</Text>
            {entries.slice(3).map((entry, index) => (
              <DiarySummaryCard
                key={entry.id}
                item={entry}
                index={index + 3}
                onPress={() => router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(entry) } })}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Empty state if no entries */}
        {entries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              Capture more memories with this chapter to see them listed here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  spectrumSection: {
    marginTop: 8,
  },
  spectrumBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  spectrumSegment: {
    height: '100%',
    minWidth: 8, // Ensure segments are tappable even if very small
  },
  emptySpectrum: {
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptySpectrumText: {
    fontSize: 14,
    opacity: 0.6,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  storylineCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  storylineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storylineTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  storylineDate: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  storylineEntries: {
    fontSize: 13,
    opacity: 0.6,
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
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default ChapterDetailScreen;
