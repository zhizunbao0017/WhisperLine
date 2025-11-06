// context/SubscriptionContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

export const SubscriptionContext = createContext(null);

const PRO_MEMBER_KEY = 'pro_member';

export const SubscriptionProvider = ({ children }) => {
  const [isProMember, setIsProMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Immediately set loading to false to let UI render first
    setIsLoading(false);
    
    // Delay loading subscription status to avoid blocking startup
    InteractionManager.runAfterInteractions(async () => {
      try {
        const stored = await AsyncStorage.getItem(PRO_MEMBER_KEY);
        const proStatus = stored === 'true';
        setIsProMember(proStatus);
      } catch (e) {
        console.error('Failed to load subscription status:', e);
        setIsProMember(false);
      }
    });
  }, []);

  const upgradeToPro = async () => {
    try {
      setIsProMember(true);
      await AsyncStorage.setItem(PRO_MEMBER_KEY, 'true');
      console.log('Upgraded to Pro!');
    } catch (e) {
      console.error('Failed to upgrade to Pro:', e);
    }
  };

  const downgradeFromPro = async () => {
    try {
      setIsProMember(false);
      await AsyncStorage.setItem(PRO_MEMBER_KEY, 'false');
      console.log('Downgraded from Pro');
    } catch (e) {
      console.error('Failed to downgrade from Pro:', e);
    }
  };

  const value = {
    isProMember,
    isLoading,
    upgradeToPro,
    downgradeFromPro,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
