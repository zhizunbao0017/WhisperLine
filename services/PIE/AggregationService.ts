// services/PIE/AggregationService.ts

import { UserStateModel } from '../../models/UserState';
import { Chapter, ChapterMetrics, EmotionType, Storyline, FocusChapter } from '../../models/PIE';
import { RichEntry } from '../../models/RichEntry';

// --- Constants for Storyline Detection ---
const MAX_DAYS_BETWEEN_STORYLINE_ENTRIES = 3; // Max gap in days to be considered part of the same story
const MIN_ENTRIES_FOR_STORYLINE = 3; // A story must have at least this many entries
const MIN_KEYWORD_OVERLAP_SCORE = 2; // Min number of shared keywords to link entries

// --- Constants for Focus Detection ---
const FOCUS_CHAPTER_COUNT = 3; // The number of focus chapters to identify
const RECENCY_WEIGHT = 1.5; // Entries in the last 7 days get a bonus
const EMOTIONAL_INTENSITY_WEIGHT = 1.2; // Entries with strong emotions get a bonus
const RECENCY_DAYS_THRESHOLD = 7;

class AggregationService {

  /**
   * Performs a full, deep analysis of the entire state to calculate all metrics.
   * This is called after a full rebuild.
   * @param currentState The current state, which has chapters and entry IDs but no metrics yet.
   * @param allRichEntries A dictionary of all rich entries, keyed by ID, for fast lookup.
   * @returns The state with all metrics, correlations, and storylines calculated.
   */
  public runFullAggregation(currentState: UserStateModel, allRichEntries: Record<string, RichEntry>): UserStateModel {
    console.log(`Running full aggregation on the entire state.`);
    
    const newState = { ...currentState };
    newState.chapters = { ...currentState.chapters };

    // 1. Calculate metrics for each chapter
    for (const chapterId in newState.chapters) {
      const chapter = newState.chapters[chapterId];
      newState.chapters[chapterId] = this.calculateMetricsForChapter(chapter, allRichEntries);
    }

    // 2. Identify storylines
    newState.storylines = this.identifyStorylines(allRichEntries);

    // 3. Calculate focus chapters
    newState.focus = {
      currentFocusChapters: this.calculateFocusChapters(newState, allRichEntries)
    };
    
    newState.lastUpdatedAt = new Date().toISOString();
    return newState;
  }

  /**
   * A private helper to calculate all metrics for a single chapter.
   * @param chapter The chapter to analyze.
   * @param allRichEntries All rich entries available for lookup.
   * @returns The chapter updated with its new metrics.
   */
  private calculateMetricsForChapter(chapter: Chapter, allRichEntries: Record<string, RichEntry>): Chapter {
      const totalEntries = chapter.entryIds.length;
      if (totalEntries === 0) {
          return chapter; // No entries, no metrics to calculate
      }

      const emotionDistribution: Record<EmotionType, number> = {
          happy: 0, excited: 0, calm: 0, tired: 0, sad: 0, angry: 0,
      };

      for (const entryId of chapter.entryIds) {
          const entry = allRichEntries[entryId];
          if (entry?.metadata) {
              // Use primaryEmotion (authoritative) with fallback to detectedEmotion for legacy entries
              const emotion = entry.metadata.primaryEmotion || entry.metadata.detectedEmotion?.primary;
              if (emotion) {
                  emotionDistribution[emotion]++;
              }
          }
      }
      
      // Calculate frequency (simple version)
      // For a more accurate version, you'd analyze the timestamps of entries
      const chapterAgeInDays = (new Date().getTime() - new Date(chapter.createdAt).getTime()) / (1000 * 3600 * 24);
      const frequencyPerWeek = chapterAgeInDays > 0 ? (totalEntries / chapterAgeInDays) * 7 : totalEntries;

      const metrics: ChapterMetrics = {
          totalEntries,
          emotionDistribution,
          frequency: {
              perWeek: parseFloat(frequencyPerWeek.toFixed(2)),
              perMonth: parseFloat((frequencyPerWeek * 4.33).toFixed(2)),
          }
      };
      
      return { ...chapter, metrics };
  }

  /**
   * Performs a quick, incremental update on metrics.
   * For now, it will just recall the full calculation for simplicity on the affected chapters.
   */
  public updateMetricsIncremental(currentState: UserStateModel, affectedChapterIds: string[], allRichEntries: Record<string, RichEntry>): UserStateModel {
    console.log(`Incrementally updating metrics for chapters:`, affectedChapterIds);
    
    let newState = { ...currentState };
    newState.chapters = { ...currentState.chapters };
    
    for(const chapterId of affectedChapterIds) {
        if(newState.chapters[chapterId]) {
            newState.chapters[chapterId] = this.calculateMetricsForChapter(newState.chapters[chapterId], allRichEntries);
        }
    }

    return newState;
  }

