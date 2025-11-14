import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeName } from '@/constants/themes';
import {
  DEFAULT_USER_PREFERENCES,
  USER_PREFERENCES_STORAGE_KEY,
  mergeUserPreferences,
  parseUserPreferences,
  serializeUserPreferences,
  type UserPreferences,
} from '@/models/UserPreferences';

export const loadUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_USER_PREFERENCES };
    }
    const parsed = JSON.parse(stored);
    return parseUserPreferences(parsed);
  } catch (error) {
    console.warn('userPreferences: failed to load preferences', error);
    return { ...DEFAULT_USER_PREFERENCES };
  }
};

export const saveUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      USER_PREFERENCES_STORAGE_KEY,
      serializeUserPreferences(preferences)
    );
  } catch (error) {
    console.warn('userPreferences: failed to save preferences', error);
  }
};

export const updateUserPreferences = async (
  updates: Partial<UserPreferences>
): Promise<UserPreferences> => {
  try {
    const current = await loadUserPreferences();
    const merged = mergeUserPreferences(current, updates);
    await saveUserPreferences(merged);
    return merged;
  } catch (error) {
    console.warn('userPreferences: failed to update preferences', error);
    return mergeUserPreferences(DEFAULT_USER_PREFERENCES, updates);
  }
};

export const persistThemeSelection = async (theme: ThemeName): Promise<UserPreferences> => {
  return updateUserPreferences({ activeTheme: theme });
};

