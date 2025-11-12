import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { InteractionManager } from 'react-native';
import Companion from '../models/Companion';
import { DiaryContext } from './DiaryContext';

const COMPANION_STORAGE_KEY = '@WhisperLine:companions';

export const CompanionContext = createContext(null);

const normalizeCompanion = (companion = {}) => {
  const legacySafe = companion && typeof companion === 'object'
    ? {
        ...companion,
        avatarIdentifier:
          companion.avatarIdentifier ?? companion.avatarURL ?? '',
      }
    : companion;
  return Companion.fromJSON(legacySafe).toJSON();
};

export const CompanionProvider = ({ children }) => {
  const [companions, setCompanions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const diaryContext = useContext(DiaryContext);

  const loadCompanions = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(COMPANION_STORAGE_KEY);
      if (!stored) {
        setCompanions([]);
        return;
      }

      const parsed = JSON.parse(stored);
      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeCompanion)
        : [];
      setCompanions(normalized);
    } catch (error) {
      console.error('Failed to load companions', error);
      setCompanions([]);
    }
  }, []);

  const persistCompanions = useCallback(async (nextCompanions) => {
    try {
      await AsyncStorage.setItem(
        COMPANION_STORAGE_KEY,
        JSON.stringify(nextCompanions)
      );
    } catch (error) {
      console.error('Failed to persist companions', error);
    }
  }, []);

  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      await loadCompanions();
      setIsLoading(false);
    });
  }, [loadCompanions]);

  const addCompanion = useCallback(
    async ({ name, avatarIdentifier }) => {
      const timestamp = new Date().toISOString();
      const newCompanion = new Companion({
        name: name?.trim() || 'Unnamed Companion',
        avatarIdentifier: avatarIdentifier || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      }).toJSON();
      const next = [newCompanion, ...companions];
      setCompanions(next);
      await persistCompanions(next);
      return newCompanion;
    },
    [companions, persistCompanions]
  );

  const updateCompanion = useCallback(
    async (companionId, payload) => {
      const next = companions.map((existing) => {
        if (existing.id !== companionId) {
          return existing;
        }
        return normalizeCompanion({
          ...existing,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      });
      setCompanions(next);
      await persistCompanions(next);
    },
    [companions, persistCompanions]
  );

  const deleteCompanion = useCallback(
    async (companionId) => {
      if (!companionId) {
        return;
      }
      try {
        await diaryContext?.removeCompanionFromEntries?.(companionId);
      } catch (error) {
        console.error('Failed to detach companion from diary entries', error);
        throw error;
      }
      const next = companions.filter((item) => item.id !== companionId);
      setCompanions(next);
      await persistCompanions(next);
    },
    [companions, persistCompanions, diaryContext]
  );

  const value = useMemo(
    () => ({
      companions,
      isLoading,
      addCompanion,
      updateCompanion,
      deleteCompanion,
      reload: loadCompanions,
    }),
    [companions, isLoading, addCompanion, updateCompanion, deleteCompanion, loadCompanions]
  );

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
};

