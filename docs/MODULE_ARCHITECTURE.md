# 模块架构文档 (Module Architecture Documentation)

## 概述

本文档定义了 WhisperLine 应用中各个功能模块的职责、边界和交互关系。正确理解模块架构是避免模块间冲突和修复 Bug 的关键。

---

## 核心模块分类

### 1. 数据层 (Data Layer)

#### 1.1 UserStateContext (`context/UserStateContext.tsx`)
**职责**:
- 管理应用的核心状态模型 (`UserStateModel`)
- 持久化存储到 AsyncStorage
- 提供全局加载状态管理
- 管理 Chapters、Companions、Storylines、Settings

**关键接口**:
```typescript
interface UserStateContextValue {
  userState: UserStateModel;
  allRichEntries: Record<string, RichEntry>;
  isLoading: boolean;
  updateUserState: (newState: UserStateModel) => Promise<void>;
  markLongPressHintSeen: () => Promise<void>;
  // ...
}
```

**数据流**:
- 读取：`AsyncStorage` → `userState` → Components
- 写入：Components → `updateUserState()` → `AsyncStorage`

**注意事项**:
- ⚠️ **单一数据源**: 所有 Chapters/Companions 数据必须从这里获取
- ⚠️ **加载顺序**: 应用启动时阻塞渲染直到数据加载完成
- ⚠️ **向后兼容**: 加载时自动迁移旧数据格式

---

#### 1.2 DiaryContext (`context/DiaryContext.js`)
**职责**:
- 管理日记条目的 CRUD 操作
- 与 PIEService 集成处理新条目
- 提供日记列表和操作函数

**关键接口**:
```javascript
{
  diaries: DiaryEntry[];
  addDiary: (diary) => Promise<void>;
  updateDiary: (id, diary) => Promise<void>;
  saveDiary: (diary) => Promise<void>; // 统一保存入口
  deleteDiary: (id) => Promise<void>;
}
```

**数据流**:
- 创建/更新：`saveDiary()` → `PIEService.processNewEntry()` → `UserStateContext.updateUserState()`
- 删除：`deleteDiary()` → 从 `diaries` 数组移除

**注意事项**:
- ⚠️ **与 PIEService 耦合**: 保存日记时会触发 PIE 处理
- ⚠️ **统一保存逻辑**: `saveDiary()` 内部区分创建和更新操作
- ⚠️ **数据同步**: 日记保存后需要刷新 `UserStateContext`

---

#### 1.3 PIEService (`services/PIE/PIEService.ts`)
**职责**:
- 处理日记条目的智能分析（Atomization）
- 关联条目与 Chapters（Association）
- 聚合 Chapter 指标（Aggregation）
- 重建完整的 UserStateModel

**关键方法**:
```typescript
processNewEntry(entry: DiaryEntry, userSelectedMood: string): Promise<void>
rebuildAll(entries: DiaryEntry[]): Promise<UserStateModel>
```

**数据流**:
- 输入：`DiaryEntry` + `userSelectedMood`
- 处理：Atomization → Association → Aggregation
- 输出：更新后的 `UserStateModel`

**注意事项**:
- ⚠️ **优先级规则**: 用户选择的 mood 优先于 AI 检测的 emotion
- ⚠️ **幂等性**: `rebuildAll()` 必须从空状态开始
- ⚠️ **数据一致性**: 确保 Chapter 的 `entryIds` 与 Entry 的 `chapterIds` 双向一致

---

### 2. UI 层 (UI Layer)

#### 2.1 编辑器模块

##### 2.1.1 主编辑器 (`app/add-edit-diary.js`)
**职责**:
- 创建和编辑日记条目
- 管理富文本编辑
- 显示 Hero Visual（Companion 头像/主题图片）
- 处理 Mood 选择和天气获取

**关键状态**:
```javascript
{
  existingDiary: DiaryEntry | null,  // 编辑模式的数据源
  selectedCompanionIDs: string[],     // 关联的 Companions
  heroVisual: VisualConfig,          // Hero 区域显示内容
  contentHtml: string,               // 编辑器内容
  selectedMood: string,              // 用户选择的心情
}
```

