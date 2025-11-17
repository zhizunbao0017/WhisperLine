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
   * @param jsonFilePath Path to the Day One JSON file
   * @param mediaDirectoryPath Path to the directory containing media files
   * @returns Array of ImportedEntry objects
   */
  public async parse(
    jsonFilePath: string,
    mediaDirectoryPath: string
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
          return this.convertDayOneEntry(entry, mediaDirectoryPath, index);
        } catch (error) {
          console.error(`[DayOneJsonParser] Error converting entry ${index}:`, error);
          // Return a minimal entry if conversion fails
          return {
            id: `imported_${Date.now()}_${index}`,
            createdAt: new Date(entry.creationDate || Date.now()),
            content: entry.text || '',
            media: [],
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
   */
  private convertDayOneEntry(
    entry: DayOneEntry,
    mediaDirectoryPath: string,
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

    // Convert photos to media array
    const media = (entry.photos || []).map((photo) => {
      // Construct media file path: mediaDirectoryPath + photo.md5 + '.' + photo.type
      const fileExtension = photo.type || 'jpg';
      const mediaPath = `${mediaDirectoryPath}/${photo.md5}.${fileExtension}`;

      return {
        type: 'photo' as const,
        path: mediaPath,
      };
    });

    // Build content with photos embedded as HTML img tags
    let content = entry.text || '';
    
    // If there are photos, append them to content as HTML img tags
    if (media.length > 0) {
      const photoHtml = media
        .map((m) => `<img src="${m.path}" alt="Imported photo" />`)
        .join('\n');
      
      // Append photos after text content
      content = content ? `${content}\n\n${photoHtml}` : photoHtml;
    }

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
      media,
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

