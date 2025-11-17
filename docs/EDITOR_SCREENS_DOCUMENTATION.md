# 编辑器屏幕文档 (Editor Screens Documentation)

## 概述

本项目包含多个日记相关的屏幕，每个屏幕都有不同的用途和UI结构。本文档明确区分每个屏幕的功能和特点。

---

## 屏幕分类

### 1. 主编辑器 (Main Editor)
**文件路径**: `app/add-edit-diary.js`  
**路由**: `/add-edit-diary`  
**用途**: 通用日记编辑器，支持创建和编辑所有类型的日记条目

**特点**:
- ✅ 包含 Hero Visual 区域（显示 Companion 头像或主题图片）
- ✅ 支持富文本编辑（Rich Text Editor）
- ✅ 支持图片插入和编辑
- ✅ 支持 Mood 选择器
- ✅ 支持 Companion 关联
- ✅ 支持主题选择
- ✅ 支持天气信息
- ✅ 标题集成到内容中（作为 `<h1>` 标签）

**UI结构**:
```
┌─────────────────────────┐
│ Navigation Header       │ ← 返回按钮 + 标题 + 保存按钮
├─────────────────────────┤
│ Hero Visual Area        │ ← Companion头像/主题图片 (150x150)
├─────────────────────────┤
│ Mood Selector           │ ← 情绪选择器
├─────────────────────────┤
│ Rich Text Editor        │ ← 富文本编辑器
├─────────────────────────┤
│ Formatting Toolbar      │ ← 格式化工具栏
├─────────────────────────┤
│ Save Button             │ ← 保存按钮
└─────────────────────────┘
```

**导航参数**:
- `diary`: JSON字符串，编辑模式时传递现有日记数据
- `date`: 日期字符串 (YYYY-MM-DD)，用于指定创建日期
- `intentDraft`: JSON字符串，快速捕获的草稿数据
- `prompt`: 字符串，来自AI Companion的提示

---

### 2. 周回顾编辑器 (Weekly Reflection Editor)
**文件路径**: `app/weekly-reflection.tsx`  
**路由**: `/weekly-reflection`  
**用途**: 结构化的周回顾模板，用于每周反思和目标设定

**特点**:
- ❌ **不包含** Hero Visual 区域
- ❌ **不显示** Companion 头像
- ✅ 结构化的输入字段（三个部分）
- ✅ 简单的文本输入（TextInput）
- ✅ 支持 Mood 选择器
- ✅ 内容自动格式化为HTML

**UI结构**:
```
┌─────────────────────────┐
│ Custom Header           │ ← 返回按钮 + "Weekly Reflection" + 保存按钮
├─────────────────────────┤
│ Mood Selector           │ ← 情绪选择器
├─────────────────────────┤
│ This Week's Wins        │ ← 文本输入框
├─────────────────────────┤
│ Challenges Faced       │ ← 文本输入框
├─────────────────────────┤
│ Goals for Next Week     │ ← 文本输入框
└─────────────────────────┘
```

**内容结构**:
保存时会将三个部分组合成HTML：
```html
<h1>Weekly Reflection</h1>
<h2>This Week's Wins</h2>
<p>用户输入的内容...</p>
<h2>Challenges Faced</h2>
<p>用户输入的内容...</p>
<h2>Goals for Next Week</h2>
<p>用户输入的内容...</p>
```

**导航参数**:
- `date`: 日期字符串 (YYYY-MM-DD)，用于指定创建日期

---

### 3. 日记详情页 (Diary Detail Screen)
**文件路径**: `app/diary-detail.js` 和 `screens/DiaryDetailScreen.js`  
**路由**: `/diary-detail`  
**用途**: 只读显示日记内容，提供编辑入口

**特点**:
- ❌ **不包含** Hero Visual 区域
- ❌ **不显示** Companion 头像（在详情页）
- ✅ 显示完整的日记内容（使用 RenderHTML）
- ✅ 显示日期和天气信息
- ✅ 提供编辑按钮（导航到 `/add-edit-diary`）

