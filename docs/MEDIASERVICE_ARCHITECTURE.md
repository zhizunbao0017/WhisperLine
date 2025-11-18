# MediaService 模块架构图

## 📦 模块概览

`MediaService` 是 WhisperLine 应用中的**媒体管理核心服务**，负责统一处理所有图片相关的操作，包括头像设置、日记图片、导入图片等。

---

## 🏗️ 模块结构

```
MediaService (services/MediaService.js)
│
├── 📁 存储路径
│   ├── COMPANIONS_MEDIA_PATH: ${documentDirectory}media/companions/
│   └── ENTRIES_MEDIA_PATH: ${documentDirectory}media/entries/
│
├── 🔧 核心依赖
│   ├── expo-file-system (文件系统操作)
│   ├── expo-image-picker (图片选择器)
│   └── react-native (Platform, Alert, Linking)
│
├── 🔐 初始化
│   └── initialize() - 确保存储目录存在
│
├── 🎯 公开 API (Public Methods)
│   ├── assignCompanionImage() - 设置/更新 Companion 头像
│   ├── importExternalImage() - 导入外部图片（用于数据导入）
│   ├── deleteMediaAsset() - 删除媒体资产
│   └── getMediaAssetInfo() - 获取媒体资产信息（已弃用）
│
└── 🔒 私有方法 (Private Methods)
    ├── _isTemporaryPath() - 验证路径是否为临时路径
    ├── _copyAndStoreImage() - 复制并存储图片到永久存储
    ├── _getFileExtension() - 获取文件扩展名
    ├── _getMimeTypeFromExtension() - 根据扩展名获取 MIME 类型
    ├── _generateUniqueId() - 生成唯一 ID
    ├── _generateShortRandomId() - 生成短随机 ID
    └── _requestMediaLibraryPermission() - 请求媒体库权限
```

---

## 🔗 调用关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                        MediaService                              │
│                  (services/MediaService.js)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 提供 API
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Screens     │    │   Contexts    │    │   Services    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ManageCompanions │  │ UserStateContext │  │ ImportService    │
│ Screen           │  │                  │  │                  │
│                  │  │                  │  │                  │
│ • assignCompanion│  │ • deleteCompanion│  │ • importExternal │
│   Image()        │  │   (调用          │  │   Image()        │
│ • deleteMedia    │  │   deleteMedia   │  │                  │
│   Asset()        │  │   Asset())       │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │
        ▼
┌──────────────────┐
│ OnboardingScreen │
│                  │
│ • assignCompanion│
│   Image()        │
└──────────────────┘
```

---

## 📋 详细调用关系

### 1. **ManageCompanionsScreen.tsx**
**用途**: 管理 Companion 列表，设置/更新头像

**调用方法**:
- `MediaService.assignCompanionImage(companionId, null, currentCompanion)`
  - 当用户点击头像图标时调用
  - `sourceUri = null` 表示从图库选择
  - 返回完整的 `updatedCompanion` 对象
  
- `MediaService.deleteMediaAsset(avatarSource)`
  - 当删除 Companion 时，清理其头像文件
  - 异步执行，不影响删除流程

**数据流**:
```
用户点击头像图标
  ↓
MediaService.assignCompanionImage()
  ↓
请求权限 → 选择图片 → 复制到永久存储
  ↓
返回 updatedCompanion 对象
  ↓
updateCompanion(updatedCompanion) → UserStateContext
  ↓
UI 自动更新
```

---

### 2. **OnboardingScreen.tsx** (`app/onboarding.js`)
**用途**: 首次登录时创建 Companion 并设置头像

**调用方法**:
- `MediaService.assignCompanionImage(companionId, null, currentCompanion)`
  - 创建 Companion 后，用户选择头像时调用
  - 流程与 ManageCompanionsScreen 相同

**数据流**:
```
用户创建 Companion (addCompanion)
  ↓
用户选择头像
  ↓
MediaService.assignCompanionImage()
  ↓
返回 updatedCompanion
  ↓
updateCompanion(updatedCompanion) → UserStateContext
  ↓
设置为主 Companion (setPrimaryCompanion)
```

---

### 3. **UserStateContext.tsx**
**用途**: 全局状态管理，删除 Companion 时清理媒体文件

**调用方法**:
- `MediaService.deleteMediaAsset(avatarSource)`
  - 在 `deleteCompanion()` 方法中调用
  - 异步执行（fire-and-forget）
  - 如果删除失败，不影响 Companion 删除流程

**数据流**:
```
用户删除 Companion
  ↓
