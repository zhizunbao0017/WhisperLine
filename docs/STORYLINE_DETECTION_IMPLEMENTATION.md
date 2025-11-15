# Storyline Detection Implementation Summary

## ✅ Completed Tasks

### Part 1: Storyline Detection Constants
- ✅ Added `MAX_DAYS_BETWEEN_STORYLINE_ENTRIES = 3`
  - Maximum gap in days between entries to be considered part of the same story
  
- ✅ Added `MIN_ENTRIES_FOR_STORYLINE = 3`
  - Minimum number of entries required to form a storyline
  
- ✅ Added `MIN_KEYWORD_OVERLAP_SCORE = 2`
  - Minimum number of shared keywords to link entries together

### Part 2: Storyline Detection Methods
- ✅ Implemented `identifyStorylines()` private method
  - Chronologically sorts all entries
  - Groups entries based on time proximity and keyword overlap
  - Returns array of detected Storylines
  
- ✅ Implemented `createStorylineFromEntries()` private helper method
  - Converts a cluster of entries into a Storyline object
  - Generates title from top keywords
  - Sets start and end dates
  - Extracts key keywords

### Part 3: Integration
- ✅ Updated `runFullAggregation()` method
  - Calls `identifyStorylines()` after calculating chapter metrics
  - Stores storylines in the state
  - Properly integrated into the aggregation pipeline

### Part 4: Type Imports
- ✅ Added `Storyline` import from `models/PIE`
  - Correctly imported and used throughout the service

## 📁 Files Modified

1. **services/PIE/AggregationService.ts**
   - Added storyline detection constants
   - Implemented `identifyStorylines()` method
   - Implemented `createStorylineFromEntries()` helper method
   - Updated `runFullAggregation()` to call storyline detection

## 🔍 Key Implementation Details

### Storyline Detection Algorithm

#### Time-Based Clustering
1. **Sort Entries Chronologically**
   - All entries are sorted by `createdAt` timestamp
   - Ensures processing in chronological order

2. **Time Proximity Check**
   - Calculates days between current entry and last entry in potential story
   - If gap is ≤ 3 days, entry is considered for inclusion
   - Prevents stories from spanning too long a period

3. **Keyword Overlap Analysis**
   - Extracts keywords from last entry in potential story
   - Compares with keywords from current entry
   - Counts number of shared keywords (overlap score)
   - Requires minimum of 2 shared keywords to link entries

4. **Story Formation**
   - If both conditions met (time proximity + keyword overlap), entry joins current story
   - Otherwise, current story ends and new story begins
   - Stories with < 3 entries are discarded

5. **Final Story Creation**
   - Processes last potential story after loop ends
   - Creates Storyline objects for all valid stories

### Storyline Object Creation

#### Title Generation
- Aggregates all keywords from all entries in the story
- Counts frequency of each keyword
- Selects top 3 most frequent keywords
- Creates title by capitalizing and joining keywords with " & "
- Example: "Work & Project & Meeting"

#### Metadata Extraction
- **ID**: Generated from first entry ID (`story-{entryId}`)
- **Title**: Generated from top keywords
- **Entry IDs**: Array of all entry IDs in the story
- **Start Date**: Date of first entry
- **End Date**: Date of last entry
- **Key Keywords**: Top 3 most frequent keywords

## ⚠️ Algorithm Characteristics

### Strengths
1. **Chronological Processing**: Ensures stories follow time sequence
2. **Keyword-Based Linking**: Identifies thematic connections
3. **Time-Bounded**: Prevents stories from spanning too long
4. **Configurable Thresholds**: Constants can be adjusted for different use cases

### Limitations & Considerations

1. **Simple Keyword Matching**
   - Uses exact keyword matching (case-sensitive)
   - Doesn't account for synonyms or related terms
   - Could miss connections with different wording

2. **Fixed Time Window**
   - 3-day maximum gap might be too restrictive for some stories
   - Long-term projects might be split into multiple stories
   - Could be made configurable per user or story type

