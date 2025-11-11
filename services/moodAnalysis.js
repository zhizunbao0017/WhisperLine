// services/moodAnalysis.js
// Local-only mood analysis utilities. Pure JavaScript, no network calls.

export const ANALYSIS_VERSION = 1;

const POSITIVE_KEYWORDS = {
  happy: 3,
  joy: 3,
  joyful: 3,
  excited: 2,
  grateful: 2,
  gratitude: 2,
  love: 3,
  loved: 3,
  proud: 2,
  calm: 1,
  relaxed: 1,
  energized: 2,
  accomplished: 2,
  great: 2,
  amazing: 2,
  wonderful: 2,
  progress: 1,
  laugh: 2,
  smiling: 1,
  peaceful: 1,
};

const NEGATIVE_KEYWORDS = {
  sad: 3,
  angry: 3,
  upset: 2,
  anxious: 3,
  anxiety: 3,
  stressed: 3,
  stress: 3,
  tired: 2,
  exhausted: 3,
  lonely: 2,
  frustrated: 2,
  worry: 2,
  worried: 2,
  fear: 2,
  afraid: 2,
  overwhelmed: 3,
  disappointed: 2,
  confused: 1,
  bored: 1,
  burnt: 2,
  burnout: 3,
  hopeless: 3,
};

const CONTEXT_KEYWORDS = {
  rest: ['tired', 'exhausted', 'sleep', 'rest', 'burnout'],
  connection: ['lonely', 'alone', 'disconnected', 'isolated'],
  stress: ['stress', 'stressed', 'deadline', 'pressure', 'overwhelmed'],
  accomplishment: ['progress', 'accomplished', 'achieved', 'finished'],
  gratitude: ['grateful', 'gratitude', 'thankful', 'appreciate'],
};

const ADVICE_LIBRARY = {
  positive: [
    {
      id: 'positive-celebrate',
      title: 'Celebrate the Wins',
      body: 'Take a moment to note what made today feel good, and plan something small to keep the momentum tomorrow.',
    },
    {
      id: 'positive-share',
      title: 'Share the Joy',
      body: 'Consider telling a friend or loved one about the highlight of your day. Sharing positivity reinforces it.',
    },
  ],
  neutral: [
    {
      id: 'neutral-checkin',
      title: 'Check in With Yourself',
      body: 'Take a slow breath and ask how you really feel. Sometimes neutrality hides subtle needs.',
    },
    {
      id: 'neutral-reflect',
      title: 'Micro Reflection',
      body: 'Write down one small thing you appreciated today. It can gently tilt the balance toward gratitude.',
    },
  ],
  negative: [
    {
      id: 'negative-grounding',
      title: 'Grounding Reminder',
      body: 'Try a short grounding exercise—name five things you can see, four things you can touch. Reconnect with the present.',
    },
    {
      id: 'negative-support',
      title: 'Reach Out',
      body: 'Consider messaging someone you trust. Sharing how you feel is a sign of strength, not weakness.',
    },
  ],
  rest: [
    {
      id: 'rest-recharge',
      title: 'Protect Your Energy',
      body: 'Block a small window for rest—stretch, nap, or simply breathe without screens.',
    },
  ],
  connection: [
    {
      id: 'connection-check',
      title: 'Nurture Connection',
      body: 'Plan a quick call or message with someone who lifts you up. Even a short chat can soften loneliness.',
    },
  ],
  stress: [
    {
      id: 'stress-break',
      title: 'Schedule a Break',
      body: 'Step away for five minutes—walk, stretch, or sip water. Short pauses reset your nervous system.',
    },
  ],
  accomplishment: [
    {
      id: 'accomplishment-acknowledge',
      title: 'Acknowledge Progress',
      body: 'Note what helped you move forward today. Repeating those patterns builds steady growth.',
    },
  ],
  gratitude: [
    {
      id: 'gratitude-extend',
      title: 'Extend Gratitude',
      body: 'Send a quick thank-you note or message to someone involved. Gratitude deepens positive memories.',
    },
  ],
};

const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTI_SPACE_REGEX = /\s+/g;

const decodeEntities = (raw = '') =>
  String(raw)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, '/');

