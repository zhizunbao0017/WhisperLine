import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import chapterService from '../services/ChapterService';
import { Chapter } from '../models/Chapter';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
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

const ChapterDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<ChapterDetailParams>();
  const router = useRouter();
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const colors = themeContext?.colors ?? FALLBACK_COLORS;
  const diaries = diaryContext?.diaries;

  useEffect(() => {
    let mounted = true;

    const fetchChapter = async () => {
      if (!id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      try {
        const result = await chapterService.getChapterById(String(id));
        if (!mounted) {
          return;
        }
        if (!result) {
          setNotFound(true);
        } else {
          setChapter(result);
        }
      } catch (error) {
        console.warn('ChapterDetailScreen: failed to load chapter', error);
        if (mounted) {
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchChapter();

    return () => {
      mounted = false;
    };
  }, [id]);

  const entries = useMemo(() => {
    if (!chapter || !Array.isArray(diaries)) {
      return [];
    }
    const ids = new Set((chapter.entryIds ?? []).map(String));
    return diaries.filter((entry) => ids.has(String(entry.id)));
  }, [chapter, diaries]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !chapter) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Chapter not found</Text>
        <Text style={[styles.notFoundSubtitle, { color: colors.text }]}>
          We couldn&apos;t locate that chapter. Try refreshing your chapters.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <DiarySummaryCard
            item={item}
            index={index}
            onPress={() =>
              router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(item) } })
            }
            colors={colors}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{chapter.title}</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              Capture more memories with this chapter to see them listed here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 40,
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
});

export default ChapterDetailScreen;

