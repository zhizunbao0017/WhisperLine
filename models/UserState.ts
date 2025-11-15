// models/UserState.ts
import { Chapter, Storyline, FocusChapter } from './PIE';

export interface UserStateModel {
  lastUpdatedAt: string;
  chapters: Record<string, Chapter>; // Use a dictionary for fast lookups by ID
  storylines: Storyline[];
  focus: {
    currentFocusChapters: FocusChapter[];
  };
  // This model will grow to hold all high-level insights
}

// Utility function example
export const getChapterById = (state: UserStateModel, chapterId: string): Chapter | undefined => {
  return state.chapters[chapterId];
};
