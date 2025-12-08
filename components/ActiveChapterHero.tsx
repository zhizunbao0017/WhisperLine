// components/ActiveChapterHero.tsx
// Netflix-style "Continue Watching" widget for active Chapter
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Chapter } from '../src/types';
import useChapterStore from '../src/stores/useChapterStore';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import MediaService from '../services/MediaService';

interface ActiveChapterHeroProps {
  colors: {
    background: string;
    text: string;
    primary: string;
    card: string;
  };
}

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

const formatDateAgo = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

const ActiveChapterHero: React.FC<ActiveChapterHeroProps> = ({ colors }) => {
  const router = useRouter();
  const chapters = useChapterStore((state) => state.chapters);
  const { diaries } = useContext(DiaryContext);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(false);

  // Get ongoing chapters and sort by lastUpdated (or createdAt if no lastUpdated)
  const mainChapter = useMemo(() => {
    const ongoing = chapters.filter((c) => c.status === 'ongoing');
    if (ongoing.length === 0) return null;

    // Sort by lastUpdated (if exists) or createdAt, descending
    // createdAt is a number (timestamp), lastUpdated is ISO string (backward compatibility)
    const sorted = ongoing.sort((a, b) => {
      const aTime = a.lastUpdated
        ? new Date(a.lastUpdated).getTime()
        : a.createdAt; // createdAt is already a timestamp (number)
      const bTime = b.lastUpdated
        ? new Date(b.lastUpdated).getTime()
        : b.createdAt;
      return bTime - aTime;
    });

    return sorted[0];
  }, [chapters]);

  // Count entries for this chapter
  const chapterStats = useMemo(() => {
    if (!mainChapter || !diaries) return { entryCount: 0, startDate: null };

    const chapterEntries = diaries.filter((entry) => entry.chapterId === mainChapter.id);
    // startDate is timestamp (number), createdAt is also timestamp (number)
    const startDate = mainChapter.startDate
      ? new Date(mainChapter.startDate)
      : new Date(mainChapter.createdAt);

    return {
      entryCount: chapterEntries.length,
      startDate,
    };
  }, [mainChapter, diaries]);

  // Load cover image
  useEffect(() => {
    if (!mainChapter?.coverImage) {
      setCoverImageUri(null);
      return;
    }

    setIsLoadingCover(true);
    MediaService.readImageAsBase64(mainChapter.coverImage)
      .then((base64) => {
        if (base64) {
          setCoverImageUri(base64);
        }
      })
      .catch((error) => {
        console.error('[ActiveChapterHero] Failed to load cover image:', error);
      })
      .finally(() => {
        setIsLoadingCover(false);
      });
  }, [mainChapter?.coverImage]);

  const handlePressChapter = () => {
    if (mainChapter) {
      router.push(`/chapter-detail/${mainChapter.id}`);
    }
  };

  const handleQuickWrite = (e: any) => {
    e.stopPropagation();
    if (mainChapter) {
      router.push({
        pathname: '/add-edit-diary',
        params: { chapterId: mainChapter.id },
      });
    }
  };

  const typeMeta = mainChapter ? getTypeMeta(mainChapter.type) : null;

  // Empty state: No ongoing chapters
  if (!mainChapter) {
    return (
      <TouchableOpacity
        style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push('/add-edit-chapter')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']}
          style={styles.emptyGradient}
        >
          <Ionicons name="book-outline" size={48} color={colors.primary} style={{ opacity: 0.6 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Start a new chapter of your life
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text }]}>
            Create your first Chapter to begin your story
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Hero card with chapter info
  return (
    <TouchableOpacity
      style={styles.heroContainer}
      onPress={handlePressChapter}
      activeOpacity={0.9}
    >
      {isLoadingCover ? (
        <View style={[styles.heroBackground, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : coverImageUri ? (
        <ImageBackground source={{ uri: coverImageUri }} style={styles.heroBackground} resizeMode="cover">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroEyebrow}>CURRENT CHAPTER</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {mainChapter.title}
                </Text>
                <View style={styles.statsRow}>
                  <Ionicons name="document-text-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statsText}>
                    {chapterStats.entryCount} {chapterStats.entryCount === 1 ? 'Entry' : 'Entries'}
                  </Text>
                  {chapterStats.startDate && (
                    <>
                      <Text style={styles.statsDivider}>•</Text>
                      <Text style={styles.statsText}>
                        Started {formatDateAgo(chapterStats.startDate)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.quickWriteButton}
                onPress={handleQuickWrite}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={typeMeta?.colors || ['#84fab0', '#8fd3f4']} style={styles.heroBackground}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroEyebrow}>CURRENT CHAPTER</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {mainChapter.title}
                </Text>
                <View style={styles.statsRow}>
                  <Ionicons name="document-text-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statsText}>
                    {chapterStats.entryCount} {chapterStats.entryCount === 1 ? 'Entry' : 'Entries'}
                  </Text>
                  {chapterStats.startDate && (
                    <>
                      <Text style={styles.statsDivider}>•</Text>
                      <Text style={styles.statsText}>
                        Started {formatDateAgo(chapterStats.startDate)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.quickWriteButton}
                onPress={handleQuickWrite}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statsDivider: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 4,
  },
  quickWriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ActiveChapterHero;