deleteCompanion(companionId)
  ↓
检查 avatar 类型和路径
  ↓
MediaService.deleteMediaAsset(avatarSource) [异步]
  ↓
更新状态，移除 Companion
```

---

### 4. **ImportService.ts**
**用途**: 数据导入服务，处理从 Day One 等外部来源导入的图片

**调用方法**:
- `MediaService.importExternalImage(sourceImagePath, 'entry', newEntryId)`
  - 导入 Day One 日记时，处理其中的照片
  - `ownerType = 'entry'` 表示这是日记条目的图片
  - 返回 `MediaAsset` 对象，包含永久存储路径

**数据流**:
```
解析 Day One JSON
  ↓
提取照片元数据 (photos array)
  ↓
遍历每张照片
  ↓
构建源路径 (sourceImagePath)
  ↓
MediaService.importExternalImage()
  ↓
复制到永久存储 (entries/)
  ↓
返回 MediaAsset 对象
  ↓
添加到日记条目 (diaryContext.addDiary)
```

---

## 🔄 核心方法详解

### `assignCompanionImage(companionId, sourceUri, currentCompanion)`

**功能**: 为 Companion 设置或更新头像

**参数**:
- `companionId`: Companion 的唯一 ID
- `sourceUri`: 可选，图片源 URI。如果为 `null`，则启动图片选择器
- `currentCompanion`: 可选，当前 Companion 对象。如果提供，返回完整的更新对象

**流程**:
1. 如果 `sourceUri` 为 `null`，请求媒体库权限
2. 启动图片选择器（如果 `sourceUri` 为 `null`）
3. 调用 `_copyAndStoreImage()` 复制图片到永久存储
4. 创建 `MediaAsset` 对象
5. 如果 `currentCompanion` 提供，返回完整的 `updatedCompanion` 对象
6. 否则返回 `CompanionAvatar` 对象（向后兼容）

**返回**:
- `Promise<Companion>` - 如果 `currentCompanion` 提供
- `Promise<CompanionAvatar>` - 否则（向后兼容）

---

### `importExternalImage(sourcePath, ownerType, ownerId)`

**功能**: 导入外部图片文件（用于数据导入功能）

**参数**:
- `sourcePath`: 源文件路径（来自导入的 ZIP 文件）
- `ownerType`: `'companion'` 或 `'entry'`
- `ownerId`: 拥有者的 ID

**流程**:
1. 验证源文件是否存在
2. 调用 `_copyAndStoreImage()` 复制到永久存储
3. 返回 `MediaAsset` 对象

**返回**: `Promise<MediaAsset>`

---

### `deleteMediaAsset(localPath)`

**功能**: 删除媒体资产文件

**参数**:
- `localPath`: 本地文件路径

**流程**:
1. 使用 `FileSystem.deleteAsync()` 删除文件
2. `idempotent: true` 确保文件不存在时不会报错

**返回**: `Promise<void>`

---

## 🗂️ 存储结构

```
${FileSystem.documentDirectory}/
└── media/
    ├── companions/
    │   ├── {companionId}_{timestamp}_{randomId}.jpg
    │   ├── {companionId}_{timestamp}_{randomId}.png
    │   └── ...
    │
    └── entries/
        ├── {entryId}_{timestamp}_{randomId}.jpg
        ├── {entryId}_{timestamp}_{randomId}.png
        └── ...
