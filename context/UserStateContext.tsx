// context/UserStateContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
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
  const [userState, setUserState] = useState<UserStateModel>(createEmptyUserState());
  const [allRichEntries, setAllRichEntries] = useState<Record<string, RichEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadUserState = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load UserStateModel
      const storedState = await AsyncStorage.getItem(USER_STATE_STORAGE_KEY);
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState);
          // Ensure companions field exists for backward compatibility
          if (!parsed.companions) {
            parsed.companions = {};
          }
          setUserState(parsed);
        } catch (parseError) {
          console.warn('UserStateContext: failed to parse user state', parseError);
          setUserState(createEmptyUserState());
        }
      } else {
        // Initialize with empty state if no stored state exists
        setUserState(createEmptyUserState());
      }
      
      // Load RichEntries
      const storedRichEntries = await AsyncStorage.getItem(RICH_ENTRIES_STORAGE_KEY);
      if (storedRichEntries) {
        try {
          const parsed = JSON.parse(storedRichEntries);
          setAllRichEntries(parsed);
        } catch (parseError) {
          console.warn('UserStateContext: failed to parse rich entries', parseError);
          setAllRichEntries({});
        }
      } else {
        // Initialize with empty dictionary if no stored entries exist
        setAllRichEntries({});
      }
    } catch (error) {
      console.warn('UserStateContext: failed to load user state', error);
      setUserState(createEmptyUserState());
      setAllRichEntries({});
    } finally {
      setIsLoading(false);
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
    await loadUserState();
  }, [loadUserState]);

  useEffect(() => {
    // Delay loading to avoid blocking startup
    InteractionManager.runAfterInteractions(() => {
      loadUserState();
    });
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

  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
};

export const useUserState = (): UserStateContextValue => {
  const context = useContext(UserStateContext);
  if (!context) {
    throw new Error('useUserState must be used within UserStateProvider');
  }
  return context;
};

