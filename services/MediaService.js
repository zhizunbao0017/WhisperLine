// services/MediaService.js
// Centralized media management service for WhisperLine
// Handles all image operations for companions, diary entries, and imports

import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';

/**
 * MediaService - Centralized service for managing media assets
 * 
 * This service provides a unified interface for:
 * - Selecting images from the device
 * - Copying images to app's private storage
 * - Managing companion avatars
 * - Managing diary entry images
 * - Handling imported images
 */
class MediaService {
  // Private storage paths
  static COMPANIONS_MEDIA_PATH = `${FileSystem.documentDirectory}media/companions/`;
  static ENTRIES_MEDIA_PATH = `${FileSystem.documentDirectory}media/entries/`;

  /**
   * Initialize the media service by ensuring storage directories exist
   * Should be called on app startup
   */
  static async initialize() {
    try {
      // Ensure companion media directory exists
      const companionsDirInfo = await FileSystem.getInfoAsync(this.COMPANIONS_MEDIA_PATH);
      if (!companionsDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.COMPANIONS_MEDIA_PATH, { intermediates: true });
        console.log('[MediaService] Created companions media directory');
      }

      // Ensure entries media directory exists
      const entriesDirInfo = await FileSystem.getInfoAsync(this.ENTRIES_MEDIA_PATH);
      if (!entriesDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.ENTRIES_MEDIA_PATH, { intermediates: true });
        console.log('[MediaService] Created entries media directory');
      }

