# Personal Insight Engine (PIE) - Implementation Plan

## Executive Summary

This document outlines the implementation plan for transforming WhisperLine into an intelligent, privacy-first diary application with an on-device Personal Insight Engine (PIE). The architecture adheres to four core principles:
1. **Be a Mirror, Not a Coach**: Objective data presentation, no prescriptive advice
2. **Zero-Friction & No-Tagging**: Automatic categorization, minimal user intervention
3. **Absolute Privacy (Local-First)**: All processing on-device, no server communication
4. **Long-Term Reliability & Scalability**: Efficient, incremental, asynchronous processing

---

## Part 1: Data Model Structure (TypeScript)

### 1.1 Rich Entry Object

The enhanced diary entry structure that contains all analyzed metadata:

```typescript
// models/RichEntry.ts

export type EmotionCategory = 
  | 'joy' | 'accomplishment' | 'contentment' | 'excitement'
  | 'anxiety' | 'sadness' | 'frustration' | 'tiredness'
  | 'neutral' | 'mixed';

export type ThemeLabel = 
  | '#Work' | '#Fitness' | '#Travel' | '#Relationships'
  | '#Learning' | '#Health' | '#Creativity' | '#Finance'
  | '#Family' | '#Friends' | '#Self' | '#Hobbies'
  | '#Reflections' | string; // Allow custom themes

export interface NamedEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'other';
  confidence: number; // 0-1
}

export interface EmotionAnalysis {
  primary: EmotionCategory;
  secondary?: EmotionCategory[];
  sentimentScore: number; // -1 to 1 (negative to positive)
  intensity: number; // 0-1 (weak to strong)
  manual?: boolean; // Whether user manually selected mood
}

export interface KeywordExtraction {
  keyword: string;
  frequency: number;
  relevance: number; // 0-1, calculated based on TF-IDF-like metric
}

export interface RichEntryMetadata {
  // Layer 1: Atomization & Enrichment
  keywords: KeywordExtraction[]; // Top 3-5 keywords
  namedEntities: NamedEntity[];
  emotionAnalysis: EmotionAnalysis;
  
  // Layer 2: Association & Classification
  companionIDs: string[]; // Links to Companion chapters
  themeLabels: ThemeLabel[]; // Multi-label theme classification
  chapterIDs: string[]; // All chapters this entry belongs to
  
  // Timestamps
  processedAt: string; // ISO timestamp when PIE processed this entry
  version: number; // Increment when re-analyzed
}

export interface RichEntry {
  // Original entry fields (from DiaryEntry model)
  id: string;
  title: string;
  content: string;
  contentHTML: string | null;
  mood: any; // Existing mood format (kept for backward compatibility)
  weather: any;
  createdAt: string;
  updatedAt: string;
  
  // Rich metadata
  metadata: RichEntryMetadata;
  
  // Legacy fields (for migration)
  companionIDs?: string[];
  analysis?: any;
  themeID?: string;
}
```

### 1.2 User State Model

The global state that aggregates insights across all entries:

