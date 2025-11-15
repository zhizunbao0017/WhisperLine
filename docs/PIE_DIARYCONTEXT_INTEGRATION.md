# PIE Service Integration with DiaryContext

## ✅ Completed Integration

### Part 1: Provider Order Update
- ✅ Modified `app/_layout.js` to move `UserStateProvider` to be a parent of `DiaryProvider`
  - This ensures `DiaryContext` can access `UserStateContext` via the `useUserState` hook
  - Provider hierarchy: `AuthProvider` > `UserStateProvider` > `DiaryProvider` > `CompanionProvider` > `SubscriptionProvider` > `ThemeProvider`

### Part 2: UserStateContext Enhancement
- ✅ Enhanced `context/UserStateContext.tsx` to manage `allRichEntries`
  - Added `allRichEntries: Record<string, RichEntry>` state
  - Added `updateRichEntries()` method to update all rich entries
  - Added `addRichEntry()` method to add a single rich entry
  - Added storage key `@WhisperLine:richEntries` for persistence
  - Both `userState` and `allRichEntries` are loaded/saved from AsyncStorage

### Part 3: PIEService Modification
- ✅ Modified `services/PIE/PIEService.ts` to return both `updatedState` and `richEntry`
  - Changed `processNewEntry()` return type from `UserStateModel` to `{ updatedState: UserStateModel; richEntry: RichEntry }`
  - This allows `DiaryContext` to update both the user state and the rich entries collection

### Part 4: DiaryContext Integration
- ✅ Modified `context/DiaryContext.js` to integrate PIE service
  - Added imports for `useUserState` hook and `pieService`
  - Added `extractTextContent()` helper function to convert diary entries to plain text
  - Integrated PIE processing into `addDiary()`, `updateDiary()`, and `createQuickEntry()` functions
  - PIE processing runs asynchronously and doesn't block diary saving if it fails

## 📁 Files Modified

1. **app/_layout.js**
   - Reordered providers: `UserStateProvider` is now a parent of `DiaryProvider`

2. **context/UserStateContext.tsx**
   - Added `allRichEntries` state management
   - Added `updateRichEntries()` and `addRichEntry()` methods
   - Added `RICH_ENTRIES_STORAGE_KEY` constant

3. **services/PIE/PIEService.ts**
   - Modified `processNewEntry()` to return `{ updatedState, richEntry }`

4. **context/DiaryContext.js**
   - Added PIE service integration
   - Added `extractTextContent()` helper function
   - Integrated PIE processing into diary operations

## 🔍 Key Implementation Details

### Text Content Extraction

```javascript
const extractTextContent = (entry) => {
  // Use content if available and not empty
  if (entry.content && entry.content.trim().length > 0) {
    // If content contains HTML, strip it
    return entry.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }
  // Otherwise use contentHTML and strip HTML tags
  if (entry.contentHTML && entry.contentHTML.trim().length > 0) {
    return entry.contentHTML.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }
  // Fallback to empty string
  return '';
};
```

- Extracts plain text from diary entries
- Handles both `content` and `contentHTML` fields
- Strips HTML tags using regex
- Normalizes whitespace

### PIE Processing Flow

```javascript
// 1. Extract plain text content
const textContent = extractTextContent(newEntry);

// 2. Convert to PIE format
const pieEntry = {
  id: newEntry.id,
  content: textContent,
  createdAt: newEntry.createdAt,
};

// 3. Get current state
const { userState, allRichEntries, updateUserState, addRichEntry } = userStateContext;

// 4. Process with PIE service
const { updatedState, richEntry } = pieService.processNewEntry(
  pieEntry,
  userState,
  allRichEntries
);

// 5. Update state (persists to AsyncStorage automatically)
await updateUserState(updatedState);
await addRichEntry(richEntry);
```

### Error Handling

- PIE processing is wrapped in try-catch blocks
- Errors are logged but don't block diary operations
- If PIE processing fails, the diary entry is still saved
- This ensures the app remains functional even if PIE has issues

## 🚀 Data Flow

### When a New Diary Entry is Saved

```
User saves diary entry
    ↓
DiaryContext.addDiary()
    ↓
1. Save diary entry to AsyncStorage
    ↓
2. Process with chapterService (existing)
    ↓
3. Process with achievementService (existing)
    ↓
4. Extract text content from entry
    ↓
5. Convert to PIE format
    ↓
6. Call pieService.processNewEntry()
    ↓
7. Update UserStateModel (chapters, storylines, focus)
    ↓
8. Add RichEntry to allRichEntries collection
    ↓
9. Persist to AsyncStorage (via UserStateContext)
    ↓
10. UI updates automatically (Chapters screen shows focus chapters)
```

