import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../models/Theme';
import { normalizeDiaryEntry } from '../models/DiaryEntry';

const THEME_STORAGE_KEY = '@WhisperLine:themes';
const THEME_REANALYSIS_CURSOR_KEY = '@WhisperLine:themeReanalysisCursor';
const THEME_REANALYSIS_TIMESTAMP_KEY = '@WhisperLine:themeReanalysisTimestamp';
const DEFAULT_BATCH_SIZE = 20;
const REANALYSIS_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6 hours

// Minimal English stop words list; can be expanded or localized as needed.
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'then',
  'with',
  'for',
  'from',
  'into',
  'on',
  'onto',
  'in',
  'out',
  'of',
  'to',
  'at',
  'by',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'as',
  'about',
  'so',
  'very',
  'can',
  'could',
  'should',
  'would',
  'just',
  'up',
  'down',
]);

const DEFAULT_MAX_KEYWORDS = 5;
const MATCH_THRESHOLD = 0.4; // 40% overlap triggers reuse of a theme.

const tokenize = (text) => {
  if (!text) {
    return [];
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
};

const extractKeywords = (text, maxKeywords = DEFAULT_MAX_KEYWORDS) => {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return [];
  }

  const frequencyMap = new Map();
  tokens.forEach((token) => {
    frequencyMap.set(token, (frequencyMap.get(token) || 0) + 1);
  });

  return Array.from(frequencyMap.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    })
    .slice(0, maxKeywords)
    .map(([word]) => word);
};

const scoreThemeMatch = (themeKeywords, entryKeywords) => {
  if (!themeKeywords.length || !entryKeywords.length) {
    return 0;
  }
  const set = new Set(themeKeywords);
  const matches = entryKeywords.filter((keyword) => set.has(keyword));
  return matches.length / Math.max(themeKeywords.length, entryKeywords.length);
};

const generateThemeNameFromKeywords = (keywords = []) => {
  if (!keywords.length) {
    return 'Untitled Theme';
  }
  if (keywords.length === 1) {
    return keywords[0];
  }
  return keywords
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ');
};

const loadThemesFromStorage = async () => {
  try {
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((theme) => Theme.fromJSON(theme).toJSON());
  } catch (error) {
    console.warn('ThemeAnalysisService: failed to load themes', error);
    return [];
  }
};

const saveThemesToStorage = async (themes) => {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
  } catch (error) {
    console.warn('ThemeAnalysisService: failed to persist themes', error);
  }
};

class ThemeAnalysisService {
  constructor() {
    this.themes = [];
    this.isLoaded = false;
    this.reanalysisCursor = 0;
    this.lastReanalysisTs = 0;
  }

  async ensureThemesLoaded() {
    if (this.isLoaded) {
      return this.themes;
    }
    this.themes = await loadThemesFromStorage();
    this.isLoaded = true;

    try {
      const cursorRaw = await AsyncStorage.getItem(THEME_REANALYSIS_CURSOR_KEY);
      if (cursorRaw !== null) {
        const cursor = Number(cursorRaw);
        this.reanalysisCursor = Number.isFinite(cursor) ? cursor : 0;
      }
      const tsRaw = await AsyncStorage.getItem(THEME_REANALYSIS_TIMESTAMP_KEY);
      if (tsRaw !== null) {
        const tsNum = Number(tsRaw);
        this.lastReanalysisTs = Number.isFinite(tsNum) ? tsNum : 0;
      }
    } catch (error) {
      console.warn('ThemeAnalysisService: failed to load reanalysis metadata', error);
      this.reanalysisCursor = 0;
      this.lastReanalysisTs = 0;
    }
    return this.themes;
  }

  async getThemes() {
    await this.ensureThemesLoaded();
    return this.themes;
  }

  /**
   * Analyze a new or updated diary entry and associate it with an existing theme or create a new one.
   * @param {object} entry - Diary entry object (raw or normalized).
   * @returns {Promise<{ entry: object, theme: object }>} - Returns the updated entry and the theme it belongs to.
   */
  async analyzeNewEntry(entry) {
    await this.ensureThemesLoaded();
    const normalizedEntry = normalizeDiaryEntry(entry);
    const { title = '', content = '' } = normalizedEntry;
    const keywords = extractKeywords(`${title} ${content}`);

    if (keywords.length === 0) {
      return {
        entry: { ...normalizedEntry, themeID: null },
        theme: null,
      };
    }

    let bestMatch = null;
    let bestScore = 0;

    this.themes.forEach((theme) => {
      if (theme.isUserDefined) {
        return;
      }
      const score = scoreThemeMatch(theme.keywords || [], keywords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = theme;
      }
    });

    if (bestMatch && bestScore >= MATCH_THRESHOLD) {
      const updatedTheme = Theme.fromJSON({
        ...bestMatch,
        diaryEntryIDs: Array.from(
          new Set([...(bestMatch.diaryEntryIDs || []), normalizedEntry.id])
        ),
        updatedAt: new Date().toISOString(),
      }).toJSON();

      this.themes = this.themes.map((theme) =>
        theme.id === updatedTheme.id ? updatedTheme : theme
      );
      await saveThemesToStorage(this.themes);

      return {
        entry: { ...normalizedEntry, themeID: updatedTheme.id },
        theme: updatedTheme,
      };
    }

    const newTheme = new Theme({
      name: generateThemeNameFromKeywords(keywords),
      keywords,
      diaryEntryIDs: [normalizedEntry.id],
    }).toJSON();
    this.themes = [newTheme, ...this.themes];
    await saveThemesToStorage(this.themes);

    return {
      entry: { ...normalizedEntry, themeID: newTheme.id },
      theme: newTheme,
    };
  }

