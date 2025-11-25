// services/aiService.js
import Sentiment from 'sentiment';
import useMemoryStore from '../src/store/memoryStore';
import { stripHtml } from '../src/utils/textUtils';

const sentiment = new Sentiment();

// --- 1. 定义主题关键词 ---
// AI将通过这些词来“理解”日记在讨论什么
const topicKeywords = {
  work: ['work', 'job', 'career', 'project', 'meeting', 'colleague', 'office', 'deadline'],
  relationships: ['friend', 'friends', 'family', 'partner', 'love', 'date', 'relationship', 'mom', 'dad'],
  self: ['myself', 'feelings', 'feeling', 'thought', 'thoughts', 'reflection', 'dream', 'anxiety', 'happy', 'sad'],
  hobbies: ['hobby', 'movie', 'book', 'music', 'game', 'sport', 'cooking', 'walk', 'gym'],
};

// --- 2. 构建更丰富的、多维度的回应矩阵 ---
const responses = {
  positive: {
    work: [
      "It sounds like you're making great progress in your career. That's fantastic!",
      "Handling work challenges like that is a true sign of professionalism. Well done.",
      "A productive day at work can feel so rewarding. Keep up the great momentum!",
    ],
    relationships: [
      "Cherish these beautiful moments with your loved ones. They are truly precious.",
      "It's wonderful to hear you're surrounded by such positive relationships.",
      "Building strong connections is so important. It's lovely to see you nurturing them.",
    ],
    self: [
      "This level of self-awareness is a sign of incredible growth. Be proud of your journey.",
      "It's wonderful that you're so in tune with your feelings. That's a superpower.",
      "Embracing your own positive feelings is a beautiful thing. Thank you for sharing this joy.",
    ],
    hobbies: [
      "It's so important to make time for hobbies. Glad you had a chance to enjoy yourself!",
      "Diving into a good hobby is the perfect way to recharge. Sounds like you had a great time.",
      "That sounds like a lot of fun! It's great you're exploring your passions.",
    ],
    generic: [ // 如果没有匹配到特定主题，就用这些
      "Reading this brought a smile to my face. What a wonderful day.",
      "It's the collection of moments like these that make life beautiful. Cherish it.",
      "Your positive energy is radiating from these words. Keep shining!",
    ],
  },
  negative: {
    work: [
      "Work can be incredibly demanding sometimes. Remember to take a moment for yourself to breathe.",
      "That sounds like a tough situation at work. Don't let it define your worth.",
      "Navigating professional challenges is difficult. Acknowledging the struggle is the first step.",
    ],
    relationships: [
      "Relationships can be complex and challenging. It's okay to feel hurt or confused.",
      "I'm sorry to hear about this difficulty. Please be gentle with yourself.",
      "Even in the strongest bonds, there are tough days. Your feelings are valid.",
    ],
    self: [
      "Thank you for being so honest about your feelings. It takes courage to be vulnerable.",
      "It's okay to not be okay. Remember that this feeling is temporary.",
      "I hear you. The most important thing is to be kind to yourself as you navigate these thoughts.",
    ],
    hobbies: [
        "It can be disappointing when a hobby doesn't bring the joy you expected. That's okay.",
        "Sometimes even the things we love can feel challenging. Don't be too hard on yourself.",
    ],
    generic: [
      "It sounds like it was a challenging day. Thank you for sharing this with me.",
      "I'm here to listen. Remember that it's okay to have days like this.",
      "Acknowledging these difficult feelings is a brave and important step.",
    ],
  },
  neutral: {
    generic: [ // 中性情绪只保留通用回应
      "Thank you for documenting your day. Every detail is a part of your unique story.",
      "The act of journaling is a powerful tool for clarity. Well done for keeping the habit.",
      "An interesting observation. It's these daily records that build a bigger picture over time.",
    ],
  },
};

// --- 3. 新的、更智能的AI分析函数 ---

// 辅助函数：分析文本包含哪些主题
const analyzeTopics = (text) => {
  const foundTopics = [];
  const lowerCaseText = text.toLowerCase();
  for (const topic in topicKeywords) {
    for (const keyword of topicKeywords[topic]) {
      if (lowerCaseText.includes(keyword)) {
        foundTopics.push(topic);
        break; // 找到一个主题的关键词就跳出，避免重复
      }
    }
  }
  return foundTopics;
};


/**
 * Retrieve relevant facts from memory store based on context
 * @param {string} contextPerson - Optional person name (e.g., "Mike")
 * @param {string} contextTopic - Optional topic name
 * @param {string} currentText - Current diary text for keyword extraction
 * @returns {Array<string>} - Array of relevant fact texts
 */
