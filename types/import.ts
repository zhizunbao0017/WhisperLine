// types/import.ts
/**
 * Standardized interface for imported diary entries from external sources (e.g., Day One)
 * This is an intermediate format that will be converted to DiaryEntry format
 */
export interface ImportedEntry {
  id: string; // A new UUID will be generated
  createdAt: Date; // Will be converted to ISO string
  content: string; // Plain text or HTML content
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  photos?: Array<{
    md5: string;
    type: string; // e.g., 'jpeg', 'png'
    orderInEntry?: number;
  }>; // Raw photos metadata from Day One JSON (parser responsibility)
  metadata: {
    weather?: object;
    tags?: string[];
  };
}

/**
 * Day One JSON structure (for reference)
 */
export interface DayOneEntry {
  uuid: string;
  creationDate: string;
  modifiedDate: string;
  text: string;
  location?: {
    latitude: number;
    longitude: number;
    placeName?: string;
    administrativeArea?: string;
    country?: string;
  };
  photos?: Array<{
    md5: string;
    type: string; // e.g., 'jpeg', 'png'
    orderInEntry: number;
  }>;
  tags?: string[];
  weather?: {
    temperatureCelsius?: number;
    conditionsDescription?: string;
  };
}