```typescript
// models/UserState.ts

export interface ChapterMetrics {
  chapterId: string;
  title: string;
  type: 'companion' | 'theme';
  
  // Frequency metrics
  entryCount: number;
  frequencyPerWeek: number; // Average entries per week
  lastEntryDate: string; // ISO date
  
  // Emotion distribution
  emotionDistribution: Record<EmotionCategory, number>; // Count per emotion
  averageSentiment: number; // -1 to 1
  emotionHistory: Array<{
    date: string; // YYYY-MM-DD
    sentimentScore: number;
    primaryEmotion: EmotionCategory;
  }>;
  
  // Keywords
  topKeywords: Array<{
    keyword: string;
    frequency: number;
    trend: 'up' | 'down' | 'stable'; // Compared to previous period
  }>;
  
  // Associated entities
  topCompanions: Array<{
    companionId: string;
    frequency: number;
    avgSentiment: number;
  }>;
  
  // Word clouds
  positiveWordCloud: Array<{ word: string; weight: number }>;
  negativeWordCloud: Array<{ word: string; weight: number }>;
  
  // Sub-topics (for activity breakdown)
  subTopics?: Record<string, number>; // e.g., { "Running": 15, "Yoga": 8 }
  
  // Updated timestamp
  lastUpdated: string;
  version: number; // Increment when recalculated
}

export interface Storyline {
  id: string;
  title: string;
  entryIds: string[];
  startDate: string;
  endDate: string;
  keywords: string[];
  dominantEmotion: EmotionCategory;
  companionIds?: string[];
  themeLabels: ThemeLabel[];
  summary?: string; // Optional AI-generated summary
}

export interface CrossChapterCorrelation {
  chapterId1: string;
  chapterId2: string;
  correlationType: 'frequency' | 'emotion' | 'temporal';
  strength: number; // -1 to 1 (negative to positive correlation)
  description: string; // Human-readable insight
}

export interface FocusChapter {
  chapterId: string;
  score: number; // 0-1, calculated from frequency + recency + emotional intensity
  reason: string; // Why this is a focus (e.g., "High activity, recent entries, strong emotions")
  trend: 'emerging' | 'stable' | 'declining';
}

export interface UserStateModel {
  // Chapter metrics (one per chapter)
  chapterMetrics: Record<string, ChapterMetrics>; // keyed by chapterId
  
  // Global insights
  focusChapters: FocusChapter[]; // Top 1-3 focus chapters
  crossChapterCorrelations: CrossChapterCorrelation[];
  storylines: Storyline[];
  
  // Global statistics
  totalEntries: number;
  dateRange: {
    firstEntry: string; // ISO date
    lastEntry: string; // ISO date
  };
  overallEmotionTrend: Array<{
    date: string; // YYYY-MM-DD
    averageSentiment: number;
  }>;
  
  // Processing metadata
  lastFullAnalysis: string; // ISO timestamp
  lastIncrementalUpdate: string; // ISO timestamp
  version: number;
}

// Storage keys
export const USER_STATE_STORAGE_KEY = '@WhisperLine:userState';
export const RICH_ENTRIES_STORAGE_KEY = '@WhisperLine:richEntries';
```

---

## Part 2: PIE Core Functions & Modules

### 2.1 Layer 1: Atomization & Enrichment Layer

**Module: `services/PIE/AtomizationService.ts`**

```typescript
// Core functions:

1. tokenizeAndClean(text: string): string[]
   - Remove stop words
   - Lowercase, normalize
   - Return token array

2. extractNamedEntities(text: string): Promise<NamedEntity[]>
   - Use local NER model/library (e.g., compromise.js, natural.js)
   - Identify people, places, organizations
   - Return entities with confidence scores

3. extractTopKeywords(text: string, maxCount: number = 5): KeywordExtraction[]
   - Calculate TF-IDF-like scores
   - Filter stop words
   - Return top keywords with relevance scores

4. analyzeEmotion(text: string, manualMood?: any): EmotionAnalysis
   - Use sentiment analysis (Sentiment.js already in use)
   - Classify into granular emotions using keyword matching + sentiment
   - If manual mood exists, incorporate it
   - Return structured emotion analysis

5. enrichEntry(entry: DiaryEntry): Promise<RichEntryMetadata>
   - Orchestrates all atomization functions
   - Combines results into RichEntryMetadata
   - Handles errors gracefully
```

**Dependencies to add:**
- `compromise` or `natural` for NER
- Enhance existing `sentiment` library usage
- Custom keyword extraction algorithm

### 2.2 Layer 2: Association & Classification Layer

**Module: `services/PIE/AssociationService.ts`**