function retrieveRelevantFacts(contextPerson, contextTopic, currentText) {
  try {
    const memoryStore = useMemoryStore.getState();
    const allFacts = memoryStore.facts || [];
    
    if (allFacts.length === 0) {
      return [];
    }
    
    // Build search queries
    const searchQueries = [];
    if (contextPerson) {
      searchQueries.push(contextPerson.toLowerCase());
    }
    if (contextTopic) {
      searchQueries.push(contextTopic.toLowerCase());
    }
    
    // Extract keywords from current text for context-aware search
    if (currentText) {
      const lowerText = currentText.toLowerCase();
      // Extract potential keywords (simple heuristic)
      const words = lowerText.split(/\s+/).filter(w => w.length > 4);
      searchQueries.push(...words.slice(0, 5)); // Top 5 keywords
    }
    
    // Search facts that match any query
    const relevantFacts = [];
    const seenFacts = new Set();
    
    for (const query of searchQueries) {
      const matchingFacts = memoryStore.searchFacts(query);
      for (const fact of matchingFacts) {
        if (!seenFacts.has(fact.id)) {
          relevantFacts.push(fact.text);
          seenFacts.add(fact.id);
        }
      }
    }
    
    // If no context-specific facts found, get recent facts as fallback
    if (relevantFacts.length === 0 && allFacts.length > 0) {
      const recentFacts = memoryStore.getRecentFacts(5);
      return recentFacts.map(f => f.text);
    }
    
    // Limit to top 10 most relevant facts
    return relevantFacts.slice(0, 10);
  } catch (error) {
    console.warn('[AI Service] Failed to retrieve facts:', error);
    return [];
  }
}

/**
 * Get recent diary entries related to context
 * @param {Array} diaries - All diary entries
 * @param {string} contextPerson - Optional person name
 * @param {string} contextTopic - Optional topic name
 * @param {string} currentEntryId - Current entry ID to exclude
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} - Array of recent related entries
 */
