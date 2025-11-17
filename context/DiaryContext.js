// context/DiaryContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { ensureAnalysis } from '../services/moodAnalysis';
import { createDiaryEntry, normalizeDiaryEntry } from '../models/DiaryEntry';
import themeAnalysisService from '../services/ThemeAnalysisService';
import achievementService from '../services/AchievementService';
import chapterService from '../services/ChapterService';
import { useUserState } from './UserStateContext';
import { pieService } from '../services/PIE/PIEService';

// Helper function to extract plain text from diary entry
// Used for PIE processing which requires plain text content
const extractTextContent = (entry) => {
  // Use content if available and not empty
  if (entry.content && entry.content.trim().length > 0) {
    // If content contains HTML, strip it
    return entry.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }
  // Otherwise use contentHTML and strip HTML tags
  if (entry.contentHTML && entry.contentHTML.trim().length > 0) {
    return entry.contentHTML.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }
  // Fallback to empty string
  return '';
};

// Helper function to extract plain text from HTML
const extractTextFromHTML = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

// Helper function to extract title from HTML content
// Used for extracting title from content for display purposes
const extractTitleFromContent = (html) => {
  if (!html) return '';
  
  // Check if content starts with <h1> tag
  const h1Match = html.match(/^<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    return extractTextFromHTML(h1Match[1]).trim();
  }
  
  // Check if content starts with <p><strong> (common title pattern)
  const strongMatch = html.match(/^<p[^>]*>\s*<strong[^>]*>(.*?)<\/strong>/i);
  if (strongMatch) {
    return extractTextFromHTML(strongMatch[1]).trim();
  }
  
  // No title found in HTML, extract from first line of plain text
  const plainText = extractTextFromHTML(html);
  const firstLine = plainText.split(/\n+/).map(line => line.trim()).find(line => line.length > 0);
  return firstLine ? firstLine.slice(0, 60) : '';
};

// Helper function to integrate title into content HTML
// Used ONLY for creating new entries
const integrateTitleIntoContent = (title, content) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  
  if (!trimmedTitle) {
    return trimmedContent;
  }
  
  // Escape HTML in title
  const escapedTitle = trimmedTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  // If content already has an h1 tag, replace it
  if (trimmedContent.match(/^<h1[^>]*>/i)) {
    return trimmedContent.replace(/^<h1[^>]*>.*?<\/h1>/i, `<h1>${escapedTitle}</h1>`);
  }
  
  // Otherwise, prepend h1 tag
  if (trimmedContent) {
    return `<h1>${escapedTitle}</h1>\n${trimmedContent}`;
  }
  
  return `<h1>${escapedTitle}</h1>`;
};

