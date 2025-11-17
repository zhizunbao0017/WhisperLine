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
}

export const UserStateContext = createContext<UserStateContextValue | null>(null);

export const UserStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- CRITICAL: App-wide loading state ---
  // This prevents any components from rendering until data is fully loaded
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  const [userState, setUserState] = useState<UserStateModel>(createEmptyUserState());
  const [allRichEntries, setAllRichEntries] = useState<Record<string, RichEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

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
            };
          }
          // Ensure isInteractionEnabled and avatarUri exist for each companion (backward compatibility)
          if (parsed.companions) {
            Object.keys(parsed.companions).forEach((companionId) => {
              if (parsed.companions[companionId]) {
                if (typeof parsed.companions[companionId].isInteractionEnabled === 'undefined') {
                  parsed.companions[companionId].isInteractionEnabled = false;
                }
                // Migrate avatarIdentifier to avatarUri if needed
                if (parsed.companions[companionId].avatarIdentifier && !parsed.companions[companionId].avatarUri) {
                  parsed.companions[companionId].avatarUri = parsed.companions[companionId].avatarIdentifier;
                }
              }
            });
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

