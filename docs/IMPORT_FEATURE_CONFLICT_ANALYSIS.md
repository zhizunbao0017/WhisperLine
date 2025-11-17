# 导入功能冲突分析 (Import Feature Conflict Analysis)

## 概述

本文档分析实现 Day One 导入功能时可能存在的冲突点，确保正确理解各模块的职责和交互关系。

---

## 发现的冲突和修正

### 1. 文件路径冲突

**用户提到的路径**:
- `@src/screens/SettingsScreen.js`
- `@src/context/UserStateContext.js`

**实际项目路径**:
- `screens/SettingsScreen.js` (不是 `src/screens/`)
- `context/UserStateContext.tsx` (不是 `src/context/`，且是 `.tsx` 不是 `.js`)

**修正**: 使用实际路径，不创建 `src/` 目录。

---

### 2. 依赖缺失

**需要的依赖**:
- `react-native-document-picker` - 未安装
- `react-native-zip-archive` - 未安装

**解决方案**: 需要先安装这些依赖。

---

### 3. API 方法名冲突

**用户提到的 API**:
- `PIEService.atomizeEntry(newEntryId)` ❌
- `PIEService.aggregateAll()` ❌
- `DatabaseService.saveEntry()` ❌

**实际存在的 API**:
- `PIEService.processNewEntry(newEntry, currentState, allRichEntries?, userSelectedMood?)` ✅
- `PIEService.rebuildAll(allEntries)` ✅
- `DiaryContext.saveDiary(diaryData)` ✅ (统一保存入口)
- `DiaryContext.addDiary(diaryData)` ✅ (创建新条目)

**修正**:
- 使用 `PIEService.processNewEntry()` 而不是 `atomizeEntry()`
- 使用 `PIEService.rebuildAll()` 而不是 `aggregateAll()`
- 使用 `DiaryContext.saveDiary()` 而不是 `DatabaseService.saveEntry()`

---

### 4. 数据保存流程冲突

**用户提到的流程**:
```
ImportService → DatabaseService.saveEntry() → PIEService.atomizeEntry()
```

**实际数据流**:
```
ImportService → DiaryContext.saveDiary() → PIEService.processNewEntry() → UserStateContext.updateUserState()
```

**正确的导入流程**:
1. `ImportService` 解析 Day One JSON
2. 对每个导入的条目调用 `DiaryContext.saveDiary()`
3. `saveDiary()` 内部会调用 `PIEService.processNewEntry()`
4. `processNewEntry()` 返回更新后的 `UserStateModel` 和 `RichEntry`
5. `DiaryContext` 更新 `UserStateContext` 和 `allRichEntries`
6. 所有条目导入完成后，调用 `PIEService.rebuildAll()` 重建聚合数据

---

### 5. 状态管理冲突

**用户提到的状态**:
```typescript
isImporting: false
importProgress: 0
importMessage: ''
```

**现有 UserStateContext 接口**:
```typescript
export interface UserStateContextValue {
  userState: UserStateModel;
  allRichEntries: Record<string, RichEntry>;
  isLoading: boolean;
  updateUserState: (newState: UserStateModel) => Promise<void>;
  // ... 其他方法
}
```

**冲突**: 
- `isLoading` 已存在，用于应用启动时的加载状态
- 导入状态不应该与全局加载状态混淆

**解决方案**:
- 添加导入相关的状态到 `UserStateContextValue` 接口
- 使用不同的状态名称避免混淆：
  - `isImporting: boolean` ✅
  - `importProgress: number` ✅
  - `importMessage: string` ✅

---

### 6. UI 集成冲突

**用户要求**: 在 "Export All Data" 上方添加 "Import Data" 行

**现有代码位置**: `screens/SettingsScreen.js` 第 540-565 行

**冲突检查**:
- ✅ 位置明确：在导出按钮上方
- ✅ 样式已存在：`styles.manageButton` 可以复用
- ✅ 状态管理：已有 `isExporting` 状态，可以添加 `isImporting`

**注意事项**:
- 确保导入和导出不会同时进行
- 导入时禁用导出按钮
- 导出时禁用导入按钮

---

### 7. 文件结构冲突

**用户提到的文件结构**:
```
src/services/ImportService.js
src/services/parsers/DayOneJsonParser.js
src/types/import.js
```

