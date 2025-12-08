// app/chapter-detail/[id].tsx
// Immersive Chapter Detail Page with Parallax Header
import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Chapter } from '../../src/types';
import useChapterStore from '../../src/stores/useChapterStore';
import { DiaryContext } from '../../context/DiaryContext';
import { ThemeContext } from '../../context/ThemeContext';
import MediaService from '../../services/MediaService';
import FloatingActionButton from '../../components/FloatingActionButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

const getTypeMeta = (type: string) => {
  switch (type) {
    case 'period':
      return { icon: 'calendar-outline', colors: ['#FF9A9E', '#FECFEF', '#FAD0C4'] };
    case 'relationship':
      return { icon: 'heart-outline', colors: ['#a18cd1', '#fbc2eb', '#fad0c4'] };
    case 'theme':
    default:
      return { icon: 'bookmark-outline', colors: ['#84fab0', '#8fd3f4', '#a8edea'] };
  }
};

const ChapterDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useContext(ThemeContext);
  const { diaries } = useContext(DiaryContext);
  const chapterId = params.id as string;

  const chapters = useChapterStore((state) => state.chapters);
  const chapter = useMemo(() => chapters.find((c) => c.id === chapterId), [chapters, chapterId]);

  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(true);

  // Parallax scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Filter entries for this chapter
  const chapterEntries = useMemo(() => {
    if (!diaries || !chapterId) return [];
    return diaries
      .filter((entry) => entry.chapterId === chapterId)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB; // Oldest first (reading order)
      });
  }, [diaries, chapterId]);

  // Load cover image
  useEffect(() => {
    const loadCoverImage = async () => {
      if (!chapter?.coverImage) {
        setIsLoadingCover(false);
        return;
      }
      setIsLoadingCover(true);
      try {
        const base64 = await MediaService.readImageAsBase64(chapter.coverImage);
        if (base64) {
          setCoverImageUri(base64);
        }
      } catch (error) {
        console.error('[ChapterDetail] Failed to load cover image:', error);
      } finally {
        setIsLoadingCover(false);
      }
    };
    loadCoverImage();
  }, [chapter?.coverImage]);

  // Parallax animations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Chapter not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeMeta = getTypeMeta(chapter.type);
  const startDate = chapter.startDate ? new Date(chapter.startDate) : new Date(chapter.createdAt);
  const endDate = chapter.endDate ? new Date(chapter.endDate) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleWriteInChapter = () => {
    router.push({
      pathname: '/add-edit-diary',
      params: { chapterId: chapter.id },
    });
  };

  const handleEditChapter = () => {
    router.push({
      pathname: '/add-edit-chapter',
      params: { id: chapter.id },
    });
  };

  const handlePressEntry = (entryId: string) => {
    const entry = diaries.find((e) => e.id === entryId);
    if (entry) {
      router.push({
        pathname: '/diary-detail',
        params: { diary: JSON.stringify(entry) },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Parallax Header */}
      <Animated.View
        style={[
          styles.header,
          {
            height: HEADER_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}
      >
        {isLoadingCover ? (
          <View style={styles.headerLoader}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : coverImageUri ? (
          <Image source={{ uri: coverImageUri }} style={styles.headerImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={typeMeta.colors} style={styles.headerGradient}>
            <Ionicons name={typeMeta.icon} size={64} color="#fff" style={{ opacity: 0.8 }} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerOverlay}
        >
          <Animated.View
            style={[
              styles.headerContent,
              {
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditChapter} style={styles.editButtonHeader}>
                <Ionicons name="create-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {chapter.title}
            </Text>
            {chapter.description && (
              <Text style={styles.headerDescription} numberOfLines={2}>
                {chapter.description}
              </Text>
            )}
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Content ScrollView */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View style={[styles.statsSection, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.text }]}>Started</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatDate(startDate)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.text }]}>Entries</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{chapterEntries.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons
              name={chapter.status === 'ongoing' ? 'play-circle-outline' : 'archive-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.statLabel, { color: colors.text }]}>Status</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {chapter.status === 'ongoing' ? 'Ongoing' : 'Archived'}
            </Text>
          </View>
          {endDate && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.text }]}>Ended</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatDate(endDate)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Entries List */}
        <View style={styles.entriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Entries</Text>
          {chapterEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                This chapter is empty
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                Start writing your story
              </Text>
            </View>
          ) : (
            chapterEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handlePressEntry(entry.id)}
                activeOpacity={0.7}
              >
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, { color: colors.text }]}>
                    {formatDate(new Date(entry.createdAt))}
                  </Text>
                  {entry.mood && (
                    <View style={[styles.moodBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.moodText, { color: colors.primary }]}>{entry.mood}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={2}>
                  {entry.title || 'Untitled'}
                </Text>
                {entry.contentHTML && (
                  <Text style={[styles.entryPreview, { color: colors.text }]} numberOfLines={3}>
                    {entry.contentHTML.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {/* FAB - Write in this Chapter (only for ongoing chapters) */}
      {chapter.status === 'ongoing' && (
        <FloatingActionButton
          onPress={handleWriteInChapter}
          onLongPress={() => router.push('/add-edit-diary')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLoader: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 12,
  },
  entriesSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  entryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  entryPreview: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChapterDetailScreen;

