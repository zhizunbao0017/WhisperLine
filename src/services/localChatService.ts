// src/services/localChatService.ts
// Local-First Chat Service (Privacy First - No External LLM APIs)
// Generates "Soulful" responses by analyzing local data patterns
import useMemoryStore from '../store/memoryStore';
import { MemoryFragment } from '../store/memoryStore';
import useChatStore from '../store/chatStore';

export interface ChatContext {
  entityName?: string; // e.g., "Mike" or "Coffee"
  entityId?: string; // e.g., "person-Mike" or "topic-coffee"
  recentMemories: MemoryFragment[];
  currentMood?: string;
  entryCount?: number;
}

// Response Templates (Mad Libs style)
const COMFORT_TEMPLATES = [
  "I can see you've been going through a lot with {entity}. Remember, it's okay to feel {mood} sometimes.",
  "It sounds like things with {entity} have been weighing on you. Your feelings are valid, and I'm here to listen.",
  "I notice you've been feeling {mood} about {entity} lately. Sometimes these feelings need time to process.",
  "You've shared quite a bit about {entity} recently. It's clear this matters a lot to you, and that's important.",
];

const PATTERN_RECOGNITION_TEMPLATES = [
  "I noticed you've been {activity} a lot lately. It seems to make you feel {mood}.",
  "You've mentioned {activity} several times recently. It looks like this is something that brings you {mood}.",
  "I see a pattern here - {activity} keeps coming up, and it's usually when you're feeling {mood}.",
  "Looking back, {activity} appears frequently in your entries, often paired with feeling {mood}.",
];

const HISTORICAL_CALLBACK_TEMPLATES = [
  "This reminds me of {date}, when you also {pastEvent}. It seems like {entity} has been on your mind.",
  "I remember {date} - you mentioned {pastEvent} then too. There's something about {entity} that resonates with you.",
  "You've touched on similar themes before, like on {date} when you {pastEvent}. {entity} seems to be a recurring theme.",
];

const POSITIVE_REINFORCEMENT_TEMPLATES = [
  "It's wonderful to see you engaging with {entity} so much. It clearly brings you joy.",
  "You've been really active with {entity} lately, and it's great to see how {mood} it makes you feel.",
  "I love seeing how {entity} shows up in your life. It seems to be a source of {mood} for you.",
];

const NEUTRAL_OBSERVATION_TEMPLATES = [
  "You've written about {entity} {count} times. It's interesting to see how this thread weaves through your story.",
  "I've noticed {entity} appears in {count} of your entries. There's clearly something significant here.",
  "Looking at your entries, {entity} has been a consistent presence. What draws you to this?",
];

/**
 * Analyze activity patterns from memories
 * @param memories - Array of memory fragments
 * @returns Most frequent activity and its associated mood
 */
function analyzeActivityPattern(memories: MemoryFragment[]): { activity: string; mood: string; count: number } | null {
  if (memories.length === 0) return null;
  
  // Count activities
  const activityCounts: Record<string, { count: number; moods: string[] }> = {};
  
  memories.forEach((mem) => {
    const activity = mem.text.toLowerCase();
    if (!activityCounts[activity]) {
      activityCounts[activity] = { count: 0, moods: [] };
    }
    activityCounts[activity].count++;
    activityCounts[activity].moods.push(mem.mood);
  });
  
  // Find most frequent activity
  let maxCount = 0;
  let mostFrequent: string | null = null;
  
  Object.entries(activityCounts).forEach(([activity, data]) => {
    if (data.count > maxCount && data.count >= 2) { // At least 2 occurrences
      maxCount = data.count;
      mostFrequent = activity;
    }
  });
  
  if (mostFrequent) {
    const moods = activityCounts[mostFrequent].moods;
    const dominantMood = moods.length > 0 ? moods[0] : 'neutral';
    return {
      activity: mostFrequent,
      mood: dominantMood,
      count: maxCount,
    };
  }
  
  return null;
}

/**
 * Find historical callback (past memory to reference)
 * @param memories - Array of memory fragments
 * @param currentText - Current entry text (optional)
 * @returns Past memory with date or null
 */