```typescript
// Core functions:

1. associateCompanions(
     entry: RichEntry, 
     companions: Companion[]
   ): string[]
   - Match named entities (person type) with Companion names
   - Use fuzzy matching for name variations
   - Return array of companion IDs

2. classifyThemes(
     entry: RichEntry,
     existingThemes: ThemeLabel[]
   ): Promise<ThemeLabel[]>
   - Multi-label text classification
   - Use keyword matching + local model (if available)
   - Can belong to multiple themes
   - Return array of theme labels

3. linkToChapters(
     entry: RichEntry,
     chapters: Chapter[]
   ): string[]
   - Match entry to existing chapters
   - Create new theme chapters if needed
   - Return array of chapter IDs

4. processAssociation(entry: RichEntry): Promise<Partial<RichEntryMetadata>>
   - Orchestrates association functions
   - Updates entry metadata with chapter links
   - Calls ChapterService to update chapter entry lists
```

**Integration with existing `ChapterService.ts`:**
- Enhance `processEntry()` to accept RichEntry
- Use metadata for smarter chapter creation
- Support multi-label theme assignment

### 2.3 Layer 3: Aggregation & Pattern Discovery Layer

**Module: `services/PIE/AggregationService.ts`**

```typescript
// Core functions:

1. updateChapterMetricsIncremental(
     chapterId: string,
     newEntry: RichEntry,
     existingMetrics: ChapterMetrics
   ): ChapterMetrics
   - Incrementally update metrics without full recalculation
   - Update emotion distribution
   - Recalculate frequency per week
   - Update keyword frequencies
   - Return updated metrics

2. calculateEmotionDistribution(
     entries: RichEntry[]
   ): Record<EmotionCategory, number>
   - Count emotions across entries
   - Return distribution object

3. generateWordClouds(
     entries: RichEntry[],
     sentimentThreshold: number = 0.1
   ): {
     positive: Array<{ word: string; weight: number }>,
     negative: Array<{ word: string; weight: number }>
   }
   - Extract keywords from positive entries (sentiment > threshold)
   - Extract keywords from negative entries (sentiment < -threshold)
   - Calculate weights based on frequency and relevance
   - Return word cloud data

4. identifyStorylines(
     entries: RichEntry[],
     timeWindowDays: number = 7,
     minEntryCount: number = 3
   ): Storyline[]
   - Cluster entries by time proximity
   - Check keyword/entity overlap
   - Group into storylines
   - Return storyline array

5. calculateCrossChapterCorrelations(
     chapterMetrics: Record<string, ChapterMetrics>
   ): CrossChapterCorrelation[]
   - Analyze frequency correlations
   - Analyze emotion correlations
   - Analyze temporal patterns
   - Return correlation array

6. calculateFocusChapters(
     chapterMetrics: Record<string, ChapterMetrics>,
     recentDays: number = 30
   ): FocusChapter[]
   - Score based on: frequency, recency, emotional intensity
   - Select top 1-3 chapters
   - Determine trend (emerging/stable/declining)
   - Return focus chapters array

7. updateUserStateIncremental(
     newEntry: RichEntry,
     existingState: UserStateModel
   ): Promise<UserStateModel>
   - Update affected chapter metrics incrementally
   - Recalculate focus chapters
   - Update global statistics
   - Return updated state
```

**Module: `services/PIE/AggregationService.background.ts`**

```typescript
// Background processing functions:

1. runFullAnalysis(
     entries: RichEntry[],
     chapters: Chapter[]
   ): Promise<UserStateModel>
   - Full recalculation (for "Rebuild Chapters" feature)
   - Calculate all metrics from scratch
   - Identify all storylines
   - Calculate all correlations
   - Return complete user state

2. scheduleIncrementalUpdates(
     callback: (progress: number) => void
   ): Promise<void>
   - Process entries in batches
   - Report progress via callback
   - Use InteractionManager to avoid blocking UI
```

### 2.4 PIE Orchestrator

**Module: `services/PIE/PIEService.ts`**

