import type { ThemeName } from '@/constants/themes';

export interface UserPreferences {
  /**
   * Current active theme ID selected by the user.
   * Example: 'default', 'child', 'cyberpunk', 'mature', 'elegant'.
   */
  activeTheme: ThemeName | null;
  /**
   * Reserved for future preference flags.
   */
  hasCompletedOnboarding?: boolean | null;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  activeTheme: null,
  hasCompletedOnboarding: null,
};

export const USER_PREFERENCES_STORAGE_KEY = '@WhisperLine:userPreferences';

export const parseUserPreferences = (raw: unknown): UserPreferences => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  const data = raw as Partial<UserPreferences>;
  return {
    activeTheme:
      typeof data.activeTheme === 'string' ? (data.activeTheme as ThemeName) : DEFAULT_USER_PREFERENCES.activeTheme,
    hasCompletedOnboarding:
      typeof data.hasCompletedOnboarding === 'boolean' ? data.hasCompletedOnboarding : DEFAULT_USER_PREFERENCES.hasCompletedOnboarding,
  };
};

export const serializeUserPreferences = (preferences: UserPreferences): string => {
  const payload: UserPreferences = {
    activeTheme: preferences.activeTheme ?? DEFAULT_USER_PREFERENCES.activeTheme,
    hasCompletedOnboarding:
      preferences.hasCompletedOnboarding ?? DEFAULT_USER_PREFERENCES.hasCompletedOnboarding,
  };
  return JSON.stringify(payload);
};

export const mergeUserPreferences = (
  existing: UserPreferences | null | undefined,
  updates: Partial<UserPreferences>
): UserPreferences => {
  const base = existing ? parseUserPreferences(existing) : { ...DEFAULT_USER_PREFERENCES };
  return {
    ...base,
    ...updates,
    activeTheme:
      updates.activeTheme !== undefined
        ? updates.activeTheme
        : base.activeTheme ?? DEFAULT_USER_PREFERENCES.activeTheme,
  };
};

