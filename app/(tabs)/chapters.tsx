import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import ChapterCard from '../../components/ChapterCard';
import chapterService from '../../services/ChapterService';
import { Chapter } from '../../models/Chapter';
import { ThemeContext } from '../../context/ThemeContext';
import FloatingActionButton from '../../components/FloatingActionButton';

const NUM_COLUMNS = 2;

const chunkArray = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const ChaptersScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useContext(ThemeContext);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<'recent' | 'entries'>('recent');
  const [filterMode, setFilterMode] = useState<'all' | 'companion' | 'theme'>('all');

  const loadChapters = useCallback(async () => {
    try {
      const data = await chapterService.getChapters();
      setChapters(data);
    } catch (error) {
      console.warn('ChaptersScreen: failed to load chapters', error);
      setChapters([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadChapters();
    }, [loadChapters])
  );

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadChapters();
  }, [loadChapters]);

  const handlePressChapter = useCallback(
    (chapterId: string) => {
      router.push({
        pathname: '/chapterDetail',
        params: { id: chapterId },
      });
    },
    [router]
  );

  const sortedFilteredChapters = useMemo(() => {
    let working = [...chapters];
    if (filterMode !== 'all') {
      working = working.filter((chapter) => chapter.type === filterMode);
    }
    working.sort((a, b) => {
      if (sortMode === 'entries') {
        const aCount = a.entryIds?.length ?? 0;
        const bCount = b.entryIds?.length ?? 0;
        if (bCount !== aCount) {
          return bCount - aCount;
        }
        const aUpdated = new Date(a.lastUpdated ?? 0).getTime() || 0;
        const bUpdated = new Date(b.lastUpdated ?? 0).getTime() || 0;
        return bUpdated - aUpdated;
      }
      const aUpdated = new Date(a.lastUpdated ?? 0).getTime() || 0;
      const bUpdated = new Date(b.lastUpdated ?? 0).getTime() || 0;
      if (bUpdated !== aUpdated) {
        return bUpdated - aUpdated;
      }
      const aCount = a.entryIds?.length ?? 0;
      const bCount = b.entryIds?.length ?? 0;
      return bCount - aCount;
    });
    return working;
  }, [chapters, filterMode, sortMode]);

  const sections = useMemo(
    () => chunkArray(sortedFilteredChapters, NUM_COLUMNS),
    [sortedFilteredChapters]
  );

  const toggleSortMode = useCallback(() => {
    setSortMode((prev) => (prev === 'recent' ? 'entries' : 'recent'));
  }, []);

  const handleFilterChange = useCallback((value: 'all' | 'companion' | 'theme') => {
    setFilterMode(value);
  }, []);

  const isChapterNew = useCallback((chapter: Chapter) => {
    const updatedAt = new Date(chapter.lastUpdated ?? '').getTime();
    if (Number.isNaN(updatedAt)) {
      return false;
    }
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - updatedAt <= twentyFourHours;
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }}>
        <FlatList
          data={sections}
          keyExtractor={(_, index) => `row-${index}`}
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 ? styles.listEmpty : null,
          ]}
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map((chapter) => (
                <View key={chapter.id} style={styles.cardWrapper}>
                  <ChapterCard
                    chapter={chapter}
                    onPress={() => handlePressChapter(chapter.id)}
                    isNew={isChapterNew(chapter)}
                  />
                </View>
              ))}
              {row.length < NUM_COLUMNS
                ? Array.from({ length: NUM_COLUMNS - row.length }).map((_, idx) => (
                    <View key={`spacer-${idx}`} style={styles.cardWrapper} />
                  ))
                : null}
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.heading, { color: colors.text }]}>My Chapters</Text>
              <Text style={[styles.subheading, { color: colors.text }]}>
                A living library of your stories.
              </Text>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  onPress={toggleSortMode}
                  activeOpacity={0.85}
                  style={[styles.controlButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.controlButtonText, { color: colors.text }]}>
                    Sort: {sortMode === 'recent' ? 'Latest' : 'Most entries'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.filterGroup}>
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Companions', value: 'companion' },
                    { label: 'Themes', value: 'theme' },
                  ].map((option) => {
                    const isActive = filterMode === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() =>
                          handleFilterChange(option.value as 'all' | 'companion' | 'theme')
                        }
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isActive
                              ? colors.primary
                              : 'rgba(255,255,255,0.08)',
                            borderColor: isActive ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: isActive ? '#fff' : colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No chapters yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                Start journaling or add companions to see chapters bloom.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.primary}
              colors={[colors.primary]}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
        <FloatingActionButton onPress={() => router.push('/add-edit-diary')} />
      </View>
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.7,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default ChaptersScreen;

