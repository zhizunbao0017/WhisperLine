# App Store 快速发布指南

## 🚀 一键发布流程

### 前置条件

1. **Apple Developer 账户**
   - 已注册 Apple Developer Program ($99/年)
   - 已创建 App ID: `com.xietian.whisperline`

2. **EAS 账户**
   - 已注册 Expo 账户
   - 已安装 EAS CLI: `npm install -g eas-cli`
   - 已登录: `eas login`

3. **App Store Connect**
   - 已创建应用记录
   - 已配置基本信息

### 快速发布步骤

#### 步骤 1: 运行发布准备脚本

```bash
chmod +x scripts/prepare-release.sh
./scripts/prepare-release.sh
```

#### 步骤 2: 构建生产版本

```bash
eas build --platform ios --profile production
```

**预计时间**: 15-30分钟

**注意事项**:
- 构建号会自动递增 (EAS 配置了 `autoIncrement: true`)
- 构建完成后会收到通知

#### 步骤 3: 提交到 App Store

```bash
eas submit --platform ios --latest
```

**需要提供**:
- Apple ID 和密码
- 或 App Store Connect API Key

#### 步骤 4: 在 App Store Connect 中完成设置

1. **登录 App Store Connect**
   - https://appstoreconnect.apple.com

2. **选择应用** → **版本信息**

3. **填写必需信息**:
   - ✅ 应用截图 (至少一组)
   - ✅ 应用描述
   - ✅ 关键词
   - ✅ 隐私政策URL
   - ✅ 支持URL (可选)
   - ✅ 营销URL (可选)

4. **设置定价和可用性**
   - 选择价格
   - 选择可用地区

5. **提交审核**
   - 点击"提交以供审核"
   - 填写审核信息

### 📋 必需的应用元数据

#### 应用名称
```
WhisperLine
```

#### 副标题 (30字符)
```
Your Private Mirror
```

#### 描述 (4000字符)
```
WhisperLine is your personal journal, designed with privacy at its core. All your thoughts, memories, and moments stay on your device—local, secure, and truly yours.

KEY FEATURES:
• Privacy-First Design: All data stored locally on your device
• Rich Text Editing: Format your entries with bold, italic, lists, and images
• Mood Tracking: Capture your emotions and visualize trends over time
• AI Companions: Create personalized companions for interactive journaling
• Multiple Themes: Choose from beautiful themes including Child and Cyberpunk
• Weather Integration: Automatically tag entries with current weather
• App Lock: Secure your entries with Face ID or Touch ID
• Export & Import: Backup your data or migrate from other journal apps

Your journal is your private space. WhisperLine never uploads your content to the cloud. Everything stays on your device, giving you complete control over your personal reflections.

Start your journey of self-reflection today.
```

#### 关键词 (100字符)
```
diary,journal,privacy,reflection,mood tracking,personal,secure,local storage,AI companion,writing
```

#### 推广文本 (170字符)
```
New in this version: Enhanced onboarding experience, improved companion management, and refined UI copy for better clarity.
```

### 📸 应用截图要求

**必需尺寸** (至少需要一组):
- iPhone 6.7" (iPhone 14 Pro Max): 1290x2796 像素

**建议提供** (覆盖更多设备):
- iPhone 6.5" (iPhone 11 Pro Max): 1242x2688 像素
- iPhone 5.5" (iPhone 8 Plus): 1242x2208 像素
- iPad Pro 12.9": 2048x2732 像素

**截图要求**:
- PNG 或 JPEG 格式
- 无状态栏
- 无导航栏 (除非是应用的一部分)
- 展示应用的核心功能

### 🔗 必需URL

#### 隐私政策URL
**必需**: 需要提供一个可公开访问的URL

**选项**:
1. 使用 GitHub Pages 托管
2. 使用自己的网站
3. 使用第三方托管服务

**内容**: 可以使用 `screens/PrivacyPolicyScreen.js` 中的内容

#### 支持URL (可选)
如果提供，用户可以通过此URL联系支持

#### 营销URL (可选)
如果有网站，可以提供

### ⏱️ 审核时间

- **首次提交**: 通常 1-3 个工作日
- **更新版本**: 通常 24-48 小时

### 📞 常见问题

#### Q: 构建失败怎么办？
A: 检查 EAS 构建日志，常见原因:
- 证书问题
- Bundle ID 不匹配
- 依赖问题

#### Q: 审核被拒怎么办？
A: 
1. 查看拒绝原因
2. 修复问题
3. 重新提交构建
4. 在审核信息中说明修复内容

#### Q: 如何更新版本？
A:
1. 更新 `app.json` 中的 `version`
2. 构建号会自动递增
3. 重新构建和提交

### 🔄 更新版本流程

1. **更新版本号** (app.json):
   ```json
   "version": "1.1.2"
   ```

2. **构建新版本**:
   ```bash
   eas build --platform ios --profile production
   ```

3. **提交更新**:
   ```bash
   eas submit --platform ios --latest
   ```

4. **在 App Store Connect 中**:
   - 更新"推广文本"说明新功能
   - 提交审核

---

**需要帮助?** 查看完整清单: `docs/APP_STORE_RELEASE_CHECKLIST.md`

