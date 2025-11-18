# 图库调用位置说明 (Image Picker Locations)

本文档说明应用中所有调用图库（ImagePicker）的位置，确保每个位置都有正确的权限处理和独立的用途。

## 1. MediaService.js - Companion Avatar 管理

**位置**: `services/MediaService.js`
**方法**: `assignCompanionImage(companionId, sourceUri)`
**用途**: 专门用于管理 Companion 的头像
**权限处理**: 使用 `_requestMediaLibraryPermission()` 私有方法
**特点**:
- 包含完整的权限检查、请求和错误处理
- 支持设置跳转（当权限被阻止时）
- 处理临时路径到永久存储的复制
- 返回格式化的 CompanionAvatar 对象

**调用位置**:
- `screens/ManageCompanionsScreen.tsx` - 通过 `handleAvatarChange()` 调用

---

## 2. ThemeContext.tsx - 主题自定义头像

**位置**: `context/ThemeContext.tsx`
**方法**: `pickCustomAvatar()`
**用途**: 用于选择主题的自定义头像（全局主题设置）
**权限处理**: 直接调用 `ImagePicker.requestMediaLibraryPermissionsAsync()`
**特点**:
- 独立的权限处理，不影响 Companion avatar
- 用于全局主题设置，不是 Companion 管理

**调用位置**:
- `screens/SettingsScreen.js` - 通过 `CustomAvatarButton` 组件

---

## 3. add-edit-diary.js - 日记条目图片添加

**位置**: `app/add-edit-diary.js`
**方法**: 内联函数（约第813行）
**用途**: 在编辑日记条目时添加图片
**权限处理**: 直接调用 `ImagePicker.requestMediaLibraryPermissionsAsync()`
**特点**:
- 支持多选图片 (`allowsMultipleSelection: true`)
- 用于日记内容，不是头像管理
- 不涉及 MediaService 的存储逻辑

---

## 4. _layout.js - 快速添加照片

**位置**: `app/_layout.js`
**方法**: `handleAddPhoto()` (约第139行)
**用途**: 从主界面快速添加照片到日记
**权限处理**: 直接调用 `ImagePicker.requestMediaLibraryPermissionsAsync()`
**特点**:
- 用于快速创建日记条目
- 独立的权限处理流程

---

## 5. onboarding.js - 引导流程头像选择

**位置**: `app/onboarding.js`
**方法**: `handleOpenImagePicker()` (约第49行)
**用途**: 在用户引导流程中选择头像
**权限处理**: 直接调用 `ImagePicker.requestMediaLibraryPermissionsAsync()`
**特点**:
- 用于首次设置，不是日常管理
- 独立的权限处理

---

## 6. CompanionListView.js - Companion 列表视图

**位置**: `screens/CompanionListView.js`
**方法**: `handlePickAvatar()` (约第180行)
**用途**: 在 Companion 列表视图中选择头像
**权限处理**: 直接调用 `ImagePicker.requestMediaLibraryPermissionsAsync()`
**特点**:
- 注意：这个位置可能与 MediaService 的功能重复
- 建议：应该统一使用 MediaService.assignCompanionImage()

---

## 重要说明

### 权限处理的独立性

每个位置都有自己独立的权限处理逻辑，不会互相干扰：
- **MediaService**: 使用增强的 `_requestMediaLibraryPermission()` 方法，包含设置跳转
- **其他位置**: 使用简单的 `requestMediaLibraryPermissionsAsync()` 检查

### 建议的统一化

为了保持代码一致性，建议：
1. **Companion 相关**: 统一使用 `MediaService.assignCompanionImage()`
2. **日记图片**: 保持独立的权限处理（因为用途不同）
3. **主题头像**: 保持独立的权限处理（因为用途不同）

### 权限状态值

Expo ImagePicker 返回的权限状态是字符串：
- `'granted'` - 已授权
- `'denied'` - 已拒绝
- `'undetermined'` - 未确定
- `'limited'` - iOS 14+ 有限访问

注意：不要使用 `ImagePicker.PermissionStatus` 枚举，应该直接比较字符串。

