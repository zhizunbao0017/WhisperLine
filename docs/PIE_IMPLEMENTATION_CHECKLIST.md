# PIE Implementation Checklist

This is a quick reference checklist for implementing the Personal Insight Engine.

---

## 📋 Part 1: Data Models (TypeScript)

### ✅ Created Files
- [x] `models/PIE.ts` - Core PIE type definitions
- [x] `models/RichEntry.ts` - Rich Entry Object
- [x] `models/UserState.ts` - User State Model

### 📝 Integration Required
- [ ] Update `models/DiaryEntry.js` to support RichEntry metadata
- [ ] Create migration utility to convert existing entries
- [ ] Update `context/DiaryContext.js` to handle RichEntry

---

## 🔧 Part 2: PIE Core Modules & Functions

### Layer 1: Atomization & Enrichment

#### Module: `services/PIE/AtomizationService.ts`

**Functions to Implement:**
- [ ] `tokenizeAndClean(text: string): string[]`
  - Remove stop words, normalize, lowercase
  
- [ ] `extractNamedEntities(text: string): Promise<NamedEntity[]>`
  - Use natural.js or compromise.js for NER
  - Identify people, places, organizations
  - Return with confidence scores
  
- [ ] `extractTopKeywords(text: string, maxCount: number = 5): KeywordExtraction[]`
  - Calculate TF-IDF-like scores
  - Filter stop words
  - Return top keywords with relevance
  
- [ ] `analyzeEmotion(text: string, manualMood?: any): EmotionAnalysis`
  - Use existing Sentiment.js
  - Classify into granular emotions
  - Incorporate manual mood if provided
  
- [ ] `enrichEntry(entry: DiaryEntry): Promise<RichEntryMetadata>`
  - Orchestrates all atomization functions
  - Combines results into RichEntryMetadata
  - Error handling

**Dependencies to Add:**
- [ ] `natural` or `compromise` for NER
- [ ] Enhance existing `sentiment` usage

---

### Layer 2: Association & Classification

#### Module: `services/PIE/AssociationService.ts`

**Functions to Implement:**
- [ ] `associateCompanions(entry: RichEntry, companions: Companion[]): string[]`
  - Match named entities with Companion names
  - Fuzzy matching for name variations
  - Return companion IDs
  
- [ ] `classifyThemes(entry: RichEntry, existingThemes: ThemeLabel[]): Promise<ThemeLabel[]>`
  - Multi-label text classification
  - Keyword matching + local model (if available)
  - Return theme labels array
  
- [ ] `linkToChapters(entry: RichEntry, chapters: Chapter[]): string[]`
  - Match entry to existing chapters
  - Create new theme chapters if needed
  - Return chapter IDs array
  
- [ ] `processAssociation(entry: RichEntry): Promise<Partial<RichEntryMetadata>>`
  - Orchestrates association functions
  - Updates entry metadata with chapter links
  - Calls ChapterService

**Integration Points:**
- [ ] Enhance `services/ChapterService.ts` `processEntry()` method
- [ ] Support multi-label theme assignment
- [ ] Update chapter entry lists

---

### Layer 3: Aggregation & Pattern Discovery

#### Module: `services/PIE/AggregationService.ts`

**Functions to Implement:**
- [ ] `updateChapterMetricsIncremental(chapterId, newEntry, existingMetrics): ChapterMetrics`
  - Incremental update (no full recalculation)
  - Update emotion distribution
  - Recalculate frequency per week
  - Update keyword frequencies
  
- [ ] `calculateEmotionDistribution(entries: RichEntry[]): Record<EmotionCategory, number>`
  - Count emotions across entries
  - Return distribution object
  
- [ ] `generateWordClouds(entries, sentimentThreshold): { positive, negative }`
  - Extract keywords from positive/negative entries
  - Calculate weights
  - Return word cloud data
  
- [ ] `identifyStorylines(entries, timeWindowDays, minEntryCount): Storyline[]`
  - Cluster entries by time proximity
  - Check keyword/entity overlap
  - Group into storylines
  
- [ ] `calculateCrossChapterCorrelations(chapterMetrics): CrossChapterCorrelation[]`
  - Analyze frequency correlations
  - Analyze emotion correlations
  - Analyze temporal patterns
  