```typescript
// Main service that orchestrates all layers:

class PIEService {
  // Process a single entry through all layers
  async processEntry(entry: DiaryEntry): Promise<RichEntry>
  
  // Process entry and update user state
  async processAndUpdate(
    entry: DiaryEntry,
    updateUserState: boolean = true
  ): Promise<{ richEntry: RichEntry; updatedChapters: Chapter[] }>
  
  // Rebuild everything (for "Rebuild Chapters")
  async rebuildAll(
    entries: DiaryEntry[],
    progressCallback?: (progress: number) => void
  ): Promise<UserStateModel>
  
  // Get current user state
  async getUserState(): Promise<UserStateModel>
  
  // Get rich entry by ID
  async getRichEntry(entryId: string): Promise<RichEntry | null>
  
  // Incremental background processing
  async processPendingEntries(): Promise<void>
}
```

---

## Part 3: React Native Components

### 3.1 Feature A: Rebuild Chapters Button

**Modified Component: `app/(tabs)/chapters.tsx`**

**Changes:**
- Add refresh icon button in header (top-right)
- Add state for progress tracking
- Add confirmation dialog modal

**New Components:**

1. **`components/RebuildChaptersDialog.tsx`**
   - Confirmation dialog
   - Shows warning about processing time
   - "Proceed" / "Cancel" actions

2. **`components/ReanalysisProgress.tsx`**
   - Non-blocking progress indicator
   - Shows percentage and status
   - Can be dismissed (continues in background)

**Integration:**
- Call `PIEService.rebuildAll()` with progress callback
- Update chapters list when complete

### 3.2 Feature B: Analytical Drill-Down Experience

**Layer 1: Chapter Card**

**Modified Component: `components/ChapterCard.tsx`**

**New Props:**
```typescript
interface ChapterCardProps {
  chapter: Chapter;
  metrics?: ChapterMetrics; // From UserStateModel
  isFocus?: boolean; // Highlight if focus chapter
}
```

**New Display Elements:**
- Dynamic subtitle (generated from metrics)
- Key metrics: "Avg. X times/week", "Y% Positive Emotion"
- Subtle glow/highlight if `isFocus === true`

**Layer 2: Dashboard Screen**

**New Component: `screens/ChapterDashboardScreen.tsx`**

**Sub-components:**

1. **`components/chapter-dashboard/ConsistencyCalendar.tsx`**
   - Calendar heatmap (use `react-native-calendars` if available)
   - Color intensity = activity + emotion
   - Shows entry dates for this chapter

2. **`components/chapter-dashboard/EmotionROIChart.tsx`**
   - Pie/donut chart (use `react-native-chart-kit` or `victory-native`)
   - Shows emotion distribution
   - Segments are tappable
   - Navigate to filtered entry list on tap

3. **`components/chapter-dashboard/ActivityBreakdown.tsx`**
   - Bar chart for sub-topics
   - Extract sub-topics from keywords (e.g., "Running", "Yoga" from Fitness)
   - Display frequency

4. **`components/chapter-dashboard/AssociatedCompanions.tsx`**
   - List of companion avatars
   - Show frequency of mention
   - Tap to navigate to companion chapter

5. **`components/chapter-dashboard/WordClouds.tsx`**
   - Two word clouds: Challenges & Motivators
   - Use library like `react-wordcloud` or custom implementation
   - Words sized by weight
   - Tap word to filter entries

**Layer 3: Contextual Diary List**

**New Component: `screens/FilteredEntriesScreen.tsx`**

**Props:**
```typescript
interface FilteredEntriesScreenProps {
  chapterId?: string;
  emotionFilter?: EmotionCategory;
  keywordFilter?: string;
  dateRange?: { start: string; end: string };
}
```

**Features:**
- Filter entries based on context
- Highlight relevant keywords in preview
- Show emotion indicators
- Navigate to full entry detail

### 3.3 Feature C: Focus Engine UI

**Modified Component: `app/(tabs)/chapters.tsx`**

**Changes:**
- Sort chapters by focus score (or highlight top 3)
- Add visual indicator (glow/badge) for focus chapters
- Update when user state changes

**Modified Component: `screens/TimelineScreen.js`**

**New Features:**

1. **Smart Highlighting**
   - Component: `components/TimelineFocusIndicator.tsx`
   - Add colored dots to calendar dates
   - Different colors for different focus chapters
   - Tap to see which entries contributed