**数据流**:
- **编辑模式**: `params.diary` → `existingDiary` → 初始化所有状态
- **创建模式**: 空状态 → 用户输入 → `saveDiary()`
- **Hero Visual**: `existingDiary.companionIDs` → `userState.companions` → 渲染头像

**注意事项**:
- ⚠️ **Hero Visual 优先级**: Companion 头像 > 主题图片 > 默认占位符
- ⚠️ **数据源**: 编辑模式下直接从 `existingDiary` 读取，不依赖状态同步
- ⚠️ **保存逻辑**: 使用 `saveDiary()` 统一处理创建和更新

---

##### 2.1.2 周回顾编辑器 (`app/weekly-reflection.tsx`)
**职责**:
- 提供结构化的周回顾输入
- 三个固定部分：Wins、Challenges、Goals
- 组合成 HTML 格式保存

**关键差异**:
- ❌ **不包含** Hero Visual 区域
- ❌ **不显示** Companion 头像
- ✅ **结构化输入**: 三个 TextInput 字段
- ✅ **自动格式化**: 保存时组合成 HTML

**注意事项**:
- ⚠️ **与主编辑器不同**: 这是独立的模板，不是主编辑器的变体
- ⚠️ **编辑流程**: 编辑周回顾条目时使用主编辑器，不是这个组件

---

##### 2.1.3 详情页 (`app/diary-detail.js`, `screens/DiaryDetailScreen.js`)
**职责**:
- 只读显示日记内容
- 提供编辑入口

**关键差异**:
- ❌ **不包含** Hero Visual 区域
- ❌ **不显示** Companion 头像
- ✅ **只读显示**: 使用 `RenderHTML` 渲染内容
- ✅ **编辑入口**: 导航到 `/add-edit-diary`

**注意事项**:
- ⚠️ **内容显示**: 只显示 `diary.content`，不单独显示 `diary.title`
- ⚠️ **导航参数**: 传递完整的 `diary` 对象作为 JSON 字符串

---

#### 2.2 Timeline 模块 (`screens/TimelineScreen.js`)
**职责**:
- 显示日历和日记列表
- 管理日期选择
- 集成 FloatingActionButton 和 CoachMark

**关键组件**:
- `FloatingActionButton`: 短按创建，长按打开模板选择
- `LongPressCoachMark`: 一次性引导教程
- `DiarySummaryCard`: 日记卡片预览

**数据流**:
- 日期选择 → `selectedDate` → 过滤 `diaries`
- FAB 短按 → `/add-edit-diary`
- FAB 长按 → `openQuickCapture()` → 模板选择器

**注意事项**:
- ⚠️ **CoachMark 触发条件**: 用户有 2+ 日记条目且未看过提示
- ⚠️ **状态管理**: CoachMark 状态保存在 `UserStateContext.settings.hasSeenLongPressHint`

---

#### 2.3 Companion 模块

##### 2.3.1 CompanionDashboard (`app/companion-dashboard.tsx`)
**职责**:
- 显示单个 Companion 的详细信息
- 显示关联的日记条目
- 显示情绪分布和统计

**数据源**:
- `userState.chapters[chapterId]` - Chapter 数据
- `userState.companions[sourceId]` - Companion 数据
- `diaries` - 过滤后的日记条目

**注意事项**:
- ⚠️ **数据一致性**: 必须从 `UserStateContext` 获取，不能使用本地缓存
- ⚠️ **AI 交互**: 显示聊天图标需要全局和个体设置都启用

---

##### 2.3.2 ManageCompanionsScreen (`components/ManageCompanionsScreen.tsx`)
**职责**:
- CRUD 操作用户自定义 Companions
- 头像上传和管理
- AI 交互开关

**数据流**:
- 创建/更新 → `UserStateContext.updateUserState()` → AsyncStorage
- 删除 → 从 `userState.companions` 移除

**注意事项**:
- ⚠️ **头像 URI**: 保存 `avatarUri`，确保非空字符串
- ⚠️ **数据同步**: 修改后需要刷新 `UserStateContext`

---

### 3. 服务层 (Service Layer)

