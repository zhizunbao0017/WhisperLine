// src/services/analysisEngine.ts
// Lightweight NLP-based analysis engine using compromise library
import { stripHtml } from '../utils/textUtils';

// Import compromise library
// Note: compromise uses default export
let nlp: any = null;
try {
  const compromise = require('compromise');
  nlp = compromise.default || compromise;
} catch (e) {
  console.warn('[AnalysisEngine] compromise library not found. Please install it: npm install compromise');
}

export interface AnalysisResult {
  people: string[];
  activities: string[];
  moods: string[];
  rawSummary: string;
  // Legacy fields for backward compatibility
  detectedPeople: string[];
  detectedTopics: string[];
  sentimentSummary: string;
  detectedMoods: string[];
  detectedActivities: string[];
}

/**
 * Extract plain text from HTML content using robust text utilities
 */
function extractPlainText(html: string): string {
  return stripHtml(html);
}

/**
 * Filter out common auxiliary/linking verbs that don't represent activities
 */
const COMMON_AUXILIARY_VERBS = [
  'is', 'are', 'am', 'was', 'were', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'done', 'doing',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'go', 'goes', 'went', 'gone', 'going',
  'get', 'gets', 'got', 'gotten', 'getting',
  'make', 'makes', 'made', 'making',
  'take', 'takes', 'took', 'taken', 'taking',
  'come', 'comes', 'came', 'coming',
  'see', 'sees', 'saw', 'seen', 'seeing',
  'know', 'knows', 'knew', 'known', 'knowing',
  'think', 'thinks', 'thought', 'thinking',
  'say', 'says', 'said', 'saying',
  'want', 'wants', 'wanted', 'wanting',
  'need', 'needs', 'needed', 'needing',
  'feel', 'feels', 'felt', 'feeling',
  'try', 'tries', 'tried', 'trying',
];

/**
 * Extract activities from text using NLP
 */
function extractActivities(doc: any): string[] {
  const activities: string[] = [];
  
  // Extract meaningful verbs (excluding auxiliary verbs)
  const verbs = doc.verbs().out('array');
  verbs.forEach((verb: string) => {
    const lowerVerb = verb.toLowerCase().trim();
    // Filter out auxiliary verbs and very short verbs
    if (
      lowerVerb.length > 2 &&
      !COMMON_AUXILIARY_VERBS.includes(lowerVerb) &&
      !activities.includes(lowerVerb)
    ) {
      activities.push(lowerVerb);
    }
  });
  
  // Extract nouns that follow common activity verbs
  // Pattern: verb + noun (e.g., "played tennis", "watched movie")
  const activityVerbPatterns = ['play', 'watch', 'listen', 'read', 'write', 'study', 'practice', 
                                'do', 'make', 'create', 'build', 'draw', 'paint', 'sing', 'dance',
                                'run', 'walk', 'swim', 'bike', 'hike', 'climb', 'travel', 'visit',
                                'cook', 'bake', 'eat', 'drink', 'shop', 'work', 'meet'];
  
  try {
    activityVerbPatterns.forEach((pattern) => {
      const matches = doc.match(`#Verb+ (${pattern}) #Noun+`);
      const nouns = matches.nouns().out('array');
      nouns.forEach((noun: string) => {
        const lowerNoun = noun.toLowerCase().trim();
        if (lowerNoun.length > 2 && !activities.includes(lowerNoun)) {
          activities.push(lowerNoun);
        }
      });
    });
  } catch (e) {
    // Pattern matching might fail, continue with verbs only
    console.warn('[AnalysisEngine] Activity pattern matching failed:', e);
  }
  
  return activities.slice(0, 10); // Limit to top 10
}

/**
 * Extract moods/adjectives from text
 */
