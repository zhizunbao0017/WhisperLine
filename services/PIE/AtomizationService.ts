// services/PIE/AtomizationService.ts
import { DiaryEntry, RichEntry, RichEntryMetadata } from '../../models/RichEntry';
import { NamedEntity } from '../../models/PIE';

// React Native-compatible stopwords list (common English stopwords)
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to',
  'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if', 'up',
  'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'after',
  'words', 'long', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit',
  'now', 'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part',
  'i', 'you', 'me', 'my', 'we', 'our', 'ours', 'us', 'your', 'yours',
  'his', 'her', 'hers', 'him', 'she', 'he', 'they', 'them', 'theirs',
  'am', 'is', 'are', 'was', 'were', 'be', 'being', 'been', 'have', 'has',
  'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'should',
  'could', 'may', 'might', 'must', 'can', 'cannot', 'ought', 'shall',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'but', 'by', 'concerning', 'despite', 'down', 'during', 'except', 'for',
  'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto',
  'out', 'outside', 'over', 'past', 'regarding', 'round', 'since', 'through',
  'throughout', 'till', 'to', 'toward', 'towards', 'under', 'underneath',
  'until', 'unto', 'up', 'upon', 'with', 'within', 'without',
]);

class AtomizationService {
  /**
   * Tokenizes text, converts to lowercase, and removes stopwords.
   * React Native-compatible implementation without Node.js dependencies.
   * @param text The raw text content.
   * @returns An array of cleaned words.
   */
  public tokenizeAndClean(text: string): string[] {
    if (!text) return [];

    // Convert to lowercase and remove HTML tags if any
    const cleanedText = text.toLowerCase().replace(/<[^>]*>/g, ' ');
    
    // Tokenize using regex (split on whitespace and punctuation)
    // Keep only alphanumeric tokens with at least 2 characters
    const tokens = cleanedText
      .split(/[\s\.,!?;:'"()\[\]{}\-—–…]+/)
      .filter(token => {
        // Filter out empty strings, single characters, and stopwords
        return token.length > 1 && !STOPWORDS.has(token);
      });

    return tokens;
  }

  /**
   * (Placeholder) Extracts named entities like people and places from text.
   * @param tokens The cleaned tokens.
   * @returns An array of named entities.
   */
  public extractNamedEntities(tokens: string[]): NamedEntity[] {
    // TODO: Implement NER logic here (e.g., using a pre-trained model or rules)
    console.log('extractNamedEntities called with:', tokens);
    return [];
  }

  /**
   * (Placeholder) Extracts the most relevant keywords using TF-IDF or similar.
   * @param tokens The cleaned tokens.
   * @returns An array of top keywords.
   */
  public extractTopKeywords(tokens: string[]): string[] {
    // TODO: Implement keyword extraction logic (e.g., TF-IDF)
    console.log('extractTopKeywords called with:', tokens);
    // For now, return a slice of tokens as a placeholder
    return tokens.slice(0, 5);
  }

  /**
   * (Placeholder) Analyzes the text to determine the primary emotion and sentiment.
   * @param text The raw text content.
   * @returns An object with detected emotion and sentiment.
   */
  public analyzeEmotion(text: string) {
    // TODO: Implement emotion and sentiment analysis
    console.log('analyzeEmotion called with:', text);
    return {
      primary: 'calm' as const,
      score: 0.7,
      sentiment: { score: 0.2, label: 'neutral' as const },
    };
  }

  /**
   * Main orchestrator function for this service.
   * Processes a raw diary entry and enriches it with metadata.
   * @param entry The raw DiaryEntry.
   * @returns A RichEntry object.
   */
  public enrichEntry(entry: DiaryEntry): RichEntry {
    const cleanedTokens = this.tokenizeAndClean(entry.content);
    const entities = this.extractNamedEntities(cleanedTokens);
    const keywords = this.extractTopKeywords(cleanedTokens);
    const emotionAnalysis = this.analyzeEmotion(entry.content);

    const metadata: RichEntryMetadata = {
      processedAt: new Date().toISOString(),
      keywords,
      entities,
      detectedEmotion: emotionAnalysis,
      sentiment: emotionAnalysis.sentiment,
    };

    return {
      ...entry,
      metadata,
    };
  }
}

// Export a singleton instance of the service
export const atomizationService = new AtomizationService();

