import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { CompanionContext } from '../context/CompanionContext';
import { useUserState } from '../context/UserStateContext';
import DiarySummaryCard from '../components/DiarySummaryCard';

type CompanionDashboardParams = {
  chapterId?: string;
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

// Fallback colors for avatar initials
const FALLBACK_COLORS_AVATAR = [
  '#6C5CE7',
  '#E17055',
  '#00CEC9',
  '#0984E3',
  '#FF7675',
  '#00B894',
  '#FAB1A0',
  '#74B9FF',
  '#D63031',
  '#636EFA',
];

const getFallbackColor = (name = '') => {
  if (!name) return FALLBACK_COLORS_AVATAR[0];
  const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_COLORS_AVATAR[code % FALLBACK_COLORS_AVATAR.length];
};

const CompanionDashboardScreen: React.FC = () => {
  const { chapterId } = useLocalSearchParams<CompanionDashboardParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const companionContext = useContext(CompanionContext);
  const { userState, allRichEntries } = useUserState();

  const colors = themeContext?.colors ?? FALLBACK_COLORS;
  const diaries = diaryContext?.diaries ?? [];
  const companions = companionContext?.companions ?? [];

  // Add loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<Chapter | undefined>(undefined);
  const [sharedTopics, setSharedTopics] = useState<Array<{ topic: string; count: number }>>([]);

  // Process data inside useEffect to handle the component lifecycle correctly
  useEffect(() => {
    try {
      if (!chapterId) {
        setError('Chapter ID missing');
        setIsLoading(false);
        return;
      }

      if (!userState?.chapters) {
        setError('User state not available');
        setIsLoading(false);
        return;
      }

      const foundChapter = userState.chapters[chapterId];
      if (!foundChapter) {
        setError('Chapter not found in user state.');
        setIsLoading(false);
        return;
      }

      setChapter(foundChapter);

      // --- Shared Topics Logic (now safely inside useEffect) ---
      const topicCounts: Record<string, number> = {};

      if (foundChapter.entryIds && Array.isArray(foundChapter.entryIds)) {
        for (const entryId of foundChapter.entryIds) {
          const entry = allRichEntries?.[entryId];
          // Defensive check for missing entry or chapterIds
          if (entry?.chapterIds && Array.isArray(entry.chapterIds)) {
            for (const cId of entry.chapterIds) {
              // Only count theme chapters (not companion chapters)
              if (typeof cId === 'string' && cId.startsWith('theme-')) {
                const themeName = cId.replace('theme-', '');
                // Capitalize first letter for display
                const displayName = themeName.charAt(0).toUpperCase() + themeName.slice(1);
                topicCounts[displayName] = (topicCounts[displayName] || 0) + 1;
              }
            }
          }
        }
      }

      // Return top 4 topics sorted by count
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([topic, count]) => ({ topic, count }));

      setSharedTopics(topTopics);
    } catch (e) {
      console.error('Failed to process companion dashboard data:', e);
      setError('Could not load companion details.');
    } finally {
      // CRITICAL: Always turn off loading, even if there's an error
      setIsLoading(false);
    }
  }, [chapterId, userState, allRichEntries]);

  // Get companion from userState.companions using chapter.sourceId
  // This ensures we use the same data source as ManageCompanionsScreen
  const companion = useMemo(() => {
    if (!chapter?.sourceId || !userState?.companions) {
      return null;
    }
    // First try to get from userState.companions (new system)
    const companionFromState = userState.companions[chapter.sourceId];
    if (companionFromState) {
      return companionFromState;
    }
    // Fallback to CompanionContext (old system) for backward compatibility
    return companions.find((c) => String(c.id) === String(chapter.sourceId)) || null;
  }, [chapter?.sourceId, userState?.companions, companions]);

  // Get entries for this chapter
  const entries = useMemo(() => {
    if (!chapter || !Array.isArray(diaries)) {
      return [];
    }
    try {
      const ids = new Set((chapter.entryIds ?? []).map(String));
      return diaries.filter((entry) => ids.has(String(entry.id))).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Sort descending (newest first)
      });
    } catch (e) {
      console.error('Error processing entries:', e);
      return [];
    }
  }, [chapter, diaries]);

  // Calculate relationship snapshot dates
  const firstMention = useMemo(() => {
    if (entries.length === 0) return null;
    try {
      const dates = entries.map((e) => new Date(e.createdAt || 0).getTime());
      const oldest = new Date(Math.min(...dates));
      return oldest;
    } catch (e) {
      console.error('Error calculating first mention:', e);
      return null;
    }
  }, [entries]);

  const lastInteraction = useMemo(() => {
    if (entries.length === 0) return null;
    try {
      const dates = entries.map((e) => new Date(e.createdAt || 0).getTime());
      const newest = new Date(Math.max(...dates));
      return newest;
    } catch (e) {
      console.error('Error calculating last interaction:', e);
      return null;
    }
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

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get companion initials for avatar fallback
  const companionInitials = useMemo(() => {
    if (!companion?.name) return '?';
    return companion.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [companion?.name]);

  const fallbackColor = useMemo(() => getFallbackColor(companion?.name), [companion?.name]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading companion...</Text>
      </SafeAreaView>
    );
  }

  if (error || !chapter) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'An unexpected error occurred.'}</Text>
      </SafeAreaView>
    );
  }

  const metrics = chapter.metrics;
  const emotionDistribution = metrics?.emotionDistribution ?? {};
  const companionName = companion?.name || chapter.title;

  // Check if AI interaction is enabled for this companion
  // Only show chat if both global and individual settings are enabled
  const isChatEnabled = useMemo(() => {
    if (!chapter || !userState) {
      return false;
    }
    
    // Get companion from userState using sourceId
    const companionId = chapter.sourceId;
    if (!companionId) {
      return false;
    }
    
    const companionFromState = userState.companions?.[companionId];
    if (!companionFromState) {
      return false;
    }
    
    // Both global and individual settings must be enabled
    const globalEnabled = userState.settings?.isAIInteractionEnabled === true;
    const individualEnabled = companionFromState.isInteractionEnabled === true;
    
    return globalEnabled && individualEnabled;
  }, [chapter, userState]);

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

  // Render relationship snapshot cards
  const renderRelationshipSnapshot = () => {
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, marginRight: 6 }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {metrics?.totalEntries ?? entries.length ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Moments Shared</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, marginLeft: 6 }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {firstMention ? formatDate(firstMention) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>First Mention</Text>
        </View>
      </View>
    );
  };

  // Render last interaction card separately (below the first two)
  const renderLastInteraction = () => {
    if (!lastInteraction) {
      return null;
    }
    return (
      <View style={styles.section}>
        <View style={[styles.lastInteractionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <View style={styles.lastInteractionContent}>
            <Text style={[styles.lastInteractionLabel, { color: colors.text }]}>Last Interaction</Text>
            <Text style={[styles.lastInteractionDate, { color: colors.text }]}>
              {formatDate(lastInteraction)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render shared topics widget
  const renderSharedTopics = () => {
    if (sharedTopics.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>We Mostly Talk About...</Text>
        <View style={styles.topicRow}>
          {sharedTopics.map(({ topic, count }) => (
            <View key={topic} style={[styles.topicPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.topicText, { color: colors.text }]}>{topic}</Text>
              <Text style={[styles.topicCount, { color: colors.text }]}>{count}</Text>
            </View>
          ))}
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
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Shared Storylines</Text>
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
    const recentEntries = entries.slice(0, 3);
    if (recentEntries.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Moments</Text>
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
              <Text style={[styles.seeAllLink, { color: colors.primary }]}>View All</Text>
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
        {/* Header with Companion Avatar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              {(companion?.avatarUri || companion?.avatarIdentifier) ? (
                <Image
                  source={{ uri: companion.avatarUri || companion.avatarIdentifier }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: fallbackColor }]}>
                  <Text style={styles.avatarInitials}>{companionInitials}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{companionName}</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>Companion</Text>
          </View>
          {isChatEnabled && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => {
                router.push({
                  pathname: '/companion-chat',
                  params: { chapterId: chapter?.id, companionId: chapter?.sourceId },
                });
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          {!isChatEnabled && <View style={styles.backButton} />}
        </View>

        {/* Relationship Snapshot */}
        {renderRelationshipSnapshot()}

        {/* Last Interaction */}
        {renderLastInteraction()}

        {/* Emotion Spectrum */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Emotional Tone</Text>
          {renderEmotionSpectrum()}
        </View>

        {/* Shared Topics */}
        {renderSharedTopics()}

        {/* Shared Storylines */}
        {renderStorylines()}

        {/* Recent Entries */}
        {renderRecentEntries()}

        {/* Empty state if no entries */}
        {entries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No moments yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              Capture more memories with {companionName} to see them listed here.
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
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    marginLeft: 12,
    padding: 4,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
  },
  lastInteractionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lastInteractionContent: {
    flex: 1,
  },
  lastInteractionLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '500',
    marginBottom: 4,
  },
  lastInteractionDate: {
    fontSize: 18,
    fontWeight: '600',
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
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
  },
  topicCount: {
    fontSize: 12,
    opacity: 0.7,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default CompanionDashboardScreen;