**UI结构**:
```
┌─────────────────────────┐
│ Navigation Header       │ ← 返回按钮 + "Diary Detail" + 编辑按钮
├─────────────────────────┤
│ Date & Weather          │ ← 日期和天气信息
├─────────────────────────┤
│ Divider                 │
├─────────────────────────┤
│ Diary Content           │ ← HTML内容渲染（包含标题）
└─────────────────────────┘
```

**导航参数**:
- `diary`: JSON字符串，包含完整的日记数据

---

## 关键区别总结

| 特性 | 主编辑器 (add-edit-diary) | 周回顾编辑器 (weekly-reflection) | 详情页 (diary-detail) |
|------|---------------------------|--------------------------------|---------------------|
| Hero Visual区域 | ✅ 有 | ❌ 无 | ❌ 无 |
| Companion头像 | ✅ 显示 | ❌ 不显示 | ❌ 不显示 |
| 富文本编辑 | ✅ 支持 | ❌ 不支持 | ❌ 只读 |
| 图片插入 | ✅ 支持 | ❌ 不支持 | ✅ 显示 |
| 结构化输入 | ❌ 自由格式 | ✅ 三个固定部分 | ❌ 只读 |
| Mood选择器 | ✅ 有 | ✅ 有 | ❌ 无 |
| 编辑功能 | ✅ 创建/编辑 | ✅ 仅创建 | ❌ 只读 |
| 保存逻辑 | `saveDiary()` | `addDiary()` | N/A |

---

## 导航流程

### 创建新日记
1. **Timeline Screen** → 点击FAB → **Template Picker**
   - 选择 "Freestyle" → `/add-edit-diary` (主编辑器)
   - 选择 "Weekly Reflection" → `/weekly-reflection` (周回顾编辑器)

2. **Timeline Screen** → 长按FAB → `/add-edit-diary` (主编辑器)

### 编辑现有日记
1. **Timeline Screen** → 点击日记卡片 → `/diary-detail` (详情页)
2. **详情页** → 点击编辑按钮 → `/add-edit-diary` (主编辑器，传递 `diary` 参数)

### 从周回顾编辑
1. **详情页** (周回顾条目) → 点击编辑按钮 → `/add-edit-diary` (主编辑器)
   - ⚠️ **注意**: 周回顾条目会使用主编辑器编辑，而不是周回顾编辑器

---

## 数据流

### 主编辑器 (add-edit-diary.js)
```
用户输入
  ↓
contentHtml (HTML格式)
  ↓
saveDiary() → DiaryContext
  ↓
PIEService.processNewEntry()
  ↓
UserStateModel 更新
```

### 周回顾编辑器 (weekly-reflection.tsx)
```
用户输入 (三个TextInput)
  ↓
组合成HTML字符串
  ↓
addDiary() → DiaryContext
  ↓
PIEService.processNewEntry()
  ↓
UserStateModel 更新
```

---

## 重要注意事项

1. **只有主编辑器显示 Companion 头像**
   - `weekly-reflection.tsx` 没有 Hero Visual 区域
   - `diary-detail.js` 是只读页面，不显示头像

2. **编辑模式下的数据传递**
   - 编辑现有日记时，`diary` 参数包含 `companionIDs`
   - 主编辑器会从 `existingDiary.companionIDs` 读取并设置 `selectedCompanionIDs`
   - Hero Visual useEffect 会根据 `selectedCompanionIDs` 显示对应的头像

3. **Hero Visual 优先级**
   ```
   Companion头像 (selectedCompanionIDs) 
     ↓ (如果存在)
   主题图片 (currentAvatar from Settings)
     ↓ (如果存在)
   默认占位符 (DEFAULT_HERO_IMAGE)
   ```

---

## 调试标识

每个屏幕都有独特的日志前缀：
- `[AddEditDiaryScreen]` - 主编辑器
- `[HeroVisual useEffect]` - Hero Visual更新逻辑
- `[CompanionAvatarView]` - Companion头像组件
- `[InitializeCompanions]` - Companion初始化逻辑

---

## 最后更新
2025-01-XX - 添加了详细的屏幕区分文档

