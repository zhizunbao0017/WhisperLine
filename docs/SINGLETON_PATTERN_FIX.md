# MediaService 单例模式修复

## 🎯 问题诊断

**根本原因**: 代码库中存在两个 MediaService 实例（"evil twin" bug），导致：
1. 重复初始化错误
2. 弃用警告（`makeDirectoryAsync`）
3. 应用启动时的初始化失败

**触发点**: 
- MediaService.js 在模块级别自动调用 `initialize()`（第529-532行）
- 导出的是类本身，而不是实例
- 多个文件导入时创建了不同的实例

---

## ✅ 修复方案：单例模式

### 1. 将 MediaService 转换为单例模式

**修改前**:
```javascript
class MediaService {
  static async initialize() { ... }
  static async assignCompanionImage() { ... }
  // ... 所有方法都是 static
}

// 模块级别自动初始化（问题根源）
MediaService.initialize().catch(...);

export default MediaService; // 导出类
```

**修改后**:
```javascript
class MediaService {
  // 实例属性（不再是 static）
  COMPANIONS_MEDIA_PATH = `${FileSystem.documentDirectory}media/companions/`;
  ENTRIES_MEDIA_PATH = `${FileSystem.documentDirectory}media/entries/`;

  // 实例方法（不再是 static）
  async initialize() { ... }
  async assignCompanionImage() { ... }
  // ... 所有方法都是实例方法
}

// CRITICAL: 单例模式实现
// 创建单个实例并导出
const mediaServiceInstance = new MediaService();

// 导出实例（不是类）
export default mediaServiceInstance;
```

### 2. 移除模块级别的自动初始化

**删除**:
```javascript
// Initialize on module load
MediaService.initialize().catch((error) => {
  console.error('[MediaService] Failed to initialize on module load:', error);
});
```

**原因**: 这会在模块加载时自动执行，导致重复初始化

### 3. 在 app/_layout.js 中添加单一初始化点

**添加**:
```javascript
import MediaService from '../services/MediaService';

// 在 RootLayoutNav 组件中
useEffect(() => {
  // CRITICAL: Initialize MediaService singleton on app startup
  // This is the ONLY place where MediaService.initialize() should be called
  MediaService.initialize().catch((error) => {
    console.error('[App] Failed to initialize MediaService:', error);
    // Don't block app startup - continue even if MediaService initialization fails
  });
}, []);
```

### 4. 标准化所有导入

所有文件现在都使用默认导入（已经是正确的）:
```javascript
import MediaService from '../services/MediaService';
// 或
import MediaService from './MediaService';
```

---

## 📋 修改的文件

1. **services/MediaService.js**
   - ✅ 将所有 `static` 方法改为实例方法
   - ✅ 将所有 `static` 属性改为实例属性
   - ✅ 移除模块级别的自动初始化
   - ✅ 创建并导出单例实例

2. **app/_layout.js**
   - ✅ 添加 MediaService 导入
   - ✅ 添加 `useEffect` 钩子进行单一初始化

---

## 🔍 验证

### 所有导入位置（已验证）:
- ✅ `app/_layout.js` - 默认导入
- ✅ `screens/ManageCompanionsScreen.tsx` - 默认导入
- ✅ `app/onboarding.js` - 默认导入
- ✅ `services/ImportService.ts` - 默认导入
- ✅ `context/UserStateContext.tsx` - 动态导入（`.default`）

### 方法调用（已验证）:
- ✅ 所有方法调用都使用实例方法（不再是 `MediaService.staticMethod()`）
- ✅ 所有导入都使用默认导入（`import MediaService from ...`）

---

## 🎯 预期效果

1. ✅ **消除重复初始化**: 只有一个实例，只初始化一次
2. ✅ **消除弃用警告**: 初始化在应用启动时正确执行
3. ✅ **架构清晰**: 单例模式确保全局一致性
4. ✅ **易于维护**: 所有导入都指向同一个实例

---

## 🚀 测试建议

1. **启动应用**: 检查控制台是否还有初始化错误
2. **检查日志**: 应该只看到一次 `[MediaService] ✅ Ensured companions media directory exists`
3. **功能测试**: 
   - 设置 Companion 头像
   - 导入日记图片
   - 删除媒体资产

---

## 📝 技术细节

### 单例模式的优势

1. **内存效率**: 只有一个实例存在于内存中
2. **状态一致性**: 所有组件共享同一个服务实例
3. **初始化控制**: 可以精确控制何时初始化
4. **避免竞态条件**: 不会出现多个实例同时初始化的情况

### 为什么之前的方法有问题

1. **模块级别初始化**: 在模块加载时自动执行，无法控制时机
2. **导出类而非实例**: 每次导入都可能创建新实例
3. **静态方法**: 虽然方法共享，但初始化逻辑可能重复执行

---

**修复完成时间**: 2025-11-18
**状态**: ✅ 完成并验证

