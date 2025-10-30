import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';
import { AVATARS } from '../data/avatars.js';

export const lightColors = {
  background: '#FFFFFF',
  text: '#121212',
  card: '#F5F5F5',
  primary: '#007AFF',
  border: '#DDDDDD',
};

export const darkColors = {
  background: '#121212',
  text: '#FFFFFF',
  card: '#1E1E1E',
  primary: '#0A84FF',
  border: '#2C2C2E',
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
    const loadAvatarPreferences = async () => {
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
      } finally {
        setIsLoading(false);
      }
    };
    loadAvatarPreferences();
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