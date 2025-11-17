// services/ImportService.ts
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { dayOneJsonParser } from './parsers/DayOneJsonParser';
import { ImportedEntry } from '../types/import';
import { DiaryContext } from '../context/DiaryContext';
import { pieService } from './PIE/PIEService';
import { createDiaryEntry } from '../models/DiaryEntry';

/**
 * Progress callback type for import operations
 */
export type ImportProgressCallback = (progress: number, message?: string) => void;

/**
 * Import service for importing diary entries from external sources (Day One, etc.)
 */
class ImportService {
  /**
   * Start the import process from a ZIP file
   * @param zipFileUri URI of the ZIP file to import
   * @param progressCallback Callback function to report progress (0-100)
   * @param diaryContext DiaryContext instance for saving entries
   * @param userStateContext UserStateContext instance for updating state
   * @returns Success message
   */
  public async startImport(
    zipFileUri: string,
    progressCallback: ImportProgressCallback,
    diaryContext: any, // DiaryContext - has addDiary, diaries, etc.
    userStateContext: any // UserStateContext - has updateUserState, updateRichEntries, etc.
  ): Promise<string> {
    let tempDirectory: string | null = null;

    try {
      progressCallback(0, 'Starting import...');

      // Step 1: Unzip the file
      progressCallback(5, 'Extracting archive...');
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        throw new Error('Cache directory not available');
      }

      tempDirectory = `${cacheDir}import_${Date.now()}`;
      await FileSystem.makeDirectoryAsync(tempDirectory, { intermediates: true });

      // Read ZIP file
      const zipFileContent = await FileSystem.readAsStringAsync(zipFileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Parse ZIP using JSZip
      const zip = await JSZip.loadAsync(zipFileContent, { base64: true });
      
      // Extract all files
      const fileNames = Object.keys(zip.files);
      for (let i = 0; i < fileNames.length; i++) {
        const fileName = fileNames[i];
        const file = zip.files[fileName];
        
        // Skip directories
        if (file.dir) {
          continue;
        }

        // Create directory structure if needed
        const filePath = `${tempDirectory}/${fileName}`;
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dirPath !== tempDirectory) {
          await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        }

        // Extract file content
        // Use 'base64' encoding directly for React Native compatibility
        const base64Content = await file.async('base64');
        await FileSystem.writeAsStringAsync(filePath, base64Content, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Update progress (5% to 20% for extraction)
        const extractProgress = 5 + ((i + 1) / fileNames.length) * 15;
        progressCallback(Math.floor(extractProgress), `Extracting ${fileName}...`);
      }
      
      progressCallback(20, 'Archive extracted');

      // Step 2: Locate JSON file and photos directory
      const files = await FileSystem.readDirectoryAsync(tempDirectory);
      console.log('[ImportService] Unzipped files:', files);

      // Find JSON file (usually named 'Journal.json' or 'entries.json')
      const jsonFile = files.find(
        (f) => f.toLowerCase().endsWith('.json') && !f.toLowerCase().includes('metadata')
      );
      
      if (!jsonFile) {
        throw new Error('No JSON file found in archive');
      }

      const jsonFilePath = `${tempDirectory}/${jsonFile}`;
      
      // Find photos directory (usually 'photos' or 'media')
      const photosDir = files.find(
        (f) => {
          const lower = f.toLowerCase();
          return (
            (lower.includes('photo') || lower.includes('media') || lower.includes('image')) &&
            !lower.endsWith('.json')
          );
        }
      ) || 'photos'; // Default fallback

      const mediaDirectoryPath = `${tempDirectory}/${photosDir}`;
      
      // Check if media directory exists
      let mediaPath = mediaDirectoryPath;
      try {
        const dirInfo = await FileSystem.getInfoAsync(mediaDirectoryPath);
        if (!dirInfo.exists) {
          console.warn('[ImportService] Media directory not found, using root directory');
          mediaPath = tempDirectory;
        }
      } catch (error) {
        console.warn('[ImportService] Error checking media directory:', error);
        mediaPath = tempDirectory;
      }

      progressCallback(30, 'Parsing entries...');

      // Step 3: Parse JSON file
      const importedEntries = await dayOneJsonParser.parse(jsonFilePath, mediaPath);
      
      if (importedEntries.length === 0) {
        throw new Error('No entries found in the archive');
      }

      progressCallback(35, `Found ${importedEntries.length} entries`);

      // Step 4: Convert ImportedEntry to DiaryEntry and save
      const totalEntries = importedEntries.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < importedEntries.length; i++) {
        const importedEntry = importedEntries[i];
        
        try {
          // Convert ImportedEntry to DiaryEntry format
          const diaryEntry = this.convertToDiaryEntry(importedEntry);

          // Save entry using DiaryContext
          // Note: We use addDiary which internally calls saveDiary
          await diaryContext.addDiary(diaryEntry);

          successCount++;

          // Update progress (35% to 90% for saving entries)
          const saveProgress = 35 + ((i + 1) / totalEntries) * 55;
          progressCallback(
            Math.floor(saveProgress),
            `Imported ${i + 1} of ${totalEntries} entries...`
          );
        } catch (error) {
          console.error(`[ImportService] Failed to import entry ${i + 1}:`, error);
          failCount++;
          // Continue with next entry even if one fails
        }
      }

      progressCallback(90, 'Finalizing import...');

      // Step 5: Rebuild PIE state to ensure all new data is reflected
      // Get all diaries from DiaryContext
      const allDiaries = diaryContext.diaries || [];
      
      if (allDiaries.length > 0) {
        console.log('[ImportService] Rebuilding PIE state with', allDiaries.length, 'total entries');
        const { newState, newRichEntries } = pieService.rebuildAll(allDiaries);

        // Update user state
        await userStateContext.updateUserState(newState);
        
        // Update rich entries
        await userStateContext.updateRichEntries(newRichEntries);
      }

      progressCallback(100, 'Import complete');

      // Step 6: Clean up temporary directory
      if (tempDirectory) {
        try {
          await FileSystem.deleteAsync(tempDirectory, { idempotent: true });
          console.log('[ImportService] Temporary directory cleaned up');
        } catch (cleanupError) {
          console.warn('[ImportService] Failed to clean up temp directory:', cleanupError);
        }
      }

      // Return success message
      const message = `Successfully imported ${successCount} entries${failCount > 0 ? ` (${failCount} failed)` : ''}`;
      return message;
    } catch (error) {
      console.error('[ImportService] Import error:', error);

      // Clean up on error
      if (tempDirectory) {
        try {
          await FileSystem.deleteAsync(tempDirectory, { idempotent: true });
        } catch (cleanupError) {
          console.warn('[ImportService] Failed to clean up temp directory on error:', cleanupError);
        }
      }

      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Convert ImportedEntry to DiaryEntry format
   */
  private convertToDiaryEntry(importedEntry: ImportedEntry): any {
    // Extract title from content (first line or first 60 characters)
    const contentLines = importedEntry.content.split('\n').filter((line) => line.trim());
    const firstLine = contentLines[0] || '';
    const title = firstLine.length > 60 ? firstLine.slice(0, 60) : firstLine || 'Imported Entry';

    // Convert Date to ISO string
    const createdAt = importedEntry.createdAt instanceof Date
      ? importedEntry.createdAt.toISOString()
      : new Date(importedEntry.createdAt).toISOString();

    // Ensure content has title as h1 tag if it doesn't already
    let content = importedEntry.content;
    if (!content.match(/^<h1[^>]*>/i)) {
      const escapedTitle = title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      content = `<h1>${escapedTitle}</h1>\n${content}`;
    }

    // Convert weather metadata if available
    const weather = importedEntry.metadata.weather
      ? {
          temperature: importedEntry.metadata.weather.temperature,
          description: importedEntry.metadata.weather.description,
          // Day One doesn't have city/icon, so we'll leave them undefined
        }
      : null;

    // Create DiaryEntry using the model factory
    return createDiaryEntry({
      title,
      content,
      mood: null, // Imported entries don't have mood, will be detected by AI
      weather,
      companionIDs: [], // No companions associated with imported entries
      themeID: null,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

export const importService = new ImportService();