**实际项目结构**:
```
services/ImportService.ts (或 .js)
services/parsers/DayOneJsonParser.ts (或 .js)
types/import.ts (如果使用 TypeScript)
```

**修正**: 
- 不使用 `src/` 前缀
- 根据项目风格选择 `.ts` 或 `.js`（项目混合使用）
- `parsers/` 目录需要创建

---

### 8. 类型定义冲突

**用户提到的接口**:
```typescript
export interface ImportedEntry {
  id: string;
  createdAt: Date;
  content: string;
  location?: { latitude: number; longitude: number; address: string; };
  media: { type: 'photo' | 'video'; path: string; }[];
  metadata: { weather?: object; tags?: string[]; };
}
```

**现有 DiaryEntry 模型**:
```javascript
{
  id: string;
  title: string;
  content: string; // HTML格式
  contentHTML: string; // 向后兼容
  createdAt: string; // ISO string
  mood: string | null;
  weather: object | null;
  companionIDs: string[];
  themeID: string | null;
}
```

**冲突**: 
- `ImportedEntry.createdAt` 是 `Date`，但 `DiaryEntry.createdAt` 是 `string`
- `ImportedEntry` 没有 `title`，但 `DiaryEntry` 需要
- `ImportedEntry` 有 `location`，但 `DiaryEntry` 没有
- `ImportedEntry` 有 `media`，但 `DiaryEntry` 的图片在 `content` HTML 中

**解决方案**:
- 在 `ImportService` 中将 `ImportedEntry` 转换为 `DiaryEntry` 格式
- 从 `content` 提取标题（第一行或前60字符）
- 将 `createdAt` 转换为 ISO string
- 将 `media` 转换为 HTML `<img>` 标签插入到 `content` 中
- `location` 可以存储在 `metadata` 中或忽略

---

### 9. 进度回调冲突

**用户提到的进度回调**:
```javascript
progressCallback((index + 1) / totalEntries * 100)
```

**实际实现考虑**:
- 进度回调应该在导入过程中更新 `importProgress` 状态
- 需要考虑解压缩、解析、保存等不同阶段的进度
- 进度更新应该是异步的，不阻塞导入流程

**建议的进度阶段**:
1. 解压缩: 0-20%
2. 解析 JSON: 20-30%
3. 保存条目: 30-90%
4. 重建聚合: 90-100%

---

### 10. 错误处理冲突

**用户提到的错误处理**:
- 文件系统错误
- 解析错误
- 数据库错误

**实际需要考虑的错误**:
- ZIP 文件格式错误
- JSON 解析错误
- 文件权限错误
- 存储空间不足
- PIE 处理错误
- 网络错误（如果有）

**解决方案**:
- 使用 try-catch 包装整个导入流程
- 提供详细的错误消息
- 允许部分导入成功（如果某些条目失败）
- 记录失败的条目以便用户查看

---

## 修正后的实现计划

### 1. 安装依赖
```bash
npm install react-native-document-picker react-native-zip-archive
```

### 2. 创建类型定义
- `types/import.ts` - 定义 `ImportedEntry` 接口

### 3. 创建解析器
- `services/parsers/DayOneJsonParser.ts` - Day One JSON 解析器

### 4. 创建导入服务
- `services/ImportService.ts` - 核心导入逻辑
- 使用正确的 API: `DiaryContext.saveDiary()`, `PIEService.processNewEntry()`, `PIEService.rebuildAll()`

### 5. 更新 UserStateContext
- 添加导入相关状态和方法
- 确保不与现有 `isLoading` 冲突

### 6. 更新 SettingsScreen
- 在导出按钮上方添加导入按钮
- 集成导入状态和进度显示

---

## 关键修正点总结

| 项目 | 用户提到 | 实际使用 | 状态 |
|------|---------|---------|------|
| 文件路径 | `src/` | 无 `src/` | ✅ 已修正 |
| PIE API | `atomizeEntry()` | `processNewEntry()` | ✅ 已修正 |
| PIE API | `aggregateAll()` | `rebuildAll()` | ✅ 已修正 |
| 保存 API | `DatabaseService` | `DiaryContext.saveDiary()` | ✅ 已修正 |
| 日期格式 | `Date` | `string` (ISO) | ✅ 需要转换 |
| 依赖 | 未安装 | 需要安装 | ⚠️ 待安装 |

---

## 最后更新
2025-01-XX - 创建导入功能冲突分析文档