  /**
   * Re-run analysis on a collection of diary entries. Intended for maintenance or bulk recalculation.
   * @param {Array<object>} rawEntries - array of diary entries.
   * @returns {Promise<{ themes: Array<object>, entries: Array<object> }>} - new themes and entries with themeID assigned.
   */
  async runFullReanalysis(rawEntries = []) {
    const normalizedEntries = rawEntries.map((entry) => normalizeDiaryEntry(entry));
    const workingThemes = [];

    const assignEntry = (entry) => {
      const keywords = extractKeywords(`${entry.title || ''} ${entry.content || ''}`);
      if (keywords.length === 0) {
        return { ...entry, themeID: null };
      }

      let bestMatch = null;
      let bestScore = 0;

      workingThemes.forEach((theme) => {
        if (theme.isUserDefined) {
          return;
        }
        const score = scoreThemeMatch(theme.keywords || [], keywords);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = theme;
        }
      });

      if (bestMatch && bestScore >= MATCH_THRESHOLD) {
        bestMatch.diaryEntryIDs = Array.from(
          new Set([...(bestMatch.diaryEntryIDs || []), entry.id])
        );
        bestMatch.updatedAt = new Date().toISOString();
        return { ...entry, themeID: bestMatch.id };
      }

      const newTheme = new Theme({
        name: generateThemeNameFromKeywords(keywords),
        keywords,
        diaryEntryIDs: [entry.id],
      }).toJSON();
      workingThemes.unshift(newTheme);
      return { ...entry, themeID: newTheme.id };
    };

