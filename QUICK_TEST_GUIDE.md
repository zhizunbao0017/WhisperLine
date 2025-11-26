# Active Focus 快速测试指南

## 🚀 快速开始测试

### 前置条件
1. 确保应用已安装并可运行
2. 打开开发者控制台查看日志

---

## 📋 测试清单

### ✅ 测试 1: 默认状态
**操作：** 打开 Settings 页面

**预期结果：**
- Active Focus 显示 "WhisperLine Assistant"
- Key People 列表中该项被选中（有 checkmark ✓）

**验证：** ✅ 或 ❌

---

### ✅ 测试 2: 切换功能
**操作：** 点击 Key People 列表中的一个真人 Companion

**预期结果：**
- Active Focus 立即更新为新选中的 Companion
- Key People 列表中的选中状态同步更新
- "WhisperLine Assistant" 不再被选中

**验证：** ✅ 或 ❌

---

### ✅ 测试 3: 外观联动
**操作：** 
1. 选择一个真人作为 Active Focus
2. 在 Focus Appearance 板块更改头像设置

**预期结果：**
- 更改只影响当前选中的 Active Focus
- Active Focus 显示的头像更新

**验证：** ✅ 或 ❌

---

### ✅ 测试 4: 安全性测试（最重要！）

**操作步骤：**
1. ✅ 选中一个真人 Companion（例如 "Alex"）作为 Active Focus
2. ✅ 导航到 Companions 管理页面
3. ✅ 删除 "Alex" 这个 Companion
4. ✅ 返回 Settings 页面

**预期结果：**
- ✅ Active Focus **已自动回退**到 "WhisperLine Assistant"
- ✅ Key People 列表中 "Alex" 已消失
- ✅ **应用没有任何崩溃或错误**
- ✅ 控制台看到警告日志：`[App] Active Focus is invalid. Resetting to default assistant.`

**验证：** ✅ 或 ❌

---

## 🔍 调试信息

如果测试失败，检查控制台日志：

1. **成功回退时应该看到：**
   ```
   [App] Active Focus is invalid. Resetting to default assistant.
   {
     currentFocusId: "comp-xxx-alex",
     validIds: ["whisperline_assistant_default", ...]
   }
   Setting Active Focus to: whisperline_assistant_default
   ```

2. **切换 Focus 时应该看到：**
   ```
   Setting Active Focus to: comp-xxx-alex
   ```

---

## ⚠️ 注意事项

1. **Key People 来源：** 目前 Key People 列表显示的是手动创建的 Companions，不是从日记中自动提取的。

2. **自动回退时机：** 
   - 应用启动时
   - Companion 被删除后（立即触发）
   - 导航到 Settings 页面时

3. **如果测试失败：** 检查 `app/_layout.js` 中的 useEffect 是否正确运行。

---

## ✅ 测试完成标准

所有测试应该：
- ✅ 功能正常
- ✅ 无崩溃
- ✅ 状态正确持久化
- ✅ 自动回退机制工作正常

