// src/components/ChapterInsights.tsx
// Smart Curation Module for Chapter Detail Page
import React, { useMemo, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiaryEntry } from '../types';
import { analyzeChapterData, ChapterInsights } from '../utils/chapterAnalysis';
import { CompanionContext } from '../../context/CompanionContext';
import { MOODS } from '../../data/moods';

interface ChapterInsightsProps {
  entries: DiaryEntry[];
  themeColors: {
    background: string;
    card: string;
    text: string;
    primary: string;
    border: string;
  };
}

const getMoodColor = (moodName: string): string => {
  const mood = MOODS.find((m) => m.name.toLowerCase() === moodName.toLowerCase());
  return mood?.color || '#9E9E9E';
};

const getMoodIcon = (moodName: string): string => {
  const moodLower = moodName.toLowerCase();
  if (moodLower.includes('happy')) return 'happy-outline';
  if (moodLower.includes('sad')) return 'sad-outline';
  if (moodLower.includes('angry')) return 'flame-outline';
  if (moodLower.includes('calm')) return 'leaf-outline';
  if (moodLower.includes('excited')) return 'flash-outline';
  if (moodLower.includes('tired')) return 'bed-outline';
  return 'ellipse-outline';
};

const ChapterInsightsComponent: React.FC<ChapterInsightsProps> = ({ entries, themeColors }) => {
  const companionContext = useContext(CompanionContext);
  const companions = companionContext?.companions || [];
  
  // Handle case where CompanionContext might not be available
  if (!companionContext) {
    console.warn('[ChapterInsights] CompanionContext not available');
  }

  const insights: ChapterInsights = useMemo(() => {
    return analyzeChapterData(entries);
  }, [entries]);

  // Resolve companion names
  const topPeopleWithNames = useMemo(() => {
    return insights.topPeople.map((person) => {
      const companion = companions.find((c) => c.id === person.id);
      return {
        ...person,
        name: companion?.name || person.id,
      };
    });
  }, [insights.topPeople, companions]);

  if (insights.entryCount === 0) {
    return null; // Don't show insights if no entries
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* People Section */}
        {topPeopleWithNames.length > 0 && (
          <View style={[styles.insightCard, { backgroundColor: themeColors.background }]}>
            <View style={styles.insightHeader}>
              <Ionicons name="people-outline" size={20} color={themeColors.primary} />
              <Text style={[styles.insightLabel, { color: themeColors.text }]}>People</Text>
            </View>
            <View style={styles.peopleList}>
              {topPeopleWithNames.slice(0, 3).map((person, index) => (
                <View key={person.id} style={styles.personItem}>
                  <View style={[styles.personAvatar, { backgroundColor: themeColors.primary + '20' }]}>
                    <Ionicons name="person" size={16} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.personName, { color: themeColors.text }]} numberOfLines={1}>
                    {person.name}
                  </Text>
                </View>
              ))}
              {topPeopleWithNames.length > 3 && (
                <Text style={[styles.moreText, { color: themeColors.text }]}>
                  +{topPeopleWithNames.length - 3}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Moods Section */}
        {insights.dominantMoods.length > 0 && (
          <View style={[styles.insightCard, { backgroundColor: themeColors.background }]}>
            <View style={styles.insightHeader}>
              <Ionicons name="heart-outline" size={20} color={themeColors.primary} />
              <Text style={[styles.insightLabel, { color: themeColors.text }]}>Moods</Text>
            </View>
            <View style={styles.moodsList}>
              {insights.dominantMoods.slice(0, 3).map((mood) => (
                <View key={mood.mood} style={styles.moodItem}>
                  <View
                    style={[
                      styles.moodIcon,
                      { backgroundColor: getMoodColor(mood.mood) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getMoodIcon(mood.mood) as any}
                      size={16}
                      color={getMoodColor(mood.mood)}
                    />
                  </View>
                  <View style={styles.moodInfo}>
                    <Text style={[styles.moodName, { color: themeColors.text }]} numberOfLines={1}>
                      {mood.mood}
                    </Text>
                    <Text style={[styles.moodPercentage, { color: themeColors.text }]}>
                      {mood.percentage}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={[styles.insightCard, { backgroundColor: themeColors.background }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="stats-chart-outline" size={20} color={themeColors.primary} />
            <Text style={[styles.insightLabel, { color: themeColors.text }]}>Stats</Text>
          </View>
          <View style={styles.statsList}>
            {/* Duration */}
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={18} color={themeColors.primary} />
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>
                  {insights.duration}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>Days</Text>
              </View>
            </View>

            {/* Entries */}
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={18} color={themeColors.primary} />
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>
                  {insights.entryCount}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>Entries</Text>
              </View>
            </View>

            {/* Avg Words */}
            <View style={styles.statItem}>
              <Ionicons name="text-outline" size={18} color={themeColors.primary} />
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>
                  {insights.avgWordsPerEntry}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>Avg Words</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  scrollContent: {
    gap: 12,
  },
  insightCard: {
    width: 200,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  peopleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  personAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 80,
  },
  moreText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  moodsList: {
    gap: 8,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  moodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodInfo: {
    flex: 1,
  },
  moodName: {
    fontSize: 13,
    fontWeight: '500',
  },
  moodPercentage: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  statsList: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
});

export default ChapterInsightsComponent;