#### 3.1 AtomizationService (`services/PIE/AtomizationService.ts`)
**职责**:
- 分析日记内容的情感
- 提取命名实体（NER）
- 生成 RichEntryMetadata

**输入/输出**:
- 输入：`DiaryEntry.content` (HTML)
- 输出：`RichEntryMetadata` (包含 `primaryEmotion`, `detectedEmotion`, `entities`)

**注意事项**:
- ⚠️ **优先级**: `primaryEmotion` 应该使用用户选择的 mood（如果提供）
- ⚠️ **向后兼容**: 保留 `detectedEmotion` 字段

---

#### 3.2 AssociationService (`services/PIE/AssociationService.ts`)
**职责**:
- 将日记条目关联到 Chapters
- 基于内容匹配 Companions
- 提取主题标签

**输入/输出**:
- 输入：`DiaryEntry` + `RichEntryMetadata`
- 输出：`chapterIds: string[]` (添加到 Entry)

**注意事项**:
- ⚠️ **双向一致性**: Entry 的 `chapterIds` 必须与 Chapter 的 `entryIds` 一致
- ⚠️ **数据源**: 使用 `userState.companions` 而不是 `CompanionContext`

---

#### 3.3 ConversationService (`services/PIE/ConversationService.ts`)
**职责**:
- 生成 AI Companion 的对话提示
- 基于历史条目分析

**注意事项**:
- ⚠️ **数据源**: 使用 `primaryEmotion` 而不是 `detectedEmotion`

---

### 4. 组件层 (Component Layer)

#### 4.1 FloatingActionButton (`components/FloatingActionButton.tsx`)
**职责**:
- 提供主要的操作入口
- 短按：创建新日记
- 长按：打开模板选择

**交互**:
- 触觉反馈：`expo-haptics`
- 视觉动画：`react-native-reanimated`

**注意事项**:
- ⚠️ **API 正确性**: 使用 `Haptics.NotificationFeedbackType.Success`（不是 `Style`）
- ⚠️ **动画性能**: 使用 `useSharedValue` 和 `useAnimatedStyle`

---

#### 4.2 LongPressCoachMark (`components/LongPressCoachMark.tsx`)
**职责**:
- 一次性引导教程
- 高亮 FAB 并显示说明

**状态管理**:
- 显示状态：`TimelineScreen` 管理
- 已读状态：`UserStateContext.settings.hasSeenLongPressHint`

**注意事项**:
- ⚠️ **显示条件**: 用户有 2+ 日记条目且未看过提示
- ⚠️ **一次性**: 用户点击 "Got It" 后不再显示

---

#### 4.3 DiarySummaryCard (`components/DiarySummaryCard.js`)
**职责**:
- 显示日记条目的预览卡片
- 显示元数据（天气、情绪、日期）

**数据源**:
- `item`: DiaryEntry（基础数据）
- `richEntry`: RichEntry（包含 metadata）

**注意事项**:
- ⚠️ **情绪优先级**: `item.mood`（用户选择）> `richEntry.metadata.detectedEmotion`
- ⚠️ **内容显示**: 使用 `RenderHTML` 渲染 `item.content`，不单独显示 `item.title`

---

## 模块交互图

```
┌─────────────────────────────────────────────────────────────┐
│                      UserStateContext                        │
│  (单一数据源: Chapters, Companions, Settings)              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──────────────────────────────────────┐
               │                                      │
               ▼                                      ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │    DiaryContext      │          │    PIEService        │
    │  (日记 CRUD 操作)     │──────────│  (智能分析和关联)     │
    └──────────┬────────────┘          └──────────────────────┘
               │
               ├──────────────────────────────────────┐
               │                                      │
               ▼                                      ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │  TimelineScreen      │          │  add-edit-diary.js   │
    │  (显示和导航)         │          │  (创建/编辑日记)      │
    └──────────┬────────────┘          └──────────────────────┘
               │
               ├──────────────────────────────────────┐
               │                                      │
               ▼                                      ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │ FloatingActionButton │          │ LongPressCoachMark    │
    │  (操作入口)          │          │  (引导教程)            │
    └──────────────────────┘          └──────────────────────┘
```

