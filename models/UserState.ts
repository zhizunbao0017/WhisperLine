// models/UserState.ts
import { Chapter, Storyline, FocusChapter, Companion } from './PIE';

export interface AppSettings {
  isAIInteractionEnabled: boolean;
  hasSeenLongPressHint?: boolean; // Track if user has seen the long-press tutorial
}

export interface UserStateModel {
  lastUpdatedAt: string;
  chapters: Record<string, Chapter>; // Use a dictionary for fast lookups by ID
  companions: Record<string, Companion>; // Dictionary of user's custom companions
  storylines: Storyline[];
  focus: {
    currentFocusChapters: FocusChapter[];
  };
  settings: AppSettings;
  // This model will grow to hold all high-level insights
}

// Utility function example
export const getChapterById = (state: UserStateModel, chapterId: string): Chapter | undefined => {
  return state.chapters[chapterId];
};