- [ ] `calculateFocusChapters(chapterMetrics, recentDays): FocusChapter[]`
  - Score based on frequency, recency, emotional intensity
  - Select top 1-3 chapters
  - Determine trend
  
- [ ] `updateUserStateIncremental(newEntry, existingState): Promise<UserStateModel>`
  - Update affected chapter metrics
  - Recalculate focus chapters
  - Update global statistics

#### Module: `services/PIE/AggregationService.background.ts`

**Functions to Implement:**
- [ ] `runFullAnalysis(entries, chapters): Promise<UserStateModel>`
  - Full recalculation (for "Rebuild Chapters")
  - Calculate all metrics from scratch
  - Identify all storylines
  - Calculate all correlations
  
- [ ] `scheduleIncrementalUpdates(callback): Promise<void>`
  - Process entries in batches
  - Report progress via callback
  - Use InteractionManager

---

### PIE Orchestrator

#### Module: `services/PIE/PIEService.ts`

**Class Methods to Implement:**
- [ ] `processEntry(entry: DiaryEntry): Promise<RichEntry>`
  - Process through all layers
  - Return enriched entry
  
- [ ] `processAndUpdate(entry, updateUserState): Promise<{ richEntry, updatedChapters }>`
  - Process entry and update user state
  - Return results
  
- [ ] `rebuildAll(entries, progressCallback): Promise<UserStateModel>`
  - Full rebuild (for "Rebuild Chapters")
  - Progress reporting
  
- [ ] `getUserState(): Promise<UserStateModel>`
  - Get current user state from storage
  
- [ ] `getRichEntry(entryId): Promise<RichEntry | null>`
  - Get rich entry by ID
  
- [ ] `processPendingEntries(): Promise<void>`
  - Background processing

**Storage Integration:**
- [ ] Load/save RichEntry to AsyncStorage
- [ ] Load/save UserStateModel to AsyncStorage
- [ ] Cache management

---

## 🎨 Part 3: React Native Components

### Feature A: Rebuild Chapters Button

#### Modified Components
- [ ] `app/(tabs)/chapters.tsx`
  - Add refresh icon button (top-right)
  - Add state for progress tracking
  - Integrate RebuildChaptersDialog
  - Integrate ReanalysisProgress

#### New Components
- [ ] `components/RebuildChaptersDialog.tsx`
  - Confirmation dialog
  - Warning about processing time
  - "Proceed" / "Cancel" actions

- [ ] `components/ReanalysisProgress.tsx`
  - Non-blocking progress indicator
  - Percentage and status display
  - Dismissible (continues in background)

---

### Feature B: Analytical Drill-Down Experience

#### Layer 1: Chapter Card

**Modified Component:**
- [ ] `components/ChapterCard.tsx`
  - Add `metrics?: ChapterMetrics` prop
  - Add `isFocus?: boolean` prop
  - Display dynamic subtitle (from metrics)
  - Display key metrics ("Avg. X times/week", "Y% Positive")
  - Add visual highlight if `isFocus === true`

#### Layer 2: Dashboard Screen

**New Main Component:**
- [ ] `screens/ChapterDashboardScreen.tsx`
  - Main dashboard screen
  - Orchestrates all dashboard widgets
  - Handles navigation to filtered entries

**Sub-components:**
- [ ] `components/chapter-dashboard/ConsistencyCalendar.tsx`
  - Calendar heatmap
  - Color intensity = activity + emotion
  - Shows entry dates for chapter
  - Uses `react-native-calendars` or custom implementation

- [ ] `components/chapter-dashboard/EmotionROIChart.tsx`
  - Pie/donut chart
  - Shows emotion distribution
  - Tappable segments
  - Navigate to filtered entry list on tap
  - Uses `react-native-chart-kit` or `victory-native`

- [ ] `components/chapter-dashboard/ActivityBreakdown.tsx`
  - Bar chart for sub-topics
  - Extract sub-topics from keywords
  - Display frequency
  - Uses chart library

- [ ] `components/chapter-dashboard/AssociatedCompanions.tsx`
  - List of companion avatars
  - Show frequency of mention
  - Tap to navigate to companion chapter
  - Uses existing `CompanionAvatarItem` component

- [ ] `components/chapter-dashboard/WordClouds.tsx`
  - Two word clouds: Challenges & Motivators
  - Words sized by weight
  - Tap word to filter entries
  - Custom SVG-based implementation or library

#### Layer 3: Contextual Diary List

