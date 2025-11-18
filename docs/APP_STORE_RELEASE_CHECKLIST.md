# App Store 发布准备清单

## 📋 发布前检查清单

### 1. 应用配置 (app.json)

#### ✅ 基本信息
- [x] **应用名称**: WhisperLine
- [x] **Bundle Identifier**: com.xietian.whisperline
- [x] **版本号**: 1.1.1
- [x] **构建号**: 5 (需要递增)
- [x] **支持设备**: iPhone, iPad

#### ✅ 权限配置
- [x] **照片库权限**: 已配置描述
- [x] **相机权限**: 已配置描述
- [x] **位置权限**: 已配置描述
- [x] **Face ID权限**: 已配置描述
- [x] **加密声明**: ITSAppUsesNonExemptEncryption = false

#### ⚠️ 需要添加的配置
- [ ] **App Store 连接信息** (需要在 App Store Connect 中配置)
- [ ] **营销URL** (可选，如果有网站)
- [ ] **隐私政策URL** (必需)
- [ ] **支持URL** (可选)

### 2. 应用图标和启动画面

#### ✅ 图标
- [x] **主图标**: `./assets/images/icon.png` (1024x1024)
- [x] **启动画面**: 已配置

#### ⚠️ 需要准备
- [ ] **App Store 图标**: 1024x1024 PNG (无透明度)
- [ ] **应用截图**: 
  - iPhone 6.7" (iPhone 14 Pro Max): 1290x2796
  - iPhone 6.5" (iPhone 11 Pro Max): 1242x2688
  - iPhone 5.5" (iPhone 8 Plus): 1242x2208
  - iPad Pro 12.9": 2048x2732
  - iPad Pro 11": 1668x2388

### 3. 隐私政策

#### ✅ 隐私政策内容
- [x] **隐私政策页面**: `screens/PrivacyPolicyScreen.js`
- [x] **最后更新日期**: November 11, 2025
- [x] **联系邮箱**: j8t@163.com
- [x] **核心原则**: 数据本地存储，不收集用户信息

#### ⚠️ 需要准备
- [ ] **在线隐私政策URL**: 需要在 App Store Connect 中提供可访问的URL
- [ ] **隐私政策需要托管在可公开访问的网站上**

### 4. App Store Connect 元数据

#### 📝 应用描述 (需要准备)

**应用名称**: WhisperLine

**副标题** (30字符):
```
Your Private Mirror
```

**描述** (4000字符):
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

**关键词** (100字符):
```
diary,journal,privacy,reflection,mood tracking,personal,secure,local storage,AI companion,writing
```

**推广文本** (170字符):
```
New in this version: Enhanced onboarding experience, improved companion management, and refined UI copy for better clarity.
```

**支持URL** (可选):
```
https://your-support-url.com
```

**营销URL** (可选):
```
https://your-marketing-url.com
```

### 5. 应用分类

**主要分类**: 
- Productivity (生产力)

**次要分类** (可选):
- Lifestyle (生活方式)

**内容分级**: 
- 4+ (适合所有年龄)

### 6. 定价和可用性

- [ ] **定价**: 免费 / 付费 / 应用内购买
- [ ] **可用地区**: 所有地区 / 特定地区
- [ ] **应用内购买**: 如果使用，需要配置产品ID

### 7. 构建和提交

#### EAS Build 配置
- [x] **EAS项目ID**: 9685fd18-75f1-4c62-807b-e38eed6370ae
- [x] **生产构建配置**: 已配置自动递增构建号

#### 构建命令
```bash
# 1. 确保已登录 EAS
eas login

# 2. 构建 iOS 生产版本
eas build --platform ios --profile production

# 3. 提交到 App Store
eas submit --platform ios --latest
```

### 8. App Store Connect 设置

#### 必需步骤
1. [ ] **创建应用记录** (如果尚未创建)
   - 登录 App Store Connect
   - 创建新应用
   - 填写基本信息

2. [ ] **配置应用信息**
   - 应用名称
   - 副标题
   - 描述
   - 关键词
   - 支持URL
   - 隐私政策URL

3. [ ] **上传应用截图**
   - 至少需要一组截图 (6.7" iPhone)
   - 建议提供多组截图以覆盖不同设备

4. [ ] **设置应用图标**
   - 上传 1024x1024 PNG 图标

5. [ ] **配置应用内购买** (如果使用)
   - 创建产品
   - 设置价格和描述

6. [ ] **设置定价和可用性**
   - 选择价格
   - 选择可用地区

7. [ ] **提交审核**
   - 填写审核信息
   - 提交构建版本

### 9. 审核信息

#### 联系信息
- **联系邮箱**: j8t@163.com
- **电话号码**: (如果需要)

#### 审核说明 (如果需要)
```
WhisperLine is a privacy-focused journaling app. All data is stored locally on the device. The app uses Face ID/Touch ID for app locking, which is a standard iOS feature. Photo and camera access are optional and only used when the user chooses to add images to their entries. Location access is optional and only used when the user requests weather information.
```

#### 演示账户 (如果需要)
- 如果应用需要登录，提供测试账户

### 10. 测试清单

#### 功能测试
- [ ] 应用启动正常
- [ ] 创建日记条目
- [ ] 编辑日记条目
- [ ] 删除日记条目
- [ ] 添加图片
- [ ] 选择心情
- [ ] 切换主题
- [ ] 创建Companion
- [ ] 设置主Companion
- [ ] 启用/禁用AI交互
- [ ] 应用锁定功能
- [ ] 导出数据
- [ ] 导入数据
- [ ] 隐私政策页面可访问

#### 设备测试
- [ ] iPhone (最新iOS版本)
- [ ] iPad (如果支持)
- [ ] 不同屏幕尺寸

#### 性能测试
- [ ] 应用启动速度
- [ ] 滚动流畅度
- [ ] 图片加载性能
- [ ] 内存使用情况

### 11. 发布前最后检查

- [ ] 所有功能正常工作
- [ ] 无崩溃或错误
- [ ] 隐私政策可访问
- [ ] 应用图标符合要求
- [ ] 截图已准备
- [ ] 元数据已填写
- [ ] 构建版本已上传
- [ ] 审核信息已填写

### 12. 发布后监控

- [ ] 监控崩溃报告
- [ ] 监控用户评价
- [ ] 准备响应审核反馈
- [ ] 准备更新版本 (如果需要)

---

## 🚀 快速发布步骤

1. **更新构建号**:
   ```bash
   # 编辑 app.json，将 buildNumber 从 "5" 改为 "6"
   ```

2. **构建生产版本**:
   ```bash
   eas build --platform ios --profile production
   ```

3. **等待构建完成** (约15-30分钟)

4. **提交到 App Store**:
   ```bash
   eas submit --platform ios --latest
   ```

5. **在 App Store Connect 中**:
   - 填写应用元数据
   - 上传截图
   - 设置定价
   - 提交审核

---

## 📞 支持联系

如有问题，请联系: j8t@163.com

---

**最后更新**: 2025年1月

