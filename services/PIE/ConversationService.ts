// services/PIE/ConversationService.ts
import { Chapter } from '../../models/Chapter';
import { RichEntry } from '../../models/RichEntry';

class ConversationService {
  // Helper to calculate shared topics (can be extracted from CompanionDashboard)
  private getTopSharedTopic(chapter: Chapter, allRichEntries: Record<string, RichEntry>): string | null {
    const topicCounts: Record<string, number> = {};

    if (!chapter.entryIds || chapter.entryIds.length === 0) {
      return null;
    }

    for (const entryId of chapter.entryIds) {
      const entry = allRichEntries[entryId];
      if (entry?.chapterIds && Array.isArray(entry.chapterIds)) {
        for (const cId of entry.chapterIds) {
          if (typeof cId === 'string' && cId.startsWith('theme-')) {
            const themeName = cId.replace('theme-', '');
            // Capitalize first letter for display
            const displayName = themeName.charAt(0).toUpperCase() + themeName.slice(1);
            topicCounts[displayName] = (topicCounts[displayName] || 0) + 1;
          }
        }
      }
    }

    const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    return topTopics.length > 0 ? topTopics[0][0] : null;
  }

  public generatePrompts(chapter: Chapter, allRichEntries: Record<string, RichEntry>): string[] {
    const prompts = new Set<string>();

    // 1. Prompt based on the top shared topic
    const topTopic = this.getTopSharedTopic(chapter, allRichEntries);
    if (topTopic) {
      prompts.add(`I've noticed we talk a lot about "${topTopic}". How are things on that front?`);
    }

    // 2. Prompt based on a recent strong emotion
    if (chapter.entryIds && chapter.entryIds.length > 0) {
      const lastEntryId = chapter.entryIds[0]; // Most recent entry
      const lastEntry = allRichEntries[lastEntryId];
      
      if (lastEntry?.metadata?.detectedEmotion) {
        const lastEmotion = lastEntry.metadata.detectedEmotion.primary;
        
        if (lastEmotion === 'excited' || lastEmotion === 'happy') {
          prompts.add("You seemed really happy recently. What was the best part of that moment?");
        } else if (lastEmotion === 'sad' || lastEmotion === 'angry') {
          prompts.add("It looks like things might have been tough recently. Is there anything you'd like to talk about?");
        } else if (lastEmotion === 'calm') {
          prompts.add("You've been feeling calm lately. What's helping you find that peace?");
        } else if (lastEmotion === 'tired') {
          prompts.add("I noticed you've been feeling tired. How are you taking care of yourself?");
        }
      }
    }

    // 3. Prompt based on entry frequency
    const entryCount = chapter.entryIds?.length || 0;
    if (entryCount > 10) {
      prompts.add("We've shared quite a bit together. What's been on your mind most lately?");
    } else if (entryCount > 0) {
      prompts.add("I'm here to listen. What would you like to share today?");
    }

    // 4. Generic, reflective prompts
    prompts.add("What's something you've been thinking about lately?");
    prompts.add("Is there anything you're looking forward to?");
    prompts.add("What's on your mind today?");

    // Return a selection of unique prompts (max 3-4)
    return Array.from(prompts).slice(0, 4);
  }
}

export const conversationService = new ConversationService();