3. **Keyword Quality Dependency**
   - Relies on quality of keywords from AtomizationService
   - If keywords are poor, story detection will be poor
   - Requires good keyword extraction in Layer 1

4. **No Semantic Understanding**
   - Doesn't understand context or meaning
   - Purely based on keyword overlap
   - Could benefit from semantic similarity (future enhancement)

5. **No Entry Deduplication**
   - Same entry could theoretically appear in multiple stories
   - Currently not an issue due to sequential processing
   - Should be considered if algorithm changes

### Future Enhancements

1. **Semantic Similarity**
   - Use embeddings or semantic analysis
   - Better connection detection
   - Understand context, not just keywords

2. **Adaptive Thresholds**
   - Adjust time window based on story type
   - Learn from user behavior
   - Personalize detection parameters

3. **Multi-Dimensional Clustering**
   - Consider emotions, themes, companions
   - More sophisticated story grouping
   - Better narrative arc detection

4. **Storyline Merging**
   - Merge related stories that are close in time
   - Handle story continuation after gaps
   - Better handling of interrupted stories

5. **Storyline Titles**
   - Use AI to generate more descriptive titles
   - Consider entry content, not just keywords
   - Generate summaries for each storyline

## 🧪 Testing

### Example Usage

```typescript
import { pieService } from './services/PIE/PIEService';

// Rebuild all entries (automatically detects storylines)
const allEntries: DiaryEntry[] = [
  {
    id: 'entry-1',
    content: "Started working on the new project today. Excited!",
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'entry-2',
    content: "Made great progress on the project. Meeting went well.",
    createdAt: '2025-01-02T10:00:00Z',
  },
  {
    id: 'entry-3',
    content: "Finished the project! Time to celebrate.",
    createdAt: '2025-01-03T10:00:00Z',
  },
];

const rebuiltState = pieService.rebuildAll(allEntries);
console.log('Storylines:', rebuiltState.storylines);
// Expected: One storyline with 3 entries, titled something like "Project & Work & Meeting"
```

### Expected Behavior

**Scenario 1: Continuous Story**
- 3 entries over 2 days with shared keywords
- Result: 1 storyline with all 3 entries

**Scenario 2: Separated Stories**
- 3 entries over 2 days, then 3 entries 5 days later with different keywords
- Result: 2 separate storylines

**Scenario 3: Insufficient Entries**
- 2 entries with shared keywords
- Result: No storyline (minimum 3 entries required)

**Scenario 4: No Keyword Overlap**
- 3 entries over 2 days but no shared keywords
- Result: No storyline (minimum 2 keyword overlap required)

## ✅ Verification

- [x] No TypeScript/linter errors
- [x] Storyline type correctly imported
- [x] Constants defined and used
- [x] `identifyStorylines()` method implemented
- [x] `createStorylineFromEntries()` helper implemented
- [x] `runFullAggregation()` updated to call storyline detection
- [x] Storylines stored in state correctly
- [x] Algorithm handles edge cases (empty entries, single entry, etc.)
- [x] Chronological sorting works correctly
- [x] Keyword overlap calculation correct
- [x] Title generation works

## 🔄 Next Steps

1. **Test with Real Data**
   - Test with actual diary entries
   - Validate story detection quality
   - Adjust thresholds if needed

2. **Enhance Algorithm**
   - Add semantic similarity
   - Improve keyword matching
   - Add emotion-based clustering

3. **UI Integration**
   - Display storylines in UI
   - Allow users to view storyline entries
   - Show storyline timeline

4. **Storyline Management**
   - Allow users to edit storyline titles
   - Merge/split storylines manually
   - Delete unwanted storylines

5. **Performance Optimization**
   - Optimize for large numbers of entries
   - Cache storyline calculations
   - Incremental storyline updates

6. **Analytics**
   - Track storyline detection accuracy
   - Monitor user engagement with storylines
   - A/B test different thresholds

---

*Implementation completed on: [Current Date]*

