import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput, // 新增
  TouchableOpacity, // 新增
  TouchableWithoutFeedback // 新增
  ,
  View
} from 'react-native';
import ChapterCard from '../../components/ChapterCard';
import FloatingActionButton from '../../components/FloatingActionButton';
import QuickCaptureContextValue from '../../context/QuickCaptureContext';
import { ThemeContext } from '../../context/ThemeContext';
import { useUserState } from '../../context/UserStateContext';
import { Chapter } from '../../models/PIE';

// --- 常量定义 ---
const NUM_COLUMNS = 2;
const GAP_SIZE = 12; // 卡片之间的间距

type SortMode = 'recent' | 'entries' | 'name';
type FilterMode = 'all' | 'companion' | 'theme';

const ChaptersScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useContext(ThemeContext);
  const { openQuickCapture } = useContext(QuickCaptureContextValue);
  const { userState, isLoading: isUserStateLoading, refreshUserState } = useUserState();
  
  // --- UI States ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState(''); // 新增：搜索关键词
  const [isControlSheetVisible, setControlSheetVisible] = useState(false);

  // 1. 获取原始数据
  const chapters = useMemo(() => {
    if (!userState || !userState.chapters) return [];
    return Object.values(userState.chapters);
  }, [userState]);

  const focusChapterIds = useMemo(() => {
    return new Set(userState?.focus?.currentFocusChapters?.map(fc => fc.chapterId) || []);
  }, [userState?.focus?.currentFocusChapters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshUserState();
    } catch (error) {
      console.warn('ChaptersScreen: failed to refresh', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshUserState]);

  // 2. 核心逻辑：搜索 + 筛选 + 排序 (三合一)
  const processedChapters = useMemo(() => {
    let working = [...chapters];

    // A. 搜索过滤 (新增)
    if (searchQuery.trim().length > 0) {
      const lowerQuery = searchQuery.toLowerCase();
      working = working.filter(c => 
        c.title?.toLowerCase().includes(lowerQuery) || 
        c.description?.toLowerCase().includes(lowerQuery)
      );
    }

    // B. 类型筛选
    if (filterMode !== 'all') {
      working = working.filter((chapter) => chapter.type === filterMode);
    }

    // C. 排序逻辑
    working.sort((a, b) => {
      if (sortMode === 'name') {
        const aTitle = a.title?.toLowerCase?.() ?? '';
        const bTitle = b.title?.toLowerCase?.() ?? '';
        return aTitle.localeCompare(bTitle);
      }
      if (sortMode === 'entries') {
        const diff = (b.entryIds?.length ?? 0) - (a.entryIds?.length ?? 0);
        if (diff !== 0) return diff;
      }
      // 默认按时间倒序 (recent)
      const aTime = new Date(a.lastUpdated ?? 0).getTime();
      const bTime = new Date(b.lastUpdated ?? 0).getTime();
      return bTime - aTime;
    });

    return working;
  }, [chapters, filterMode, sortMode, searchQuery]);

  const handlePressChapter = useCallback((chapterId: string) => {
    const chapter = userState?.chapters?.[chapterId];
    if (!chapter) return;
    
    if (chapter.type === 'companion') {
      router.push({ pathname: '/companion-dashboard', params: { chapterId } });
    } else {
      router.push({ pathname: '/chapterDetail', params: { id: chapterId } });
    }
  }, [router, userState?.chapters]);

  // 新增：判断是否是新章节 (24h)
  const isChapterNew = useCallback((chapter: Chapter) => {
    const updatedAt = new Date(chapter.lastUpdated ?? '').getTime();
    if (Number.isNaN(updatedAt)) return false;
    return Date.now() - updatedAt <= 24 * 60 * 60 * 1000;
  }, []);

  // Loading View
  if (isUserStateLoading || !userState) {
    return (
      <SafeAreaView style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <FlatList
            // 核心修改：移除 chunkArray，使用原生 numColumns
            data={processedChapters}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={{ gap: GAP_SIZE }} // 列间距
            contentContainerStyle={[
              styles.listContent,
              processedChapters.length === 0 && styles.listEmpty
            ]}
            
            // 渲染 Header (包含搜索框)
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={[styles.heading, { color: colors.text }]}>My Chapters</Text>
                
                {/* 新增搜索框 */}
                <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.border }]}>
                  <Ionicons name="search" size={20} color={colors.text} style={{ opacity: 0.5, marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search chapters..."
                    placeholderTextColor={colors.text + '80'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>

                {/* 筛选控制器 */}
                <View style={styles.controlsRow}>
                  {/* 排序按钮 */}
                  <TouchableOpacity
                    onPress={() => setControlSheetVisible(true)}
                    style={[styles.sortButton, { borderColor: colors.border }]}
                  >
                    <Ionicons name="funnel-outline" size={16} color={colors.text} />
                    <Text style={[styles.sortButtonText, { color: colors.text }]}>
                      {sortMode === 'recent' ? 'Latest' : sortMode === 'entries' ? 'Entries' : 'A-Z'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={colors.text} style={{ opacity: 0.5 }} />
                  </TouchableOpacity>

                  {/* 筛选 Chips */}
                  <View style={styles.filterGroup}>
                    {[
                      { label: 'All', value: 'all' },
                      { label: 'Companions', value: 'companion' },
                      { label: 'Themes', value: 'theme' },
                    ].map((opt) => {
                      const isActive = filterMode === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setFilterMode(opt.value as FilterMode)}
                          style={[
                            styles.filterChip,
                            {
                                backgroundColor: isActive ? colors.primary : 'transparent',
                                borderColor: isActive ? colors.primary : colors.border
                            }
                          ]}
                        >
                          <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.text }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            }

            // 渲染列表项
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ChapterCard
                  chapter={item}
                  onPress={() => handlePressChapter(item.id)}
                  isNew={isChapterNew(item)}
                  isFocus={focusChapterIds.has(item.id)}
                />
              </View>
            )}

            // 空状态
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery ? 'No matching chapters' : 'No chapters yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.text }]}>
                  {searchQuery ? 'Try a different keyword.' : 'Start journaling to create your first chapter.'}
                </Text>
              </View>
            }
            
            refreshControl={
              <RefreshControl
                tintColor={colors.primary}
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

          {/* 模态框逻辑保持不变，为了代码整洁我这里省略了部分 Modal 内容，你可以直接复用原来的 ControlSheet */}
          <Modal
            transparent
            visible={isControlSheetVisible}
            animationType="slide"
            onRequestClose={() => setControlSheetVisible(false)}
          >
             <View style={styles.sheetOverlay}>
                <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setControlSheetVisible(false)} />
                <View style={[styles.sheetContainer, { backgroundColor: colors.card ?? '#151515', borderColor: colors.border }]}>
                    <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>Sort Order</Text>
                    {/* 简化的排序选项 */}
                    {[
                        { label: 'Latest Update', value: 'recent' as SortMode },
                        { label: 'Most Entries', value: 'entries' as SortMode },
                        { label: 'Name A-Z', value: 'name' as SortMode },
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.sheetOption, { borderColor: sortMode === opt.value ? colors.primary : colors.border }]}
                            onPress={() => { setSortMode(opt.value); setControlSheetVisible(false); }}
                        >
                            <Text style={[styles.sheetOptionLabel, { color: colors.text }]}>{opt.label}</Text>
                            {sortMode === opt.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 100,
    paddingTop: 0
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  header: { paddingTop: 12, paddingBottom: 20 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  
  // 搜索框样式
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden' // 防止溢出
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  
  // Card 样式调整
  cardWrapper: {
    flex: 1,
    marginBottom: GAP_SIZE,
    // 移除 marginHorizontal，由 columnWrapperStyle 处理
  },
  
  emptyState: { alignItems: 'center', paddingVertical: 120 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, opacity: 0.7, textAlign: 'center', paddingHorizontal: 16 },
  
  // Modal Styles (保持精简)
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetBackdrop: { flex: 1 },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderTopWidth: 1 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12, opacity: 0.5 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  sheetOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sheetOptionLabel: { fontSize: 15, fontWeight: '600' },
});

export default ChaptersScreen;