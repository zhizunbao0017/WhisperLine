// services/aiService.js
import Sentiment from 'sentiment';

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


export const getAIResponse = (text) => {
  try {
    // 步骤A: 分析情感 (情感轴)
    const sentimentResult = sentiment.analyze(text);
    const score = sentimentResult.comparative;
    let sentimentCategory = 'neutral';
    if (score > 0.1) sentimentCategory = 'positive';
    if (score < -0.1) sentimentCategory = 'negative';

    // 步骤B: 分析主题 (内容轴)
    const topics = analyzeTopics(text);
    const primaryTopic = topics.length > 0 ? topics[0] : 'generic'; // 只取第一个匹配到的主题，如果没有就用'generic'

    // 步骤C: 在回应矩阵中寻找最匹配的“剧本”（多级容错）
    let responseOptions =
      responses[sentimentCategory]?.[primaryTopic];

    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      responseOptions = responses[sentimentCategory]?.generic;
    }
    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      responseOptions = responses.neutral?.generic;
    }

    // 兜底确保为数组
    if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
      return "Thank you for sharing your thoughts today.";
    }

    const randomIndex = Math.floor(Math.random() * responseOptions.length);
    return responseOptions[randomIndex];
  } catch (err) {
    console.error('AI Response Error:', err);
    return "Thank you for sharing your thoughts today.";
  }
};