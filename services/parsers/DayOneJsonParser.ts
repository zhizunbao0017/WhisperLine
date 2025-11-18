// services/parsers/DayOneJsonParser.ts
import * as FileSystem from 'expo-file-system';
import { ImportedEntry, DayOneEntry } from '../../types/import';

/**
 * Parser for Day One JSON export format
 * Converts Day One entries to ImportedEntry format
 */
class DayOneJsonParser {
  /**
   * Parse Day One JSON file and convert entries to ImportedEntry format
   * The parser's responsibility is only to parse, not to interpret.
   * It returns raw photo metadata without building file paths.
   * @param jsonFilePath Path to the Day One JSON file
   * @param mediaDirectoryPath Path to the directory containing media files (unused, kept for compatibility)
   * @returns Array of ImportedEntry objects with raw photos metadata
   */
  public async parse(
    jsonFilePath: string,
    mediaDirectoryPath?: string
  ): Promise<ImportedEntry[]> {
    try {
      // Read JSON file
      const jsonContent = await FileSystem.readAsStringAsync(jsonFilePath);
      const dayOneData = JSON.parse(jsonContent);

      // Day One JSON structure: { entries: [...] }
      const entries: DayOneEntry[] = dayOneData.entries || [];

      if (!Array.isArray(entries)) {
        throw new Error('Invalid Day One JSON format: entries must be an array');
      }

      console.log(`[DayOneJsonParser] Found ${entries.length} entries in JSON file`);

      // Convert each Day One entry to ImportedEntry format
      const importedEntries: ImportedEntry[] = entries.map((entry, index) => {
        try {
          return this.convertDayOneEntry(entry, index);
        } catch (error) {
          console.error(`[DayOneJsonParser] Error converting entry ${index}:`, error);
          // Return a minimal entry if conversion fails
          return {
            id: `imported_${Date.now()}_${index}`,
            createdAt: new Date(entry.creationDate || Date.now()),
            content: entry.text || '',
            photos: entry.photos || [],
            metadata: {
              tags: entry.tags || [],
              weather: entry.weather || undefined,
            },
          };
        }
      });

      console.log(`[DayOneJsonParser] Successfully parsed ${importedEntries.length} entries`);
      return importedEntries;
    } catch (error) {
      console.error('[DayOneJsonParser] Parse error:', error);
      throw new Error(`Failed to parse Day One JSON: ${error.message}`);
    }
  }

  /**
   * Convert a single Day One entry to ImportedEntry format
   * The parser only parses, it does not build file paths or interpret data.
   * It returns raw photo metadata directly from the JSON.
   */
  private convertDayOneEntry(
    entry: DayOneEntry,
    index: number
  ): ImportedEntry {
    // Parse creation date
    const createdAt = entry.creationDate
      ? new Date(entry.creationDate)
      : new Date();

    // Convert location if available
    const location = entry.location
      ? {
          latitude: entry.location.latitude,
          longitude: entry.location.longitude,
          address: this.formatLocationAddress(entry.location),
        }
      : undefined;

    // Return raw photos array directly from JSON (e.g., [{ "md5": "...", "type": "jpeg" }, ...])
    // The parser does not build file paths - that's the responsibility of ImportService
    const photos = entry.photos || [];

    // Content is just the text - no photo embedding here
    const content = entry.text || '';

    // Convert tags
    const tags = entry.tags || [];

    // Convert weather data
    const weather = entry.weather
      ? {
          temperature: entry.weather.temperatureCelsius,
          description: entry.weather.conditionsDescription,
        }
      : undefined;

    return {
      id: `imported_${Date.now()}_${index}_${entry.uuid?.slice(0, 8) || 'unknown'}`,
      createdAt,
      content,
      location,
      photos, // Raw photos metadata array
      metadata: {
        weather,
        tags,
      },
    };
  }

  /**
   * Format Day One location object into a readable address string
   */
  private formatLocationAddress(location: DayOneEntry['location']): string {
    if (!location) return '';
    
    const parts: string[] = [];
    
    if (location.placeName) {
      parts.push(location.placeName);
    }
    if (location.administrativeArea) {
      parts.push(location.administrativeArea);
    }
    if (location.country) {
      parts.push(location.country);
    }
    
    return parts.join(', ') || 'Unknown location';
  }
}

export const dayOneJsonParser = new DayOneJsonParser();

