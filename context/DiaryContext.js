// context/DiaryContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';

export const DiaryContext = createContext();
const DIARY_STORAGE_KEY = '@MyAIDiary:diaries';
const AI_USAGE_KEY = '@MyAIDiary:aiUsageCount';

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export const DiaryProvider = ({ children }) => {
  const [diaries, setDiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ---- AI Usage Count State ----
  const [aiUsageCount, setAIUsageCount] = useState({
    date: getTodayDateString(),
    count: 0,
  });

  // Load aiUsageCount from AsyncStorage on mount
  useEffect(() => {
    const loadAIUsage = async () => {
      try {
        const usageJson = await AsyncStorage.getItem(AI_USAGE_KEY);
        const today = getTodayDateString();
        if (usageJson !== null) {
          const stored = JSON.parse(usageJson);
          if (stored.date === today) {
            setAIUsageCount(stored);
          } else {
            // New day, reset count
            const reset = { date: today, count: 0 };
            setAIUsageCount(reset);
            await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(reset));
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
    };
    loadAIUsage();
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

  useEffect(() => {
    const loadDiaries = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(DIARY_STORAGE_KEY);
        if (jsonValue !== null) {
          setDiaries(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error('Failed to load diaries.', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDiaries();
  }, []);

  // 封装一个函数，用于将更新后的日记数组保存到AsyncStorage
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
      createdAt: new Date().toISOString(),
    };
    const updatedDiaries = [newEntry, ...diaries];
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
  };

  // --- 新增函数 ---
  const updateDiary = async (diaryToUpdate) => {
    const updatedDiaries = diaries.map(diary => 
      diary.id === diaryToUpdate.id ? diaryToUpdate : diary
    );
    setDiaries(updatedDiaries);
    await saveDiariesToStorage(updatedDiaries);
  };

  // --- 新增函数 ---
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
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};