function extractMoods(doc: any): string[] {
  const moods: string[] = [];
  
  // Extract adjectives (these often represent moods/emotions)
  const adjectives = doc.adjectives().out('array');
  adjectives.forEach((adj: string) => {
    const lowerAdj = adj.toLowerCase().trim();
    // Filter out very short adjectives and common descriptors
    if (lowerAdj.length > 2 && !moods.includes(lowerAdj)) {
      moods.push(lowerAdj);
    }
  });
  
  // Extract hashtags (users might tag moods)
  try {
    const hashtags = doc.hashTags().out('array');
    hashtags.forEach((tag: string) => {
      const cleanTag = tag.replace('#', '').toLowerCase().trim();
      if (cleanTag.length > 0 && !moods.includes(cleanTag)) {
        moods.push(cleanTag);
      }
    });
  } catch (e) {
    // HashTags might not be available in all versions
  }
  
  return moods.slice(0, 10); // Limit to top 10
}

/**
 * Generate a raw summary from the main sentence
 */
function generateRawSummary(doc: any): string {
  try {
    // Get the first sentence as summary
    const sentences = doc.sentences().out('array');
    if (sentences.length > 0) {
      return sentences[0].substring(0, 100); // Limit to 100 chars
    }
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Main analysis function using NLP
 * @param htmlContent - HTML content from RichEditor
 * @returns AnalysisResult
 */
export function analyzeDiaryEntry(htmlContent: string): AnalysisResult {
  const plainText = extractPlainText(htmlContent);
  
  if (!plainText || plainText.trim().length === 0) {
    return {
      people: [],
      activities: [],
      moods: [],
      rawSummary: '',
      detectedPeople: [],
      detectedTopics: [],
      sentimentSummary: 'neutral',
      detectedMoods: [],
      detectedActivities: [],
    };
  }
  
  // Check if compromise is available
  if (!nlp) {
    console.warn('[AnalysisEngine] compromise library not available, returning empty result');
    return {
      people: [],
      activities: [],
      moods: [],
      rawSummary: '',
      detectedPeople: [],
      detectedTopics: [],
      sentimentSummary: 'neutral',
      detectedMoods: [],
      detectedActivities: [],
    };
  }

  try {
    // Parse text with compromise
    const doc = nlp(plainText);
    
    // Extract people (proper nouns)
    const people = doc.people().out('array').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    
    // Extract activities
    const activities = extractActivities(doc);
    
    // Extract moods/adjectives
    const moods = extractMoods(doc);
    
    // Generate raw summary
    const rawSummary = generateRawSummary(doc);
    
    // Determine sentiment based on moods
    const positiveMoods = ['happy', 'joyful', 'excited', 'grateful', 'thankful', 'blessed', 'lucky', 'proud', 'confident', 'calm', 'peaceful', 'relaxed', 'energetic'];
    const negativeMoods = ['sad', 'depressed', 'anxious', 'worried', 'stressed', 'angry', 'frustrated', 'tired', 'exhausted', 'upset', 'disappointed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    moods.forEach((mood: string) => {
      const lowerMood = mood.toLowerCase();
      if (positiveMoods.some(p => lowerMood.includes(p))) positiveCount++;
      if (negativeMoods.some(n => lowerMood.includes(n))) negativeCount++;
    });
    
    let sentimentSummary = 'neutral';
    if (positiveCount > negativeCount * 1.5) {
      sentimentSummary = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      sentimentSummary = 'negative';
    } else if (positiveCount > 0 || negativeCount > 0) {
      sentimentSummary = 'mixed';
    }
    
    // Combine all topics for backward compatibility
    const allTopics = [...activities, ...moods];
    
    return {
      people: people.slice(0, 5), // Limit to top 5
      activities: activities.slice(0, 10),
      moods: moods.slice(0, 10),
      rawSummary,
      // Legacy fields
      detectedPeople: people.slice(0, 5),
      detectedTopics: allTopics.slice(0, 10),
      sentimentSummary,
      detectedMoods: moods,
      detectedActivities: activities,
    };
  } catch (error) {
    console.error('[AnalysisEngine] NLP processing failed:', error);
    // Fallback to empty result
    return {
      people: [],
      activities: [],
      moods: [],
      rawSummary: '',
      detectedPeople: [],
      detectedTopics: [],
      sentimentSummary: 'neutral',
      detectedMoods: [],
      detectedActivities: [],
    };
  }
}