2. **Contextual Placeholder**
   - Modify placeholder in `app/add-edit-diary.js`
   - Check if date is in a focus chapter's recent entries
   - Suggest relevant prompt (e.g., "How was your workout?")

**New Component: `components/FocusIndicator.tsx`**
- Reusable component for showing focus status
- Can be used in multiple places

### 3.4 Supporting Components

**New Component: `components/InsightCard.tsx`**
- Reusable card for displaying insights
- Supports different insight types
- Consistent styling

**New Component: `components/MetricDisplay.tsx`**
- Display key metrics (frequency, sentiment, etc.)
- Consistent formatting
- Optional trend indicators

**New Hook: `hooks/useUserState.ts`**
- Subscribe to user state changes
- Provide helper functions
- Cache and optimize updates

**New Hook: `hooks/useChapterMetrics.ts`**
- Get metrics for a specific chapter
- Handle loading states
- Auto-refresh on updates

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. ✅ Create TypeScript interfaces for RichEntry and UserStateModel
2. ✅ Implement Layer 1 (Atomization & Enrichment)
3. ✅ Migrate existing entries to RichEntry format
4. ✅ Set up PIEService orchestrator

### Phase 2: Association & Basic UI (Week 3-4)
1. ✅ Implement Layer 2 (Association & Classification)
2. ✅ Enhance ChapterService for multi-label themes
3. ✅ Create ChapterDashboardScreen structure
4. ✅ Implement basic metrics display

### Phase 3: Aggregation & Insights (Week 5-6)
1. ✅ Implement Layer 3 (Aggregation & Pattern Discovery)
2. ✅ Build UserStateModel calculation logic
3. ✅ Implement Focus Engine calculation
4. ✅ Add storylines and correlations

### Phase 4: Advanced UI Features (Week 7-8)
1. ✅ Complete ChapterDashboardScreen with all widgets
2. ✅ Implement FilteredEntriesScreen
3. ✅ Add Focus Engine UI indicators
4. ✅ Implement Rebuild Chapters feature

### Phase 5: Polish & Optimization (Week 9-10)
1. ✅ Performance optimization (incremental updates)
2. ✅ Background processing improvements
3. ✅ Error handling and edge cases
4. ✅ User testing and refinements

---

## Technical Considerations

### Performance Optimization
- Use `InteractionManager` for non-blocking processing
- Implement incremental updates (don't recalculate everything)
- Cache user state and chapter metrics
- Batch AsyncStorage operations
- Use React.memo for expensive components

### Privacy & Local-First
- All processing must run on-device
- No API calls for analysis
- Use local libraries: `sentiment`, `natural`, `compromise`
- Consider TensorFlow.js for advanced models (optional)

### Data Migration
- Create migration script to convert existing DiaryEntry to RichEntry
- Handle entries without metadata gracefully
- Maintain backward compatibility during transition

### Error Handling
- Graceful degradation if analysis fails
- Continue with basic categorization if advanced features fail
- Log errors but don't block user interaction

### Testing Strategy
- Unit tests for PIE functions
- Integration tests for data flow
- Performance tests for large datasets (10k+ entries)
- UI tests for new components

---

## Dependencies to Add

```json
{
  "dependencies": {
    // NLP libraries (choose one or combination)
    "natural": "^6.0.0", // For NER and tokenization
    "compromise": "^14.0.0", // Alternative NER solution
    
    // Chart libraries
    "react-native-chart-kit": "^6.12.0", // Already installed
    "victory-native": "^36.0.0", // Alternative for more control
    
    // Word cloud (may need custom implementation)
    // Or use SVG-based custom component
    
    // Optional: TensorFlow.js for advanced models
    "@tensorflow/tfjs": "^4.0.0",
    "@tensorflow/tfjs-react-native": "^0.8.0"
  }
}
```

---

## Next Steps

1. Review and approve this plan
2. Set up TypeScript configuration for new models
3. Create initial file structure
4. Begin Phase 1 implementation
5. Set up testing infrastructure

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*

