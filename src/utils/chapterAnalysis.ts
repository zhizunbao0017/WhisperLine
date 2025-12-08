// src/utils/chapterAnalysis.ts
// Pure statistical analysis for Chapter data (no LLM calls)

import { DiaryEntry } from '../types';

export interface ChapterInsights {
  topPeople: Array<{ id: string; name: string; count: number }>;
  dominantMoods: Array<{ mood: string; count: number; percentage: number }>;
  dateRange: string;
  duration: number; // in days
  totalWords: number;
  avgWordsPerEntry: number;
  entryCount: number;
}

/**
 * Analyze chapter entries to extract insights
 * Pure statistical function - no AI/LLM calls
 */
export function analyzeChapterData(entries: DiaryEntry[]): ChapterInsights {
  if (!entries || entries.length === 0) {
    return {
      topPeople: [],
      dominantMoods: [],
      dateRange: 'No entries',
      duration: 0,
      totalWords: 0,
      avgWordsPerEntry: 0,
      entryCount: 0,
    };
  }

  // 1. Extract people from companionIDs
  const peopleCount: Record<string, number> = {};
  entries.forEach((entry) => {
    if (entry.companionIDs && Array.isArray(entry.companionIDs)) {
      entry.companionIDs.forEach((companionId) => {
        if (companionId) {
          peopleCount[companionId] = (peopleCount[companionId] || 0) + 1;
        }
      });
    }
  });

  // Sort by count and take top 5
  const topPeople = Object.entries(peopleCount)
    .map(([id, count]) => ({ id, name: id, count })) // name will be resolved in component
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 2. Count moods
  const moodCount: Record<string, number> = {};
  entries.forEach((entry) => {
    if (entry.mood) {
      moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
    }
  });

  const totalMoodEntries = Object.values(moodCount).reduce((sum, count) => sum + count, 0);
  const dominantMoods = Object.entries(moodCount)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: totalMoodEntries > 0 ? Math.round((count / totalMoodEntries) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Calculate date range and duration
  const dates = entries
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter((date) => !isNaN(date))
    .sort((a, b) => a - b);

  const startDate = dates.length > 0 ? new Date(dates[0]) : null;
  const endDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;

  let dateRange = 'No entries';
  let duration = 0;

  if (startDate && endDate) {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
  }

  // 4. Calculate word count
  const extractText = (html: string | null | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const wordCounts = entries.map((entry) => {
    const text = extractText(entry.contentHTML || entry.content || '');
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  });

  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
  const avgWordsPerEntry = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;

  return {
    topPeople,
    dominantMoods,
    dateRange,
    duration,
    totalWords,
    avgWordsPerEntry,
    entryCount: entries.length,
  };
}

