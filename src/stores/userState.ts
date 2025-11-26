// src/stores/userState.ts
// Unified Focus Model - Zustand store for primary companion management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom storage adapter for AsyncStorage
const asyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

// Default assistant ID constant
export const WHISPERLINE_ASSISTANT_ID = 'whisperline_assistant_default';

/**
 * User State Interface
 * Represents the unified focus model state
 */
export interface UserState {
  // Primary companion ID - always a string, never null
  primaryCompanionId: string;
}

/**
 * User State Actions
 */
interface UserStateActions {
  // Set the primary companion ID
  setPrimaryCompanionId: (newId: string) => void;
}

/**
 * Combined User State Store Type
 */
type UserStateStore = UserState & UserStateActions;

/**
 * User State Store
 * Manages the primary companion focus state
 */
const useUserStateStore = create<UserStateStore>()(
  persist(
    (set) => ({
      // Initial state - always has a default companion ID
      primaryCompanionId: WHISPERLINE_ASSISTANT_ID,

      // Set primary companion ID action
      setPrimaryCompanionId: (newId: string) => {
        console.log(`Setting Active Focus to: ${newId}`);
        set({ primaryCompanionId: newId });
      },
    }),
    {
      name: 'whisperline-user-state-storage',
      storage: createJSONStorage(() => asyncStorage),
      // Migration: ensure we always have a valid primaryCompanionId
      migrate: (persistedState: any, version: number) => {
        // If persisted state exists but primaryCompanionId is null/undefined, set default
        if (!persistedState?.primaryCompanionId) {
          return {
            ...persistedState,
            primaryCompanionId: WHISPERLINE_ASSISTANT_ID,
          };
        }
        return persistedState;
      },
    }
  )
);

export default useUserStateStore;

