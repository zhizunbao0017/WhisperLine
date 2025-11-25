import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  SectionList,
  StatusBar, // 核心改动：使用 SectionList
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DiarySummaryCard from '../components/DiarySummaryCard';
import FloatingActionButton from '../components/FloatingActionButton'; // 引入 FAB
import MoodTrendChart from '../src/components/MoodTrendChart';
import ChatInterface from '../src/components/ChatInterface';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import { Chapter, EmotionType } from '../models/PIE';
import { getChatContext } from '../src/services/localChatService';

type ChapterDetailParams = { 
  id?: string;
  filterType?: 'person' | 'topic';
  filterValue?: string;
  entryIds?: string; // Comma-separated entry IDs for dynamic chapters
};

// ... (保留之前的颜色和 Label 常量) ...
const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD700', excited: '#FF69B4', calm: '#87CEEB',
  tired: '#A9A9A9', sad: '#483D8B', angry: '#FF4500',
};

const ChapterDetailScreen: React.FC = () => {
  const { id, filterType, filterValue, entryIds: entryIdsParam } = useLocalSearchParams<ChapterDetailParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const { userState, allRichEntries } = useUserState();
  const { colors } = themeContext;

  const [isLoading, setIsLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<any[]>([]); // SectionList 的数据源
  const [stats, setStats] = useState<any>(null); // 统计数据
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatContextId, setChatContextId] = useState<string | null>(null);
  const [chatEntityName, setChatEntityName] = useState<string>('');

  useEffect(() => {
    if (!diaryContext?.diaries) {
      setIsLoading(false);
      return;
    }

    try {
      let rawEntries: any[] = [];
      let chapterTitle = '';
      let chapterType: 'person' | 'topic' | 'companion' | 'theme' = 'theme';

      // === NEW: Filter-based approach (Event-Driven) ===
      if (filterType && filterValue) {
        chapterType = filterType;
        chapterTitle = filterValue;
        
        // Filter entries based on metadata
        rawEntries = (diaryContext.diaries || []).filter((entry: any) => {
          const metadata = entry.analyzedMetadata || {};
          
          if (filterType === 'person') {
            return (metadata.people || []).some((p: string) => 
              p.trim().toLowerCase() === filterValue.trim().toLowerCase()
            );
          } else if (filterType === 'topic') {
            return (metadata.activities || []).some((t: string) => 
              t.trim().toLowerCase() === filterValue.trim().toLowerCase()
            );
          }
          return false;
        });
        
        // Sort by date (newest first)
        rawEntries.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        
        // Create a virtual chapter object for dynamic chapters
        setChapter({
          id: id || `${filterType}:${filterValue}`,
          title: chapterTitle,
          type: chapterType,
          entryIds: rawEntries.map(e => e.id),
        });
      }
      // === NEW: Direct entryIds parameter ===
      else if (entryIdsParam) {
        const entryIdsArray = entryIdsParam.split(',').map(id => id.trim()).filter(Boolean);
        const entryIdsSet = new Set(entryIdsArray.map(String));
        rawEntries = (diaryContext.diaries || [])
          .filter((e: any) => entryIdsSet.has(String(e.id)))
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        setChapter({
          id: id || 'dynamic',
          title: chapterTitle || 'Dynamic Chapter',
          type: chapterType,
          entryIds: entryIdsArray,
        });
      }
      // === LEGACY: Chapter ID approach ===
      else if (id && userState?.chapters) {
        const currentChapter = userState.chapters[id];
        if (!currentChapter) throw new Error('Chapter not found');
        
        setChapter(currentChapter);
        chapterTitle = currentChapter.title;
        chapterType = currentChapter.type;
        
        const entryIds = new Set((currentChapter.entryIds || []).map(String));
        rawEntries = (diaryContext?.diaries || [])
          .filter((e: any) => entryIds.has(String(e.id)))
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } else {
        setIsLoading(false);
        return;
      }

      // 1. 按月份分组 (Grouping by Month)
      const grouped = rawEntries.reduce((acc: any, entry) => {
        const date = new Date(entry.createdAt || Date.now());
        const sectionTitle = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!acc[sectionTitle]) {
          acc[sectionTitle] = [];
        }
        acc[sectionTitle].push(entry);
        return acc;
      }, {});

      // 2. 转换为 SectionList 格式
      const sectionData = Object.keys(grouped).map(title => ({
        title,
        data: grouped[title]
      }));
      
      setSections(sectionData);

      // 3. 计算统计数据
      // For dynamic chapters, calculate stats from entries
      let emotionDist: Record<string, number> = {};
      let perWeek = 0;
      
      if (chapter && chapter.metrics) {
        // Use existing metrics for legacy chapters
        emotionDist = chapter.metrics.emotionDistribution || {};
        perWeek = chapter.metrics.frequency?.perWeek || 0;
      } else {
        // Calculate stats from raw entries for dynamic chapters
        rawEntries.forEach((entry: any) => {
          const mood = entry.mood || entry.analyzedMetadata?.moods?.[0];
          if (mood) {
            emotionDist[mood] = (emotionDist[mood] || 0) + 1;
          }
        });
        
        // Calculate frequency (entries per week)
        if (rawEntries.length > 0) {
          const firstDate = new Date(rawEntries[rawEntries.length - 1].createdAt || Date.now());
          const lastDate = new Date(rawEntries[0].createdAt || Date.now());
          
          if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
            const diffInMs = Math.abs(lastDate.getTime() - firstDate.getTime());
            const diffInWeeks = Math.max(1, diffInMs / (7 * 24 * 60 * 60 * 1000));
            const calculated = rawEntries.length / diffInWeeks;
            perWeek = isNaN(calculated) || !isFinite(calculated) ? 0 : calculated;
          }
        }
      }
      
      const totalEmotions = Object.values(emotionDist).reduce((a: number, b: number) => a + b, 0);
      setStats({
        total: rawEntries.length,
        perWeek: perWeek,
        emotionDist,
        totalEmotions
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id, userState, diaryContext?.diaries, filterType, filterValue, entryIdsParam]);

  // --- Header 组件 (包含图表和统计) ---
  const renderHeader = useCallback(() => {
    if (!chapter || !stats) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Title Area */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{chapter.title}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.text }]}>
               {chapter.type.toUpperCase()} • {stats.total} ENTRIES
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
           <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <Text style={[styles.statNum, { color: colors.text }]}>{stats.total}</Text>
             <Text style={[styles.statLabel, { color: colors.text }]}>Moments</Text>
           </View>
           <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <Text style={[styles.statNum, { color: colors.text }]}>
               {(typeof stats.perWeek === 'number' ? stats.perWeek : 0).toFixed(1)}
             </Text>
             <Text style={[styles.statLabel, { color: colors.text }]}>/ Week</Text>
           </View>
        </View>

        {/* Mood Trend Chart (Real Data) */}
        {sections.length > 0 && (
          <View style={styles.moodTrendContainer}>
            <Text style={[styles.moodTrendLabel, { color: colors.text }]}>Mood Trend</Text>
            <MoodTrendChart
              diaries={sections.flatMap(s => s.data)}
              width={300}
              height={40}
              strokeColor={colors.primary}
              strokeWidth={2}
              maxEntries={10}
            />
          </View>
        )}

        {/* Emotion Bar (简化版) */}
        {stats.totalEmotions > 0 && (
          <View style={styles.emotionBarContainer}>
             <View style={styles.emotionBar}>
                {Object.entries(stats.emotionDist).map(([emo, count]: any) => {
                  if (count === 0) return null;
                  return (
                    <View 
                      key={emo} 
                      style={{ 
                        flex: count / stats.totalEmotions, 
                        backgroundColor: EMOTION_COLORS[emo as EmotionType],
                        height: '100%' 
                      }} 
                    />
                  );
                })}
             </View>
             <Text style={[styles.emotionLabel, { color: colors.text }]}>Emotional Spectrum</Text>
          </View>
        )}
      </View>
    );
  }, [chapter, stats, colors]);

  // Handle chat button press - Open chat interface
  const handleChatPress = useCallback(() => {
    if (!chapter) return;
    
    // Determine entity ID and name
    let entityId: string;
    let entityName: string = chapter.title.trim();
    
    if (chapter.type === 'person') {
      entityId = `person-${entityName.toLowerCase().trim()}`;
    } else if (chapter.type === 'topic') {
      entityId = `topic-${entityName.toLowerCase().trim()}`;
    } else {
      // For companion/theme chapters, use chapter ID (also normalize)
      entityId = chapter.id.toLowerCase().trim();
    }
    
    setChatContextId(entityId);
    setChatEntityName(entityName);
    setIsChatModalVisible(true);
  }, [chapter]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!chapter) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#ffffff' ? 'dark-content' : 'light-content'} />
      
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled={false} // 也可以设为 true 尝试吸顶效果
        
        // 头部
        ListHeaderComponent={renderHeader}

        // 分组头 (Month)
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            <View style={[styles.sectionLabelContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>{title}</Text>
            </View>
          </View>
        )}

        // 列表项
        renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            return (
              <View style={styles.timelineRow}>
                {/* 左侧时间轴线 */}
                <View style={styles.timelineLeft}>
                   <View style={[styles.timelineDot, { borderColor: colors.primary, backgroundColor: colors.background }]} />
                   {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                </View>
                
                {/* 右侧卡片 */}
                <View style={styles.timelineContent}>
                    <DiarySummaryCard
                        item={item}
                        richEntry={allRichEntries?.[item.id]}
                        index={index}
                        onPress={() => router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(item) } })}
                        colors={colors}
                        // 如果 DiarySummaryCard 支持 compact 模式最好，这里直接复用
                    />
                </View>
              </View>
            );
        }}

        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>No entries yet.</Text>
                <Text style={[styles.emptySub, { color: colors.text }]}>Write your first entry for this chapter.</Text>
            </View>
        }
      />

      {/* FAB: 允许直接在此章节下写日记 */}
      <FloatingActionButton 
        onPress={() => {
            // 跳转并带上 defaultChapterId
            router.push({
                pathname: '/add-edit-diary',
                params: { defaultChapterId: chapter.id }
            });
        }} 
      />
      
      {/* Chat FAB: 第二个 FAB 用于聊天 */}
      <TouchableOpacity
        style={[styles.chatFAB, { backgroundColor: colors.primary }]}
        onPress={handleChatPress}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Chat Modal - Full Conversational UI */}
      <Modal
        visible={isChatModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Chat about {chapter?.title || 'this chapter'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsChatModalVisible(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Chat Interface */}
              {chatContextId && (
                <ChatInterface
                  contextId={chatContextId}
                  entityName={chatEntityName}
                  entityId={chatContextId}
                  currentMood={stats?.emotionDist ? Object.keys(stats.emotionDist)[0] : undefined}
                  onClose={() => setIsChatModalVisible(false)}
                  colors={colors}
                />
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  navBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { marginRight: 16, padding: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, fontWeight: '600', opacity: 0.5, marginTop: 4, letterSpacing: 0.5 },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 13, opacity: 0.6, fontWeight: '500' },

  moodTrendContainer: { marginBottom: 24, alignItems: 'center' },
  moodTrendLabel: { fontSize: 12, opacity: 0.6, fontWeight: '600', marginBottom: 8 },
  emotionBarContainer: { marginBottom: 24 },
  emotionBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  emotionLabel: { fontSize: 12, opacity: 0.5, fontWeight: '600' },

  // Timeline Styles
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 20 },
  sectionLine: { flex: 1, height: 1, opacity: 0.5 },
  sectionLabelContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginLeft: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },

  timelineRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  timelineLeft: { width: 20, alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 1 },
  timelineLine: { width: 2, position: 'absolute', top: 12, bottom: -20, opacity: 0.3 }, // 连接线
  timelineContent: { flex: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySub: { marginTop: 8 },
  
  // Chat FAB Styles
  chatFAB: {
    position: 'absolute',
    bottom: 90, // Above the main FAB
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Chat Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    // backgroundColor is set inline in the component (line 390)
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  chatLoadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
  },
  chatBubble: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  chatText: {
    fontSize: 16,
    lineHeight: 24,
  },
  chatEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  chatEmptyText: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChapterDetailScreen;