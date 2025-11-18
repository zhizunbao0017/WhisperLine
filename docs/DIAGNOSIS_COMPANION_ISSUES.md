# Companion 显示问题诊断报告

## 🔴 关键发现：根据控制台日志，问题根源已确定

### 日志分析结果：

**错误信息**：
```
ERROR [MediaService] Failed to copy and store image: [Error: Method getInfoAsync imported from "expo-file-system" is deprecated.
```

**错误位置**：
- `MediaService.js:97:52` - `const dirInfo = await FileSystem.getInfoAsync(baseDir);`
- `MediaService.js:130:22` - `const fileInfo = await FileSystem.getInfoAsync(destinationPath);`

**状态检查日志**：
```json
{
  "companionCount": 1,
  "companionsObject": {
    "comp-1763449975860-iy9ve7g": {
      "avatar": [Object],
      "createdAt": "2025-11-18T07:12:55.860Z",
      "id": "comp-1763449975860-iy9ve7g",
      "isInteractionEnabled": true,
      "name": "yeye"
    }
  },
  "ids": ["comp-1763449975860-iy9ve7g"],
  "isLoading": false,
  "names": ["yeye"],
  "userStateExists": true
}
```

**结论**：
1. ✅ Companion 数据存在：有1个companion "yeye"，数据加载正常
2. ❌ 头像保存失败：`FileSystem.getInfoAsync` 已弃用，导致头像无法保存
3. ❌ 头像显示失败：因为头像保存失败，所以头像无法显示

---

## 问题1: 用户图片（头像）没有显示

### 根本原因分析

#### 🔴 1.0 `FileSystem.getInfoAsync` 已弃用（主要问题）

**位置**: `services/MediaService.js` 第31, 38, 97, 130, 450, 470行

**问题**:
- `FileSystem.getInfoAsync` 在 Expo SDK v54 中已被弃用
- 导致头像保存操作失败
- 错误信息：`Method getInfoAsync imported from "expo-file-system" is deprecated`

**影响**:
- 所有头像保存操作都会失败
- 用户无法为companion设置头像
- 即使选择了图片，也无法保存到永久存储

**解决方案**:
1. **快速修复**：使用 legacy API `import * as FileSystem from 'expo-file-system/legacy';`
2. **长期修复**：迁移到新的 File 和 Directory 类 API

#### 1.1 `CompanionAvatarItem.js` 不支持 Lottie 类型头像（次要问题）

**位置**: `components/CompanionAvatarItem.js` 第57行

**问题**:
```javascript
{companion?.avatarIdentifier ? (
  <View style={styles.avatarImage}>
    <Image 
      source={{ uri: companion.avatarIdentifier }} 
      ...
    />
  </View>
) : (
  // 显示 fallback (首字母)
)}
```

**问题分析**:
- `CompanionAvatarItem` 只检查 `avatarIdentifier` 是否存在
- 如果存在，就尝试用 `Image` 组件显示，假设它是一个图片 URI
- **但是**：当 `avatar.type === 'lottie'` 时，`avatar.source` 是 `'1'` 这样的字符串（Lottie 动画 ID），不是图片 URI
- 所以 `Image` 组件会尝试加载 `'1'` 作为图片 URI，导致失败

#### 1.2 `SettingsScreen.js` 的数据转换问题

**位置**: `screens/SettingsScreen.js` 第180-186行

**问题**:
```javascript
const formattedUserCompanions = userCreatedCompanions.map(comp => {
    // Extract avatar source from new format or legacy format
    const avatarSource = comp.avatar?.source || comp.avatarUri || '';
    return {
        id: comp.id,
        name: comp.name,
        avatarIdentifier: avatarSource && avatarSource.trim() ? avatarSource.trim() : '',
        ...
    };
});
```

**问题分析**:
- 代码没有检查 `comp.avatar?.type`
- 当 `avatar.type === 'lottie'` 时，`avatar.source` 是 `'1'`，被直接赋值给 `avatarIdentifier`
- `CompanionAvatarItem` 收到 `avatarIdentifier: '1'`，尝试显示图片，失败

#### 1.3 缺少 Lottie 动画支持

**问题**:
- `CompanionAvatarItem` 没有导入或使用 `LottieView`
- 没有检查 `avatar.type` 来决定显示图片还是 Lottie 动画
- `data/avatars.js` 定义了 Lottie 动画数据，但没有在 `CompanionAvatarItem` 中使用

### 解决方案建议

1. **修改 `CompanionAvatarItem.js`**:
   - 检查 `companion.avatar?.type`
   - 如果 `type === 'lottie'`，使用 `LottieView` 显示动画
   - 如果 `type === 'image'`，使用 `Image` 显示图片
   - 如果都没有，显示 fallback（首字母）

2. **修改 `SettingsScreen.js`**:
   - 在 `formattedUserCompanions` 中保留 `avatar.type` 信息
   - 或者只传递图片类型的 `avatarIdentifier`，Lottie 类型单独处理

---

## 问题2: 全部用户栏里没有显示全部用户

### 🔍 根据日志分析

**状态检查日志显示**：
- `companionCount: 1` - 只有1个companion
- `names: ["yeye"]` - 只有"yeye"一个用户
- `userStateExists: true` - 状态存在
- `isLoading: false` - 加载完成

**可能的原因**：
1. ✅ 数据加载正常：`userState.companions` 确实只有1个companion
2. ❓ 其他companions可能：
   - 在数据验证时被过滤掉了（缺少name或id）
   - 没有被正确保存
   - 在之前的清理中被删除了

### 根本原因分析

#### 2.1 数据源检查

**位置**: `screens/SettingsScreen.js` 第178行

**代码**:
```javascript
const userCreatedCompanions = Object.values(userState?.companions || {});
```

**可能的问题**:
- `userState?.companions` 可能是空对象 `{}`
- 某些 companions 在 `UserStateContext` 的数据验证过程中被过滤掉了

#### 2.2 数据验证过滤

**位置**: `context/UserStateContext.tsx` 第104-210行

**验证逻辑**:
- 第107-112行：跳过 `null`、`undefined` 或非对象类型
- 第117-128行：**跳过缺少 `id` 或 `name` 的 companion**
- 第131-135行：修复 `id` 不匹配的问题
- 第138-141行：确保 `isInteractionEnabled` 存在

**关键问题**:
- 如果某个 companion 缺少 `name` 或 `name.trim() === ''`，会被跳过
- 如果 `id` 不匹配，会被修复，但可能影响显示
- 被跳过的 companions 会被记录到 `invalidCompanionIds`，但不会出现在最终列表中

#### 2.3 数据加载时机问题

**可能的问题**:
- `userState` 可能在组件渲染时还没有完全加载
- `isLoading` 状态可能没有正确处理
- `useUserState()` 返回的 `userState` 可能是初始空状态

#### 2.4 数据持久化问题

**可能的问题**:
- Companions 可能没有正确保存到 `AsyncStorage`
- `addCompanion` 函数可能保存失败但没有抛出错误
- 数据可能被其他地方的代码清空了

### 诊断步骤建议

1. **检查控制台日志**:
   - 查看 `[UserStateContext] Found X companion(s) in storage:` 日志
   - 查看 `[UserStateContext] ✅ Loaded X valid companion(s) from storage` 日志
   - 查看 `[UserStateContext] Valid companion names:` 日志
   - 查看 `[ManageCompanionsScreen] State check:` 日志
   - 查看 `[SettingsScreen] Primary companion found:` 日志

2. **检查数据验证**:
   - 查看是否有 `[UserStateContext] ⚠️ Skipping companion` 警告
   - 查看是否有 `[UserStateContext] Removed X invalid companion(s)` 日志

3. **检查数据保存**:
   - 查看 `[UserStateContext] ✅ [AUTHORITATIVE] Companion creation persisted successfully` 日志
   - 查看 `[UserStateContext] ✅ State saved to storage:` 日志

4. **检查组件渲染**:
   - 确认 `isLoading` 状态正确
   - 确认 `userState?.companions` 不是空对象
   - 确认 `Object.values(userState?.companions || {})` 返回了预期的数组

### 解决方案建议

1. **增强日志**:
   - 在 `SettingsScreen.js` 中添加日志，显示 `userCreatedCompanions` 的数量和内容
   - 在 `formattedUserCompanions` 转换后添加日志

2. **检查数据完整性**:
   - 确保所有 companions 都有 `id` 和 `name`
   - 确保 `name` 不是空字符串

3. **检查数据同步**:
   - 确保 `addCompanion` 正确保存数据
   - 确保 `updateCompanion` 正确更新数据
   - 确保数据加载时没有丢失

---

## 总结

### 问题1（头像显示）的根本原因：
- `CompanionAvatarItem` 不支持 Lottie 类型头像，只支持图片 URI
- 当 `avatar.type === 'lottie'` 时，`avatar.source` 是动画 ID（如 `'1'`），不是图片 URI
- `SettingsScreen` 的数据转换没有区分头像类型

### 问题2（用户列表）的可能原因：
- 数据验证过滤掉了无效的 companions
- 数据加载时机问题
- 数据持久化失败
- 需要查看具体日志来确定

### 下一步行动：
1. 查看应用控制台日志，确认数据加载和验证情况
2. 检查 `userState.companions` 的实际内容
3. 修复 `CompanionAvatarItem` 以支持 Lottie 类型头像
4. 修复 `SettingsScreen` 的数据转换逻辑

