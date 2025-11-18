// types/mediaTypes.js
// Unified media asset model for WhisperLine

/**
 * MediaAsset represents a media file (image) stored in the app's private directory
 * @typedef {Object} MediaAsset
 * @property {string} id - Unique identifier for the media asset
 * @property {'companion' | 'entry'} ownerType - Type of entity that owns this media
 * @property {string} ownerId - ID of the owning entity (companion ID or entry ID)
 * @property {string} localPath - The final, safe path inside the app's private directory (file:// URI)
 * @property {string} mimeType - MIME type of the media (e.g., 'image/jpeg', 'image/png')
 * @property {Date} createdAt - Timestamp when the media was created
 */

/**
 * @type {MediaAsset}
 */
export const MediaAsset = {
  // This is a type definition, not an actual object
  // Used for JSDoc type checking
};

