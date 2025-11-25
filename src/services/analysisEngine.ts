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
 * Extract memory fragment from text using NLP (The Miner)
 * Extracts main verb phrase + object (e.g., "I played tennis with Mike" -> "played tennis")
 * 
 * @param text - Plain text content
 * @param mood - Dominant mood from diary entry
 * @param entityId - Optional entity ID (person or topic) this memory relates to
 * @returns Extracted memory text or null if no memory found
 */
export function extractMemory(text: string, mood: string = 'neutral', entityId?: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Check if compromise is available
  if (!nlp) {
    console.warn('[AnalysisEngine] compromise library not available for memory extraction');
    return null;
  }

  try {
    const plainText = extractPlainText(text);
    const doc = nlp(plainText);
    
    // Strategy 1: Extract verb phrases (main action + object)
    // Pattern: "I [verb] [noun]" -> "verb noun"
    const verbPhrases: string[] = [];
    
    // Extract verbs with their objects
    const verbs = doc.verbs();
    verbs.forEach((verb: any) => {
      try {
        // Get the verb text
        const verbText = verb.text().toLowerCase().trim();
        
        // Skip auxiliary verbs
        if (COMMON_AUXILIARY_VERBS.includes(verbText)) {
          return;
        }
        
        // Try to get the object/noun after the verb
        const afterVerb = verb.after();
        const nouns = afterVerb.nouns().out('array');
        
        if (nouns.length > 0) {
          // Combine verb + first noun
          const memory = `${verbText} ${nouns[0].toLowerCase()}`.trim();
          if (memory.length >= 5 && memory.length <= 100) {
            verbPhrases.push(memory);
          }
        } else {
          // Just use the verb if it's meaningful
          if (verbText.length >= 4 && verbText.length <= 50) {
            verbPhrases.push(verbText);
          }
        }
      } catch (e) {
        // Skip this verb if processing fails
      }
    });
    
    // Strategy 2: Extract "I [verb] [preposition] [noun]" patterns
    // e.g., "I went to the beach" -> "went to beach"
    const prepositionPhrases: string[] = [];
    try {
      const sentences = doc.sentences().out('array');
      sentences.forEach((sentence: string) => {
        const lowerSentence = sentence.toLowerCase();
        // Look for "I [verb] [prep] [noun]" patterns
        const prepPatterns = [
          /I\s+(\w+)\s+(?:to|at|in|on|with|for)\s+(?:the\s+)?(\w+)/i,
          /I\s+(\w+)\s+(\w+)\s+(?:with|for)\s+(\w+)/i,
        ];
        
        prepPatterns.forEach(pattern => {
          const match = sentence.match(pattern);
          if (match) {
            const parts = match.slice(1).filter(Boolean);
            const memory = parts.join(' ').toLowerCase().trim();
            if (memory.length >= 5 && memory.length <= 100) {
              prepositionPhrases.push(memory);
            }
          }
        });
      });
    } catch (e) {
      // Pattern matching might fail, continue
    }
    
    // Combine and prioritize results
    const allMemories = [...verbPhrases, ...prepositionPhrases];
    
    if (allMemories.length > 0) {
      // Return the first meaningful memory
      const memory = allMemories[0];
      // Capitalize first letter
      const capitalizedMemory = memory.charAt(0).toUpperCase() + memory.slice(1);
      console.log('[AnalysisEngine] Extracted memory:', capitalizedMemory);
      return capitalizedMemory;
    }
    
    // Fallback: Extract first meaningful activity from activities list
    const activities = extractActivities(doc);
    if (activities.length > 0) {
      const memory = activities[0];
      console.log('[AnalysisEngine] Extracted memory (from activities):', memory);
      return memory;
    }
    
    return null;
  } catch (error) {
    console.error('[AnalysisEngine] Memory extraction failed:', error);
    return null;
  }
}

/**
 * Extract key facts from text (heuristic-based for local-first/offline)
 * Looks for self-referential statements like "I am", "I like", "I hate", "I feel"
 * 
 * Future: This will be replaced by a small LLM call for better extraction
 * 
 * @param text - Plain text content
 * @returns Extracted fact string or null if no fact found
 */
export function extractKeyFact(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Normalize text: remove extra whitespace and split into sentences
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Patterns for self-referential statements (facts about the user)
  const factPatterns = [
    // "I am..." statements (identity, state)
    /I\s+am\s+([^.!?]+)/gi,
    // "I'm..." statements (contracted form)
    /I'm\s+([^.!?]+)/gi,
    // "I like..." statements (preferences)
    /I\s+like\s+([^.!?]+)/gi,
    // "I love..." statements (strong preferences)
    /I\s+love\s+([^.!?]+)/gi,
    // "I hate..." statements (dislikes)
    /I\s+hate\s+([^.!?]+)/gi,
    // "I dislike..." statements (dislikes)
    /I\s+dislike\s+([^.!?]+)/gi,
    // "I feel..." statements (emotions, states)
    /I\s+feel\s+([^.!?]+)/gi,
    // "I think..." statements (beliefs, opinions) - but be selective
    /I\s+think\s+(?:that\s+)?([^.!?]+)/gi,
    // "I believe..." statements (beliefs)
    /I\s+believe\s+(?:that\s+)?([^.!?]+)/gi,
    // "I prefer..." statements (preferences)
    /I\s+prefer\s+([^.!?]+)/gi,
    // "I always..." statements (habits, patterns)
    /I\s+always\s+([^.!?]+)/gi,
    // "I never..." statements (habits, patterns)
    /I\s+never\s+([^.!?]+)/gi,
    // "I usually..." statements (habits)
    /I\s+usually\s+([^.!?]+)/gi,
    // "I often..." statements (habits)
    /I\s+often\s+([^.!?]+)/gi,
  ];

  // Try each pattern
  for (const pattern of factPatterns) {
    const matches = normalizedText.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let fact = match[1].trim();
        
        // Clean up the fact
        // Remove leading articles and common words
        fact = fact.replace(/^(the|a|an|this|that|these|those)\s+/i, '').trim();
        
        // Ensure fact is meaningful (at least 5 characters)
        if (fact.length >= 5 && fact.length <= 200) {
          // Capitalize first letter
          fact = fact.charAt(0).toUpperCase() + fact.slice(1);
          
          // Add period if missing
          if (!fact.match(/[.!?]$/)) {
            fact += '.';
          }
          
          console.log('[AnalysisEngine] Extracted fact:', fact);
          return fact;
        }
      }
    }
  }

  // If no pattern matched, try to extract first meaningful sentence
  // (fallback for other types of facts)
  const sentences = normalizedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  for (const sentence of sentences) {
    // Look for sentences that start with "I" and are reasonably long
    if (sentence.match(/^I\s+/i) && sentence.length >= 10 && sentence.length <= 200) {
      let fact = sentence.trim();
      // Capitalize first letter
      fact = fact.charAt(0).toUpperCase() + fact.slice(1);
      // Add period if missing
      if (!fact.match(/[.!?]$/)) {
        fact += '.';
      }
      console.log('[AnalysisEngine] Extracted fact (fallback):', fact);
      return fact;
    }
  }

  return null;
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
