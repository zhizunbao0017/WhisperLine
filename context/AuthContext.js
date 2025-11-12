// context/AuthContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const LOCK_ENABLED_KEY = '@MyAIDiary:isLockEnabled';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. Default lock enabled, but allow AsyncStorage to override
  const [isLockEnabled, setIsLockEnabled] = useState(true);
  
  // 2. Key: isUnlocked initial value depends on isLockEnabled
  // If lock is disabled, the app is inherently "unlocked"
  const [isUnlocked, setIsUnlocked] = useState(!isLockEnabled);
  
  const [isLoading, setIsLoading] = useState(true);

  // 3. Load user preferences from AsyncStorage on app startup
  useEffect(() => {
    // Immediately set loading to false to let UI render first
    setIsLoading(false);
    
    // Delay loading preferences to avoid blocking startup
    InteractionManager.runAfterInteractions(async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
        // If there's a value in storage, use it to update state
        if (storedPreference !== null) {
          try {
          const isEnabled = JSON.parse(storedPreference);
          setIsLockEnabled(isEnabled);
            // Update isUnlocked initial state again based on loaded preference
          setIsUnlocked(!isEnabled); 
          } catch (parseError) {
            console.error('Failed to parse lock preference:', parseError);
            // Use default value on parse failure
          }
        }
      } catch (e) {
        console.error('Failed to load lock preference.', e);
      }
    });
  }, []);

  const authenticate = async () => {
    // (authenticate function itself is correct, keep unchanged)
    try {
      const results = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock WhisperLine',
      });
      if (results.success) {
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const toggleLock = async () => {
    try {
      const newPreference = !isLockEnabled;
      setIsLockEnabled(newPreference);
      // When user disables lock, app should immediately become "unlocked"
      if (!newPreference) {
          setIsUnlocked(true);
      }
      await AsyncStorage.setItem(LOCK_ENABLED_KEY, JSON.stringify(newPreference));
    } catch (e) {
      console.error('Failed to save lock preference.', e);
    }
  };
  
  // If still loading preferences, can show a blank screen to avoid flickering
  if (isLoading) {
      return null;
  }

  const value = { isLockEnabled, isUnlocked, authenticate, toggleLock };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};