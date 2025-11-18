// context/UserStateContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { UserStateModel } from '../models/UserState';
import { RichEntry } from '../models/RichEntry';
import { Companion } from '../models/PIE';

const USER_STATE_STORAGE_KEY = '@WhisperLine:userState';
const RICH_ENTRIES_STORAGE_KEY = '@WhisperLine:richEntries';

const createEmptyUserState = (): UserStateModel => {
  return {
    lastUpdatedAt: new Date().toISOString(),
    chapters: {},
    companions: {},
    storylines: [],
    focus: {
      currentFocusChapters: [],
    },
    settings: {
      isAIInteractionEnabled: false, // Default to disabled, user must opt-in
      hasSeenLongPressHint: false, // Show tutorial by default
    },
  };
};

export interface UserStateContextValue {
  userState: UserStateModel;
  allRichEntries: Record<string, RichEntry>;
  isLoading: boolean;
  updateUserState: (newState: UserStateModel) => Promise<void>;
  updateRichEntries: (richEntries: Record<string, RichEntry>) => Promise<void>;
  addRichEntry: (richEntry: RichEntry) => Promise<void>;
  refreshUserState: () => Promise<void>;
  markLongPressHintSeen: () => Promise<void>; // Helper to mark hint as seen
  // Companion management functions
  createCompanion: (name: string, tempAvatarUri?: string | null) => Promise<Companion>; // Legacy - use addCompanion instead
  addCompanion: (name: string) => Promise<Companion>; // Authoritative factory function - always creates with default avatar
  updateCompanion: (companion: Companion) => Promise<void>;
  deleteCompanion: (companionId: string) => Promise<void>;
  setPrimaryCompanion: (companionId: string | null) => Promise<void>; // Set primary companion ID
  // Import-related state
  isImporting: boolean;
  importProgress: number;
  importMessage: string;
  startImportProcess: (fileUri: string) => Promise<void>; // Start import process
}

export const UserStateContext = createContext<UserStateContextValue | null>(null);