```

**命名规则**:
- `{ownerId}_{timestamp}_{randomId}{extension}`
- `ownerId`: Companion ID 或 Entry ID
- `timestamp`: `Date.now()` 时间戳
- `randomId`: 短随机 ID（避免冲突）
- `extension`: 文件扩展名（.jpg, .png 等）

---

## 🔐 权限处理

### `_requestMediaLibraryPermission()`

**功能**: 请求媒体库访问权限

**流程**:
1. 检查当前权限状态 (`ImagePicker.getMediaLibraryPermissionsAsync()`)
2. 如果未授权，请求权限 (`ImagePicker.requestMediaLibraryPermissionsAsync()`)
3. 处理不同权限状态:
   - `'granted'` / `'limited'`: 允许访问
   - `'denied'`: 显示提示，引导用户到设置
   - `'undetermined'`: 请求权限

**平台差异**:
- iOS: 使用 `'app-settings:'` URL scheme
- Android: 使用 `Linking.openSettings()`

---

## 🛠️ 技术细节

### ID 生成策略

**问题**: `uuid` 库依赖 `crypto.getRandomValues()`，在某些 React Native 环境中不可用

**解决方案**: 自定义 ID 生成器
- `_generateUniqueId()`: 长 ID（用于 MediaAsset.id）
- `_generateShortRandomId()`: 短 ID（用于文件名）

### 文件系统 API

**已修复**: 移除了所有 `FileSystem.getInfoAsync()` 调用（已弃用）

**新方法**:
- 目录检查: `FileSystem.makeDirectoryAsync()` (自动处理已存在)
- 文件删除: `FileSystem.deleteAsync()` with `idempotent: true`
- 文件信息: 新的 `File` API（`getMediaAssetInfo` 方法）

### 临时路径处理

**问题**: ImagePicker 可能返回临时缓存路径，导致文件丢失

**解决方案**: `_isTemporaryPath()` 检测临时路径，始终复制到永久存储

---

## 📊 数据流示例

### 场景 1: 用户设置 Companion 头像

```
1. 用户点击头像图标 (ManageCompanionsScreen)
   ↓
2. handleAvatarChange(companionId)
   ↓
3. MediaService.assignCompanionImage(companionId, null, currentCompanion)
   ├─→ 请求权限 (_requestMediaLibraryPermission)
   ├─→ 启动图片选择器 (ImagePicker.launchImageLibraryAsync)
   ├─→ 复制图片 (_copyAndStoreImage)
   │   ├─→ 创建目录 (makeDirectoryAsync)
   │   ├─→ 生成文件名 ({companionId}_{timestamp}_{randomId}.jpg)
   │   └─→ 复制文件 (copyAsync)
   └─→ 返回 updatedCompanion
   ↓
4. updateCompanion(updatedCompanion) → UserStateContext
   ↓
5. UI 自动更新（React Context 触发重渲染）
```

### 场景 2: 导入 Day One 日记

```
1. 用户选择 ZIP 文件 (ImportService)
   ↓
2. 解压 ZIP，解析 JSON
   ↓
3. 遍历日记条目 (parsedEntry.photos)
   ↓
4. 对每张照片调用 MediaService.importExternalImage()
   ├─→ 构建源路径 (tempDirectory + photosDirectoryPath + photo.md5)
   ├─→ 复制图片 (_copyAndStoreImage)
   │   └─→ 存储到 entries/ 目录
   └─→ 返回 MediaAsset 对象
   ↓
5. 收集所有 MediaAsset 对象
   ↓
6. 创建日记条目 (diaryContext.addDiary)
   └─→ media: finalMediaAssets
```

---

## 🎯 设计原则

1. **单一职责**: MediaService 只负责媒体文件管理，不涉及业务逻辑
2. **统一接口**: 所有图片操作都通过 MediaService，确保一致性
3. **永久存储**: 所有图片都复制到应用管理的永久目录
4. **权限隔离**: 权限请求逻辑封装在 MediaService 内部
5. **错误处理**: 所有方法都有完善的错误处理和日志记录
6. **向后兼容**: 保持 API 向后兼容，避免破坏现有代码

---

## 📝 相关文档

- `docs/IMAGE_PICKER_LOCATIONS.md` - 所有图片选择器位置说明
- `docs/DIAGNOSIS_COMPANION_ISSUES.md` - Companion 相关问题诊断
- `docs/FIXES_APPLIED.md` - 已应用的修复总结

---

## 🔍 调试提示

### 查看日志

MediaService 的所有操作都有详细的日志输出，前缀为 `[MediaService]`:

```javascript
[MediaService] Ensured companions media directory exists
[MediaService] Requesting media library permission...
[MediaService] Copying from temporary path to permanent storage: {...}
[MediaService] File copied successfully to: file:///...
```

### 常见问题

1. **头像不显示**: 检查 `MediaAsset` 对象的 `uri` 是否正确
2. **权限被拒绝**: 检查 `app.json` 中的权限配置
3. **文件复制失败**: 检查存储目录是否存在（`initialize()` 是否调用）
4. **临时路径问题**: 检查 `_isTemporaryPath()` 是否正确识别临时路径

---

**最后更新**: 2025-11-18
**版本**: MediaService v2.0 (已修复 getInfoAsync 弃用问题)

