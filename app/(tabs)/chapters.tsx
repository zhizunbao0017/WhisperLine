import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ChapterCard from '../../components/ChapterCard';
import chapterService from '../../services/ChapterService';
import { Chapter } from '../../models/Chapter';
import { ThemeContext } from '../../context/ThemeContext';
import FloatingActionButton from '../../components/FloatingActionButton';
import QuickCaptureContextValue from '../../context/QuickCaptureContext';

const NUM_COLUMNS = 2;
type SortMode = 'recent' | 'entries' | 'name';
type FilterMode = 'all' | 'companion' | 'theme';

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
  const { openQuickCapture } = useContext(QuickCaptureContextValue);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isControlSheetVisible, setControlSheetVisible] = useState(false);

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
      if (sortMode === 'name') {
        const aTitle = a.title?.toLowerCase?.() ?? '';
        const bTitle = b.title?.toLowerCase?.() ?? '';
        if (aTitle !== bTitle) {
          return aTitle.localeCompare(bTitle);
        }
        const aUpdatedName = new Date(a.lastUpdated ?? 0).getTime() || 0;
        const bUpdatedName = new Date(b.lastUpdated ?? 0).getTime() || 0;
        return bUpdatedName - aUpdatedName;
      }
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

  const handleFilterChange = useCallback((value: FilterMode) => {
    setFilterMode(value);
    setControlSheetVisible(false);
  }, []);

  const handleSortChange = useCallback((value: SortMode) => {
    setSortMode(value);
    setControlSheetVisible(false);
  }, []);

  const openControlSheet = useCallback(() => {
    setControlSheetVisible(true);
  }, []);

  const closeControlSheet = useCallback(() => {
    setControlSheetVisible(false);
  }, []);

  const isChapterNew = useCallback((chapter: Chapter) => {
    const updatedAt = new Date(chapter.lastUpdated ?? '').getTime();
    if (Number.isNaN(updatedAt)) {
      return false;
    }
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - updatedAt <= twentyFourHours;
  }, []);

  const filterSummaryLabel = useMemo(() => {
    switch (filterMode) {
      case 'companion':
        return 'Companion chapters';
      case 'theme':
        return 'Theme chapters';
      default:
        return 'All chapters';
    }
  }, [filterMode]);

  const sortSummaryLabel = useMemo(() => {
    switch (sortMode) {
      case 'entries':
        return 'Most entries';
      case 'name':
        return 'Name A-Z';
      default:
        return 'Latest update';
    }
  }, [sortMode]);

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
                  onPress={openControlSheet}
                  activeOpacity={0.85}
                  style={[
                    styles.controlIconButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                  ]}
                >
                  <Ionicons name="options-outline" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.filterGroup}>
                  {[
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
              <Text style={[styles.controlSummary, { color: colors.text }]}>
                Sorted by {sortSummaryLabel} • Showing {filterSummaryLabel}
              </Text>
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
        <FloatingActionButton
          onPress={openQuickCapture}
          onLongPress={() => router.push('/add-edit-diary')}
        />
      </View>
      <Modal
        transparent
        visible={isControlSheetVisible}
        animationType="slide"
        onRequestClose={closeControlSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeControlSheet} />
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.card ?? '#151515', borderColor: colors.border },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>View Controls</Text>
            <View style={styles.sheetSection}>
              <Text style={[styles.sheetSectionTitle, { color: colors.text }]}>Filter by Type</Text>
              {[
                { label: 'All', value: 'all' as FilterMode },
                { label: 'Companions', value: 'companion' as FilterMode },
                { label: 'Themes', value: 'theme' as FilterMode },
              ].map((option) => {
                const isActive = filterMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sheetOption,
                      { borderColor: isActive ? colors.primary : colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleFilterChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        { color: colors.text, fontWeight: isActive ? '700' : '500' },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isActive ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.sheetSection}>
              <Text style={[styles.sheetSectionTitle, { color: colors.text }]}>Sort by</Text>
              {[
                { label: 'Latest Update', value: 'recent' as SortMode },
                { label: 'Most Entries', value: 'entries' as SortMode },
                { label: 'Name A-Z', value: 'name' as SortMode },
              ].map((option) => {
                const isActive = sortMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sheetOption,
                      { borderColor: isActive ? colors.primary : colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSortChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        { color: colors.text, fontWeight: isActive ? '700' : '500' },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isActive ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 160,
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
  controlIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
  controlSummary: {
    fontSize: 13,
    opacity: 0.65,
    marginTop: 8,
    fontWeight: '500',
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
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 20,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    opacity: 0.7,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSection: {
    gap: 8,
  },
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sheetOptionLabel: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

export default ChaptersScreen;

