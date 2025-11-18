# 需要修复的问题清单

## 🔴 优先级1：修复 FileSystem.getInfoAsync 弃用问题

### 问题
- `FileSystem.getInfoAsync` 在 Expo SDK v54 中已弃用
- 导致所有头像保存操作失败
- 影响：用户无法为companion设置头像

### 影响范围
- `services/MediaService.js` 中6处使用：
  1. 第31行：初始化companions目录检查
  2. 第38行：初始化entries目录检查
  3. 第97行：复制前检查目标目录
  4. 第130行：复制后验证文件存在
  5. 第450行：删除媒体资产前检查
  6. 第470行：获取媒体资产信息

### 解决方案选项

#### 选项1：使用 Legacy API（快速修复）
```javascript
// 修改导入
import * as FileSystem from 'expo-file-system/legacy';
```

#### 选项2：迁移到新API（推荐，长期方案）
使用新的 `File` 和 `Directory` 类：
```javascript
import { File, Directory } from 'expo-file-system';

// 检查目录存在
const dir = new Directory(baseDir);
const exists = await dir.exists();

// 检查文件存在
const file = new File(destinationPath);
const exists = await file.exists();
```

---

## 🟡 优先级2：修复 Lottie 头像显示问题

### 问题
- `CompanionAvatarItem.js` 不支持 Lottie 类型头像
- 当 `avatar.type === 'lottie'` 时，`avatar.source` 是动画ID（如 `'1'`），不是图片URI
- 导致默认Lottie头像无法显示

### 影响范围
- `components/CompanionAvatarItem.js` - 头像显示组件
- `screens/SettingsScreen.js` - 数据转换逻辑

### 解决方案
1. 修改 `CompanionAvatarItem.js` 支持Lottie类型
2. 修改 `SettingsScreen.js` 的数据转换，保留 `avatar.type` 信息

---

## 🟢 优先级3：验证用户列表显示

### 问题
- 根据日志，只有1个companion "yeye"
- 需要确认是否还有其他companions被过滤掉了

### 需要检查
1. 查看 `[UserStateContext] Found X companion(s) in storage:` 日志
2. 查看 `[UserStateContext] ⚠️ Skipping companion` 警告
3. 查看 `[UserStateContext] Removed X invalid companion(s)` 日志

### 解决方案
- 如果companions被过滤，需要修复数据验证逻辑
- 如果确实只有1个，则问题已解决

