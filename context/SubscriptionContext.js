// context/SubscriptionContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';

export const SubscriptionContext = createContext(null);

const PRO_MEMBER_KEY = 'pro_member';

export const SubscriptionProvider = ({ children }) => {
  const [isProMember, setIsProMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem(PRO_MEMBER_KEY);
        const proStatus = stored === 'true';
        setIsProMember(proStatus);
      } catch (e) {
        console.error('Failed to load subscription status:', e);
        setIsProMember(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadSubscriptionStatus();
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