export const DiaryContext = createContext();
const DIARY_STORAGE_KEY = '@MyAIDiary:diaries';
const AI_USAGE_KEY = '@MyAIDiary:aiUsageCount';
const FREE_TRIAL_USED_KEY = '@MyAIDiary:freeTrialUsed';
const DATA_CLEANED_KEY = '@MyAIDiary:hasDataBeenCleaned';
const INCREMENTAL_THEME_BATCH = 20;

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export const DiaryProvider = ({ children }) => {
  const [diaries, setDiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Global selected date for timeline/calendar (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // ---- AI Usage Count State ----
  const [aiUsageCount, setAIUsageCount] = useState({
    date: getTodayDateString(),
    count: 0,
  });

  // ---- Free Trial Used State ----
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);

  // --- PIE Integration: Get UserState context ---
  // Note: UserStateProvider MUST be a parent of DiaryProvider in the component tree
  // This is ensured by the provider order in app/_layout.js
  // If UserStateProvider is not available, this will throw an error (which is intentional)
  const userStateContext = useUserState();

  const [themeReanalysisState, setThemeReanalysisState] = useState({
    lastRun: null,
    lastProcessed: 0,
    isRunning: false,
  });
  const themeReanalysisInFlightRef = useRef(false);

  // Load aiUsageCount from AsyncStorage on mount
  useEffect(() => {
    // Delay loading to avoid blocking startup
    InteractionManager.runAfterInteractions(async () => {
      try {
        const usageJson = await AsyncStorage.getItem(AI_USAGE_KEY);
        const today = getTodayDateString();
        if (usageJson !== null) {
          try {
          const stored = JSON.parse(usageJson);
          if (stored.date === today) {
            setAIUsageCount(stored);
          } else {
            // New day, reset count
            const reset = { date: today, count: 0 };
            setAIUsageCount(reset);
            await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(reset));
            }
          } catch (parseError) {
            console.error('Failed to parse AI usage count:', parseError);
            // Reset on parse failure
            const reset = { date: today, count: 0 };
            setAIUsageCount(reset);
          }
        } else {
          // First launch
          const initial = { date: today, count: 0 };
          setAIUsageCount(initial);
          await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(initial));
        }
      } catch (e) {
        console.error('Failed to load AI usage count.', e);
      }
    });
  }, []);

  // Load freeTrialUsed from AsyncStorage on mount
  useEffect(() => {
    // Delay loading to avoid blocking startup
    InteractionManager.runAfterInteractions(async () => {
      try {
        const freeTrialJson = await AsyncStorage.getItem(FREE_TRIAL_USED_KEY);
        if (freeTrialJson !== null) {
          try {
          setFreeTrialUsed(JSON.parse(freeTrialJson));
          } catch (parseError) {
            console.error('Failed to parse free trial status:', parseError);
            setFreeTrialUsed(false);
          }
        } else {
          // First launch, free trial not used yet
          setFreeTrialUsed(false);
        }
      } catch (e) {
        console.error('Failed to load free trial status.', e);
        setFreeTrialUsed(false);
      }
    });
  }, []);

  // Function to increment AI Usage
  const incrementAIUsage = async () => {
    try {
      const today = getTodayDateString();
      let updated;
      if (aiUsageCount.date === today) {
        updated = { ...aiUsageCount, count: aiUsageCount.count + 1 };
      } else {
        // If date changed since last update, reset count
        updated = { date: today, count: 1 };
      }
      setAIUsageCount(updated);
      await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to increment AI usage count.', e);
    }
  };

  // Function to mark free trial as used
  const markFreeTrialAsUsed = async () => {
    try {
      setFreeTrialUsed(true);
      await AsyncStorage.setItem(FREE_TRIAL_USED_KEY, JSON.stringify(true));
    } catch (e) {
      console.error('Failed to mark free trial as used.', e);
    }
  };

  useEffect(() => {
    const loadDiaries = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(DIARY_STORAGE_KEY);
        if (jsonValue !== null) {
          // Check data size, warn if too large
          const dataSize = jsonValue.length;
          if (dataSize > 10 * 1024 * 1024) { // 10MB
            console.warn(`Large diary data detected: ${(dataSize / 1024 / 1024).toFixed(2)}MB. This may cause performance issues.`);
          }
          
          // Use InteractionManager to parse after interactions complete, avoid blocking startup
          InteractionManager.runAfterInteractions(async () => {
            try {
              const parsed = JSON.parse(jsonValue);
              const normalizedEntries = Array.isArray(parsed)
                ? parsed.map((entry) => normalizeDiaryEntry(entry))
                : [];
              
              // --- Data cleanup logic: remove old diaries containing Base64 images ---
              const hasBeenCleaned = await AsyncStorage.getItem(DATA_CLEANED_KEY);
              
              if (!hasBeenCleaned) {
                console.log('Starting data cleanup: removing diaries with Base64 images...');
                
                const cleanedDiaries = normalizedEntries.filter((diary) => {
                  // Check diary.content field: prioritize content, fallback to contentHTML for backward compatibility
                  const content = diary.content || diary.contentHTML || '';
                  
                  // If content length is less than 1000 characters, keep (likely plain text)
                  if (content.length <= 1000) {
                    return true;
                  }
                  
                  // Check if contains Base64 image characteristic strings
                  const hasBase64Image = 
                    content.includes('data:image/') && 
                    content.includes('base64,');
                  
                  if (hasBase64Image) {
                    console.log(`Removing diary with Base64 image: ${diary.title || diary.id}`);
                    return false; // Filter out diaries containing Base64
                  }
                  
                  // Doesn't contain Base64, keep
                  return true;
                });
                
                const analyzedCleaned = cleanedDiaries.map(ensureAnalysis);

                // Save cleaned data
                if (cleanedDiaries.length !== normalizedEntries.length) {
                  const removedCount = normalizedEntries.length - cleanedDiaries.length;
                  console.log(`Data cleanup complete: removed ${removedCount} diary entries with Base64 images.`);
                  
                  // Update state and storage
                  setDiaries(analyzedCleaned);
                  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(analyzedCleaned));
                  
                  // Mark cleanup as complete
                  await AsyncStorage.setItem(DATA_CLEANED_KEY, 'true');
                } else {
                  // No data to clean, set directly
                  setDiaries(analyzedCleaned);
                  // Mark cleanup as complete (even if no data needed cleaning)
                  await AsyncStorage.setItem(DATA_CLEANED_KEY, 'true');
                }
              } else {
                // Already cleaned, ensure analysis metadata exists for every diary
                const analyzed = normalizedEntries.map(ensureAnalysis);
                const analysisUpdated = analyzed.some((entry, index) => {
                  const existing = normalizedEntries[index];
                  const existingVersion = existing?.analysis?.version ?? null;
                  const newVersion = analyzed[index]?.analysis?.version ?? null;
                  return existingVersion !== newVersion;
                });

                setDiaries(analyzed);

                if (analysisUpdated) {
                  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(analyzed));
                }
              }
            } catch (parseError) {
              console.error('Failed to parse diaries JSON:', parseError);
              // If parsing fails, set to empty array to avoid crash
              setDiaries([]);
            }
          });
        }
      } catch (e) {
        console.error('Failed to load diaries.', e);
        // Ensure loading is set to false even on error
        setDiaries([]);
      } finally {
        // Immediately set loading to false to let UI render first
        setIsLoading(false);
      }
    };
    loadDiaries();
  }, []);

  // Encapsulate a function to save updated diary array to AsyncStorage
  const saveDiariesToStorage = useCallback(async (updatedDiaries) => {
    try {
      await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(updatedDiaries));
    } catch (e) {
      console.error('Failed to save diaries.', e);
    }
  }, []);

  const removeCompanionFromEntries = useCallback(
    async (companionId) => {
      if (!companionId) {
        return { changed: false, diaries };
      }
      const stringId = String(companionId);
      let changed = false;
      const updatedDiaries = diaries.map((entry) => {
        const normalized = normalizeDiaryEntry(entry);
        const filtered = normalized.companionIDs.filter((id) => String(id) !== stringId);
        if (filtered.length !== normalized.companionIDs.length) {
          changed = true;
          return {
            ...normalized,
            companionIDs: filtered,
          };
        }
        return normalized;
      });

      if (changed) {
        setDiaries(updatedDiaries);
        await saveDiariesToStorage(updatedDiaries);
      }

      return { changed, diaries: updatedDiaries };
    },
    [diaries, saveDiariesToStorage]
  );

  const applyThemeEntryUpdates = useCallback(
    async (updatedEntries = []) => {
      if (!updatedEntries || updatedEntries.length === 0) {
        return 0;
      }
      const updatesMap = new Map(
        updatedEntries.map((entry) => [String(entry.id), normalizeDiaryEntry(entry)])
      );
      const nextDiaries = diaries.map((entry) => updatesMap.get(String(entry.id)) ?? entry);
      let changed = false;
      for (let i = 0; i < diaries.length; i += 1) {
        if (nextDiaries[i] !== diaries[i]) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        return 0;
      }
      setDiaries(nextDiaries);
      await saveDiariesToStorage(nextDiaries);
      return updatedEntries.length;
    },
    [diaries, saveDiariesToStorage]
  );

  // --- THE NEW UNIFIED SAVE FUNCTION ---
  // This function intelligently determines whether to create or update an entry
  // and applies the correct data processing path
  const saveDiary = async (data) => {
    const { entryId, htmlContent, selectedMood, weather, companionIDs, themeID, createdAt } = data;
    
    let entryToProcess;
    let updatedDiaries;
    
    if (entryId) {
      // --- UPDATE PATH ---
      console.log(`[DiaryContext] Updating entry: ${entryId}`);
      
      // Find the existing entry
      const existingEntry = diaries.find(d => d.id === entryId);
      if (!existingEntry) {
        console.error(`[DiaryContext] Update failed: Entry ${entryId} not found`);
        throw new Error(`Entry ${entryId} not found`);
      }
      
      // For updates: Use content directly from editor (already contains title)
      // Do NOT re-integrate title to avoid duplication
      // Extract title from content for display purposes (for list views)
      const extractedTitle = extractTitleFromContent(htmlContent);
      
      // Create updated entry
      const baseEntry = createDiaryEntry({
        ...existingEntry,
        title: extractedTitle || existingEntry.title,
        content: htmlContent, // Use content as-is from editor
        mood: selectedMood !== undefined ? selectedMood : existingEntry.mood,
        weather: weather !== undefined ? weather : existingEntry.weather,
        companionIDs: companionIDs !== undefined ? companionIDs : existingEntry.companionIDs,
        themeID: themeID !== undefined ? themeID : existingEntry.themeID,
        updatedAt: new Date().toISOString(),
        createdAt: existingEntry.createdAt, // Preserve original creation date
      });
      
      entryToProcess = ensureAnalysis(baseEntry);
      
      // Update diaries array
      updatedDiaries = diaries.map(diary => 
        diary.id === entryId ? entryToProcess : diary
      );
      
      console.log(`[DiaryContext] Entry updated (content used as-is, no title re-integration)`);
    } else {
      // --- CREATE PATH ---
      console.log('[DiaryContext] Creating new entry...');
      
      // For creates: Extract title and integrate it into content
      const extractedTitle = extractTitleFromContent(htmlContent);
      const finalTitle = extractedTitle || 'Untitled';
      const integratedContent = integrateTitleIntoContent(finalTitle, htmlContent);
      
      // Create new entry
      const baseEntry = createDiaryEntry({
        title: finalTitle,
        content: integratedContent, // Content with title integrated
        mood: selectedMood,
        weather: weather,
        companionIDs: companionIDs || [],
        themeID: themeID || null,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      entryToProcess = ensureAnalysis(baseEntry);
      
      // Check for duplicates
      const duplicateCheck = diaries.find(d => d.id === entryToProcess.id);
      if (duplicateCheck) {
        console.warn('[DiaryContext] Duplicate entry detected, skipping:', entryToProcess.id);
        return duplicateCheck;
      }
      
      // Add to diaries array
      updatedDiaries = [entryToProcess, ...diaries];
      
      console.log('[DiaryContext] Entry created (title integrated into content)');
    }
    
    // --- COMMON LOGIC: Update state and storage ---
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
    
    // --- Process with chapter service ---
    try {
      await chapterService.processEntry(entryToProcess);
    } catch (error) {
      console.warn('DiaryContext: chapter classification failed (saveDiary)', error);
    }
    
    // --- Process with achievement service ---
    try {
      await achievementService.evaluate({
        diaries: updatedDiaries,
        entry: entryToProcess,
        companions: [],
      });
    } catch (error) {
      console.warn('DiaryContext: achievement evaluation failed (saveDiary)', error);
    }
    
    // --- PIE Integration: Process entry with PIE service ---
    try {
      console.log('PIE: Processing diary entry...');
      
      // Extract plain text content for PIE processing
      const textContent = extractTextContent(entryToProcess);
      
      // Convert DiaryEntry to format expected by PIE service
      const pieEntry = {
        id: entryToProcess.id,
        content: textContent,
        createdAt: entryToProcess.createdAt,
      };
      
      // Get current user state and rich entries
      const { userState, allRichEntries, updateUserState, addRichEntry } = userStateContext;
      
      // Process entry with PIE service
      // Pass the user-selected mood to ensure it takes priority over AI detection
      const moodString = entryToProcess.mood && typeof entryToProcess.mood === 'object' 
        ? entryToProcess.mood.name 
        : entryToProcess.mood;
      
      const { updatedState, richEntry } = pieService.processNewEntry(
        pieEntry,
        userState,
        allRichEntries,
        moodString || null
      );
      
      // Update user state (this will persist to AsyncStorage automatically)
      await updateUserState(updatedState);
      
      // Add/update the rich entry in the collection
      await addRichEntry(richEntry);
      
      console.log('PIE: Entry processed and user state updated.');
    } catch (error) {
      // Don't block diary saving if PIE processing fails
      console.warn('DiaryContext: PIE processing failed (saveDiary)', error);
    }
    
    return entryToProcess;
  };

  // --- Legacy functions: Keep for backward compatibility ---
  // These now call the unified saveDiary function internally
  const addDiary = async (newDiary) => {
    // Extract mood string if it's an object
    const moodString = newDiary.mood && typeof newDiary.mood === 'object' 
      ? newDiary.mood.name 
      : newDiary.mood;
    
    // Use the unified saveDiary function for new entries
    return await saveDiary({
      entryId: undefined, // No entryId means create
      htmlContent: newDiary.content || newDiary.contentHTML || '',
      selectedMood: moodString,
      weather: newDiary.weather,
      companionIDs: newDiary.companionIDs,
      themeID: newDiary.themeID,
      createdAt: newDiary.createdAt,
    });
  };

  const createQuickEntry = useCallback(
    async ({
      title,
      mood = null,
      content = '',
      weather = null,
      captureType = null,
      captureMeta = null,
      createdAt,
    }) => {
      const entry = createDiaryEntry({
        title: title ?? '',
        content,
        mood,
        weather,
        captureType,
        captureMeta,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        themeID: null,
      });
      const analyzed = ensureAnalysis(entry);
      const updatedDiaries = [analyzed, ...diaries];
      setDiaries(updatedDiaries);
      await saveDiariesToStorage(updatedDiaries);
      try {
        await chapterService.processEntry(analyzed);
      } catch (error) {
        console.warn('DiaryContext: chapter classification failed (quick entry)', error);
      }
      try {
        await achievementService.evaluate({
          diaries: updatedDiaries,
          entry: analyzed,
          companions: [],
        });
      } catch (error) {
        console.warn('DiaryContext: achievement evaluation failed (quick entry)', error);
      }

      // --- PIE Integration: Process quick entry with PIE service ---
      try {
        console.log('PIE: Processing quick entry...');
        
        // Extract plain text content for PIE processing
        const textContent = extractTextContent(analyzed);
        
        // Convert DiaryEntry to format expected by PIE service
        const pieEntry = {
          id: analyzed.id,
          content: textContent,
          createdAt: analyzed.createdAt,
        };
        
        // Get current user state and rich entries
        const { userState, allRichEntries, updateUserState, addRichEntry } = userStateContext;
        
        // Process entry with PIE service
        // Pass the user-selected mood to ensure it takes priority over AI detection
        const { updatedState, richEntry } = pieService.processNewEntry(
          pieEntry,
          userState,
          allRichEntries,
          analyzed.mood || null // Pass user-selected mood from quick entry
        );
        
        // Update user state (this will persist to AsyncStorage automatically)
        await updateUserState(updatedState);
        
        // Add the new rich entry to the collection
        await addRichEntry(richEntry);
        
        console.log('PIE: Quick entry processed and user state updated.');
      } catch (error) {
        // Don't block quick entry creation if PIE processing fails
        console.warn('DiaryContext: PIE processing failed (quick entry)', error);
      }

      return analyzed;
    },
    [diaries, saveDiariesToStorage, userStateContext]
  );

  useEffect(() => {
    if (isLoading || diaries.length === 0) {
      return;
    }

    let cancelled = false;

    const runIncremental = async () => {
      try {
        const shouldRun = await themeAnalysisService.shouldRunIncremental();
        if (!shouldRun || cancelled) {
          return;
        }
        if (themeReanalysisInFlightRef.current) {
          return;
        }
        themeReanalysisInFlightRef.current = true;
        setThemeReanalysisState((prev) => ({ ...prev, isRunning: true }));
        const result = await themeAnalysisService.processIncrementalBatch(
          diaries,
          INCREMENTAL_THEME_BATCH
        );
        if (cancelled) {
          return;
        }
        const updates = result?.updatedEntries ?? [];
        const processed = await applyThemeEntryUpdates(updates);
        setThemeReanalysisState({
          lastRun: Date.now(),
          lastProcessed: processed,
          isRunning: false,
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('DiaryContext: incremental theme analysis failed', error);
          setThemeReanalysisState((prev) => ({ ...prev, isRunning: false }));
        }
      } finally {
        themeReanalysisInFlightRef.current = false;
      }
    };

    runIncremental();

    return () => {
      cancelled = true;
    };
  }, [diaries, isLoading, applyThemeEntryUpdates]);

  // --- Legacy function: Keep for backward compatibility ---
  // This now calls the unified saveDiary function internally
  const updateDiary = async (diaryToUpdate) => {
    // Extract mood string if it's an object
    const moodString = diaryToUpdate.mood && typeof diaryToUpdate.mood === 'object' 
      ? diaryToUpdate.mood.name 
      : diaryToUpdate.mood;
    
    // Use the unified saveDiary function for updates
    return await saveDiary({
      entryId: diaryToUpdate.id,
      htmlContent: diaryToUpdate.content || diaryToUpdate.contentHTML || '',
      selectedMood: moodString,
      weather: diaryToUpdate.weather,
      companionIDs: diaryToUpdate.companionIDs,
      themeID: diaryToUpdate.themeID,
      createdAt: diaryToUpdate.createdAt,
    });
  };

  const runThemeReanalysisBatch = useCallback(
    async ({ batchSize = 60, full = false } = {}) => {
      if (themeReanalysisInFlightRef.current) {
        return { processedCount: 0, skipped: true };
      }
      themeReanalysisInFlightRef.current = true;
      setThemeReanalysisState((prev) => ({ ...prev, isRunning: true }));
      try {
        if (full) {
          const result = await themeAnalysisService.runFullReanalysis(diaries);
          const entries = Array.isArray(result?.entries) ? result.entries : [];
          if (entries.length) {
            setDiaries(entries);
            await saveDiariesToStorage(entries);
          }
          await themeAnalysisService.markReanalysisComplete();
          const processedCount = entries.length;
          setThemeReanalysisState({
            lastRun: Date.now(),
            lastProcessed: processedCount,
            isRunning: false,
          });
          return { processedCount, type: 'full' };
        }

        const result = await themeAnalysisService.processIncrementalBatch(diaries, batchSize);
        const updates = result?.updatedEntries ?? [];
        const processedCount = await applyThemeEntryUpdates(updates);
        setThemeReanalysisState({
          lastRun: Date.now(),
          lastProcessed: processedCount,
          isRunning: false,
        });
        return { processedCount, type: 'incremental' };
      } catch (error) {
        console.warn('DiaryContext: theme reanalysis failed', error);
        setThemeReanalysisState((prev) => ({ ...prev, isRunning: false }));
        throw error;
      } finally {
        themeReanalysisInFlightRef.current = false;
      }
    },
    [diaries, applyThemeEntryUpdates, saveDiariesToStorage]
  );

  // --- New function ---
  const deleteDiary = async (idToDelete) => {
    const updatedDiaries = diaries.filter(diary => diary.id !== idToDelete);
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
  };

  return (
    <DiaryContext.Provider
      value={{
        diaries,
        addDiary,
        updateDiary,
        saveDiary, // New unified function
        deleteDiary,
        isLoading,
        aiUsageCount,
        incrementAIUsage,
        selectedDate,
        setSelectedDate,
        freeTrialUsed,
        markFreeTrialAsUsed,
        removeCompanionFromEntries,
        themeReanalysisState,
        runThemeReanalysisBatch,
        createQuickEntry,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};