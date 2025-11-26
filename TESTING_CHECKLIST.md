# Active Focus 功能测试清单

## 测试环境准备

1. 确保应用已安装并可以运行
2. 打开开发者控制台以查看日志输出
3. 确保至少有一个手动创建的 Companion（用于测试）

## 测试场景

### ✅ 测试 1: 默认状态验证

**步骤：**
1. 启动应用
2. 导航到 Settings 页面
3. 查看 Active Focus Section

**预期结果：**
- [ ] Active Focus 显示 "WhisperLine Assistant"
- [ ] 显示默认助手图标（sparkles icon）
- [ ] Key People 列表中 "WhisperLine Assistant" 项被选中（有 checkmark 图标）
- [ ] 边框颜色为 primary color（表示选中状态）

**检查点：**
- 控制台应该没有错误
- UI 应该正常渲染

---

### ✅ 测试 2: 切换功能验证

**步骤：**
1. 在 Settings 页面，找到 Key People Section
2. 如果还没有 Companion，先创建一个（通过其他页面）
3. 点击 Key People 列表中的一个真人 Companion（例如 "Alex"）

**预期结果：**
- [ ] Active Focus 立即更新，显示选中的 Companion 名称（例如 "Alex"）
- [ ] Active Focus 显示该 Companion 的头像或首字母
- [ ] Key People 列表中该 Companion 项被选中（checkmark 图标）
- [ ] "WhisperLine Assistant" 项不再被选中
- [ ] 状态变化是即时的，没有延迟

**检查点：**
- 控制台应该看到日志：`Setting Active Focus to: [companion-id]`
- UI 更新应该流畅，没有闪烁

---

### ✅ 测试 3: 外观联动验证

**步骤：**
1. 选择一个真人 Companion 作为 Active Focus（例如 "Alex"）
2. 滚动到 Focus Appearance Section
3. 更改头像选择（选择不同的 Lottie 头像或自定义头像）

**预期结果：**
- [ ] Focus Appearance 的更改只影响当前选中的 Active Focus
- [ ] Active Focus 显示的头像更新为新选择的头像
- [ ] 其他 Companion 的头像不受影响
- [ ] 更改应该持久化（重新打开应用后仍然有效）

**检查点：**
- 头像更改应该立即反映在 Active Focus Display 中
- 如果选择自定义头像，应该能够成功上传和显示

---

### ✅ 测试 4: 安全性测试（最重要）

**前置条件：**
- 确保有一个名为 "Alex" 的 Companion
- 确保 "Alex" 是当前的 Active Focus

**步骤：**
1. 在 Settings 页面，确认 "Alex" 是 Active Focus
2. 导航到其他页面（例如 Timeline 或 Companions 管理页面）
3. 删除 "Alex" 这个 Companion（通过 Companions 管理页面）
4. 返回 Settings 页面

**预期结果：**
- [ ] **关键：** Active Focus 已自动、安全地回退到 "WhisperLine Assistant"
- [ ] Key People 列表中 "Alex" 已消失
- [ ] "WhisperLine Assistant" 被自动选中
- [ ] **应用没有任何崩溃或错误**
- [ ] 控制台应该看到警告日志：
  ```
  [App] Active Focus is invalid. Resetting to default assistant.
  {
    currentFocusId: "comp-xxx-alex",
    validIds: ["whisperline_assistant_default", ...]
  }
  ```

**检查点：**
- 应用应该完全稳定，没有任何崩溃
- 不应该出现 "Focus not found" 错误消息
- 状态应该正确持久化

---

## 额外测试场景

### ✅ 测试 5: 应用重启后的状态持久化

**步骤：**
1. 选择一个 Companion 作为 Active Focus
2. 完全关闭应用
3. 重新启动应用
4. 导航到 Settings 页面

**预期结果：**
- [ ] Active Focus 状态已正确恢复
- [ ] 选中的 Companion 仍然被选中
- [ ] 如果没有选中的 Companion（已删除），应该回退到默认助手

---

### ✅ 测试 6: 边界情况测试

**场景 A: 删除默认助手（不应该发生）**
- 尝试删除 "WhisperLine Assistant"（如果可能）
- 应该无法删除，或者有保护机制

**场景 B: 清空所有 Companions**
- 删除所有手动创建的 Companions
- Active Focus 应该回退到 "WhisperLine Assistant"
- 应用应该正常运行

**场景 C: 快速切换多个 Companions**
- 快速点击不同的 Companions
- 状态应该正确更新，没有竞态条件

---

## 调试提示

如果测试失败，检查以下内容：

1. **控制台日志：**
   - 查看是否有错误消息
   - 查看 `[App] Active Focus is invalid` 警告是否出现
   - 查看 `Setting Active Focus to:` 日志

2. **Zustand Store 状态：**
   - 在 React DevTools 中检查 `useUserStateStore` 的状态
   - 确认 `primaryCompanionId` 的值

3. **UserState Context：**
   - 检查 `userState.companions` 是否包含预期的数据
   - 确认数据加载完成（`isLoading === false`）

4. **组件渲染：**
   - 检查 `ActiveFocusDisplay` 组件是否正确接收 props
   - 检查 `KeyPeopleList` 组件是否正确渲染所有 Companions

---

## 已知问题和限制

1. **Key People 来源：** 目前 Key People 列表显示的是手动创建的 Companions，而不是从日记条目中自动提取的。如果需要从日记中提取，需要额外的实现。

2. **自动回退时机：** 自动回退逻辑在 `app/_layout.js` 中运行，会在以下情况触发：
   - 应用启动时
   - Companions 列表变化时
   - Active Focus ID 变化时

3. **Focus Appearance：** 目前 Focus Appearance 部分使用的是主题头像选择器，可能需要进一步集成以影响 Active Focus 的外观。

---

## 测试完成标准

所有测试场景都应该：
- ✅ 通过功能验证
- ✅ 没有崩溃或错误
- ✅ 状态正确持久化
- ✅ UI 响应流畅
- ✅ 自动回退机制正常工作