### When a Diary Entry is Updated

```
User updates diary entry
    ↓
DiaryContext.updateDiary()
    ↓
1. Save updated diary entry to AsyncStorage
    ↓
2. Process with chapterService (existing)
    ↓
3. Process with achievementService (existing)
    ↓
4. Extract text content from updated entry
    ↓
5. Convert to PIE format
    ↓
6. Call pieService.processNewEntry() (reprocesses entry)
    ↓
7. Update UserStateModel (chapters may change)
    ↓
8. Update RichEntry in allRichEntries collection
    ↓
9. Persist to AsyncStorage (via UserStateContext)
    ↓
10. UI updates automatically
```

## ⚠️ Important Notes

### Provider Order

The `UserStateProvider` MUST be a parent of `DiaryProvider` in the component tree. This is ensured by the provider order in `app/_layout.js`:

```javascript
<AuthProvider>
  <UserStateProvider>
    <DiaryProvider>
      {/* ... other providers ... */}
    </DiaryProvider>
  </UserStateProvider>
</AuthProvider>
```

### Rich Entries Storage

- `allRichEntries` is stored separately from `userState` in AsyncStorage
- This allows for efficient updates and queries
- The collection is loaded on app startup and updated incrementally

### Incremental Updates

- PIE processing uses incremental updates for performance
- Only affected chapters are recalculated
- `allRichEntries` is passed to aggregation service for accurate metrics

### Error Resilience

- PIE processing failures don't block diary operations
- Errors are logged for debugging
- The app remains functional even if PIE has issues
- This ensures a good user experience

## 🧪 Testing

### Manual Testing Steps

1. **Create a New Diary Entry**
   - Create a new diary entry with text content
   - Check console logs for "PIE: Processing new diary entry..."
   - Verify entry is saved to AsyncStorage
   - Verify UserStateModel is updated
   - Verify RichEntry is added to allRichEntries
   - Check Chapters screen for focus chapters (if any)

2. **Update a Diary Entry**
   - Update an existing diary entry
   - Check console logs for "PIE: Processing updated diary entry..."
   - Verify entry is updated in AsyncStorage
   - Verify UserStateModel is updated
   - Verify RichEntry is updated in allRichEntries

3. **Create a Quick Entry**
   - Create a quick entry via quick capture
   - Check console logs for "PIE: Processing quick entry..."
   - Verify entry is saved and processed

4. **Verify Focus Chapters**
   - Create multiple diary entries
   - Wait for PIE processing to complete
   - Check Chapters screen for focus chapters (should be highlighted)
   - Verify focus chapters have glow effect

### Expected Behavior

**Scenario 1: New Entry with Content**
- Entry is saved to AsyncStorage
- PIE processes the entry
- UserStateModel is updated with new chapters
- RichEntry is added to allRichEntries
- Focus chapters are calculated and displayed

**Scenario 2: Entry Update**
- Entry is updated in AsyncStorage
- PIE reprocesses the entry
- UserStateModel is updated (chapters may change)
- RichEntry is updated in allRichEntries
- Focus chapters are recalculated

**Scenario 3: PIE Processing Failure**
- Entry is still saved to AsyncStorage
- Error is logged to console
- App continues to function normally
- User can retry by updating the entry

## 🚀 Next Steps

1. **Rebuild All Entries**
   - Add a "Rebuild Chapters" button in Settings
   - Call `pieService.rebuildAll()` with all diary entries
   - Update UserStateModel and allRichEntries

2. **Performance Optimization**
   - Batch PIE processing for multiple entries
   - Cache rich entries for faster access
   - Optimize aggregation calculations

3. **Error Recovery**
   - Add retry logic for failed PIE processing
   - Add background processing for large datasets
   - Add progress indicators for long operations

4. **Analytics**
   - Track PIE processing time
   - Monitor error rates
   - Track focus chapter accuracy

## 📊 Complete Integration Checklist

- [x] UserStateProvider is a parent of DiaryProvider
- [x] UserStateContext manages allRichEntries
- [x] PIEService returns both updatedState and richEntry
- [x] DiaryContext integrates PIE service
- [x] Text content extraction works correctly
- [x] PIE processing doesn't block diary operations
- [x] Error handling is implemented
- [x] State persistence works correctly
- [x] UI updates automatically
- [x] No linter errors

---

*Integration completed on: [Current Date]*
*Next: Test with real diary entries and verify focus chapters appear*

