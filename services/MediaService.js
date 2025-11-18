// services/MediaService.js
// Centralized media management service for WhisperLine
// Handles all image operations for companions, diary entries, and imports

// CRITICAL: Use legacy API to avoid deprecation errors
// TODO: Migrate to new File/Directory API in future Expo SDK update
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert, Linking } from 'react-native';

/**
 * MediaService - Centralized service for managing media assets
 * 
 * This service provides a unified interface for:
 * - Selecting images from the device
 * - Copying images to app's private storage
 * - Managing companion avatars
 * - Managing diary entry images
 * - Handling imported images
 * 
 * CRITICAL: This service is implemented as a Singleton Pattern to ensure
 * only one instance exists throughout the application lifecycle.
 * This prevents duplicate initializations and "evil twin" bugs.
 */
class MediaService {
  // Private storage paths (instance properties)
  COMPANIONS_MEDIA_PATH = `${FileSystem.documentDirectory}media/companions/`;
  ENTRIES_MEDIA_PATH = `${FileSystem.documentDirectory}media/entries/`;

  /**
   * Initialize the media service by ensuring storage directories exist
   * Should be called on app startup (only once, in app/_layout.js)
   * CRITICAL: This is now an instance method, not static
   */
  async initialize() {
    try {
      // CRITICAL FIX: Use modern makeDirectoryAsync API instead of deprecated getInfoAsync
      // makeDirectoryAsync automatically handles existing directories (no error if already exists)
      // This replaces the old getInfoAsync + conditional create pattern
      
      // Ensure companion media directory exists
      await FileSystem.makeDirectoryAsync(this.COMPANIONS_MEDIA_PATH, { intermediates: true });
      console.log('[MediaService] ✅ Ensured companions media directory exists');

      // Ensure entries media directory exists
      await FileSystem.makeDirectoryAsync(this.ENTRIES_MEDIA_PATH, { intermediates: true });
      console.log('[MediaService] ✅ Ensured entries media directory exists');

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
  _isTemporaryPath(path) {
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
  async _copyAndStoreImage(sourceUri, ownerType, ownerId) {
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

      // CRITICAL FIX: Use modern makeDirectoryAsync API instead of deprecated getInfoAsync
      // This single line REPLACES the old getInfoAsync logic.
      // It is the modern, correct, and robust way to ensure a directory exists.
      // makeDirectoryAsync automatically handles existing directories (no error if already exists)
      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      console.log('[MediaService] Ensured destination directory exists:', baseDir);

      // Generate unique, safe filename
      // Use our custom ID generator instead of uuidv4() to avoid crypto.getRandomValues() issues
      const timestamp = Date.now();
      const randomId = this._generateShortRandomId();
      const extension = this._getFileExtension(sourceUri);
      const filename = `${ownerId}_${timestamp}_${randomId}${extension}`;
      // CRITICAL: Ensure destinationPath is a proper file URI
      // FileSystem.documentDirectory already includes 'file://' prefix, so we just append filename
      const destinationPath = `${baseDir}${filename}`;

      console.log('[MediaService] Copying from temporary path to permanent storage:', {
        sourceUri,
        destinationPath,
        isTemporary,
      });

      // Copy file from source to destination using modern Expo FileSystem API
      // Using object format: { from, to } - this is the current recommended API
      try {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationPath,
        });
        
        // CRITICAL FIX: Removed deprecated getInfoAsync verification
        // If copyAsync succeeds without throwing an error, the file was copied successfully
        // No need to verify with getInfoAsync - copyAsync already guarantees success
        console.log('[MediaService] File copied successfully to:', destinationPath);
      } catch (copyError) {
        console.error(`[MediaService] Failed to copy file from ${sourceUri} to ${destinationPath}:`, copyError);
        throw new Error(`Failed to store image due to a file system error: ${copyError.message}`);
      }
      
      // Determine MIME type from extension
      const mimeType = this._getMimeTypeFromExtension(extension);

      // Create MediaAsset object
      // Use our custom ID generator instead of uuidv4() to avoid crypto.getRandomValues() issues
      const mediaAsset = {
        id: this._generateUniqueId(),
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
  _getFileExtension(uri) {
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
  _getMimeTypeFromExtension(extension) {
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
   * Private: Generate a unique ID without relying on crypto.getRandomValues()
   * Uses timestamp + random number + counter to ensure uniqueness
   * This is a workaround for React Native environments where crypto.getRandomValues() may not be available
   * @returns {string} Unique ID string
   */
  _generateUniqueId() {
    // Use timestamp for uniqueness
    const timestamp = Date.now().toString(36);
    
    // Generate random component using Math.random() (available in all JS environments)
    const randomPart = Math.random().toString(36).substring(2, 10);
    
    // Add a counter to prevent collisions if called multiple times in the same millisecond
    if (!this._idCounter) {
      this._idCounter = 0;
    }
    this._idCounter = (this._idCounter + 1) % 10000;
    const counterPart = this._idCounter.toString(36).padStart(4, '0');
    
    // Combine: timestamp-random-counter
    return `${timestamp}-${randomPart}-${counterPart}`;
  }

  /**
   * Private: Generate a short random ID for filenames (8 characters)
   * @returns {string} Short random ID string
   */
  _generateShortRandomId() {
    // Use timestamp + random number for short IDs
    const timestamp = Date.now().toString(36).slice(-4); // Last 4 chars of timestamp
    const randomPart = Math.random().toString(36).substring(2, 6); // 4 random chars
    
    return `${timestamp}${randomPart}`;
  }

  /**
   * Private: Request media library permission
   * 
   * IMPORTANT: This is SPECIFICALLY for Companion avatar management in MediaService.
   * Other locations in the app handle permissions independently:
   * - Each location has its own permission handling logic
   * - They don't interfere with each other
   * - This method is only used by assignCompanionImage()
   * 
   * Robust permission handling using Expo's ImagePicker API
   * @returns {Promise<boolean>} True if permission granted, false otherwise
   */
  async _requestMediaLibraryPermission() {
    try {
      console.log('[MediaService] Requesting media library permission...');

      // Request permission - this will return the current status
      // If already granted, it returns immediately without showing a dialog
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('[MediaService] Permission status:', status);

      // Handle Statuses - Expo ImagePicker uses string values: 'granted', 'denied', 'undetermined'
      if (status === 'granted') {
        // If the status is 'granted', it's all good. Return true.
        console.log('[MediaService] Media library permission granted');
        return true;
      }

      // Handle 'limited' status (iOS 14+): User granted limited access to photos
      // This is acceptable - user can still select images, just from a limited set
      if (status === 'limited') {
        console.log('[MediaService] Media library permission granted with limited access (iOS 14+)');
        return true;
      }

      // If permission was denied
      if (status === 'denied') {
        // Check if we can request again or if it's permanently denied
        // On Android, if user selected "Don't ask again", we should show settings alert
        // On iOS, if denied, we should also show settings alert
        
        Alert.alert(
          'Permission Required',
          'Photo library access is required to select images. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                } catch (error) {
                  console.error('[MediaService] Failed to open settings:', error);
                  Alert.alert(
                    'Error',
                    'Could not open settings. Please manually enable photo library access in your device settings.',
                    [{ text: 'OK' }]
                  );
                }
              },
            },
          ]
        );
        return false;
      }

      // For 'undetermined' status (shouldn't happen after request, but handle it)
      if (status === 'undetermined') {
        Alert.alert(
          'Permission Required',
          'WhisperLine needs access to your photo library to select images for companion avatars.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // For any other status, show generic alert
      console.warn('[MediaService] Unknown permission status:', status);
      Alert.alert(
        'Permission Required',
        'WhisperLine needs access to your photo library to select images.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (error) {
      console.error('[MediaService] Error requesting media library permission:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request photo library permission. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Assign an image to a companion (avatar)
   * 
   * IMPORTANT: This function is SPECIFICALLY for Companion avatar management.
   * It should NOT be confused with other image picker locations in the app:
   * - ThemeContext.tsx: pickCustomAvatar() - for theme custom avatars
   * - add-edit-diary.js: inline function - for diary entry images
   * - _layout.js: handleAddPhoto() - for quick photo addition
   * - onboarding.js: handleOpenImagePicker() - for onboarding flow
   * - CompanionListView.js: handlePickAvatar() - should use this function instead
   * 
   * Overloaded function: can launch image picker OR use provided source URI
   * @param {string} companionId - ID of the companion
   * @param {string | null} sourceUri - Optional source URI. If provided, skips ImagePicker and uses this URI directly
   * @param {object | null} currentCompanion - Optional current companion object. If provided, returns complete updated companion object
   * @returns {Promise<object | {type: 'image', source: string} | null>} 
   *   - If currentCompanion provided: Complete updated Companion object
   *   - Otherwise: CompanionAvatar object {type: 'image', source: string}
   *   - null if cancelled
   * @throws {Error} If permission denied or file operation fails
   */
  async assignCompanionImage(companionId, sourceUri = null, currentCompanion = null) {
    try {
      let finalSourceUri = sourceUri;

      // If we are picking a new image (not importing)
      if (!sourceUri) {
        // CRITICAL: Request permission before attempting to access photo library
        const hasPermission = await this._requestMediaLibraryPermission();
        if (!hasPermission) {
          // If permission is not granted, stop the process immediately.
          // The helper function already showed the necessary alert to the user.
          console.log('[MediaService] Permission denied, aborting image selection');
          return null;
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

        // Use the selected image URI
        finalSourceUri = result.assets[0].uri;
        
        // CRITICAL: Log the source URI to help debug temporary path issues
        console.log('[MediaService] ImagePicker returned URI:', finalSourceUri);
      } else {
        console.log('[MediaService] Using provided source URI:', finalSourceUri);
      }

      const isSourceTemporary = this._isTemporaryPath(finalSourceUri);
      console.log('[MediaService] Source is temporary:', isSourceTemporary);
      
      // Copy and store the image (whether from picker or provided source)
      const mediaAsset = await this._copyAndStoreImage(finalSourceUri, 'companion', companionId);

      // CRITICAL: Verify the returned path is permanent
      if (this._isTemporaryPath(mediaAsset.localPath)) {
        throw new Error(`Failed to copy to permanent storage: path is still temporary: ${mediaAsset.localPath}`);
      }

      console.log('[MediaService] Companion image assigned successfully:', {
        companionId,
        sourceUri: finalSourceUri,
        permanentPath: mediaAsset.localPath,
        isPermanent: !this._isTemporaryPath(mediaAsset.localPath),
      });

      // Create the new avatar data
      const newAvatarData = {
        type: 'image',
        source: mediaAsset.localPath, // file:// URI from MediaService - PERMANENT path
      };

      // If currentCompanion is provided, return the complete updated companion object
      // This ensures proper state synchronization
      if (currentCompanion) {
        const updatedCompanion = {
          ...currentCompanion,
          avatar: newAvatarData,
          // Remove legacy avatarUri if it exists
          avatarUri: undefined,
        };
        
        console.log('[MediaService] Returning complete updated companion object:', {
          id: updatedCompanion.id,
          name: updatedCompanion.name,
          hasAvatar: !!updatedCompanion.avatar,
        });
        
        return updatedCompanion;
      }

      // Otherwise, return just the avatar data for backward compatibility
      return newAvatarData;
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
  async deleteMediaAsset(localPath) {
    try {
      // CRITICAL FIX: Use deleteAsync with idempotent option instead of deprecated getInfoAsync
      // deleteAsync with { idempotent: true } will not throw an error if file doesn't exist
      // This replaces the old getInfoAsync + conditional delete pattern
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      console.log('[MediaService] Deleted media asset (or it was already gone):', localPath);
    } catch (error) {
      console.error('[MediaService] Failed to delete media asset:', error);
      throw new Error(`Failed to delete media asset: ${error.message}`);
    }
  }

  /**
   * Get media asset info
   * @param {string} localPath - Local path of the media asset
   * @returns {Promise<{exists: boolean, uri?: string, size?: number}>} File info
   * @deprecated This method is rarely used. Consider refactoring callers to not need file info.
   */
  async getMediaAssetInfo(localPath) {
    try {
      // CRITICAL FIX: Use new File API instead of deprecated getInfoAsync
      // Import File class dynamically to avoid issues if API changes
      const { File } = await import('expo-file-system');
      const file = new File(localPath);
      const exists = await file.exists();
      
      if (!exists) {
        return { exists: false };
      }
      
      // Get file size if available
      try {
        const stat = await file.stat();
        return {
          exists: true,
          uri: localPath,
          size: stat.size,
        };
      } catch (statError) {
        // If stat fails, return basic info
        return {
          exists: true,
          uri: localPath,
        };
      }
    } catch (error) {
      // If new API fails, return exists: false
      console.warn('[MediaService] Failed to get media asset info with new API, assuming not exists:', error);
      return { exists: false };
    }
  }

  /**
   * Copy an external image file to app storage (for imports)
   * @param {string} sourcePath - Source file path (from import)
   * @param {'companion' | 'entry'} ownerType - Type of entity owning this media
   * @param {string} ownerId - ID of the owning entity
   * @returns {Promise<MediaAsset>} MediaAsset object with permanent path
   */
  async importExternalImage(sourcePath, ownerType, ownerId) {
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

// CRITICAL: Singleton Pattern Implementation
// Create a single instance of MediaService and export it
// This ensures all imports receive the exact same instance, preventing duplicate initializations
const mediaServiceInstance = new MediaService();

// Export the singleton instance (not the class)
// All files importing MediaService will receive this same instance
export default mediaServiceInstance;

