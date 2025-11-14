import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, InteractionManager } from 'react-native';

import {
  AVAILABLE_THEMES,
  FALLBACK_THEME_NAME,
  type ThemeDefinition,
  type ThemeName,
  getThemeDefinition,
  isValidThemeName,
} from '@/constants/themes';
import { AVATARS } from '@/data/avatars';
import { persistThemeSelection, loadUserPreferences } from '@/services/userPreferences';

const SELECTED_AVATAR_STORAGE_KEY = '@selectedAvatarId';
const CUSTOM_AVATAR_URI_STORAGE_KEY = '@customAvatarUri';

type AvatarType = {
  id: string;
  type: 'system' | 'custom';
  source?: any;
  image?: string;
  name?: string;
};

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (themeName: ThemeName) => Promise<void>;
  isReady: boolean;
  hasSelectedTheme: boolean;
  definition: ThemeDefinition;
  palette: ThemeDefinition['palette'];
  colors: {
    background: string;
    card: string;
    surface: string;
    text: string;
    secondaryText: string;
    muted: string;
    primary: string;
    primaryText: string;
    accent: string;
    border: string;
    tagBackground: string;
    tagText: string;
  };
  availableThemes: ThemeDefinition[];
  selectedAvatarId: string;
  setSelectedAvatarId: (id: string) => Promise<void>;
  customAvatarUri: string | null;
  pickCustomAvatar: () => Promise<void>;
  currentAvatar: AvatarType | null;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasSelectedTheme, setHasSelectedTheme] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>(FALLBACK_THEME_NAME);
  const [selectedAvatarId, setSelectedAvatarIdState] = useState<string>('1');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateTheme = async () => {
      try {
        const preferences = await loadUserPreferences();
        const candidate = preferences.activeTheme;
        if (!cancelled) {
          if (candidate && isValidThemeName(candidate)) {
            setThemeState(candidate);
            setHasSelectedTheme(true);
          } else {
            setThemeState(FALLBACK_THEME_NAME);
            setHasSelectedTheme(false);
          }
        }
      } catch (error) {
        console.warn('ThemeProvider: failed to hydrate theme', error);
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    InteractionManager.runAfterInteractions(() => {
      hydrateTheme();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateAvatarPrefs = async () => {
      try {
        const [storedId, storedCustomUri] = await Promise.all([
          AsyncStorage.getItem(SELECTED_AVATAR_STORAGE_KEY),
          AsyncStorage.getItem(CUSTOM_AVATAR_URI_STORAGE_KEY),
        ]);

        if (cancelled) {
          return;
        }

        if (storedId && (storedId === 'custom' || AVATARS.some((avatar) => avatar.id === storedId))) {
          setSelectedAvatarIdState(storedId);
        }

        if (storedCustomUri) {
          setCustomAvatarUri(storedCustomUri);
        }
      } catch (error) {
        console.warn('ThemeProvider: failed to hydrate avatar preferences', error);
      }
    };

    InteractionManager.runAfterInteractions(() => {
      hydrateAvatarPrefs();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(
    async (themeName: ThemeName) => {
      const nextTheme = isValidThemeName(themeName) ? themeName : FALLBACK_THEME_NAME;
      setThemeState(nextTheme);
      setHasSelectedTheme(true);
      await persistThemeSelection(nextTheme);
    },
    []
  );

  const definition = useMemo(() => getThemeDefinition(theme), [theme]);
  const palette = definition.palette;

  const colors = useMemo(
    () => ({
      background: palette.background,
      card: palette.card,
      surface: palette.surface,
      text: palette.text,
      secondaryText: palette.secondaryText,
      muted: palette.muted,
      primary: palette.primary,
      primaryText: palette.primaryText,
      accent: palette.accent,
      border: palette.border,
      tagBackground: palette.tagBackground,
      tagText: palette.tagText,
    }),
    [palette]
  );

  const setSelectedAvatarId = useCallback(async (newId: string) => {
    setSelectedAvatarIdState(newId);
    try {
      await AsyncStorage.setItem(SELECTED_AVATAR_STORAGE_KEY, newId);
    } catch (error) {
      console.warn('ThemeProvider: failed to persist selected avatar id', error);
    }
  }, []);

  const pickCustomAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setCustomAvatarUri(uri);
        await AsyncStorage.setItem(CUSTOM_AVATAR_URI_STORAGE_KEY, uri);
        await setSelectedAvatarId('custom');
      }
    } catch (error) {
      console.warn('ThemeProvider: failed picking custom avatar', error);
    }
  }, [setSelectedAvatarId]);

  const currentAvatar: AvatarType | null = useMemo(() => {
    if (selectedAvatarId === 'custom' && customAvatarUri) {
      return {
        id: 'custom',
        type: 'custom',
        image: customAvatarUri,
      };
    }

    const avatar = AVATARS.find((item) => item.id === selectedAvatarId);
    if (avatar) {
      return {
        id: avatar.id,
        type: avatar.type,
        source: avatar.source,
        name: avatar.name,
      };
    }

    const fallback = AVATARS[0];
    return fallback
      ? {
          id: fallback.id,
          type: fallback.type,
          source: fallback.source,
          name: fallback.name,
        }
      : null;
  }, [customAvatarUri, selectedAvatarId]);

  if (isHydrating) {
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      />
    );
  }

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isReady: !isHydrating,
    hasSelectedTheme,
    definition,
    palette,
    colors,
    availableThemes: AVAILABLE_THEMES,
    selectedAvatarId,
    setSelectedAvatarId,
    customAvatarUri,
    pickCustomAvatar,
    currentAvatar,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

