// context/DiaryContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export const DiaryContext = createContext();
const DIARY_STORAGE_KEY = '@MyAIDiary:diaries';
const AI_USAGE_KEY = '@MyAIDiary:aiUsageCount';
const FREE_TRIAL_USED_KEY = '@MyAIDiary:freeTrialUsed';
const DATA_CLEANED_KEY = '@MyAIDiary:hasDataBeenCleaned';

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
              
              // --- Data cleanup logic: remove old diaries containing Base64 images ---
              const hasBeenCleaned = await AsyncStorage.getItem(DATA_CLEANED_KEY);
              
              if (!hasBeenCleaned) {
                console.log('Starting data cleanup: removing diaries with Base64 images...');
                
                const cleanedDiaries = parsed.filter((diary) => {
                  // Check diary.content field
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
                
                // Save cleaned data
                if (cleanedDiaries.length !== parsed.length) {
                  const removedCount = parsed.length - cleanedDiaries.length;
                  console.log(`Data cleanup complete: removed ${removedCount} diary entries with Base64 images.`);
                  
                  // Update state and storage
                  setDiaries(cleanedDiaries);
                  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(cleanedDiaries));
                  
                  // Mark cleanup as complete
                  await AsyncStorage.setItem(DATA_CLEANED_KEY, 'true');
                } else {
                  // No data to clean, set directly
                  setDiaries(parsed);
                  // Mark cleanup as complete (even if no data needed cleaning)
                  await AsyncStorage.setItem(DATA_CLEANED_KEY, 'true');
                }
              } else {
                // Already cleaned, use directly
                setDiaries(parsed);
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
  const saveDiariesToStorage = async (updatedDiaries) => {
    try {
      await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(updatedDiaries));
    } catch (e) {
      console.error('Failed to save diaries.', e);
    }
  };

  const addDiary = async (newDiary) => {
    const newEntry = { 
      id: Date.now().toString(),
      ...newDiary, 
      // Respect provided createdAt (e.g., from selected calendar date); fallback to now
      createdAt: newDiary?.createdAt ?? new Date().toISOString(),
    };
    const updatedDiaries = [newEntry, ...diaries];
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
  };

  // --- New function ---
  const updateDiary = async (diaryToUpdate) => {
    const updatedDiaries = diaries.map(diary => 
      diary.id === diaryToUpdate.id ? diaryToUpdate : diary
    );
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
  };

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
        deleteDiary,
        isLoading,
        aiUsageCount,
        incrementAIUsage,
        selectedDate,
        setSelectedDate,
        freeTrialUsed,
        markFreeTrialAsUsed,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};