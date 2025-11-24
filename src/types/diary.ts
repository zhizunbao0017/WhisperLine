// src/types/diary.ts
// Type definitions for diary entries and analyzed metadata

export interface AnalyzedMetadata {
  people: string[];    // e.g. ["Sarah", "Mike"]
  activities: string[]; // e.g. ["hiking", "coffee"]
  moods: string[];     // e.g. ["happy"]
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  contentHTML?: string;
  mood?: string | null;
  weather?: any;
  createdAt: string;
  updatedAt: string;
  companionIDs?: string[];
  analysis?: any;
  analyzedMetadata?: AnalyzedMetadata;
  themeID?: string | null;
  captureType?: string | null;
  captureMeta?: any;
}