      console.log('[MediaService] Initialization complete');
    } catch (error) {
      console.error('[MediaService] Failed to initialize:', error);
      throw new Error(`MediaService initialization failed: ${error.message}`);
    }
  }

  /**
   * Private: Validate that a path is NOT a temporary ImagePicker cache path
   * @param {string} path - Path to validate
   * @returns {boolean} True if path is safe (permanent), false if temporary
   */
  static _isTemporaryPath(path) {
    if (!path) return false;
    // Check for ImagePicker cache paths (iOS and Android)
    const temporaryIndicators = [
      'Caches/ImagePicker',
      'cache/ImagePicker',
      'ImagePicker',
      'temp',
      'tmp',
    ];
    return temporaryIndicators.some(indicator => path.includes(indicator));
  }

  /**
   * Private: Copy and store an image from source URI to app's private directory
   * @param {string} sourceUri - Source URI from image picker (file:// or content://)
   * @param {'companion' | 'entry'} ownerType - Type of entity owning this media
   * @param {string} ownerId - ID of the owning entity
   * @returns {Promise<MediaAsset>} MediaAsset object with local path
   */
  static async _copyAndStoreImage(sourceUri, ownerType, ownerId) {
    try {
      // CRITICAL: Always copy to our managed permanent storage directory
      // This ensures consistent path structure and prevents temporary path issues
      const isTemporary = this._isTemporaryPath(sourceUri);
      
      if (isTemporary) {
        console.log('[MediaService] Source is temporary, will copy to permanent storage:', sourceUri);
      } else {
        // Even if source appears permanent, we still copy it to our managed directory
        // This ensures all media files are in our controlled location
        console.log('[MediaService] Source appears permanent, but copying to managed storage for consistency:', sourceUri);
      }

      // Determine destination directory based on owner type
      const baseDir = ownerType === 'companion' 
        ? this.COMPANIONS_MEDIA_PATH 
        : this.ENTRIES_MEDIA_PATH;

      // Generate unique, safe filename
      const timestamp = Date.now();
      const randomId = uuidv4().substring(0, 8);
      const extension = this._getFileExtension(sourceUri);
      const filename = `${ownerId}_${timestamp}_${randomId}${extension}`;
      const destinationPath = `${baseDir}${filename}`;

      console.log('[MediaService] Copying from temporary path to permanent storage:', {
        sourceUri,
        destinationPath,
        isTemporary,
      });

      // Copy file from source to destination
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationPath,
      });

      // Verify the copy was successful
      const fileInfo = await FileSystem.getInfoAsync(destinationPath);
      if (!fileInfo.exists) {
        throw new Error(`Failed to verify copied file exists at ${destinationPath}`);
      }
      
      // Determine MIME type from extension
      const mimeType = this._getMimeTypeFromExtension(extension);

      // Create MediaAsset object
      const mediaAsset = {
        id: uuidv4(),
        ownerType,
        ownerId,
        localPath: destinationPath, // file:// URI - PERMANENT path
        mimeType,
        createdAt: new Date(),
      };

      console.log('[MediaService] Image copied and stored successfully:', {
        sourceUri,
        destinationPath,
        ownerType,
        ownerId,
        isPermanent: !this._isTemporaryPath(destinationPath),
      });

      return mediaAsset;
    } catch (error) {
      console.error('[MediaService] Failed to copy and store image:', error);
      throw new Error(`Failed to store image: ${error.message}`);
    }
  }

  /**
   * Private: Get file extension from URI
   * @param {string} uri - File URI
   * @returns {string} File extension (e.g., '.jpg', '.png')
   */
  static _getFileExtension(uri) {
    // Extract extension from URI
    const match = uri.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
    // Default to .jpg if no extension found
    return '.jpg';
  }

  /**
   * Private: Get MIME type from file extension
   * @param {string} extension - File extension (e.g., '.jpg', '.png')
   * @returns {string} MIME type
   */
  static _getMimeTypeFromExtension(extension) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Assign an image to a companion (avatar)
   * Launches image picker, copies image to private storage, and returns CompanionAvatar object
   * @param {string} companionId - ID of the companion
   * @returns {Promise<{type: 'image', source: string} | null>} CompanionAvatar if image selected, null if cancelled
   * @throws {Error} If permission denied or file operation fails
   */
  static async assignCompanionImage(companionId) {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for avatars
        quality: 0.8,
      });

      // Handle user cancellation
      if (result.canceled || !result.assets?.[0]?.uri) {
        console.log('[MediaService] User cancelled image selection');
        return null;
      }

      // Copy and store the selected image
      const sourceUri = result.assets[0].uri;
      
      // CRITICAL: Log the source URI to help debug temporary path issues
      console.log('[MediaService] ImagePicker returned URI:', sourceUri);
      const isSourceTemporary = this._isTemporaryPath(sourceUri);
      console.log('[MediaService] Source is temporary:', isSourceTemporary);
      
      const mediaAsset = await this._copyAndStoreImage(sourceUri, 'companion', companionId);

      // CRITICAL: Verify the returned path is permanent
      if (this._isTemporaryPath(mediaAsset.localPath)) {
        throw new Error(`Failed to copy to permanent storage: path is still temporary: ${mediaAsset.localPath}`);
      }

      console.log('[MediaService] Companion image assigned successfully:', {
        companionId,
        sourceUri,
        permanentPath: mediaAsset.localPath,
        isPermanent: !this._isTemporaryPath(mediaAsset.localPath),
      });

      // Return in the new CompanionAvatar format
      return {
        type: 'image',
        source: mediaAsset.localPath, // file:// URI from MediaService - PERMANENT path
      };
    } catch (error) {
      console.error('[MediaService] Failed to assign companion image:', error);
      throw error;
    }
  }

  /**
   * Delete a media asset from storage
   * @param {string} localPath - Local path of the media asset to delete
   * @returns {Promise<void>}
   */
  static async deleteMediaAsset(localPath) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        console.log('[MediaService] Deleted media asset:', localPath);
      } else {
        console.warn('[MediaService] Media asset not found:', localPath);
      }
    } catch (error) {
      console.error('[MediaService] Failed to delete media asset:', error);
      throw new Error(`Failed to delete media asset: ${error.message}`);
    }
  }

  /**
   * Get media asset info
   * @param {string} localPath - Local path of the media asset
   * @returns {Promise<FileSystem.FileInfo>} File info
   */
  static async getMediaAssetInfo(localPath) {
    try {
      return await FileSystem.getInfoAsync(localPath);
    } catch (error) {
      console.error('[MediaService] Failed to get media asset info:', error);
      throw new Error(`Failed to get media asset info: ${error.message}`);
    }
  }

  /**
   * Copy an external image file to app storage (for imports)
   * @param {string} sourcePath - Source file path (from import)
   * @param {'companion' | 'entry'} ownerType - Type of entity owning this media
   * @param {string} ownerId - ID of the owning entity
   * @returns {Promise<MediaAsset>} MediaAsset object with permanent path
   */
  static async importExternalImage(sourcePath, ownerType, ownerId) {
    try {
      // CRITICAL: Always copy to permanent storage, even if source appears permanent
      // This ensures we have a consistent path structure
      const mediaAsset = await this._copyAndStoreImage(sourcePath, ownerType, ownerId);
      
      // CRITICAL: Verify the returned path is NOT temporary
      if (this._isTemporaryPath(mediaAsset.localPath)) {
        throw new Error(`Import failed: returned path is still temporary: ${mediaAsset.localPath}`);
      }
      
      console.log('[MediaService] External image imported successfully:', {
        sourcePath,
        permanentPath: mediaAsset.localPath,
        isPermanent: !this._isTemporaryPath(mediaAsset.localPath),
      });
      
      return mediaAsset;
    } catch (error) {
      console.error('[MediaService] Failed to import external image:', error);
      throw new Error(`Failed to import external image: ${error.message}`);
    }
  }
}

// Initialize on module load
MediaService.initialize().catch((error) => {
  console.error('[MediaService] Failed to initialize on module load:', error);
});

export default MediaService;

