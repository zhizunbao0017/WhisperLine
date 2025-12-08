// app/(tabs)/chapters.tsx
// Netflix-style Chapters Screen with grouped display
import React, { useCallback, useMemo, useState, useContext, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChapterCard } from '../../src/components/ChapterCard';
import { Chapter, ChapterType, ChapterStatus } from '../../src/types';
import useChapterStore from '../../src/stores/useChapterStore';
import { ThemeContext } from '../../context/ThemeContext';
import FloatingActionButton from '../../components/FloatingActionButton';
import QuickCaptureContextValue from '../../context/QuickCaptureContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_SPACING = 8;

const ChaptersScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useContext(ThemeContext);
  const { openQuickCapture } = useContext(QuickCaptureContextValue);
  
  // Get chapters from Zustand store
  const chapters = useChapterStore((state) => state.chapters);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state (in real app, this would be handled by store hydration)
  useEffect(() => {
    // Store hydration happens automatically, but we can add a small delay for UX
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Group chapters by status
  const { ongoingChapters, archivedChapters } = useMemo(() => {
    const ongoing = chapters.filter((c) => c.status === 'ongoing');
    const archived = chapters.filter((c) => c.status === 'archived');
    
    // Sort ongoing by createdAt (newest first)
    ongoing.sort((a, b) => b.createdAt - a.createdAt);
    
    // Sort archived by endDate or createdAt (newest first)
    archived.sort((a, b) => {
      const dateA = a.endDate || a.createdAt;
      const dateB = b.endDate || b.createdAt;
      return dateB - dateA;
    });
    
    return { ongoingChapters: ongoing, archivedChapters: archived };
  }, [chapters]);

  const handlePressChapter = useCallback(
    (chapter: Chapter) => {
      // Navigate to immersive chapter detail page
      router.push({
        pathname: '/chapter-detail/[id]',
        params: { id: chapter.id },
      });
    },
    [router]
  );

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, { color: colors.text }]}>My Life Chapters</Text>
            <Text style={[styles.subheading, { color: colors.text }]}>
              A living library of your stories.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/add-edit-chapter')}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Section 1: Current Life (Ongoing Chapters) */}
        {ongoingChapters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="play-circle" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Life</Text>
            </View>
            <FlatList
              data={ongoingChapters}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <View style={styles.largeCardWrapper}>
                  <ChapterCard
                    chapter={item}
                    onPress={() => handlePressChapter(item)}
                    size="large"
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* Section 2: Archives (Archived Chapters) */}
        {archivedChapters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="archive" size={20} color={colors.text} style={{ opacity: 0.7 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Archives</Text>
            </View>
            <View style={styles.gridContainer}>
              {archivedChapters.map((chapter) => (
                <View key={chapter.id} style={styles.smallCardWrapper}>
                  <ChapterCard
                    chapter={chapter}
                    onPress={() => handlePressChapter(chapter)}
                    size="small"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {chapters.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Start Your First Chapter
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              Begin journaling to see your life chapters unfold.{'\n'}
              Each entry creates a new story waiting to be told.
            </Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/add-edit-chapter')}
              >
                <Ionicons name="book-outline" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Create Chapter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyButtonSecondary, { borderColor: colors.border }]}
                onPress={openQuickCapture}
              >
                <Text style={[styles.emptyButtonTextSecondary, { color: colors.text }]}>
                  Start Writing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={openQuickCapture}
        onLongPress={() => router.push('/add-edit-diary')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  largeCardWrapper: {
    width: SCREEN_WIDTH - 32,
    marginRight: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  smallCardWrapper: {
    width: (SCREEN_WIDTH - 32 - CARD_SPACING) / NUM_COLUMNS,
    position: 'relative',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButtons: {
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyButtonSecondary: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  emptyButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChaptersScreen;
