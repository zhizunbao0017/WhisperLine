// services/PIE/AtomizationService.ts
import { DiaryEntry, RichEntry, RichEntryMetadata } from '../../models/RichEntry';
import { NamedEntity, EmotionType } from '../../models/PIE';

// --- Simple Sentiment Dictionary (AFINN-like) ---
const sentimentDictionary: Record<string, number> = {
  // Positive words
  'happy': 3, 'great': 3, 'love': 3, 'excited': 2, 'amazing': 3, 'wonderful': 3,
  'beautiful': 2, 'fun': 2, 'joy': 3, 'success': 2, 'win': 2, 'good': 1, 'nice': 1,
  'excellent': 3, 'fantastic': 3, 'brilliant': 3, 'perfect': 3, 'delight': 3,
  'pleased': 2, 'grateful': 2, 'thankful': 2, 'blessed': 2, 'proud': 2,
  'celebrate': 2, 'cheerful': 2, 'glad': 2, 'pleasure': 2, 'satisfied': 2,
  'awesome': 3, 'outstanding': 3, 'superb': 3, 'magnificent': 3, 'marvelous': 3,
  // Negative words
  'sad': -3, 'angry': -3, 'hate': -3, 'terrible': -3, 'awful': -3, 'bad': -2,
  'cry': -2, 'fear': -2, 'stress': -2, 'anxiety': -2, 'fail': -2, 'pain': -1,
  'depressed': -3, 'disappointed': -2, 'frustrated': -2, 'worried': -2, 'scared': -2,
  'horrible': -3, 'dreadful': -3, 'miserable': -3, 'lonely': -2, 'upset': -2,
  'tired': -1, 'exhausted': -2, 'drained': -2, 'weary': -1, 'fatigue': -1,
  'annoyed': -2, 'irritated': -2, 'furious': -3, 'rage': -3, 'outraged': -3,
};

// --- Score to Emotion Mapping ---
const mapScoreToEmotion = (score: number): { 
  primary: EmotionType; 
  score: number;
  sentiment: { score: number; label: 'positive' | 'negative' | 'neutral' } 
} => {
  // Normalize score to -1 to 1 range for sentiment
  const normalizedSentimentScore = Math.max(-1, Math.min(1, score / 5));
  
  const sentiment = {
    score: normalizedSentimentScore,
    label: (normalizedSentimentScore > 0.2 ? 'positive' : normalizedSentimentScore < -0.2 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
  };

  // Map score to emotion type
  // Positive emotions
  if (score >= 3) return { primary: 'excited', score: Math.min(1, score / 5), sentiment };
  if (score > 1) return { primary: 'happy', score: Math.min(1, score / 5), sentiment };
  
  // Neutral to mildly negative
  if (score > -1) return { primary: 'calm', score: Math.max(0, (score + 1) / 6), sentiment };
  
  // Negative emotions
  if (score > -3) return { primary: 'tired', score: Math.max(0, Math.abs(score) / 5), sentiment };
  // For very negative scores, distinguish between sad (moderately negative) and angry (strongly negative)
  if (score > -5) return { primary: 'sad', score: Math.max(0, Math.abs(score) / 5), sentiment };
  if (score <= -5) return { primary: 'angry', score: Math.max(0, Math.abs(score) / 5), sentiment };

  // Default fallback for neutral cases
  return { primary: 'calm', score: 0.5, sentiment };
};

// --- Exclusions for NER ---
const NER_EXCLUSIONS = new Set([
  'I', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December', 'Apple', 'Google', 'Microsoft',
  'Facebook', 'Amazon', 'Netflix', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube',
  'Today', 'Yesterday', 'Tomorrow', 'Now', 'Then', 'Here', 'There',
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.',
]);

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
   * Extracts named entities (primarily people) using a rule-based approach.
   * Uses heuristics like capitalization, sentence position, and exclusion lists
   * to identify potential person names.
   * @param text The raw text content of the diary entry.
   * @returns An array of named entities.
   */
  public extractNamedEntities(text: string): NamedEntity[] {
    if (!text) return [];

    const entities: NamedEntity[] = [];
    
    // Remove HTML tags first
    const cleanedText = text.replace(/<[^>]*>/g, ' ');
    
    // Split text into sentences while preserving sentence structure
    // Simple sentence splitting: split on period, question mark, or exclamation followed by whitespace
    // Note: This is a basic implementation; more sophisticated sentence splitting can be added later
    const sentences = cleanedText.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
    const potentialNames: Set<string> = new Set();

    for (const sentence of sentences) {
      // Split sentence into words while preserving capitalization
      const words = sentence.trim().split(/\s+/);
      
      for (let i = 0; i < words.length; i++) {
        // Clean the word: remove punctuation but keep letters
        const cleanedWord = words[i].replace(/[^a-zA-Z]/g, '');
        
        // Skip empty words or very short words
        if (cleanedWord.length < 2) continue;
        
        // Rule 1: Is the first letter capitalized?
        const isCapitalized = cleanedWord[0] === cleanedWord[0].toUpperCase() && 
                              cleanedWord[0] !== cleanedWord[0].toLowerCase();
        
        // Rule 2: Is it NOT the first word of the sentence? (Sentence starters are often capitalized)
        // Rule 3: Is it NOT in our exclusion list?
        // Rule 4: Is it NOT all uppercase? (Acronyms like "AI", "NLP" are usually all caps)
        const isNotAllUppercase = cleanedWord !== cleanedWord.toUpperCase() || cleanedWord.length <= 2;
        
        if (isCapitalized && i > 0 && !NER_EXCLUSIONS.has(cleanedWord) && isNotAllUppercase) {
          // Additional check: ignore words that are common sentence starters even if capitalized
          // These are less likely to be names
          const commonStarters = ['The', 'This', 'That', 'These', 'Those', 'A', 'An'];
          if (!commonStarters.includes(cleanedWord) || i > 1) {
            potentialNames.add(cleanedWord);
          }
        }
      }
    }

    // Convert potential names to NamedEntity objects
    // For now, we'll treat each found word as a separate potential person
    // Future enhancement: combine consecutive capitalized words (e.g., "Christopher Nolan")
    potentialNames.forEach(name => {
      entities.push({ 
        text: name, 
        type: 'PERSON' as const 
      });
    });

    return entities;
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
   * Analyzes the text to determine the primary emotion and sentiment.
   * Uses a sentiment dictionary to calculate scores and maps them to emotion types.
   * @param cleanedTokens The array of cleaned words from the entry.
   * @returns An object with detected emotion and sentiment.
   */
  public analyzeEmotion(cleanedTokens: string[]): {
    primary: EmotionType;
    score: number;
    sentiment: { score: number; label: 'positive' | 'negative' | 'neutral' };
  } {
    // Calculate sentiment score by summing dictionary values
    let score = 0;
    for (const token of cleanedTokens) {
      if (sentimentDictionary[token]) {
        score += sentimentDictionary[token];
      }
    }

    // Map score to emotion type
    return mapScoreToEmotion(score);
  }

  /**
   * Main orchestrator function for this service.
   * Processes a raw diary entry and enriches it with metadata.
   * @param entry The raw DiaryEntry.
   * @returns A RichEntry object.
   */
  public enrichEntry(entry: DiaryEntry): RichEntry {
    const cleanedTokens = this.tokenizeAndClean(entry.content);
    const entities = this.extractNamedEntities(entry.content);
    const keywords = this.extractTopKeywords(cleanedTokens);
    const emotionAnalysis = this.analyzeEmotion(cleanedTokens);

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

