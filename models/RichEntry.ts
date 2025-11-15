// models/RichEntry.ts
import { EmotionType, NamedEntity } from './PIE';

// Assuming you have a base DiaryEntry type. If not, you can define it here.
export interface DiaryEntry {
  id: string;
  content: string;
  createdAt: string;
  // ... other existing properties
}

export interface RichEntryMetadata {
  processedAt: string;
  keywords: string[];
  entities: NamedEntity[];
  detectedEmotion: {
    primary: EmotionType;
    score: number; // e.g., 0.85
  };
  sentiment: {
    score: number; // a value from -1 (negative) to 1 (positive)
    label: 'positive' | 'negative' | 'neutral';
  };
}

export interface RichEntry extends DiaryEntry {
  metadata: RichEntryMetadata;
  chapterIds?: string[]; // Chapter IDs that this entry belongs to (for efficient lookups)
}
