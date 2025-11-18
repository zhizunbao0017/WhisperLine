// models/PIE.ts

// --- Base Enums and Types ---
export type EmotionType = 'happy' | 'excited' | 'calm' | 'tired' | 'sad' | 'angry';

export type ChapterType = 'companion' | 'theme';

export type ThemeType = 'work' | 'wellness' | 'relationships' | 'learning' | 'travel' | 'reflections';

export interface NamedEntity {
  text: string;
  type: 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'UNKNOWN';
}

/**
 * Avatar configuration for Companion
 */
export interface CompanionAvatar {
  type: 'lottie' | 'image'; // Avatar type: lottie for animated avatars, image for static images
  source: string; // For 'lottie': Lottie file identifier/name; For 'image': MediaService-managed file path
}

export interface Companion {
  id: string;
  name: string;
  isInteractionEnabled: boolean; // User preference for AI interaction with this companion
  avatar?: CompanionAvatar; // Optional avatar configuration
  // Legacy field for backward compatibility (will be migrated to avatar)
  avatarUri?: string; // @deprecated Use avatar instead
}

// --- Aggregated Data Structures for Dashboards ---
export interface ChapterMetrics {
  totalEntries: number;
  emotionDistribution: Record<EmotionType, number>; // e.g., { happy: 10, sad: 2 }
  frequency: {
    perWeek: number;
    perMonth: number;
  };
  // Add other metrics as needed for the dashboard
}

export interface Storyline {
  id: string; // e.g., 'story-tokyo-trip-2025'
  title: string; // e.g., "Tokyo Trip 2025"
  entryIds: string[];
  startDate: string;
  endDate: string;
  keyKeywords: string[];
}

export interface FocusChapter {
  chapterId: string;
  score: number; // A calculated score based on recency, frequency, emotional intensity
  reason: string; // e.g., "High frequency of recent entries"
}

export interface Chapter {
  id: string; // e.g., 'companion-xyz' or 'theme-work'
  title: string;
  type: ChapterType;
  entryIds: string[];
  lastUpdated: string;
  createdAt: string;
  sourceId?: string; // Companion ID or Theme ID
  keywords?: string[];
  metrics?: ChapterMetrics;
}
