import AsyncStorage from '@react-native-async-storage/async-storage';
import ChapterRecord, { Chapter, ChapterType } from '../models/Chapter';

const CHAPTER_STORAGE_KEY = '@WhisperLine:chapters';
const COMPANION_STORAGE_KEY = '@WhisperLine:companions';

type DiaryEntryLike = {
  id: string;
  title?: string;
  content?: string;
  contentHTML?: string | null;
  companionIDs?: string[];
  createdAt?: string;
  mood?: string | null;
};

type CompanionRecord = {
  id: string;
  name?: string;
};

const THEME_KEYWORD_BANK: Array<{
  id: string;
  title: string;
  keywords: string[];
}> = [
  { id: 'work', title: 'Work', keywords: ['work', 'project', 'clients', 'deadline', 'meeting', 'office'] },
  { id: 'wellness', title: 'Wellness', keywords: ['health', 'exercise', 'fitness', 'gym', 'run', 'meditation', 'yoga'] },
  { id: 'relationships', title: 'Relationships', keywords: ['family', 'friend', 'partner', 'love', 'date', 'mom', 'dad'] },
  { id: 'learning', title: 'Learning', keywords: ['study', 'learn', 'book', 'read', 'course', 'class', 'school'] },
  { id: 'travel', title: 'Travel', keywords: ['trip', 'travel', 'flight', 'hotel', 'vacation', 'journey', 'train'] },
];

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
  'my',
  'i',
  'me',
  'we',
  'our',
  'you',
  'your',
]);

const tokenize = (text?: string | null) => {
  if (!text) {
    return [];
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
};

const clampTitle = (value: string, max = 60) => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
};

const DEFAULT_GRADIENT = ['#7f53ac', '#647dee'];

const TYPE_FALLBACK_GRADIENT: Record<ChapterType, string[]> = {
  companion: ['#4facfe', '#00f2fe'],
  theme: ['#f6d365', '#fda085'],
};

type MoodGradientConfig = {
  score: number;
  gradient: string[];
};

const MOOD_GRADIENT_MAP: Record<string, MoodGradientConfig> = {
  happy: { score: 5, gradient: ['#FFD54F', '#FFAB00'] },
  excited: { score: 4.2, gradient: ['#FF4081', '#F50057'] },
  calm: { score: 3.6, gradient: ['#4FC3F7', '#29B6F6'] },
  tired: { score: 2.8, gradient: ['#B0BEC5', '#90A4AE'] },
  sad: { score: 1.6, gradient: ['#7E57C2', '#5C6BC0'] },
  angry: { score: 1, gradient: ['#EF5350', '#E53935'] },
};

const moodNameToKey = (value?: unknown) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') {
      return name.toLowerCase();
    }
  }
  return null;
};

const determineGradientByScore = (score: number): string[] => {
  const entries = Object.values(MOOD_GRADIENT_MAP).sort((a, b) => b.score - a.score);
  for (const entry of entries) {
    if (score >= entry.score - 0.4) {
      return entry.gradient;
    }
  }
  return DEFAULT_GRADIENT;
};

class ChapterService {
  private chapters: ChapterRecord[] = [];

  private isLoaded = false;

  private companionCache: Map<string, CompanionRecord> | null = null;

