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
 * Robust state migration and validation logic
 * This function ensures data integrity and prevents infinite render loops
 * caused by corrupted or legacy data structures.
 * 
 * CRITICAL: This function must be synchronous as Zustand's migrate hook is synchronous.
 * Async validation against companions will be done in UserStateContext after load.
 * 
 * @param persistedState - The state loaded from AsyncStorage
 * @param version - Migration version number (unused for now, but kept for future migrations)
 * @returns Migrated and validated state object
 */
const migrateAndValidateState = (persistedState: any, version: number): any => {
  console.log('[UserStateStore] 🔄 Starting state migration and validation...');
  
  // Track if state was modified during migration
  let stateWasModified = false;
  let migratedState = persistedState ? { ...persistedState } : {};

  // Step 1: Detect and handle legacy data structures
  // Check for deprecated top-level 'companion' key (old structure)
  if (migratedState.companion && typeof migratedState.companion === 'object') {
    console.warn('[UserStateStore] ⚠️ Detected deprecated top-level "companion" key. This is legacy data.');
    console.warn('[UserStateStore] Legacy companion data:', migratedState.companion);
    
    // Try to extract companion ID from legacy structure
    const legacyCompanionId = migratedState.companion?.id || migratedState.companion?.companionId;
    
    if (legacyCompanionId && typeof legacyCompanionId === 'string') {
      // If we have a valid legacy companion ID, we could migrate it
      // But since we're moving to a unified focus model, we'll reset to default
      console.log('[UserStateStore] Found legacy companion ID:', legacyCompanionId);
      console.log('[UserStateStore] Resetting to default assistant due to legacy structure.');
    }
    
    // Remove deprecated companion key
    delete migratedState.companion;
    stateWasModified = true;
  }

  // Step 2: Validate and fix primaryCompanionId
  // Ensure primaryCompanionId exists and is a valid string
  if (!migratedState.primaryCompanionId || typeof migratedState.primaryCompanionId !== 'string') {
    console.warn('[UserStateStore] ⚠️ Invalid or missing primaryCompanionId. Resetting to default.');
    migratedState.primaryCompanionId = WHISPERLINE_ASSISTANT_ID;
    stateWasModified = true;
  } else {
    // Validate that primaryCompanionId is not empty
    const trimmedId = migratedState.primaryCompanionId.trim();
    if (trimmedId === '') {
      console.warn('[UserStateStore] ⚠️ primaryCompanionId is empty string. Resetting to default.');
      migratedState.primaryCompanionId = WHISPERLINE_ASSISTANT_ID;
      stateWasModified = true;
    } else {
      migratedState.primaryCompanionId = trimmedId;
    }
  }

  // Step 3: Clean up any legacy fields that might cause issues
  // Remove any fields that don't belong in UserState interface
  const validKeys = ['primaryCompanionId'];
  const invalidKeys: string[] = [];
  
  Object.keys(migratedState).forEach((key) => {
    if (!validKeys.includes(key)) {
      // Check if it's a known legacy field
      if (key === 'companion' || key === 'activeFocusId' || key === 'keyPeople') {
        console.warn(`[UserStateStore] ⚠️ Removing legacy field: ${key}`);
        invalidKeys.push(key);
        stateWasModified = true;
      } else {
        // Unknown field - log but don't remove (might be future extension)
        console.log(`[UserStateStore] Unknown field in state: ${key} (keeping for compatibility)`);
      }
    }
  });

  // Remove invalid keys
  invalidKeys.forEach((key) => {
    delete migratedState[key];
  });

  // Step 4: Ensure final state is valid
  const finalState = {
    primaryCompanionId: migratedState.primaryCompanionId || WHISPERLINE_ASSISTANT_ID,
  };

  if (stateWasModified) {
    console.log('[UserStateStore] ✅ State migration completed. Changes made:', {
      removedLegacyFields: invalidKeys,
      finalPrimaryCompanionId: finalState.primaryCompanionId,
    });
  } else {
    console.log('[UserStateStore] ✅ State validation passed. No changes needed.');
  }

  return finalState;
};

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
        console.log(`[UserStateStore] Setting Active Focus to: ${newId}`);
        set({ primaryCompanionId: newId });
      },
    }),
    {
      name: 'whisperline-user-state-storage',
      storage: createJSONStorage(() => asyncStorage),
      // Robust migration: ensure we always have a valid primaryCompanionId
      migrate: (persistedState: any, version: number) => {
        try {
          return migrateAndValidateState(persistedState, version);
        } catch (error) {
          console.error('[UserStateStore] ❌ Migration failed, using default state:', error);
          // Return safe default state on migration failure
          return {
            primaryCompanionId: WHISPERLINE_ASSISTANT_ID,
          };
        }
      },
    }
  )
);

export default useUserStateStore;

