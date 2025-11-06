import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, useColorScheme } from 'react-native';
import { AVATARS } from '../data/avatars.js';

export const lightColors = {
  background: '#FFFFFF',
  text: '#121212',
  card: '#F5F5F5',
  primary: '#007AFF',
  border: '#DDDDDD',
          moods: {
            // High-brightness background colors based on psychological color principles (light mode)
            Happy: '#FFF9E6',      // Warm light yellow, bright and energetic
            Sad: '#E3F2FD',        // Soft light blue, calm and peaceful
            Angry: '#FFEBEE',      // Soft light red, gentle but energetic
            Calm: '#E8F5E9',       // Soft light green/mint, peaceful and serene
            Excited: '#FFF3E0',    // Bright light orange/coral, energetic
            Tired: '#F5F5F5',      // Soft light gray, calm and relaxed
          },
};

export const darkColors = {
  background: '#121212',
  text: '#FFFFFF',
  card: '#1E1E1E',
  primary: '#0A84FF',
  border: '#2C2C2E',
          moods: {
            // High-brightness background colors based on psychological color principles (dark mode)
            // Use slightly deeper colors in dark mode while maintaining high brightness and readability
            Happy: '#2A2410',      // Deep golden yellow, warm but not harsh
            Sad: '#1A2332',        // Deep blue, peaceful and soothing
            Angry: '#2A1F1F',      // Deep red, energetic but not harsh
            Calm: '#1A2A1A',       // Deep green, peaceful and serene
            Excited: '#2A1F15',    // Deep orange, energetic
            Tired: '#1F1F1F',      // Deep gray, calm and relaxed
          },
};

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(colorScheme || 'light');
  const [selectedAvatarId, setSelectedAvatarIdState] = useState('1'); // default avatar id = '1'
  const [customAvatarUri, setCustomAvatarUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to set and persist avatar ID
  const setSelectedAvatarId = async (newId) => {
    setSelectedAvatarIdState(newId);
    try {
      await AsyncStorage.setItem('@selectedAvatarId', newId);
    } catch (err) {
      console.warn('Failed to save avatar id:', err);
    }
  };

  // Load avatar ID and custom avatar URI from AsyncStorage on mount
  useEffect(() => {
    // Immediately set loading to false to let UI render first
    setIsLoading(false);
    
    // Delay loading avatar preferences to avoid blocking startup
    InteractionManager.runAfterInteractions(async () => {
      try {
        const savedId = await AsyncStorage.getItem('@selectedAvatarId');
        if (savedId && (savedId === 'custom' || AVATARS.some(avatar => avatar.id === savedId))) {
          setSelectedAvatarIdState(savedId);
        }
        const savedCustomUri = await AsyncStorage.getItem('@customAvatarUri');
        if (savedCustomUri) {
          setCustomAvatarUri(savedCustomUri);
        }
      } catch (err) {
        console.warn('Failed to load avatar preferences:', err);
      }
    });
  }, []);

  // Image picking logic for custom avatar
  const pickCustomAvatar = async () => {
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
        await AsyncStorage.setItem('@customAvatarUri', uri);
        await setSelectedAvatarId('custom'); // Also persists this
      }
    } catch (err) {
      console.warn('Error picking custom avatar:', err);
    }
  };

  let currentAvatar;
  if (selectedAvatarId === 'custom' && customAvatarUri) {
    currentAvatar = { 
      id: 'custom', 
      type: 'custom',
      image: customAvatarUri
    };
  } else {
    currentAvatar = AVATARS.find(avatar => avatar.id === selectedAvatarId) || AVATARS[0];
  }

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? lightColors : darkColors;
  const value = { 
    theme,
    toggleTheme,
    colors,
    currentAvatar,
    setSelectedAvatarId,
    pickCustomAvatar,
    customAvatarUri,
    selectedAvatarId,
  };

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      />
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};