  /**
   * Identifies and groups entries into storylines.
   * @param allRichEntries A dictionary of all rich entries, keyed by ID.
   * @returns An array of detected Storylines.
   */
  private identifyStorylines(allRichEntries: Record<string, RichEntry>): Storyline[] {
    const storylines: Storyline[] = [];

    // Sort entries by date to process them chronologically
    const sortedEntries = Object.values(allRichEntries).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let potentialStory: RichEntry[] = [];

    for (let i = 0; i < sortedEntries.length; i++) {
      const currentEntry = sortedEntries[i];

      if (potentialStory.length === 0) {
        potentialStory.push(currentEntry);
        continue;
      }

      const lastEntryInStory = potentialStory[potentialStory.length - 1];
      const daysBetween = (new Date(currentEntry.createdAt).getTime() - new Date(lastEntryInStory.createdAt).getTime()) / (1000 * 3600 * 24);

      // Calculate keyword overlap score
      const lastKeywords = new Set(lastEntryInStory.metadata.keywords);
      const currentKeywords = currentEntry.metadata.keywords;
      let overlapScore = 0;
      for (const keyword of currentKeywords) {
        if (lastKeywords.has(keyword)) {
          overlapScore++;
        }
      }

      if (daysBetween <= MAX_DAYS_BETWEEN_STORYLINE_ENTRIES && overlapScore >= MIN_KEYWORD_OVERLAP_SCORE) {
        // This entry is part of the current story
        potentialStory.push(currentEntry);
      } else {
        // The story ends here. Check if it's significant enough to save.
        if (potentialStory.length >= MIN_ENTRIES_FOR_STORYLINE) {
          storylines.push(this.createStorylineFromEntries(potentialStory));
        }
        // Start a new potential story
        potentialStory = [currentEntry];
      }
    }

    // Don't forget the last potential story
    if (potentialStory.length >= MIN_ENTRIES_FOR_STORYLINE) {
      storylines.push(this.createStorylineFromEntries(potentialStory));
    }

    return storylines;
  }

  /**
   * A helper to convert a cluster of entries into a Storyline object.
   * @param entries An array of RichEntry objects that form a story.
   * @returns A Storyline object.
   */
  private createStorylineFromEntries(entries: RichEntry[]): Storyline {
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];

    // Aggregate all keywords and find the most frequent ones
    const allKeywords: Record<string, number> = {};
    for (const entry of entries) {
      for (const keyword of entry.metadata.keywords) {
        allKeywords[keyword] = (allKeywords[keyword] || 0) + 1;
      }
    }
    const topKeywords = Object.entries(allKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
    
    // Create a title from the top keywords
    const title = topKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' & ');

    return {
      id: `story-${firstEntry.id}`,
      title: title || "A New Story",
      entryIds: entries.map(e => e.id),
      startDate: firstEntry.createdAt,
      endDate: lastEntry.createdAt,
      keyKeywords: topKeywords,
    };
  }

  /**
   * Calculates the current focus chapters based on a scoring algorithm.
   * @param currentState The UserStateModel, which includes chapters with their entry IDs.
   * @param allRichEntries A dictionary of all rich entries for lookup.
   * @returns An array of FocusChapter objects.
   */
  private calculateFocusChapters(currentState: UserStateModel, allRichEntries: Record<string, RichEntry>): FocusChapter[] {
    const chapterScores: { chapterId: string; score: number; recencyBonus: number; emotionalBonus: number; entryCount: number }[] = [];
    const now = new Date().getTime();

    for (const chapterId in currentState.chapters) {
      const chapter = currentState.chapters[chapterId];
      let totalScore = 0;

      if (!chapter.entryIds || chapter.entryIds.length === 0) {
        continue;
      }
      
      // Base score is proportional to the number of entries
      let baseScore = chapter.entryIds.length;

      let recencyBonus = 0;
      let emotionalBonus = 0;
      let recentEntryCount = 0;
      let strongEmotionCount = 0;

      for (const entryId of chapter.entryIds) {
        const entry = allRichEntries[entryId];
        if (!entry) continue;

        // Calculate recency bonus
        const entryDate = new Date(entry.createdAt).getTime();
        const daysAgo = (now - entryDate) / (1000 * 3600 * 24);
        if (daysAgo <= RECENCY_DAYS_THRESHOLD) {
          recentEntryCount++;
          recencyBonus += (RECENCY_DAYS_THRESHOLD - daysAgo) / RECENCY_DAYS_THRESHOLD; // Higher bonus for more recent entries
        }

        // Calculate emotional intensity bonus
        const sentimentScore = Math.abs(entry.metadata.sentiment.score); // 0 to 1
        if (sentimentScore > 0.5) { // Consider only strong emotions
            strongEmotionCount++;
            emotionalBonus += sentimentScore;
        }
      }

      totalScore = baseScore + (recencyBonus * RECENCY_WEIGHT) + (emotionalBonus * EMOTIONAL_INTENSITY_WEIGHT);
      
      chapterScores.push({ 
        chapterId, 
        score: totalScore,
        recencyBonus,
        emotionalBonus,
        entryCount: chapter.entryIds.length
      });
    }

    // Sort chapters by score in descending order and take the top N
    const topChapters = chapterScores
      .sort((a, b) => b.score - a.score)
      .slice(0, FOCUS_CHAPTER_COUNT);

    // Format into FocusChapter objects with descriptive reasons
    return topChapters.map(cs => {
      const reasons: string[] = [];
      
      if (cs.entryCount >= 10) {
        reasons.push("High activity");
      } else if (cs.entryCount >= 5) {
        reasons.push("Moderate activity");
      }
      
      if (cs.recencyBonus > 3) {
        reasons.push("Recent entries");
      }
      
      if (cs.emotionalBonus > 2) {
        reasons.push("Strong emotional engagement");
      }
      
      const reason = reasons.length > 0 
        ? reasons.join(", ") 
        : "High recent activity and engagement";
      
      return {
        chapterId: cs.chapterId,
        score: parseFloat(cs.score.toFixed(2)),
        reason,
      };
    });
  }

}

export const aggregationService = new AggregationService();
