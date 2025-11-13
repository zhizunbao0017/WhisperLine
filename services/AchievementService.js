import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDiaryEntry } from '../models/DiaryEntry';

const ACHIEVEMENT_LOG_KEY = '@WhisperLine:achievementLog';
const MILESTONE_COUNTS = [1, 10, 25, 50, 100, 150, 200, 365];

const stripDate = (isoString) => {
  if (!isoString) {
    return null;
  }
  return new Date(isoString).toISOString().split('T')[0];
};

const loadAchievementLog = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENT_LOG_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('AchievementService: failed to load log', error);
    return [];
  }
};

const appendAchievementLog = async (entry) => {
  try {
    const current = await loadAchievementLog();
    const next = [entry, ...current].slice(0, 50);
    await AsyncStorage.setItem(ACHIEVEMENT_LOG_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('AchievementService: failed to persist log', error);
  }
};

class AchievementService {
  constructor() {
    this.lastCheckDate = null;
  }

  async evaluate({ diaries, entry, companions }) {
    if (!Array.isArray(diaries) || diaries.length === 0) {
      return [];
    }

    const normalizedEntry = normalizeDiaryEntry(entry);
    const achievements = [];

    const distinctDateStrings = Array.from(
      new Set(
        diaries
          .map((diary) => stripDate(diary.createdAt))
          .filter(Boolean)
      )
    ).sort();
    const streak = this.countCurrentStreak(distinctDateStrings);
    if (streak.streakAchieved) {
      achievements.push({
        id: `streak-${streak.length}`,
        type: 'streak',
        title: `Nice! ${streak.length}-day burst`,
        length: streak.length,
        occurredAt: new Date().toISOString(),
      });
    }

    const totalCount = diaries.length;
    const milestone = MILESTONE_COUNTS.find((count) => count === totalCount);
    if (milestone) {
      achievements.push({
        id: `milestone-${milestone}`,
        type: 'count',
        value: milestone,
        title: `You just logged ${milestone} entries!`,
        occurredAt: new Date().toISOString(),
      });
    }

    if (normalizedEntry.companionIDs && normalizedEntry.companionIDs.length > 0) {
      normalizedEntry.companionIDs.forEach((companionId) => {
        const relatedEntries = diaries.filter((diary) => {
          const normalized = normalizeDiaryEntry(diary);
          return normalized.companionIDs.includes(companionId);
        });
        if (relatedEntries.length === 1) {
          const companion =
            companions?.find((item) => String(item.id) === String(companionId)) ?? null;
          achievements.push({
            id: `companion-first-${companionId}`,
            type: 'companion',
            companionId,
            title: companion ? `First moment with ${companion.name}` : 'New companion moment',
            occurredAt: new Date().toISOString(),
          });
        }
      });
    }

    if (achievements.length > 0) {
      await appendAchievementLog({
        entryId: normalizedEntry.id,
        achievements,
        createdAt: new Date().toISOString(),
      });
    }

    return achievements;
  }

  countCurrentStreak(dateStrings) {
    if (!dateStrings || dateStrings.length === 0) {
      return { length: 0, streakAchieved: false };
    }

    const today = stripDate(new Date().toISOString());
    const datesSet = new Set(dateStrings);
    let streakLength = 0;
    let cursor = new Date(today);

    while (true) {
      const cursorString = cursor.toISOString().split('T')[0];
      if (datesSet.has(cursorString)) {
        streakLength += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      length: streakLength,
      streakAchieved: streakLength > 0 && streakLength % 3 === 0,
    };
  }

  async getRecentAchievements() {
    return loadAchievementLog();
  }
}

const achievementService = new AchievementService();
export default achievementService;


