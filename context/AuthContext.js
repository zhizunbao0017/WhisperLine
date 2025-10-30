// context/AuthContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useEffect, useState } from 'react';

const LOCK_ENABLED_KEY = '@MyAIDiary:isLockEnabled';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. 默认启用锁，但允许被AsyncStorage覆盖
  const [isLockEnabled, setIsLockEnabled] = useState(true);
  
  // 2. 关键：isUnlocked的初始值取决于isLockEnabled
  // 如果锁是禁用的，那App天生就是“已解锁”状态
  const [isUnlocked, setIsUnlocked] = useState(!isLockEnabled);
  
  const [isLoading, setIsLoading] = useState(true);

  // 3. 在App启动时，从AsyncStorage加载用户的偏好设置
  useEffect(() => {
    const loadLockPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
        // 如果存储中有值，就用它来更新状态
        if (storedPreference !== null) {
          const isEnabled = JSON.parse(storedPreference);
          setIsLockEnabled(isEnabled);
          // 再次根据加载到的偏好，更新isUnlocked的初始状态
          setIsUnlocked(!isEnabled); 
        }
      } catch (e) {
        console.error('Failed to load lock preference.', e);
      } finally {
        setIsLoading(false); // 加载完成
      }
    };
    loadLockPreference();
  }, []);

  const authenticate = async () => {
    // (authenticate 函数本身是正确的，保持不变)
    try {
      const results = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock My AI Diary',
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
      // 当用户关闭锁时，App应立即变为“已解锁”状态
      if (!newPreference) {
          setIsUnlocked(true);
      }
      await AsyncStorage.setItem(LOCK_ENABLED_KEY, JSON.stringify(newPreference));
    } catch (e) {
      console.error('Failed to save lock preference.', e);
    }
  };
  
  // 如果还在加载偏好设置，可以显示一个空白屏幕，避免闪烁
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