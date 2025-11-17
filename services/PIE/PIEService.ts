// services/PIE/PIEService.ts

import { DiaryEntry, RichEntry, RichEntryMetadata } from '../../models/RichEntry';
import { Chapter, Companion, EmotionType } from '../../models/PIE';
import { UserStateModel } from '../../models/UserState';
import { atomizationService } from './AtomizationService';
import { associationService } from './AssociationService';
import { aggregationService } from './AggregationService'; // We will call its placeholder functions

/**
 * Helper function to convert mood string (e.g., "Happy") to EmotionType (e.g., "happy")
 */
function moodStringToEmotionType(mood: string | null | undefined): EmotionType | undefined {
  if (!mood || typeof mood !== 'string') return undefined;
  const normalized = mood.toLowerCase().trim();
  // Map mood names to EmotionType
  const moodMap: Record<string, EmotionType> = {
    'happy': 'happy',
    'sad': 'sad',
    'angry': 'angry',
    'calm': 'calm',
    'excited': 'excited',
    'tired': 'tired',
  };
  return moodMap[normalized];
}

class PIEService {
  /**
   * Processes a single new diary entry from start to finish and updates the user state.
   * This is the main function to call when a user saves a new diary.
   * @param newEntry The newly created DiaryEntry.
   * @param currentState The current UserStateModel.
   * @param allRichEntries Optional dictionary of all existing RichEntry objects for aggregation.
   * @param userSelectedMood Optional user-selected mood (e.g., "Happy", "Sad") - takes priority over AI detection.
   * @returns An object containing the updated UserStateModel and the new RichEntry.
   */
  public processNewEntry(
    newEntry: DiaryEntry,
    currentState: UserStateModel,
    allRichEntries?: Record<string, RichEntry>,
    userSelectedMood?: string | null
  ): { updatedState: UserStateModel; richEntry: RichEntry } {
    // Layer 1: Enrich the entry (this generates AI analysis)
    const richEntryWithAI = atomizationService.enrichEntry(newEntry);
    
    // --- KEY LOGIC CHANGE: Establish the authoritative emotion ---
    // Convert user-selected mood to EmotionType if provided
    const userEmotionType = moodStringToEmotionType(userSelectedMood);
    
    // Priority: User-selected mood > AI-detected emotion
    const primaryEmotion: EmotionType = userEmotionType || richEntryWithAI.metadata.detectedEmotion.primary;
    
    // Rebuild metadata with the authoritative emotion
    const metadata: RichEntryMetadata = {
      processedAt: richEntryWithAI.metadata.processedAt,
      keywords: richEntryWithAI.metadata.keywords,
      entities: richEntryWithAI.metadata.entities,
      primaryEmotion: primaryEmotion, // The authoritative field
      aiAnalysis: {
        primary: richEntryWithAI.metadata.detectedEmotion.primary,
        score: richEntryWithAI.metadata.detectedEmotion.score,
        sentiment: richEntryWithAI.metadata.sentiment,
      },
      // Legacy fields for backward compatibility
      detectedEmotion: richEntryWithAI.metadata.detectedEmotion,
      sentiment: richEntryWithAI.metadata.sentiment,
    };
    
    // Create the final rich entry with updated metadata
    const richEntry: RichEntry = {
      ...richEntryWithAI,
      metadata,
    };
    // --- END KEY LOGIC CHANGE ---

    // Layer 2: Find associations
    const associations = associationService.processAssociation(richEntry, currentState);

    // Create a mutable copy of the state to update
    let updatedState = { ...currentState };
    updatedState.chapters = { ...currentState.chapters };

    const allChapterIds = [...associations.companionChapterIds, ...associations.themeChapterIds];

    // Layer 3 (Update Step): Update the relevant chapters
    for (const chapterId of allChapterIds) {
      if (updatedState.chapters[chapterId]) {
        // Chapter exists, prepend the new entry ID
        updatedState.chapters[chapterId] = {
          ...updatedState.chapters[chapterId],
          entryIds: [newEntry.id, ...updatedState.chapters[chapterId].entryIds],
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Chapter doesn't exist, create it
        // Note: We need a way to get chapter titles. For now, we use a helper.
        updatedState.chapters[chapterId] = this.createChapter(chapterId, newEntry.id, currentState);
      }
    }
    
    // Update the global timestamp
    updatedState.lastUpdatedAt = new Date().toISOString();

    // Attach chapterIds to the rich entry for efficient lookups
    const finalRichEntry: RichEntry = {
      ...richEntry,
      chapterIds: allChapterIds,
    };

    // Build allRichEntries if not provided, including the new rich entry with chapterIds
    const richEntriesForAggregation: Record<string, RichEntry> = allRichEntries 
      ? { ...allRichEntries, [finalRichEntry.id]: finalRichEntry }
      : { [finalRichEntry.id]: finalRichEntry };

    // Call the aggregation service to perform incremental updates
    updatedState = aggregationService.updateMetricsIncremental(updatedState, allChapterIds, richEntriesForAggregation);

    return { updatedState, richEntry: finalRichEntry };
  }
  
  /**
   * Rebuilds the entire UserStateModel from all diary entries.
   * This is a heavy operation designed to fix data inconsistencies and apply new logic to old data.
   * This will act as a data migration and cleanup tool. After running, any old, inconsistent
   * chapter data will be purged, and the app's state will be perfectly synchronized.
   * @param allEntries An array of all DiaryEntry objects.
   * @returns An object containing the newly built UserStateModel and all RichEntry objects.
   */
  public rebuildAll(allEntries: DiaryEntry[]): { newState: UserStateModel; newRichEntries: Record<string, RichEntry> } {
    console.log("--- STARTING FULL REBUILD ---");
    console.log(`Processing ${allEntries.length} total entries...`);

    // 1. --- CRITICAL --- Start with a completely fresh, empty state.
    // This purges all old/ghost chapters and ensures data integrity.
    let freshState: UserStateModel = {
      lastUpdatedAt: '',
      chapters: {},
      storylines: [],
      focus: { currentFocusChapters: [] },
      // Make sure all UserStateModel properties are initialized
    };
    
    // Create a dictionary for all new rich entries that will be created
    let allRichEntries: Record<string, RichEntry> = {};

    // 2. Sort entries by creation date to process them in chronological order.
    const sortedEntries = [...allEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 3. Process each entry one by one, building up the fresh state.
    for (const entry of sortedEntries) {
      // NOTE: We pass the incrementally built `allRichEntries` dictionary
      // even though it's a full rebuild, to satisfy the function signature.
      // For rebuild, we don't have access to original user-selected mood, so pass undefined
      // The AI-detected emotion will be used as fallback
      const { updatedState, richEntry } = this.processNewEntry(entry, freshState, allRichEntries, entry.mood || undefined);
      freshState = updatedState;
      allRichEntries[richEntry.id] = richEntry;
    }

    // 4. After all entries are processed, run the final full aggregation step.
    // This calculates all metrics, storylines, and focus chapters based on the complete data.
    console.log("All entries processed. Running final aggregation...");
    freshState = aggregationService.runFullAggregation(freshState, allRichEntries);

    console.log("--- FULL REBUILD COMPLETE ---");
    return { newState: freshState, newRichEntries: allRichEntries };
  }

  /**
   * A helper function to create a new chapter object.
   * In a real app, this might need to fetch companion names etc.
   */
  private createChapter(chapterId: string, firstEntryId: string, currentState: UserStateModel): Chapter {
    const now = new Date().toISOString();
    const [type, sourceId] = chapterId.split('-');
    
    let title = "New Chapter";
    if (type === 'theme') {
      title = sourceId.charAt(0).toUpperCase() + sourceId.slice(1); // e.g., "Work"
    } else if (type === 'companion') {
        // This is a placeholder. You'd need to find the companion's name from the state.
        // Assuming userState.companions exists:
        // const companion = currentState.companions[sourceId];
        // title = companion ? companion.name : 'Unknown Companion';
        title = `Companion ${sourceId}`;
    }

    return {
      id: chapterId,
      title,
      type: type as 'companion' | 'theme',
      sourceId: sourceId,
      entryIds: [firstEntryId],
      createdAt: now,
      lastUpdated: now,
    };
  }
}

export const pieService = new PIEService();
