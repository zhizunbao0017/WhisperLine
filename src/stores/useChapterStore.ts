// src/stores/useChapterStore.ts
// Zustand store for Chapter management with data migration support
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chapter, ChapterType, ChapterStatus } from '../types';

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

// Helper function to generate unique ID
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `chapter-${timestamp}-${random}`;
};

/**
 * Chapter Store Interface
 */
interface ChapterStore {
  chapters: Chapter[];
  
  // Actions
  addChapter: (chapter: Omit<Chapter, 'id' | 'createdAt'>) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  archiveChapter: (id: string) => void;
  getChapterById: (id: string) => Chapter | undefined;
  getChaptersByType: (type: ChapterType) => Chapter[];
  getChaptersByStatus: (status: ChapterStatus) => Chapter[];
}

/**
 * Data migration function
 * Migrates old Chapter data to new schema with default values
 */
const migrateChapterData = (oldChapter: any): Chapter => {
  // If already in new format, return as-is
  if (oldChapter.type && oldChapter.status && typeof oldChapter.createdAt === 'number') {
    return {
      ...oldChapter,
      // Ensure all optional fields exist
      description: oldChapter.description || undefined,
      coverImage: oldChapter.coverImage || undefined,
      startDate: oldChapter.startDate || undefined,
      endDate: oldChapter.endDate || undefined,
      linkedFocusId: oldChapter.linkedFocusId || undefined,
      entryIds: oldChapter.entryIds || [],
      lastUpdated: oldChapter.lastUpdated || undefined,
      sourceId: oldChapter.sourceId || undefined,
      keywords: oldChapter.keywords || undefined,
    };
  }
  
  // Migrate from old format
  const migrated: Chapter = {
    id: oldChapter.id || generateId(),
    title: oldChapter.title || 'Untitled Chapter',
    createdAt: oldChapter.createdAt 
      ? (typeof oldChapter.createdAt === 'number' 
          ? oldChapter.createdAt 
          : new Date(oldChapter.createdAt).getTime())
      : Date.now(),
    
    // Map old type to new type
    type: oldChapter.type === 'companion' 
      ? 'relationship' // Map 'companion' to 'relationship'
      : (oldChapter.type === 'theme' 
          ? 'theme' 
          : 'theme'), // Default to 'theme' for unknown types
    
    // Default status to 'ongoing'
    status: oldChapter.status || 'ongoing',
    
    // Preserve optional fields if they exist
    description: oldChapter.description || undefined,
    coverImage: oldChapter.coverImage || undefined,
    
    // Migrate dates if they exist
    startDate: oldChapter.startDate 
      ? (typeof oldChapter.startDate === 'number' 
          ? oldChapter.startDate 
          : new Date(oldChapter.startDate).getTime())
      : undefined,
    endDate: oldChapter.endDate 
      ? (typeof oldChapter.endDate === 'number' 
          ? oldChapter.endDate 
          : new Date(oldChapter.endDate).getTime())
      : undefined,
    
    // Map old sourceId to linkedFocusId if type is relationship
    linkedFocusId: oldChapter.type === 'companion' && oldChapter.sourceId
      ? oldChapter.sourceId
      : (oldChapter.linkedFocusId || undefined),
    
    // Preserve legacy fields for backward compatibility
    entryIds: oldChapter.entryIds || [],
    lastUpdated: oldChapter.lastUpdated || undefined,
    sourceId: oldChapter.sourceId || undefined,
    keywords: oldChapter.keywords || undefined,
  };
  
  return migrated;
};

/**
 * Chapter Store with persistence and data migration
 */
export const useChapterStore = create<ChapterStore>()(
  persist(
    (set, get) => ({
      chapters: [],

      // Add new Chapter (supports new fields)
      addChapter: (chapter: Omit<Chapter, 'id' | 'createdAt'>) => {
        set((state) => ({
          chapters: [
            ...state.chapters,
            {
              ...chapter,
              id: generateId(),
              createdAt: Date.now(),
              // Ensure default values are safe
              status: chapter.status || 'ongoing',
              type: chapter.type || 'theme',
            },
          ],
        }));
      },

      // Update Chapter
      updateChapter: (id: string, updates: Partial<Chapter>) => {
        set((state) => ({
          chapters: state.chapters.map((c) => 
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      // Delete Chapter
      deleteChapter: (id: string) => {
        set((state) => ({
          chapters: state.chapters.filter((c) => c.id !== id),
        }));
      },

      // Archive Chapter (core ritual function)
      archiveChapter: (id: string) => {
        set((state) => ({
          chapters: state.chapters.map((c) => 
            c.id === id 
              ? { 
                  ...c, 
                  status: 'archived' as ChapterStatus, 
                  endDate: Date.now() 
                } 
              : c
          ),
        }));
      },

      // Get Chapter by ID
      getChapterById: (id: string) => {
        return get().chapters.find((c) => c.id === id);
      },

      // Get Chapters by type
      getChaptersByType: (type: ChapterType) => {
        return get().chapters.filter((c) => c.type === type);
      },

      // Get Chapters by status
      getChaptersByStatus: (status: ChapterStatus) => {
        return get().chapters.filter((c) => c.status === status);
      },
    }),
    {
      name: 'whisperline-chapters-storage',
      storage: createJSONStorage(() => asyncStorage),
      
      // CRITICAL: Data migration logic
      // When reading old data, automatically populate new fields to prevent crashes
      onRehydrateStorage: () => (state) => {
        if (state && state.chapters) {
          console.log('[ChapterStore] 🔄 Migrating chapter data...');
          let migrationCount = 0;
          
          state.chapters = state.chapters.map((chapter: any) => {
            // Check if migration is needed
            const needsMigration = !chapter.type || !chapter.status || typeof chapter.createdAt !== 'number';
            
            if (needsMigration) {
              migrationCount++;
              console.log(`[ChapterStore] Migrating chapter: ${chapter.id || 'unknown'} - ${chapter.title || 'Untitled'}`);
            }
            
            return migrateChapterData(chapter);
          });
          
          if (migrationCount > 0) {
            console.log(`[ChapterStore] ✅ Migrated ${migrationCount} chapters to new schema`);
          } else {
            console.log('[ChapterStore] ✅ All chapters already in new format');
          }
        }
      },
    }
  )
);

export default useChapterStore;