const stripHtml = (raw = '') => {
  if (!raw) return '';
  const decoded = decodeEntities(raw);
  return decoded.replace(HTML_TAG_REGEX, ' ').replace(MULTI_SPACE_REGEX, ' ').trim();
};

const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

const scoreFromTokens = (tokens) => {
  let positive = 0;
  let negative = 0;
  const matchedPositives = new Set();
  const matchedNegatives = new Set();

  tokens.forEach((token) => {
    if (POSITIVE_KEYWORDS[token]) {
      positive += POSITIVE_KEYWORDS[token];
      matchedPositives.add(token);
    }
    if (NEGATIVE_KEYWORDS[token]) {
      negative += NEGATIVE_KEYWORDS[token];
      matchedNegatives.add(token);
    }
  });

  return {
    rawScore: positive - negative,
    positiveWeight: positive,
    negativeWeight: negative,
    matchedPositives: Array.from(matchedPositives),
    matchedNegatives: Array.from(matchedNegatives),
  };
};

const deriveTone = (score, moodName) => {
  let adjusted = score;

  let mood = null;
  if (typeof moodName === 'string' && moodName.length) {
    mood = moodName.toLowerCase();
  } else if (moodName && typeof moodName === 'object') {
    const candidate = typeof moodName.name === 'string' ? moodName.name : typeof moodName.label === 'string' ? moodName.label : null;
    if (candidate) {
      mood = candidate.toLowerCase();
    }
  }

  if (mood) {
    if (['sad', 'angry', 'tired'].includes(mood)) {
      adjusted -= 2;
    } else if (['happy', 'excited', 'calm'].includes(mood)) {
      adjusted += 2;
    }
  }

  if (adjusted >= 3) return 'positive';
  if (adjusted <= -3) return 'negative';
  return 'neutral';
};

const collectContextTags = (tokens) => {
  const tags = new Set();
  Object.entries(CONTEXT_KEYWORDS).forEach(([tag, keywords]) => {
    if (keywords.some((word) => tokens.includes(word))) {
      tags.add(tag);
    }
  });
  return Array.from(tags);
};

const selectAdvice = (tone, tags) => {
  const advice = [];
  const usedIds = new Set();

  const pushFromPool = (pool) => {
    pool.forEach((item) => {
      if (!usedIds.has(item.id)) {
        advice.push(item);
        usedIds.add(item.id);
      }
    });
  };

  if (ADVICE_LIBRARY[tone]) {
    pushFromPool(ADVICE_LIBRARY[tone]);
  }

  tags.forEach((tag) => {
    if (ADVICE_LIBRARY[tag]) {
      pushFromPool(ADVICE_LIBRARY[tag]);
    }
  });

  return advice.slice(0, 4);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const convertToScore100 = (rawScore) => {
  const normalized = clamp(rawScore, -10, 10);
  return Math.round(((normalized + 10) / 20) * 100);
};

export const analyzeDiaryEntry = (entry) => {
  const { content, contentHTML, mood } = entry || {};
  const plainText = stripHtml(content || contentHTML || '');
  const tokens = tokenize(plainText);
  const {
    rawScore,
    positiveWeight,
    negativeWeight,
    matchedPositives,
    matchedNegatives,
  } = scoreFromTokens(tokens);

  const tone = deriveTone(rawScore, mood);
  const tags = collectContextTags(tokens);
  const score100 = convertToScore100(rawScore);
  const advice = selectAdvice(tone, tags);

  return {
    version: ANALYSIS_VERSION,
    computedAt: new Date().toISOString(),
    summary: {
      tone,
      rawScore,
      score: score100,
      positiveWeight,
      negativeWeight,
      moodReference: mood || null,
    },
    keywords: {
      positives: matchedPositives,
      negatives: matchedNegatives,
      tags,
    },
    advice,
    plainTextPreview: plainText.slice(0, 160),
  };
};

export const ensureAnalysis = (entry) => {
  if (!entry) return entry;
  if (entry.analysis && entry.analysis.version === ANALYSIS_VERSION) {
    return entry;
  }
  return {
    ...entry,
    analysis: analyzeDiaryEntry(entry),
  };
};

