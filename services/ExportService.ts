// services/ExportService.ts

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { UserStateModel } from '../models/UserState';
import { RichEntry } from '../models/RichEntry';

const EXPORT_FORMAT_VERSION = '1.0.0';

export interface ExportData {
  version: string;
  exportedAt: string;
  userState: UserStateModel;
  richEntries: Record<string, RichEntry>;
}

class ExportService {
  /**
   * Generates export data structure from user state and rich entries
   */
  public generateExportData(
    userState: UserStateModel,
    richEntries: Record<string, RichEntry>
  ): ExportData {
    return {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      userState,
      richEntries,
    };
  }

  /**
   * Exports data to a JSON file and shares it using the native sharing dialog
   */
  public async exportAndShare(
    userState: UserStateModel,
    richEntries: Record<string, RichEntry>
  ): Promise<void> {
    try {
      // Generate export data
      const exportData = this.generateExportData(userState, richEntries);
      
      // Convert to JSON string with formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Generate filename with current date
      const dateString = new Date().toISOString().split('T')[0];
      const fileName = `WhisperLine_Backup_${dateString}.json`;
      
      // Use document directory for sharing (cache directory files might be cleaned up)
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Write JSON to file
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('ExportService: Backup file created at:', fileUri);
      console.log('ExportService: File size:', jsonString.length, 'bytes');
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Sharing isn't available on your platform");
      }
      
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export WhisperLine Data',
      });
      
      console.log('ExportService: File shared successfully');
    } catch (error) {
      console.error('ExportService: Export failed:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();