function getRecentContextEntries(diaries, contextPerson, contextTopic, currentEntryId, limit = 3) {
  if (!diaries || diaries.length === 0) {
    return [];
  }
  
  try {
    // Filter entries related to context
    let relatedEntries = diaries.filter(entry => {
      // Exclude current entry
      if (entry.id === currentEntryId) {
        return false;
      }
      
      const metadata = entry.analyzedMetadata || {};
      const content = stripHtml(entry.content || entry.contentHTML || '').toLowerCase();
      
      // Check if entry relates to context person
      if (contextPerson) {
        const lowerPerson = contextPerson.toLowerCase();
        const hasPerson = (metadata.people || []).some(p => 
          p.toLowerCase() === lowerPerson
        );
        if (hasPerson || content.includes(lowerPerson)) {
          return true;
        }
      }
      
      // Check if entry relates to context topic
      if (contextTopic) {
        const lowerTopic = contextTopic.toLowerCase();
        const hasTopic = (metadata.activities || []).some(t => 
          t.toLowerCase() === lowerTopic
        );
        if (hasTopic || content.includes(lowerTopic)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Sort by date (newest first) and limit
    relatedEntries.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    return relatedEntries.slice(0, limit);
  } catch (error) {
    console.warn('[AI Service] Failed to get recent context entries:', error);
    return [];
  }
}

/**
 * Generate summary of recent entries for context
 * @param {Array} entries - Recent diary entries
 * @returns {string} - Summary text
 */
function summarizeRecentEntries(entries) {
  if (!entries || entries.length === 0) {
    return '';
  }
  
  const summaries = entries.map((entry, index) => {
    const title = entry.title || 'Untitled';
    const date = new Date(entry.createdAt || Date.now()).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const preview = stripHtml(entry.content || entry.contentHTML || '')
      .substring(0, 80)
      .trim();
    
    return `${index + 1}. [${date}] ${title}: ${preview}${preview.length >= 80 ? '...' : ''}`;
  });
  
  return summaries.join('\n');
}

/**
 * Generate high-context AI response with long-term memory (The "Hope" Architecture)
 * @param {string} currentDiaryContent - Current diary entry HTML/text content
 * @param {object} options - Options object
 * @param {object|null} options.companion - Optional companion object with systemPrompt
 * @param {string} options.contextPerson - Optional person name (e.g., "Mike")
 * @param {string} options.contextTopic - Optional topic name
 * @param {Array} options.diaries - All diary entries for context retrieval
 * @param {string} options.currentEntryId - Current entry ID to exclude from context
 * @returns {string} - The AI-generated response
 */
export const generateReply = (currentDiaryContent, options = {}) => {
  const {
    companion = null,
    contextPerson = null,
    contextTopic = null,
    diaries = [],
    currentEntryId = null,
  } = options;
  
  try {
    // Extract plain text from current content
    const currentText = stripHtml(currentDiaryContent || '');
    
    // Step 1: Retrieve relevant facts from memory store
    const relevantFacts = retrieveRelevantFacts(contextPerson, contextTopic, currentText);
    
    // Step 2: Get recent context entries
    const recentEntries = getRecentContextEntries(
      diaries,
      contextPerson,
      contextTopic,
      currentEntryId,
      3 // Last 3 entries
    );
    const recentContextSummary = summarizeRecentEntries(recentEntries);
    
    // Step 3: Determine persona prompt
    let personaPrompt;
    if (companion && companion.systemPrompt) {
      personaPrompt = companion.systemPrompt;
      console.log('[AI Service] Using companion persona:', companion.name || 'Unknown');
    } else {
      personaPrompt = "You are a deep, empathetic companion.";
      console.log('[AI Service] Using default system archetype');
    }
    
    // Step 4: Construct high-context system prompt (The Soul)
    let systemPrompt = `${personaPrompt}\n\n`;
    
    // Add long-term memory section
    if (relevantFacts.length > 0) {
      systemPrompt += '[LONG TERM MEMORY]\n';
      relevantFacts.forEach(fact => {
        systemPrompt += `- ${fact}\n`;
      });
      systemPrompt += '\n';
    }
    
    // Add recent context section
    if (recentContextSummary) {
      systemPrompt += '[RECENT CONTEXT]\n';
      systemPrompt += recentContextSummary;
      systemPrompt += '\n\n';
    }
    
    // Add current situation
    systemPrompt += `[CURRENT SITUATION]\n"${currentText.substring(0, 500)}${currentText.length > 500 ? '...' : ''}"\n\n`;
    
    // Add instruction
    systemPrompt += 'Instruction: Reply to the user as a close friend who remembers their history. Be insightful, not generic. Validate their feelings based on past patterns.';
    
    console.log('[AI Service] Generated high-context prompt:', {
      factsCount: relevantFacts.length,
      recentEntriesCount: recentEntries.length,
      hasContext: !!(contextPerson || contextTopic),
    });
    
    // Step 5: Generate response using sentiment analysis (current rule-based approach)
    // Future: Replace this with LLM API call using systemPrompt
    const sentimentResult = sentiment.analyze(currentText);
    const score = sentimentResult.comparative;
    let sentimentCategory = 'neutral';
    if (score > 0.1) sentimentCategory = 'positive';
    if (score < -0.1) sentimentCategory = 'negative';
    
    const topics = analyzeTopics(currentText);
    const primaryTopic = topics.length > 0 ? topics[0] : 'generic';
    
    // Enhance response selection based on context
    let responseOptions = responses[sentimentCategory]?.[primaryTopic];
    
    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      responseOptions = responses[sentimentCategory]?.generic;
    }
    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      responseOptions = responses.neutral?.generic;
    }
    
    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      // Fallback with memory-aware response
      if (relevantFacts.length > 0) {
        return "I remember you've shared similar thoughts before. Thank you for continuing to trust me with your reflections.";
      }
      return "Thank you for sharing your thoughts today.";
    }
    
    const randomIndex = Math.floor(Math.random() * responseOptions.length);
    let response = responseOptions[randomIndex];
    
    // Enhance response with memory awareness if facts are available
    if (relevantFacts.length > 0 && Math.random() > 0.5) {
      // Occasionally reference memory (30% chance to avoid being repetitive)
      const memoryHint = "I remember you've mentioned this before. ";
      response = memoryHint + response.toLowerCase();
    }
    
    return response;
  } catch (err) {
    console.error('[AI Service] Error generating reply:', err);
    return "Thank you for sharing your thoughts today.";
  }
};

/**
 * Generate AI response based on diary text and optional companion persona
 * (Legacy function - wraps generateReply for backward compatibility)
 * @param {string} text - The diary entry text to analyze
 * @param {object|null} companion - Optional companion object with systemPrompt, or null for default persona
 * @returns {string} - The AI-generated response
 */
export const getAIResponse = (text, companion = null) => {
  // Legacy function - delegate to generateReply for backward compatibility
  // Note: Without diaries/context, this will use basic memory retrieval
  return generateReply(text, {
    companion,
    diaries: [], // Empty array - will use basic memory only
    currentEntryId: null,
  });
};