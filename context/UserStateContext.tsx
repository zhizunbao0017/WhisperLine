// context/UserStateContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { UserStateModel } from '../models/UserState';
import { RichEntry } from '../models/RichEntry';

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
            Object.keys(parsed.companions).forEach((companionId) => {
              if (parsed.companions[companionId]) {
                const companion = parsed.companions[companionId];
                
                // Ensure isInteractionEnabled exists
                if (typeof companion.isInteractionEnabled === 'undefined') {
                  companion.isInteractionEnabled = false;
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
              }
            });
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

