// src/store/memoryStore.ts
// Memory Graph store for persistent memory fragments (Privacy First & Local First)
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

/**
 * Memory Fragment - Indexed memory unit extracted from diary entries
 * Used for fast retrieval and pattern recognition
 */
export interface MemoryFragment {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  entityId?: string; // Link to Companion ID or Topic ID (e.g., "person-Mike", "topic-coffee")
  text: string; // Extracted memory text (e.g., "Went surfing", "Felt anxious about work")
  mood: string; // Dominant mood at time of memory
  sourceEntryId?: string; // Optional: link to diary entry
  createdAt: number; // timestamp for sorting
}

/**
 * Fact - Legacy fact structure (kept for backward compatibility)
 */
export interface Fact {
  id: string;
  text: string;
  createdAt: number;
  sourceEntryId?: string;
}

interface MemoryState {
  // New: Memory Fragments (indexed for fast retrieval)
  items: MemoryFragment[];
  
  // Legacy: Facts (kept for backward compatibility)
  facts: Fact[];
  
  // Memory Fragment Actions
  addMemory: (fragment: Omit<MemoryFragment, 'id' | 'createdAt'>) => void;
  getMemoriesByEntity: (entityId: string, limit?: number) => MemoryFragment[];
  getRecentMemories: (limit: number) => MemoryFragment[];
  searchMemories: (query: string) => MemoryFragment[];
  clearAllMemories: () => void;
  
  // Legacy Fact Actions (backward compatibility)
  addFact: (fact: string, sourceEntryId?: string) => void;
  searchFacts: (query: string) => Fact[];
  getRecentFacts: (limit: number) => Fact[];
  removeFact: (factId: string) => void;
  clearAllFacts: () => void;
}

const generateFactId = (): string => {
  return `fact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const generateMemoryId = (): string => {
  return `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      // New: Memory Fragments
      items: [],
      
      // Legacy: Facts (backward compatibility)
      facts: [],

      // === NEW: Memory Fragment Actions ===
      addMemory: (fragment: Omit<MemoryFragment, 'id' | 'createdAt'>) => {
        if (!fragment.text || fragment.text.trim().length === 0) return;
        
        const trimmedText = fragment.text.trim();
        const now = Date.now();
        const date = fragment.date || new Date().toISOString().split('T')[0];
        
        const newMemory: MemoryFragment = {
          id: generateMemoryId(),
          date,
          entityId: fragment.entityId,
          text: trimmedText,
          mood: fragment.mood || 'neutral',
          sourceEntryId: fragment.sourceEntryId,
          createdAt: now,
        };
        
        set((state) => ({
          items: [newMemory, ...state.items], // Add to beginning (most recent first)
        }));
        
        console.log('[MemoryStore] Added memory fragment:', {
          text: trimmedText.substring(0, 50),
          entityId: fragment.entityId,
          mood: fragment.mood,
        });
      },

      getMemoriesByEntity: (entityId: string, limit: number = 10) => {
        const state = get();
        return state.items
          .filter((mem) => mem.entityId === entityId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);
      },

      getRecentMemories: (limit: number) => {
        const state = get();
        return state.items
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);
      },

      searchMemories: (query: string) => {
        if (!query || query.trim().length === 0) {
          return get().items;
        }
        
        const lowerQuery = query.toLowerCase().trim();
        const state = get();
        
        return state.items.filter((mem) =>
          mem.text.toLowerCase().includes(lowerQuery) ||
          mem.entityId?.toLowerCase().includes(lowerQuery) ||
          mem.mood.toLowerCase().includes(lowerQuery)
        );
      },

      clearAllMemories: () => {
        set({ items: [] });
        console.log('[MemoryStore] Cleared all memory fragments');
      },

      addFact: (fact: string, sourceEntryId?: string) => {
        if (!fact || fact.trim().length === 0) return;
        
        const trimmedFact = fact.trim();
        
        // Check for duplicates (case-insensitive)
        const existingFact = get().facts.find(
          (f) => f.text.toLowerCase() === trimmedFact.toLowerCase()
        );
        
        if (existingFact) {
          // Fact already exists, skip adding duplicate
          console.log('[MemoryStore] Fact already exists, skipping:', trimmedFact);
          return;
        }
        
        const newFact: Fact = {
          id: generateFactId(),
          text: trimmedFact,
          createdAt: Date.now(),
          sourceEntryId,
        };
        
        set((state) => ({
          facts: [newFact, ...state.facts], // Add to beginning (most recent first)
        }));
        
        console.log('[MemoryStore] Added fact:', trimmedFact);
      },

      searchFacts: (query: string) => {
        if (!query || query.trim().length === 0) {
          return get().facts;
        }
        
        const lowerQuery = query.toLowerCase().trim();
        const state = get();
        
        return state.facts.filter((fact) =>
          fact.text.toLowerCase().includes(lowerQuery)
        );
      },

      getRecentFacts: (limit: number) => {
        const state = get();
        return state.facts
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);
      },

      removeFact: (factId: string) => {
        set((state) => ({
          facts: state.facts.filter((f) => f.id !== factId),
        }));
        console.log('[MemoryStore] Removed fact:', factId);
      },

      clearAllFacts: () => {
        set({ facts: [] });
        console.log('[MemoryStore] Cleared all facts');
      },
    }),
    {
      name: 'whisperline-memory-storage',
      storage: createJSONStorage(() => asyncStorage),
    }
  )
);

export default useMemoryStore;