---

## 常见模块冲突场景

### 场景 1: Hero Visual 不显示
**问题**: 编辑模式下 Companion 头像不显示

**根本原因**: 
- `add-edit-diary.js` 依赖 `selectedCompanionIDs` 状态
- 状态更新存在时序问题
- `heroVisual` useEffect 可能在数据加载前执行

**解决方案**:
- 在渲染时直接检查 `existingDiary.companionIDs`
- 从 `userState.companions` 直接读取，不依赖状态同步

**涉及的模块**:
- `app/add-edit-diary.js` (UI)
- `context/UserStateContext.tsx` (Data)
- `components/CompanionAvatarView` (Component)

---

### 场景 2: 数据不一致（"Ghost" Chapters）
**问题**: Chapters 列表显示不存在的 Chapter

**根本原因**:
- `chapters.tsx` 使用本地缓存
- `UserStateContext` 更新后缓存未刷新
- 多个数据源导致不一致

**解决方案**:
- 移除本地缓存
- 直接从 `UserStateContext` 读取
- 确保单一数据源

**涉及的模块**:
- `app/(tabs)/chapters.tsx` (UI)
- `context/UserStateContext.tsx` (Data)
- `services/PIE/PIEService.ts` (Service)

---

### 场景 3: 情绪显示不一致
**问题**: Timeline 显示的情绪与编辑时选择的不同

**根本原因**:
- `DiarySummaryCard` 使用 AI 检测的情绪
- 用户选择的 mood 未被正确传递
- PIEService 未正确设置 `primaryEmotion`

**解决方案**:
- `DiarySummaryCard` 优先使用 `item.mood`
- PIEService 将用户选择的 mood 设置为 `primaryEmotion`
- 确保数据优先级正确

**涉及的模块**:
- `components/DiarySummaryCard.js` (Component)
- `services/PIE/PIEService.ts` (Service)
- `context/DiaryContext.js` (Data)

---

### 场景 4: 触觉反馈 API 错误
**问题**: `Cannot read property 'Success' of undefined`

**根本原因**:
- 使用了错误的 API 名称
- `NotificationFeedbackStyle` 不存在
- 应该是 `NotificationFeedbackType`

**解决方案**:
- 检查 expo-haptics 文档
- 使用正确的 API 名称

**涉及的模块**:
- `components/FloatingActionButton.tsx` (Component)
- `expo-haptics` (External Library)

---

## 调试检查清单

在修复 Bug 前，请确认：

1. **数据源确认**
   - [ ] 确认数据来自哪个 Context/Service
   - [ ] 确认是否有多个数据源导致冲突
   - [ ] 确认数据加载顺序是否正确

2. **状态同步确认**
   - [ ] 确认状态更新的时序
   - [ ] 确认 useEffect 依赖项是否正确
   - [ ] 确认是否有竞态条件

3. **模块边界确认**
   - [ ] 确认修改的模块职责是否匹配
   - [ ] 确认是否影响了其他模块
   - [ ] 确认接口契约是否一致

4. **数据优先级确认**
   - [ ] 确认用户输入 vs AI 分析的优先级
   - [ ] 确认编辑模式 vs 创建模式的数据流
   - [ ] 确认向后兼容性

5. **API 正确性确认**
   - [ ] 确认外部库 API 使用正确
   - [ ] 确认版本兼容性
   - [ ] 确认错误处理

---

## 最佳实践

1. **单一数据源原则**
   - 所有数据从 `UserStateContext` 获取
   - 避免本地缓存和状态重复

2. **明确模块职责**
   - 每个模块只负责自己的领域
   - 通过明确的接口交互

3. **防御性编程**
   - 检查数据存在性
   - 提供合理的默认值
   - 处理边界情况

4. **详细日志**
   - 记录关键数据流
   - 标记模块边界
   - 便于问题诊断

5. **向后兼容**
   - 迁移旧数据格式
   - 提供默认值
   - 渐进式增强

---

## 最后更新
2025-01-XX - 创建模块架构文档，明确各模块职责和交互关系