function findHistoricalCallback(memories: MemoryFragment[], currentText?: string): { date: string; event: string } | null {
  if (memories.length < 2) return null;
  
  // Get second most recent memory (skip the most recent one)
  const pastMemory = memories[1];
  if (pastMemory) {
    const date = new Date(pastMemory.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    return {
      date,
      event: pastMemory.text,
    };
  }
  
  return null;
}

/**
 * Determine mood category
 * @param mood - Mood string
 * @returns Mood category
 */
function categorizeMood(mood: string): 'positive' | 'negative' | 'neutral' {
  const lowerMood = mood.toLowerCase();
  const positiveMoods = ['happy', 'joyful', 'excited', 'grateful', 'calm', 'peaceful', 'energetic', 'proud'];
  const negativeMoods = ['sad', 'depressed', 'anxious', 'worried', 'stressed', 'angry', 'frustrated', 'tired'];
  
  if (positiveMoods.some(p => lowerMood.includes(p))) return 'positive';
  if (negativeMoods.some(n => lowerMood.includes(n))) return 'negative';
  return 'neutral';
}

/**
 * Generate local-first chat response (The Mock LLM)
 * @param context - Chat context with entity, memories, and mood
 * @returns Generated response string
 */
export function generateResponse(context: ChatContext): string {
  try {
    const { entityName, entityId, recentMemories, currentMood, entryCount } = context;
    
    // Determine mood category
    const moodCategory = currentMood ? categorizeMood(currentMood) : 'neutral';
    
    // Analyze activity patterns
    const activityPattern = analyzeActivityPattern(recentMemories);
    
    // Find historical callback
    const historicalCallback = findHistoricalCallback(recentMemories);
    
    // Template selection logic
    let selectedTemplate: string;
    let templateVars: Record<string, string> = {
      entity: entityName || 'this',
      mood: currentMood || 'thoughtful',
      count: String(entryCount || recentMemories.length),
    };
    
    // Pattern 1: Negative mood -> Comfort templates
    if (moodCategory === 'negative') {
      const template = COMFORT_TEMPLATES[Math.floor(Math.random() * COMFORT_TEMPLATES.length)];
      selectedTemplate = template;
    }
    // Pattern 2: Activity pattern detected -> Pattern recognition templates
    else if (activityPattern && activityPattern.count >= 2) {
      const template = PATTERN_RECOGNITION_TEMPLATES[Math.floor(Math.random() * PATTERN_RECOGNITION_TEMPLATES.length)];
      selectedTemplate = template;
      templateVars.activity = activityPattern.activity;
      templateVars.mood = activityPattern.mood;
    }
    // Pattern 3: Historical callback available -> Historical templates
    else if (historicalCallback) {
      const template = HISTORICAL_CALLBACK_TEMPLATES[Math.floor(Math.random() * HISTORICAL_CALLBACK_TEMPLATES.length)];
      selectedTemplate = template;
      templateVars.date = historicalCallback.date;
      templateVars.pastEvent = historicalCallback.event;
    }
    // Pattern 4: Positive mood -> Positive reinforcement templates
    else if (moodCategory === 'positive') {
      const template = POSITIVE_REINFORCEMENT_TEMPLATES[Math.floor(Math.random() * POSITIVE_REINFORCEMENT_TEMPLATES.length)];
      selectedTemplate = template;
    }
    // Pattern 5: Default -> Neutral observation templates
    else {
      const template = NEUTRAL_OBSERVATION_TEMPLATES[Math.floor(Math.random() * NEUTRAL_OBSERVATION_TEMPLATES.length)];
      selectedTemplate = template;
    }
    
    // Fill template (Mad Libs style)
    let response = selectedTemplate;
    Object.entries(templateVars).forEach(([key, value]) => {
      response = response.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    // Clean up any remaining placeholders
    response = response.replace(/\{[^}]+\}/g, '');
    
    console.log('[LocalChatService] Generated response:', {
      template: selectedTemplate.substring(0, 50),
      entityName,
      moodCategory,
      hasPattern: !!activityPattern,
      hasHistory: !!historicalCallback,
    });
    
    return response.trim();
  } catch (error) {
    console.error('[LocalChatService] Error generating response:', error);
    return "Thank you for sharing your thoughts. I'm here to listen.";
  }
}

/**
 * Get chat context for an entity
 * @param entityId - Entity ID (e.g., "person-Mike" or "topic-coffee")
 * @param entityName - Entity name for display
 * @param currentMood - Current mood (optional)
 * @returns Chat context
 */
export function getChatContext(
  entityId: string,
  entityName: string,
  currentMood?: string
): ChatContext {
  const memoryStore = useMemoryStore.getState();
  
  // Fix 2: Ensure entityId is normalized (lowercase and trimmed)
  const normalizedEntityId = entityId.toLowerCase().trim();
  
  const recentMemories = memoryStore.getMemoriesByEntity(normalizedEntityId, 10);
  
  return {
    entityName: entityName.trim(),
    entityId: normalizedEntityId,
    recentMemories,
    currentMood,
    entryCount: recentMemories.length,
  };
}

// Reply Templates for user messages
const REFLECTIVE_QUESTION_TEMPLATES = [
  "What makes you think about {entity} in that way?",
  "I'm curious - what's been on your mind about {entity} lately?",
  "That's interesting. Can you tell me more about how {entity} makes you feel?",
  "What do you think is the root of your feelings about {entity}?",
];

const GRATITUDE_RESPONSES = [
  "You're welcome! I'm always here to listen.",
  "Of course! I'm glad I could help.",
  "Anytime! Remember, I'm here whenever you need to talk.",
  "You're welcome! It means a lot that you trust me with your thoughts.",
];

const SUPPORTIVE_RESPONSES = [
  "I understand. {entity} seems to be an important part of your life.",
  "Thank you for sharing that with me. I'm here to support you.",
  "I hear you. It sounds like {entity} has been significant for you.",
  "That makes sense. I'm here whenever you want to talk more about {entity}.",
];

const QUESTION_RESPONSES = [
  "That's a great question. Based on what you've shared, I think {entity} has been a source of both joy and reflection for you.",
  "Hmm, let me think... Looking at your entries, {entity} seems to bring up mixed feelings sometimes.",
  "That's something worth exploring. What do you think {entity} means to you?",
];

/**
 * Generate reply to user message (Multi-turn conversation support)
 * Uses simple pattern matching for offline/local-first approach
 * 
 * @param userMessage - User's message text
 * @param context - Chat context with entity information
 * @returns AI reply string
 */
export function generateReplyToUser(userMessage: string, context: ChatContext): string {
  if (!userMessage || userMessage.trim().length === 0) {
    return "I'm here to listen. What would you like to talk about?";
  }

  const lowerMessage = userMessage.toLowerCase().trim();
  const entityName = context.entityName || 'this';
  
  // Pattern 1: User asks "Why?" or similar reflective questions
  if (
    lowerMessage.includes('why') ||
    lowerMessage.includes('how come') ||
    lowerMessage.includes('what makes') ||
    lowerMessage === '?' ||
    lowerMessage.endsWith('?')
  ) {
    const template = REFLECTIVE_QUESTION_TEMPLATES[
      Math.floor(Math.random() * REFLECTIVE_QUESTION_TEMPLATES.length)
    ];
    return template.replace(/\{entity\}/g, entityName);
  }

  // Pattern 2: User expresses gratitude
  if (
    lowerMessage.includes('thank') ||
    lowerMessage.includes('thanks') ||
    lowerMessage.includes('appreciate') ||
    lowerMessage.includes('grateful')
  ) {
    return GRATITUDE_RESPONSES[
      Math.floor(Math.random() * GRATITUDE_RESPONSES.length)
    ];
  }

  // Pattern 3: User asks a question
  if (lowerMessage.includes('?') || lowerMessage.startsWith('what') || lowerMessage.startsWith('how')) {
    const template = QUESTION_RESPONSES[
      Math.floor(Math.random() * QUESTION_RESPONSES.length)
    ];
    return template.replace(/\{entity\}/g, entityName);
  }

  // Pattern 4: User expresses agreement or acknowledgment
  if (
    lowerMessage === 'yes' ||
    lowerMessage === 'yeah' ||
    lowerMessage === 'yep' ||
    lowerMessage === 'ok' ||
    lowerMessage === 'okay' ||
    lowerMessage.includes('i see') ||
    lowerMessage.includes('i understand')
  ) {
    return "I'm glad that resonates with you. Is there anything else you'd like to explore about " + entityName + "?";
  }

  // Pattern 5: User expresses disagreement or confusion
  if (
    lowerMessage === 'no' ||
    lowerMessage === 'nope' ||
    lowerMessage.includes("don't think") ||
    lowerMessage.includes('not sure') ||
    lowerMessage.includes('confused')
  ) {
    return "That's okay. Sometimes things aren't clear right away. What would you like to explore about " + entityName + "?";
  }

  // Pattern 6: User mentions the entity name directly
  if (lowerMessage.includes(entityName.toLowerCase())) {
    // Use context-aware response
    const activityPattern = analyzeActivityPattern(context.recentMemories);
    if (activityPattern && activityPattern.count >= 2) {
      return `I've noticed ${entityName} comes up often when you're ${activityPattern.activity}. What draws you to that?`;
    }
  }

  // Fallback: Generic supportive response using context
  const template = SUPPORTIVE_RESPONSES[
    Math.floor(Math.random() * SUPPORTIVE_RESPONSES.length)
  ];
  return template.replace(/\{entity\}/g, entityName);
}

