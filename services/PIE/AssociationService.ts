// services/PIE/AssociationService.ts
import { RichEntry } from '../../models/RichEntry';
import { Chapter, Companion, ThemeType } from '../../models/PIE';
import { UserStateModel } from '../../models/UserState';

// --- Predefined Data (can be moved to a config file later) ---
// A mock database of user's companions. In a real app, this would be loaded from user state.
const MOCK_COMPANIONS: Companion[] = [
  { id: 'comp-01', name: 'Alex' },
  { id: 'comp-02', name: 'Dr. Evelyn Reed' },
];

const THEME_KEYWORD_BANK: Record<ThemeType, string[]> = {
  work: ['work', 'project', 'clients', 'deadline', 'meeting', 'office', 'google'],
  wellness: ['health', 'exercise', 'fitness', 'gym', 'run', 'meditation', 'yoga', 'running'],
  relationships: ['family', 'friend', 'partner', 'love', 'date', 'mom', 'dad'],
  learning: ['study', 'learn', 'book', 'read', 'course', 'class', 'school'],
  travel: ['trip', 'travel', 'flight', 'hotel', 'vacation', 'journey', 'train'],
  reflections: [], // Default fallback
};

class AssociationService {
  /**
   * Associates an entry with companions based on named entities.
   * @param richEntry The enriched diary entry.
   * @param companions A list of the user's known companions.
   * @returns An array of Companion IDs that are mentioned in the entry.
   */
  public associateCompanions(richEntry: RichEntry, companions: Companion[]): string[] {
    const mentionedIds: Set<string> = new Set();
    const content = richEntry.content.toLowerCase();

    for (const companion of companions) {
      if (content.includes(companion.name.toLowerCase())) {
        mentionedIds.add(companion.id);
      }
    }
    
    // Also check the named entities for persons
    for (const entity of richEntry.metadata.entities) {
      if (entity.type === 'PERSON') {
        const foundCompanion = companions.find(c => c.name.toLowerCase() === entity.text.toLowerCase());
        if (foundCompanion) {
          mentionedIds.add(foundCompanion.id);
        }
      }
    }

    return Array.from(mentionedIds);
  }

  /**
   * Classifies an entry into one or more themes using keyword matching.
   * @param richEntry The enriched diary entry.
   * @returns An array of ThemeType strings.
   */
  public classifyThemes(richEntry: RichEntry): ThemeType[] {
    const detectedThemes: Set<ThemeType> = new Set();
    const tokens = richEntry.metadata.keywords;

    for (const token of tokens) {
      for (const [theme, keywords] of Object.entries(THEME_KEYWORD_BANK)) {
        if (keywords.includes(token)) {
          detectedThemes.add(theme as ThemeType);
        }
      }
    }

    // If no specific theme is found, classify it as 'reflections'.
    if (detectedThemes.size === 0) {
      detectedThemes.add('reflections');
    }

    return Array.from(detectedThemes);
  }

  /**
   * Main orchestrator function for this service.
   * @param richEntry The entry to process.
   * @param userState The current state of the user's data (to get companions, etc.).
   * @returns An object containing the IDs of associated chapters.
   */
  public processAssociation(richEntry: RichEntry, userState: UserStateModel): { companionChapterIds: string[], themeChapterIds: string[] } {
    // In a real implementation, you'd get companions from the userState.
    // For now, we use a mock.
    const companions = MOCK_COMPANIONS; // Replace with: Object.values(userState.companions)
    
    const companionIds = this.associateCompanions(richEntry, companions);
    const themeTypes = this.classifyThemes(richEntry);

    // Convert IDs and types to chapter IDs
    const companionChapterIds = companionIds.map(id => `companion-${id}`);
    const themeChapterIds = themeTypes.map(type => `theme-${type}`);

    return { companionChapterIds, themeChapterIds };
  }
}

export const associationService = new AssociationService();
