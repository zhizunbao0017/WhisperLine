// src/store/crmStore.ts
// Silent CRM store for tracking people and topics implicitly
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

export interface Person {
  id: string;
  name: string;
  interactionCount: number;
  lastSeen: number; // timestamp
}

export interface Topic {
  id: string;
  name: string;
  count: number;
  category: 'activity' | 'mood' | 'place' | 'social' | 'other';
}

interface CRMState {
  people: Record<string, Person>;
  topics: Record<string, Topic>;
  
  // Actions
  trackPersonInteraction: (name: string) => void;
  trackTopic: (name: string, category: Topic['category']) => void;
  getTopPeople: (limit: number) => Person[];
  getTopTopics: (limit: number, category?: Topic['category']) => Topic[];
  reset: () => void;
}

const generateId = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
};

const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      people: {},
      topics: {},

      trackPersonInteraction: (name: string) => {
        if (!name || name.trim().length === 0) return;
        
        const normalizedName = name.trim();
        const id = generateId(normalizedName);
        const now = Date.now();
        
        set((state) => {
          const existing = state.people[id];
          if (existing) {
            // Update existing person
            return {
              people: {
                ...state.people,
                [id]: {
                  ...existing,
                  interactionCount: existing.interactionCount + 1,
                  lastSeen: now,
                },
              },
            };
          } else {
            // Create new person
            return {
              people: {
                ...state.people,
                [id]: {
                  id,
                  name: normalizedName,
                  interactionCount: 1,
                  lastSeen: now,
                },
              },
            };
          }
        });
      },

      trackTopic: (name: string, category: Topic['category']) => {
        if (!name || name.trim().length === 0) return;
        
        const normalizedName = name.trim();
        const id = generateId(normalizedName);
        
        set((state) => {
          const existing = state.topics[id];
          if (existing) {
            // Update existing topic
            return {
              topics: {
                ...state.topics,
                [id]: {
                  ...existing,
                  count: existing.count + 1,
                  // Update category if provided
                  category: category || existing.category,
                },
              },
            };
          } else {
            // Create new topic
            return {
              topics: {
                ...state.topics,
                [id]: {
                  id,
                  name: normalizedName,
                  count: 1,
                  category: category || 'other',
                },
              },
            };
          }
        });
      },

      getTopPeople: (limit: number) => {
        const state = get();
        return Object.values(state.people)
          .sort((a, b) => {
            // Sort by interaction count, then by last seen
            if (b.interactionCount !== a.interactionCount) {
              return b.interactionCount - a.interactionCount;
            }
            return b.lastSeen - a.lastSeen;
          })
          .slice(0, limit);
      },

      getTopTopics: (limit: number, category?: Topic['category']) => {
        const state = get();
        let topics = Object.values(state.topics);
        
        if (category) {
          topics = topics.filter((t) => t.category === category);
        }
        
        return topics
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },

      reset: () => {
        set({
          people: {},
          topics: {},
        });
      },
    }),
    {
      name: 'whisperline-crm-storage',
      storage: createJSONStorage(() => asyncStorage),
    }
  )
);

export default useCRMStore;