  private async ensureLoaded() {
    if (this.isLoaded) {
      return this.chapters;
    }
    try {
      const stored = await AsyncStorage.getItem(CHAPTER_STORAGE_KEY);
      if (!stored) {
        this.chapters = [];
      } else {
        const parsed = JSON.parse(stored);
        this.chapters = Array.isArray(parsed)
          ? parsed.map((chapter: Chapter) => ChapterRecord.fromJSON(chapter))
          : [];
      }
    } catch (error) {
      console.warn('ChapterService: failed to load chapters', error);
      this.chapters = [];
    }
    this.isLoaded = true;
    return this.chapters;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(
        CHAPTER_STORAGE_KEY,
        JSON.stringify(this.chapters.map((chapter) => chapter.toJSON()))
      );
    } catch (error) {
      console.warn('ChapterService: failed to persist chapters', error);
    }
  }

  private async ensureCompanionLookup() {
    if (this.companionCache) {
      return this.companionCache;
    }
    try {
      const raw = await AsyncStorage.getItem(COMPANION_STORAGE_KEY);
      if (!raw) {
        this.companionCache = new Map();
        return this.companionCache;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.companionCache = new Map();
        return this.companionCache;
      }
      this.companionCache = new Map(
        parsed
          .filter((item: CompanionRecord) => item && item.id)
          .map((item: CompanionRecord) => [String(item.id), item])
      );
      return this.companionCache;
    } catch (error) {
      console.warn('ChapterService: failed to load companions', error);
      this.companionCache = new Map();
      return this.companionCache;
    }
  }

  private upsertChapter({
    id,
    title,
    type,
    sourceId,
    keywords = [],
  }: {
    id: string;
    title: string;
    type: ChapterType;
    sourceId?: string;
    keywords?: string[];
  }) {
    const existing = this.chapters.find((chapter) => chapter.id === id);
    if (existing) {
      let changed = false;
      if (title && existing.title !== title) {
        existing.title = title;
        changed = true;
      }
      if (sourceId && existing.sourceId !== sourceId) {
        existing.sourceId = sourceId;
        changed = true;
      }
      if (keywords?.length) {
        const keywordSet = new Set([...(existing.keywords ?? []), ...keywords]);
        const mergedKeywords = Array.from(keywordSet);
        if (
          existing.keywords?.length !== mergedKeywords.length ||
          mergedKeywords.some((keyword, index) => keyword !== existing.keywords?.[index])
        ) {
          existing.keywords = mergedKeywords;
          changed = true;
        }
      }
      if (changed) {
        existing.touch();
      }
      return existing;
    }
    const chapter = new ChapterRecord({
      id,
      title,
      type,
      sourceId,
      keywords,
      entryIds: [],
    });
    this.chapters.push(chapter);
    return chapter;
  }

  private detectThemeChapters(entry: DiaryEntryLike) {
    const body = entry.contentHTML ?? entry.content ?? entry.title ?? '';
    const tokens = tokenize(body);
    if (!tokens.length) {
      return [];
    }

    const matched: Array<{ id: string; title: string; keywords: string[] }> = [];
    THEME_KEYWORD_BANK.forEach((theme) => {
      const hasKeyword = theme.keywords.some((keyword) => tokens.includes(keyword));
      if (hasKeyword) {
        matched.push({
          id: `theme-${theme.id}`,
          title: theme.title,
          keywords: theme.keywords,
        });
      }
    });

    if (!matched.length) {
      return [
        {
          id: 'theme-reflections',
          title: 'Reflections',
          keywords: tokens.slice(0, 5),
        },
      ];
    }
    return matched;
  }

  private ensureEntryLinked(chapter: ChapterRecord, entryId: string) {
    const linked = chapter.addEntry(entryId);
    return linked;
  }

  public async processEntry(entry: DiaryEntryLike, options: { persist?: boolean } = {}) {
    if (!entry || !entry.id) {
      return [];
    }

    const { persist = true } = options;

    await this.ensureLoaded();
    const entryId = String(entry.id);
    let chaptersTouched = false;
    let updatedChapters: ChapterRecord[] = [];

    const companionIds = Array.isArray(entry.companionIDs) ? entry.companionIDs : [];

    if (companionIds.length > 0) {
      const companionLookup = await this.ensureCompanionLookup();
      companionIds.forEach((companionIdRaw) => {
        const companionId = String(companionIdRaw);
        const companion = companionLookup.get(companionId);
        const title = companion?.name
          ? clampTitle(companion.name)
          : `With Companion ${companionId.slice(-4)}`;
        const chapter = this.upsertChapter({
          id: `companion-${companionId}`,
          title,
          type: 'companion',
          sourceId: companionId,
        });
        const linked = this.ensureEntryLinked(chapter, entryId);
        if (linked) {
          chaptersTouched = true;
        }
        updatedChapters.push(chapter);
      });
    } else {
      const themeMatches = this.detectThemeChapters(entry);
      themeMatches.forEach((theme) => {
        const chapter = this.upsertChapter({
          id: theme.id,
          title: theme.title,
          type: 'theme',
          keywords: theme.keywords,
          sourceId: theme.id,
        });
        const linked = this.ensureEntryLinked(chapter, entryId);
        if (linked) {
          chaptersTouched = true;
        }
        updatedChapters.push(chapter);
      });
    }

    if (chaptersTouched && persist) {
      await this.persist();
    }

    return updatedChapters.map((chapter) => chapter.toJSON());
  }

  public async getChapterById(id: string): Promise<Chapter | null> {
    if (!id) {
      return null;
    }
    await this.ensureLoaded();
    const found = this.chapters.find((chapter) => chapter.id === id);
    return found ? found.toJSON() : null;
  }

  public async getChapters(): Promise<Chapter[]> {
    await this.ensureLoaded();
    return this.chapters.map((chapter) => chapter.toJSON());
  }

  public async rebuildChapters(entries: DiaryEntryLike[] = []) {
    await this.ensureLoaded();
    this.chapters = [];
    await this.persist();

    for (const entry of entries) {
      await this.processEntry(entry, { persist: false });
    }

    await this.persist();
  }

  public async resetCache() {
    this.isLoaded = false;
    this.chapters = [];
    this.companionCache = null;
  }
}

const chapterService = new ChapterService();

export default chapterService;
export const getEmotionGradientForChapter = (
  chapter: Chapter,
  entries: DiaryEntryLike[] = []
): string[] => {
  if (!chapter) {
    return DEFAULT_GRADIENT;
  }

  const entryIdSet = new Set((chapter.entryIds ?? []).map((id) => String(id)));
  if (entryIdSet.size === 0) {
    return TYPE_FALLBACK_GRADIENT[chapter.type] ?? DEFAULT_GRADIENT;
  }

  const relevantMoods: MoodGradientConfig[] = [];
  entries.forEach((entry) => {
    if (!entry || !entry.id) {
      return;
    }
    if (!entryIdSet.has(String(entry.id))) {
      return;
    }
    const key = moodNameToKey(entry.mood);
    if (!key) {
      return;
    }
    const config = MOOD_GRADIENT_MAP[key];
    if (config) {
      relevantMoods.push(config);
    }
  });

  if (!relevantMoods.length) {
    return TYPE_FALLBACK_GRADIENT[chapter.type] ?? DEFAULT_GRADIENT;
  }

  const averageScore =
    relevantMoods.reduce((sum, config) => sum + config.score, 0) / relevantMoods.length;

  return determineGradientByScore(averageScore);
};

