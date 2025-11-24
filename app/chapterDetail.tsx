import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StatusBar, // 核心改动：使用 SectionList
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DiarySummaryCard from '../components/DiarySummaryCard';
import FloatingActionButton from '../components/FloatingActionButton'; // 引入 FAB
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import { Chapter, EmotionType } from '../models/PIE';

type ChapterDetailParams = { id?: string };

// ... (保留之前的颜色和 Label 常量) ...
const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD700', excited: '#FF69B4', calm: '#87CEEB',
  tired: '#A9A9A9', sad: '#483D8B', angry: '#FF4500',
};

const ChapterDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<ChapterDetailParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const { userState, allRichEntries } = useUserState();
  const { colors } = themeContext;

  const [isLoading, setIsLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<any[]>([]); // SectionList 的数据源
  const [stats, setStats] = useState<any>(null); // 统计数据

  useEffect(() => {
    if (!id || !userState || !userState.chapters) {
      if (userState) setIsLoading(false);
      return;
    }

    try {
      const currentChapter = userState.chapters[id];
      if (!currentChapter) throw new Error('Chapter not found');
      
      setChapter(currentChapter);

      // --- 数据处理核心逻辑 ---
      const entryIds = new Set((currentChapter.entryIds || []).map(String));
      const rawEntries = (diaryContext?.diaries || [])
        .filter(e => entryIds.has(String(e.id)))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
      const emotionDist = currentChapter.metrics?.emotionDistribution || {};
      const totalEmotions = Object.values(emotionDist).reduce((a: number, b: number) => a + b, 0);
      setStats({
        total: rawEntries.length,
        perWeek: currentChapter.metrics?.frequency?.perWeek || 0,
        emotionDist,
        totalEmotions
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id, userState, diaryContext?.diaries]);

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
             <Text style={[styles.statNum, { color: colors.text }]}>{stats.perWeek.toFixed(1)}</Text>
             <Text style={[styles.statLabel, { color: colors.text }]}>/ Week</Text>
           </View>
        </View>

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
  emptySub: { marginTop: 8 }
});

export default ChapterDetailScreen;