export const UserStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- CRITICAL: App-wide loading state ---
  // This prevents any components from rendering until data is fully loaded
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  const [userState, setUserState] = useState<UserStateModel>(createEmptyUserState());
  const [allRichEntries, setAllRichEntries] = useState<Record<string, RichEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Import-related state (separate from isLoading to avoid conflicts)
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');

  const loadUserState = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('UserStateContext: Loading initial data from AsyncStorage...');
      
      // Load UserStateModel
      const storedState = await AsyncStorage.getItem(USER_STATE_STORAGE_KEY);
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState);
          // Ensure companions field exists for backward compatibility
          if (!parsed.companions) {
            parsed.companions = {};
          }
          // Ensure settings field exists for backward compatibility
          if (!parsed.settings) {
            parsed.settings = {
              isAIInteractionEnabled: false,
              hasSeenLongPressHint: false,
            };
          }
          // Ensure hasSeenLongPressHint exists for backward compatibility
          if (typeof parsed.settings.hasSeenLongPressHint === 'undefined') {
            parsed.settings.hasSeenLongPressHint = false;
          }
          // Ensure isInteractionEnabled and migrate avatar fields (backward compatibility)
          // CRITICAL: Track if state was modified during cleanup to persist sanitized data
          let stateWasModified = false;
          
          if (parsed.companions) {
            // CRITICAL: Validate and clean companions data
            // Some old companions might be missing required fields or have invalid data
            const validCompanions: Record<string, Companion> = {};
            const invalidCompanionIds: string[] = [];
            
            const allCompanionKeys = Object.keys(parsed.companions);
            console.log(`[UserStateContext] Found ${allCompanionKeys.length} companion(s) in storage:`, allCompanionKeys);
            
            Object.keys(parsed.companions).forEach((companionId) => {
              const companion = parsed.companions[companionId];
              
              // Skip null, undefined, or invalid companions
              if (!companion || typeof companion !== 'object') {
                console.warn(`[UserStateContext] ⚠️ Skipping invalid companion at key ${companionId}:`, companion);
                invalidCompanionIds.push(companionId);
                stateWasModified = true;
                return;
              }
              
              // CRITICAL: Validate required fields
              // Ensure companion has id and name (required fields)
              if (!companion.id || !companion.name || typeof companion.name !== 'string' || companion.name.trim() === '') {
                console.warn(`[UserStateContext] ⚠️ Skipping companion ${companionId} with missing required fields:`, {
                  id: companion.id,
                  name: companion.name,
                  nameType: typeof companion.name,
                  hasName: !!companion.name,
                  nameTrimmed: companion.name?.trim(),
                });
                invalidCompanionIds.push(companionId);
                stateWasModified = true;
                return;
              }
              
              // Ensure id matches the key (data integrity check)
              if (companion.id !== companionId) {
                console.warn(`[UserStateContext] ⚠️ Companion id mismatch: key=${companionId}, companion.id=${companion.id}. Using key as source of truth.`);
                companion.id = companionId; // Fix the id to match the key
                stateWasModified = true;
              }
              
              // Ensure isInteractionEnabled exists
              if (typeof companion.isInteractionEnabled === 'undefined') {
                companion.isInteractionEnabled = false;
                stateWasModified = true;
              }
              
              // Migrate legacy avatar fields to new avatar format
              // Priority: avatarIdentifier > avatarUri > avatar (if exists)
              if (!companion.avatar) {
                const legacyAvatarUri = companion.avatarIdentifier || companion.avatarUri;
                if (legacyAvatarUri && legacyAvatarUri.trim()) {
                  // CRITICAL: Check if legacy path is temporary (ImagePicker cache)
                  const isTemporary = legacyAvatarUri.includes('Caches/ImagePicker') || 
                                     legacyAvatarUri.includes('cache/ImagePicker') ||
                                     legacyAvatarUri.includes('ImagePicker');
                  
                  if (isTemporary) {
                    console.error(`[UserStateContext] ⚠️ CRITICAL: Found temporary ImagePicker cache path in companion ${companionId}!`);
                    console.error(`[UserStateContext] Temporary path: ${legacyAvatarUri}`);
                    console.error(`[UserStateContext] This companion's avatar will be cleared to prevent infinite loops.`);
                    // Don't migrate temporary paths - clear them instead
                    companion.avatar = undefined;
                    companion.avatarUri = undefined;
                    companion.avatarIdentifier = undefined;
                    // Mark state as modified so we can persist the cleaned data
                    stateWasModified = true;
                  } else {
                    // Determine if it's a lottie identifier or an image path
                    if (legacyAvatarUri.startsWith('file://') || legacyAvatarUri.startsWith('/')) {
                      // It's an image file path
                      companion.avatar = {
                        type: 'image',
                        source: legacyAvatarUri.trim(),
                      };
                    } else if (legacyAvatarUri.match(/^[1-8]$/)) {
                      // It's a lottie avatar ID (1-8)
                      companion.avatar = {
                        type: 'lottie',
                        source: legacyAvatarUri,
                      };
                    } else {
                      // Default to image if unclear
                      companion.avatar = {
                        type: 'image',
                        source: legacyAvatarUri.trim(),
                      };
                    }
                    console.log(`[UserStateContext] Migrated companion ${companionId} avatar:`, companion.avatar);
                  }
                }
              } else {
                // Avatar already exists in new format - validate it's not temporary
                const avatarSource = companion.avatar.source;
                if (avatarSource) {
                  const isTemporary = avatarSource.includes('Caches/ImagePicker') || 
                                     avatarSource.includes('cache/ImagePicker') ||
                                     avatarSource.includes('ImagePicker');
                  if (isTemporary) {
                    console.error(`[UserStateContext] ⚠️ CRITICAL: Found temporary path in companion ${companionId} avatar.source!`);
                    console.error(`[UserStateContext] Temporary path: ${avatarSource}`);
                    console.error(`[UserStateContext] Clearing avatar to prevent infinite loops.`);
                    companion.avatar = undefined;
                    // Mark state as modified so we can persist the cleaned data
                    stateWasModified = true;
                  }
                }
              }
              
              // Clean up legacy fields (keep for now for safety, but mark as deprecated)
              // We'll remove these in a future version
              
              // Add valid companion to the cleaned object
              validCompanions[companionId] = companion;
            });
            
            // CRITICAL: Replace companions with cleaned, validated data
            // This ensures only valid companions are kept
            if (invalidCompanionIds.length > 0) {
              console.log(`[UserStateContext] Removed ${invalidCompanionIds.length} invalid companions:`, invalidCompanionIds);
              parsed.companions = validCompanions;
              stateWasModified = true;
            } else {
              // Even if no invalid companions, ensure we're using the cleaned data
              parsed.companions = validCompanions;
            }
            
            // Log summary
            const companionCount = Object.keys(validCompanions).length;
            console.log(`[UserStateContext] ✅ Loaded ${companionCount} valid companion(s) from storage`);
            if (invalidCompanionIds.length > 0) {
              console.log(`[UserStateContext] ⚠️ Removed ${invalidCompanionIds.length} invalid companion(s):`, invalidCompanionIds);
            }
            // Log all valid companion names for debugging
            const companionNames = Object.values(validCompanions).map(c => c.name);
            console.log(`[UserStateContext] Valid companion names:`, companionNames);
          } else {
            console.log('[UserStateContext] No companions found in storage');
          }
          
          // CRITICAL: If state was modified during cleanup, persist the sanitized data
          if (stateWasModified) {
            console.log('[UserStateContext] ⚠️ Corrupted data was found and cleaned. Persisting the sanitized state now...');
            // Update lastUpdatedAt to reflect the data migration
            parsed.lastUpdatedAt = new Date().toISOString();
            try {
              await AsyncStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(parsed));
              console.log('[UserStateContext] ✅ Sanitized state has been successfully saved to persistent storage.');
              console.log('[UserStateContext] This was a one-time migration. Future app launches will load clean data.');
            } catch (saveError) {
              console.error('[UserStateContext] ⚠️ Failed to persist sanitized state:', saveError);
              // Continue anyway - at least the in-memory state is clean
            }
          }
          
          setUserState(parsed);
          console.log('UserStateContext: UserState loaded successfully');
        } catch (parseError) {
          console.warn('UserStateContext: failed to parse user state', parseError);
          setUserState(createEmptyUserState());
        }
      } else {
        // Initialize with empty state if no stored state exists
        setUserState(createEmptyUserState());
        console.log('UserStateContext: No stored user state found, using empty state');
      }
      
      // Load RichEntries
      const storedRichEntries = await AsyncStorage.getItem(RICH_ENTRIES_STORAGE_KEY);
      if (storedRichEntries) {
        try {
          const parsed = JSON.parse(storedRichEntries);
          setAllRichEntries(parsed);
          console.log('UserStateContext: RichEntries loaded successfully');
        } catch (parseError) {
          console.warn('UserStateContext: failed to parse rich entries', parseError);
          setAllRichEntries({});
        }
      } else {
        // Initialize with empty dictionary if no stored entries exist
        setAllRichEntries({});
        console.log('UserStateContext: No stored rich entries found, using empty dictionary');
      }
      
      console.log('UserStateContext: Initial data loaded successfully');
    } catch (error) {
      console.error('UserStateContext: failed to load user state', error);
      // Even on error, initialize with empty state so app can continue
      setUserState(createEmptyUserState());
      setAllRichEntries({});
    } finally {
      // --- CRITICAL ---
      // Set both loading states to false ONLY after all async operations complete
      setIsLoading(false);
      setIsAppLoading(false);
      console.log('UserStateContext: App loading complete');
    }
  }, []);

  const updateUserState = useCallback(async (newState: UserStateModel) => {
    try {
      setUserState(newState);
      await AsyncStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('UserStateContext: failed to save user state', error);
    }
  }, []);

  const updateRichEntries = useCallback(async (richEntries: Record<string, RichEntry>) => {
    try {
      setAllRichEntries(richEntries);
      await AsyncStorage.setItem(RICH_ENTRIES_STORAGE_KEY, JSON.stringify(richEntries));
    } catch (error) {
      console.warn('UserStateContext: failed to save rich entries', error);
    }
  }, []);

  const addRichEntry = useCallback(async (richEntry: RichEntry) => {
    try {
      const updated = { ...allRichEntries, [richEntry.id]: richEntry };
      setAllRichEntries(updated);
      await AsyncStorage.setItem(RICH_ENTRIES_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('UserStateContext: failed to add rich entry', error);
    }
  }, [allRichEntries]);

  const refreshUserState = useCallback(async () => {
    // When refreshing, we don't want to show the full-screen loader
    // Only set isAppLoading to true during initial load
    await loadUserState();
  }, [loadUserState]);

  const markLongPressHintSeen = useCallback(async () => {
    try {
      const updatedState = {
        ...userState,
        settings: {
          ...userState.settings,
          hasSeenLongPressHint: true,
        },
      };
      setUserState(updatedState);
      await AsyncStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(updatedState));
      console.log('UserStateContext: Long press hint marked as seen');
    } catch (error) {
      console.warn('UserStateContext: failed to mark long press hint as seen', error);
    }
  }, [userState]);

  /**
   * Private helper: Save state to storage immediately
   */
  const _saveStateToStorage = useCallback(async (state: UserStateModel) => {
    try {
      const stateJson = JSON.stringify(state);
      await AsyncStorage.setItem(USER_STATE_STORAGE_KEY, stateJson);
      console.log('[UserStateContext] ✅ State saved to storage:', {
        companionCount: Object.keys(state.companions || {}).length,
        companionIds: Object.keys(state.companions || {}),
      });
    } catch (error) {
      console.error('[UserStateContext] ❌ Failed to save state to storage:', error);
      throw error;
    }
  }, []);

  /**
   * AUTHORITATIVE FACTORY: Create a new companion atomically
   * This is the ONLY way to create companions in the entire app.
   * CRITICAL: Always creates a companion with a default avatar structure.
   * 
   * Steps performed atomically:
   * 1. Generate unique ID
   * 2. Create complete companion object with default avatar
   * 3. Update state immutably
   * 4. Persist to storage immediately
   * 5. Return the new companion object
   * 
   * @param name - Companion name
   * @returns The newly created companion object
   */
  const addCompanion = useCallback(async (name: string): Promise<Companion> => {
    try {
      console.log('[UserStateContext] 🚀 [AUTHORITATIVE] Starting companion creation:', {
        name: name.trim(),
      });

      // Step 1: Generate a new unique ID for the companion
      const newId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Step 2: Create the new companion object with default avatar structure
      // CRITICAL: Always have a default avatar - this ensures consistency
      const newCompanion: Companion = {
        id: newId,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        isInteractionEnabled: true, // Default to enabled
        avatar: {
          type: 'lottie',
          source: '1', // Default to first Lottie avatar (can be changed later)
        },
      };

      console.log('[UserStateContext] 📦 [AUTHORITATIVE] Created companion object:', {
        id: newCompanion.id,
        name: newCompanion.name,
        hasDefaultAvatar: !!newCompanion.avatar,
        avatarType: newCompanion.avatar?.type,
        avatarSource: newCompanion.avatar?.source,
      });

      // Step 3: Update state immutably using function式更新
      // This ensures React detects the change and triggers re-renders
      let updatedStateToSave: UserStateModel | null = null;
      
      setUserState((prevState) => {
        const updatedCompanions = {
          ...(prevState.companions || {}),
          [newId]: newCompanion,
        };

        const updatedState: UserStateModel = {
          ...prevState,
          companions: updatedCompanions,
          lastUpdatedAt: new Date().toISOString(),
        };

        // Store the state for persistence outside the callback
        updatedStateToSave = updatedState;

        console.log('[UserStateContext] 📝 [AUTHORITATIVE] Updated state object:', {
          companionCount: Object.keys(updatedCompanions).length,
          companionIds: Object.keys(updatedCompanions),
        });

        return updatedState;
      });

      // Step 4: Persist changes to storage IMMEDIATELY
      // CRITICAL: Await this to ensure persistence completes before returning
      if (updatedStateToSave) {
        try {
          await _saveStateToStorage(updatedStateToSave);
          console.log('[UserStateContext] ✅ [AUTHORITATIVE] Companion creation persisted successfully');
        } catch (saveError) {
          console.error('[UserStateContext] ❌ [AUTHORITATIVE] Failed to persist companion creation:', saveError);
          throw saveError; // Re-throw to ensure caller knows persistence failed
        }
      } else {
        console.error('[UserStateContext] ❌ [AUTHORITATIVE] Updated state is null, cannot persist');
        throw new Error('Failed to create companion: state update failed');
      }

      console.log('[UserStateContext] ✅ [AUTHORITATIVE] Companion creation complete:', {
        id: newId,
        name: name.trim(),
      });

      // Step 5: Return the new companion object
      return newCompanion;
    } catch (error) {
      console.error('[UserStateContext] ❌ [AUTHORITATIVE] Failed to create companion:', error);
      throw error;
    }
  }, [_saveStateToStorage]);

  /**
   * LEGACY: Create a new companion with a unique ID
   * @deprecated Use addCompanion instead - this function is kept for backward compatibility
   * @param name - Companion name
   * @param tempAvatarUri - Optional temporary avatar URI (will be replaced later)
   * @returns The newly created companion object
   */
  const createCompanion = useCallback(async (name: string, tempAvatarUri?: string | null): Promise<Companion> => {
    // Delegate to addCompanion for consistency
    const newCompanion = await addCompanion(name);
    
    // If tempAvatarUri is provided, update the avatar immediately
    if (tempAvatarUri && tempAvatarUri.trim()) {
      const updatedCompanion: Companion = {
        ...newCompanion,
        avatar: {
          type: 'image',
          source: tempAvatarUri.trim(),
        },
      };
      await updateCompanion(updatedCompanion);
      return updatedCompanion;
    }
    
    return newCompanion;
  }, [addCompanion, updateCompanion]);

  /**
   * Update an existing companion
   * CRITICAL: Uses function式更新 to ensure React re-renders
   * @param companion - The updated companion object
   */
  const updateCompanion = useCallback(async (companion: Companion): Promise<void> => {
    try {
      // CRITICAL: Use function式更新 to create a new state object
      // This ensures React detects the change and triggers re-renders
      setUserState((prevState) => {
        const updatedCompanions = {
          ...(prevState.companions || {}),
          [companion.id]: companion,
        };

        const updatedState: UserStateModel = {
          ...prevState,
          companions: updatedCompanions,
          lastUpdatedAt: new Date().toISOString(),
        };

        // Persist changes to storage immediately (fire and forget)
        _saveStateToStorage(updatedState).catch((error) => {
          console.error('[UserStateContext] Failed to persist companion update:', error);
        });

        console.log('[UserStateContext] Updated companion:', {
          id: companion.id,
          name: companion.name,
        });

        return updatedState;
      });
    } catch (error) {
      console.error('[UserStateContext] Failed to update companion:', error);
      throw error;
    }
  }, [_saveStateToStorage]);

  /**
   * Delete a companion
   * Handles deletion of companion and its associated media assets
   * @param companionId - ID of the companion to delete
   */
  const deleteCompanion = useCallback(async (companionId: string): Promise<void> => {
    try {
      // Import MediaService dynamically to avoid circular dependencies
      const MediaService = (await import('../services/MediaService')).default;

      // CRITICAL: Use function式更新 to create a new state object
      // This ensures React detects the change and triggers re-renders
      setUserState((prevState) => {
        // Get the companion before deletion to handle media cleanup
        const companionToDelete = prevState.companions?.[companionId];
        
        // Delete companion's avatar from storage if it exists (async, fire and forget)
        if (companionToDelete) {
          const avatarSource = companionToDelete.avatar?.source || companionToDelete.avatarUri;
          if (avatarSource && avatarSource.startsWith('file://') && companionToDelete.avatar?.type === 'image') {
            MediaService.deleteMediaAsset(avatarSource)
              .then(() => {
                console.log('[UserStateContext] Deleted companion avatar:', avatarSource);
              })
              .catch((error) => {
                console.warn('[UserStateContext] Failed to delete companion avatar:', error);
                // Continue - companion deletion succeeded even if avatar deletion fails
              });
          }
        }

        const updatedCompanions = { ...(prevState.companions || {}) };
        delete updatedCompanions[companionId];

        const updatedState: UserStateModel = {
          ...prevState,
          companions: updatedCompanions,
          lastUpdatedAt: new Date().toISOString(),
        };

        // Persist changes to storage immediately (fire and forget)
        _saveStateToStorage(updatedState).catch((error) => {
          console.error('[UserStateContext] Failed to persist companion deletion:', error);
        });

        console.log('[UserStateContext] Deleted companion:', companionId);

        return updatedState;
      });
    } catch (error) {
      console.error('[UserStateContext] Failed to delete companion:', error);
      throw error;
    }
  }, [_saveStateToStorage]);

  /**
   * Set the primary companion ID
   * Stores the primary companion ID in AsyncStorage for app-wide access
   * @param companionId - ID of the companion to set as primary, or null to clear
   */
  const setPrimaryCompanion = useCallback(async (companionId: string | null): Promise<void> => {
    try {
      if (companionId === null) {
        await AsyncStorage.removeItem('primaryCompanionID');
        console.log('[UserStateContext] Cleared primary companion');
      } else {
        await AsyncStorage.setItem('primaryCompanionID', String(companionId));
        console.log('[UserStateContext] Set primary companion:', companionId);
      }
    } catch (error) {
      console.error('[UserStateContext] Failed to set primary companion:', error);
      throw error;
    }
  }, []);

  // Import process handler
  // Note: This function is kept for interface compatibility but the actual import
  // logic is handled directly in SettingsScreen to avoid circular dependencies
  const startImportProcess = useCallback(async (fileUri: string) => {
    // This function is a placeholder - actual import is handled in SettingsScreen
    // where DiaryContext is available
    console.warn('startImportProcess called directly - use importService.startImport() from SettingsScreen instead');
    throw new Error('startImportProcess should be called with diaryContext - use importService.startImport() directly');
  }, []);

  useEffect(() => {
    // Load data immediately on mount
    // No delay - we want to block rendering until data is ready
      loadUserState();
  }, [loadUserState]);

  const value: UserStateContextValue = {
    userState,
    allRichEntries,
    isLoading,
    updateUserState,
    updateRichEntries,
    addRichEntry,
    refreshUserState,
    markLongPressHintSeen,
    // Companion management functions
    createCompanion, // Legacy - kept for backward compatibility
    addCompanion, // Authoritative factory function
    updateCompanion,
    deleteCompanion,
    setPrimaryCompanion,
    // Import-related values
    isImporting,
    importProgress,
    importMessage,
    startImportProcess,
  };

  // --- CRITICAL: Conditional Rendering ---
  // Show full-screen loader until all data is loaded
  if (isAppLoading) {
    return (
      <View style={styles.fullScreenLoader}>
        <ActivityIndicator size="large" color="#4a6cf7" />
      </View>
    );
  }

  // Only render children after data is fully loaded
  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
};

export const useUserState = (): UserStateContextValue => {
  const context = useContext(UserStateContext);
  if (!context) {
    throw new Error('useUserState must be used within UserStateProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark background - will be replaced by theme colors once app loads
  },
});