**New Component:**
- [ ] `screens/FilteredEntriesScreen.tsx`
  - Filter entries based on context
  - Props: `chapterId?`, `emotionFilter?`, `keywordFilter?`, `dateRange?`
  - Highlight relevant keywords in preview
  - Show emotion indicators
  - Navigate to full entry detail
  - Reuse existing entry list components

---

### Feature C: Focus Engine UI

#### Modified Components
- [ ] `app/(tabs)/chapters.tsx`
  - Sort chapters by focus score
  - Add visual indicator (glow/badge) for focus chapters
  - Update when user state changes

- [ ] `screens/TimelineScreen.js`
  - Add smart highlighting (colored dots on calendar)
  - Integrate FocusIndicator component
  - Add contextual placeholder logic

- [ ] `app/add-edit-diary.js`
  - Modify placeholder text based on focus chapters
  - Check if date is in focus chapter's recent entries
  - Suggest relevant prompt

#### New Components
- [ ] `components/FocusIndicator.tsx`
  - Reusable component for showing focus status
  - Can be used in multiple places
  - Visual badge/glow effect

- [ ] `components/TimelineFocusIndicator.tsx`
  - Colored dots on calendar dates
  - Different colors for different focus chapters
  - Tap to see which entries contributed

---

### Supporting Components & Hooks

#### New Components
- [ ] `components/InsightCard.tsx`
  - Reusable card for displaying insights
  - Supports different insight types
  - Consistent styling

- [ ] `components/MetricDisplay.tsx`
  - Display key metrics (frequency, sentiment, etc.)
  - Consistent formatting
  - Optional trend indicators

#### New Hooks
- [ ] `hooks/useUserState.ts`
  - Subscribe to user state changes
  - Provide helper functions
  - Cache and optimize updates

- [ ] `hooks/useChapterMetrics.ts`
  - Get metrics for a specific chapter
  - Handle loading states
  - Auto-refresh on updates

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "natural": "^6.0.0",
    // OR
    "compromise": "^14.0.0",
    
    "victory-native": "^36.0.0",
    // (react-native-chart-kit already installed)
    
    // Optional: TensorFlow.js for advanced models
    "@tensorflow/tfjs": "^4.0.0",
    "@tensorflow/tfjs-react-native": "^0.8.0"
  }
}
```

---

## 🗄️ Storage Keys

**New Storage Keys:**
- `@WhisperLine:userState` - User State Model
- `@WhisperLine:richEntries` - Rich Entry Objects (or enhance existing `@MyAIDiary:diaries`)

**Consideration:**
- Store RichEntry alongside or replace DiaryEntry?
- Migration strategy for existing entries

---

## 🔄 Migration Strategy

### Phase 1: Parallel Storage
- [ ] Keep existing DiaryEntry format
- [ ] Add RichEntry metadata as optional field
- [ ] Process entries on-demand when accessed

### Phase 2: Gradual Migration
- [ ] Process all existing entries in background
- [ ] Store RichEntry format alongside DiaryEntry
- [ ] Update UI to use RichEntry when available

### Phase 3: Full Migration
- [ ] Replace DiaryEntry with RichEntry
- [ ] Remove old format (or keep as fallback)

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test all AtomizationService functions
- [ ] Test all AssociationService functions
- [ ] Test all AggregationService functions
- [ ] Test PIEService orchestrator

### Integration Tests
- [ ] Test end-to-end entry processing
- [ ] Test user state updates
- [ ] Test chapter metrics calculation
- [ ] Test focus engine calculation

### Performance Tests
- [ ] Test with 1,000 entries
- [ ] Test with 10,000 entries
- [ ] Test incremental updates performance
- [ ] Test background processing

### UI Tests
- [ ] Test ChapterDashboardScreen
- [ ] Test FilteredEntriesScreen
- [ ] Test Rebuild Chapters flow
- [ ] Test Focus Engine UI

---

## 📚 Documentation to Create

- [ ] API documentation for PIE services
- [ ] Component documentation
- [ ] User guide for new features
- [ ] Developer guide for extending PIE

---

## 🚀 Deployment Checklist

- [ ] Code review
- [ ] Performance testing
- [ ] Privacy audit (ensure all processing is local)
- [ ] User acceptance testing
- [ ] Release notes
- [ ] Rollout plan (phased or full)

---

*Last Updated: [Current Date]*

