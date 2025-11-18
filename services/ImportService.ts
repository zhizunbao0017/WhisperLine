// services/ImportService.ts
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { dayOneJsonParser } from './parsers/DayOneJsonParser';
import { ImportedEntry } from '../types/import';
import { DiaryContext } from '../context/DiaryContext';
import { pieService } from './PIE/PIEService';
import { createDiaryEntry } from '../models/DiaryEntry';
import MediaService from './MediaService';

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

      // Step 3: Parse JSON file (parser no longer needs mediaPath, but we keep it for compatibility)
      const importedEntries = await dayOneJsonParser.parse(jsonFilePath, mediaPath);
      
      if (importedEntries.length === 0) {
        throw new Error('No entries found in the archive');
      }

      progressCallback(35, `Found ${importedEntries.length} entries`);

      // Step 4: Process each parsed entry with MediaService integration
      const totalEntries = importedEntries.length;
      let successCount = 0;
      let failCount = 0;

      // Store the detected photos directory path for use in photo processing
      const photosDirectoryPath = mediaPath;

      for (let i = 0; i < importedEntries.length; i++) {
        const parsedEntry = importedEntries[i];
        
        try {
          // Generate a new, unique UUID for the diary entry
          const newEntryId = uuidv4();

          // Initialize Media Assets: Create an empty array to hold the final, processed media assets
          let finalMediaAssets: any[] = [];

          // Process Photos: Check if parsedEntry.photos exists and is not empty
          if (parsedEntry.photos && parsedEntry.photos.length > 0) {
            // Loop through each photo object in the parsedEntry.photos array
            for (const photo of parsedEntry.photos) {
              try {
                // Construct Source Path: Build the full path to the source image within the unzipped temporary directory
                // The path will be: ${photosDirectoryPath}/${photo.md5}.${photo.type}
                const fileExtension = photo.type || 'jpg';
                const sourceImagePath = `${photosDirectoryPath}/${photo.md5}.${fileExtension}`;

                // Check if the source file exists before trying to import
                const sourceFileInfo = await FileSystem.getInfoAsync(sourceImagePath);
                if (!sourceFileInfo.exists) {
                  console.warn(`[ImportService] Photo file not found: ${sourceImagePath}, skipping...`);
                  continue;
                }

                // Delegate to MediaService: Call our specialized media import function
                const newAsset = await MediaService.importExternalImage(
                  sourceImagePath,
                  'entry',
                  newEntryId
                );

                // Collect Results: Push the newAsset object returned by MediaService into the finalMediaAssets array
                finalMediaAssets.push(newAsset);
              } catch (photoError) {
                console.error(`[ImportService] Failed to import photo ${photo.md5}:`, photoError);
                // Continue with next photo even if one fails
              }
            }
          }

          // Construct Final Entry: Create the final DiaryEntry object that will be saved to our database
          const finalDiaryEntry = this.convertToDiaryEntry(parsedEntry, newEntryId, finalMediaAssets);

          // Save and Process: Save the complete entry to the database
          await diaryContext.addDiary(finalDiaryEntry);

          // Note: PIE analysis will be triggered automatically by DiaryContext.addDiary
          // or we can trigger it manually after all entries are imported (see Step 5)

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
   * @param importedEntry The parsed entry from DayOneJsonParser
   * @param newEntryId The new UUID generated for this entry
   * @param mediaAssets Array of MediaAsset objects processed by MediaService
   */
  private convertToDiaryEntry(
    importedEntry: ImportedEntry,
    newEntryId: string,
    mediaAssets: any[]
  ): any {
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

    // Embed media assets into content as HTML img tags
    if (mediaAssets.length > 0) {
      const photoHtml = mediaAssets
        .map((asset) => `<img src="${asset.localPath}" alt="Imported photo" />`)
        .join('\n');
      
      // Append photos after text content
      content = content ? `${content}\n\n${photoHtml}` : photoHtml;
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
    const diaryEntry = createDiaryEntry({
      id: newEntryId, // Use the new UUID
      title,
      content,
      mood: null, // Imported entries don't have mood, will be detected by AI
      weather,
      companionIDs: [], // No companions associated with imported entries
      themeID: null,
      createdAt,
      updatedAt: createdAt,
    });

    // Add media field to the entry (MediaAsset array)
    return {
      ...diaryEntry,
      media: mediaAssets, // Include the array of assets processed by MediaService
    };
  }
}

export const importService = new ImportService();