    const updatedEntries = normalizedEntries.map(assignEntry);
    this.themes = workingThemes;
    this.isLoaded = true;
    await saveThemesToStorage(this.themes);
    this.reanalysisCursor = 0;
    this.lastReanalysisTs = Date.now();
    await AsyncStorage.multiRemove([
      THEME_REANALYSIS_CURSOR_KEY,
      THEME_REANALYSIS_TIMESTAMP_KEY,
    ]);
    return {
      themes: this.themes,
      entries: updatedEntries,
    };
  }

  async removeEntryFromThemes(entryId, skipPersist = false) {
    if (!entryId) {
      return;
    }
    await this.ensureThemesLoaded();
    let changed = false;
    this.themes = this.themes.map((theme) => {
      if (!theme?.diaryEntryIDs?.length) {
        return theme;
      }
      const filtered = theme.diaryEntryIDs.filter((id) => String(id) !== String(entryId));
      if (filtered.length !== theme.diaryEntryIDs.length) {
        changed = true;
        return {
          ...theme,
          diaryEntryIDs: filtered,
          updatedAt: new Date().toISOString(),
        };
      }
      return theme;
    });
    if (changed && !skipPersist) {
      await saveThemesToStorage(this.themes);
    }
  }

  async assignEntryToTheme(entryId, themeId, entry = null) {
    if (!entryId) {
      return null;
    }
    await this.ensureThemesLoaded();
    await this.removeEntryFromThemes(entryId, true);

    if (!themeId) {
      await saveThemesToStorage(this.themes);
      return null;
    }

    let targetTheme = this.themes.find((theme) => String(theme.id) === String(themeId));

    if (!targetTheme) {
      if (!entry) {
        return null;
      }
      const keywords = extractKeywords(`${entry.title || ''} ${entry.content || ''}`);
      targetTheme = new Theme({
        id: themeId,
        name: generateThemeNameFromKeywords(keywords),
        keywords,
        diaryEntryIDs: [],
        isUserDefined: false,
      }).toJSON();
      this.themes = [targetTheme, ...this.themes];
    }

    const updatedTheme = {
      ...targetTheme,
      diaryEntryIDs: Array.from(
        new Set([...(targetTheme.diaryEntryIDs || []), String(entryId)])
      ),
      updatedAt: new Date().toISOString(),
    };

    this.themes = this.themes.map((theme) =>
      theme.id === updatedTheme.id ? updatedTheme : theme
    );
    await saveThemesToStorage(this.themes);
    return updatedTheme;
  }

  async renameTheme(themeId, newName) {
    await this.ensureThemesLoaded();
    if (!themeId) {
      return null;
    }
    const index = this.themes.findIndex((theme) => String(theme.id) === String(themeId));
    if (index === -1) {
      return null;
    }

    const trimmed = typeof newName === 'string' ? newName.trim() : '';
    const name = trimmed.length > 0 ? trimmed : 'Untitled Theme';
    const target = this.themes[index];
    const updatedTheme = Theme.fromJSON({
      ...target,
      name,
      isUserDefined: true,
      updatedAt: new Date().toISOString(),
    }).toJSON();

    this.themes = [
      ...this.themes.slice(0, index),
      updatedTheme,
      ...this.themes.slice(index + 1),
    ];
    await saveThemesToStorage(this.themes);
    return updatedTheme;
  }

  async shouldRunIncremental() {
    await this.ensureThemesLoaded();
    const now = Date.now();
    if (
      !Number.isFinite(this.lastReanalysisTs) ||
      now - this.lastReanalysisTs >= REANALYSIS_COOLDOWN_MS
    ) {
      return true;
    }
    return false;
  }

  async processIncrementalBatch(rawEntries = [], batchSize = DEFAULT_BATCH_SIZE) {
    await this.ensureThemesLoaded();
    if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
      return { updatedEntries: [], processedCount: 0 };
    }

    const normalizedEntries = rawEntries.map((entry) => normalizeDiaryEntry(entry));

    if (!Number.isFinite(this.reanalysisCursor) || this.reanalysisCursor < 0) {
      this.reanalysisCursor = 0;
    }

    const startIndex = this.reanalysisCursor % normalizedEntries.length;
    const batch = [];
    let index = startIndex;
    let processed = 0;
    const seenIds = new Set();

    while (processed < batchSize && seenIds.size < normalizedEntries.length) {
      const entry = normalizedEntries[index];
      if (entry && !entry.themeID) {
        batch.push(entry);
        processed += 1;
      }
      seenIds.add(entry?.id ?? `idx_${index}`);
      index = (index + 1) % normalizedEntries.length;
    }

    if (batch.length === 0) {
      this.reanalysisCursor = index;
      await AsyncStorage.multiSet([
        [THEME_REANALYSIS_CURSOR_KEY, String(this.reanalysisCursor)],
        [THEME_REANALYSIS_TIMESTAMP_KEY, String(Date.now())],
      ]);
      return { updatedEntries: [], processedCount: 0 };
    }

    const updates = await this.runFullReanalysisBatchInternal(batch);
    this.reanalysisCursor = index;
    this.lastReanalysisTs = Date.now();
    await AsyncStorage.multiSet([
      [THEME_REANALYSIS_CURSOR_KEY, String(this.reanalysisCursor)],
      [THEME_REANALYSIS_TIMESTAMP_KEY, String(this.lastReanalysisTs)],
    ]);
    await saveThemesToStorage(this.themes);

    return {
      updatedEntries: updates,
      processedCount: updates.length,
    };
  }

  async runFullReanalysisBatchInternal(entryBatch = []) {
    if (!Array.isArray(entryBatch) || entryBatch.length === 0) {
      return [];
    }

    const normalizedBatch = entryBatch.map((entry) => normalizeDiaryEntry(entry));
    const updates = [];

    normalizedBatch.forEach((entry) => {
      const keywords = extractKeywords(`${entry.title || ''} ${entry.content || ''}`);
      if (keywords.length === 0) {
        updates.push({ ...entry, themeID: null });
        return;
      }

      let bestMatch = null;
      let bestScore = 0;

      this.themes.forEach((theme) => {
        if (theme.isUserDefined) {
          return;
        }
        const score = scoreThemeMatch(theme.keywords || [], keywords);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = theme;
        }
      });

      if (bestMatch && bestScore >= MATCH_THRESHOLD) {
        bestMatch.diaryEntryIDs = Array.from(
          new Set([...(bestMatch.diaryEntryIDs || []), entry.id])
        );
        bestMatch.updatedAt = new Date().toISOString();
        updates.push({ ...entry, themeID: bestMatch.id });
      } else {
        const newTheme = new Theme({
          name: generateThemeNameFromKeywords(keywords),
          keywords,
          diaryEntryIDs: [entry.id],
        }).toJSON();
        this.themes.unshift(newTheme);
        updates.push({ ...entry, themeID: newTheme.id });
      }
    });

    return updates;
  }

  async markReanalysisComplete() {
    this.reanalysisCursor = 0;
    this.lastReanalysisTs = Date.now();
    try {
      await AsyncStorage.multiRemove([
        THEME_REANALYSIS_CURSOR_KEY,
        THEME_REANALYSIS_TIMESTAMP_KEY,
      ]);
    } catch (error) {
      console.warn('ThemeAnalysisService: failed to reset reanalysis metadata', error);
    }
  }
}

const themeAnalysisService = new ThemeAnalysisService();
export default themeAnalysisService;


