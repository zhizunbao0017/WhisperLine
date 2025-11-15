// services/PIE/PIEService.ts

import { DiaryEntry, RichEntry } from '../../models/RichEntry';
import { Chapter, Companion } from '../../models/PIE';
import { UserStateModel } from '../../models/UserState';
import { atomizationService } from './AtomizationService';
import { associationService } from './AssociationService';
import { aggregationService } from './AggregationService'; // We will call its placeholder functions

class PIEService {
  /**
   * Processes a single new diary entry from start to finish and updates the user state.
   * This is the main function to call when a user saves a new diary.
   * @param newEntry The newly created DiaryEntry.
   * @param currentState The current UserStateModel.
   * @param allRichEntries Optional dictionary of all existing RichEntry objects for aggregation.
   * @returns An object containing the updated UserStateModel and the new RichEntry.
   */
  public processNewEntry(
    newEntry: DiaryEntry,
    currentState: UserStateModel,
    allRichEntries?: Record<string, RichEntry>
  ): { updatedState: UserStateModel; richEntry: RichEntry } {
    // Layer 1: Enrich the entry
    const richEntry = atomizationService.enrichEntry(newEntry);

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
   * This is a heavy operation and should be triggered manually by the user.
   * @param allEntries An array of all DiaryEntry objects.
   * @returns The newly built UserStateModel.
   */
  public rebuildAll(allEntries: DiaryEntry[]): UserStateModel {
      console.log("Rebuilding all chapters from scratch...");
      let freshState: UserStateModel = {
          lastUpdatedAt: '',
          chapters: {},
          storylines: [],
          focus: { currentFocusChapters: [] },
          // Initialize other state properties...
      };

      // Build a dictionary of all rich entries as we process them
      const allRichEntries: Record<string, RichEntry> = {};

      // Sort entries chronologically by createdAt
      const sortedEntries = [...allEntries].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      for(const entry of sortedEntries) {
          // Layer 1: Enrich the entry
          const richEntry = atomizationService.enrichEntry(entry);

          // Layer 2: Find associations
          const associations = associationService.processAssociation(richEntry, freshState);

          // Update chapters
          const allChapterIds = [...associations.companionChapterIds, ...associations.themeChapterIds];
          
          // Attach chapterIds to the rich entry for efficient lookups
          const finalRichEntry: RichEntry = {
            ...richEntry,
            chapterIds: allChapterIds,
          };
          
          allRichEntries[finalRichEntry.id] = finalRichEntry;
          
          for (const chapterId of allChapterIds) {
            if (freshState.chapters[chapterId]) {
              // Chapter exists, prepend the new entry ID
              freshState.chapters[chapterId] = {
                ...freshState.chapters[chapterId],
                entryIds: [entry.id, ...freshState.chapters[chapterId].entryIds],
                lastUpdated: new Date().toISOString(),
              };
            } else {
              // Chapter doesn't exist, create it
              freshState.chapters[chapterId] = this.createChapter(chapterId, entry.id, freshState);
            }
          }
      }
      
      // After processing all entries, run a full aggregation
      freshState = aggregationService.runFullAggregation(freshState, allRichEntries);

      console.log("Rebuild complete.");
      return freshState;
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
