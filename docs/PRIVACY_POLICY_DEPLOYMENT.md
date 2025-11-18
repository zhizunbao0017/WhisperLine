# 隐私政策 URL 部署指南

## 📋 概述

本文档说明如何将隐私政策部署到可公开访问的 URL，以满足 App Store 的要求。

## 🚀 方案一：GitHub Pages（推荐）

### 前提条件
- GitHub 账户
- 仓库已推送到 GitHub

### 步骤

#### 1. 创建 `gh-pages` 分支（如果还没有）

```bash
# 创建并切换到 gh-pages 分支
git checkout -b gh-pages

# 将隐私政策文件移动到根目录
cp docs/privacy-policy.html index.html

# 提交更改
git add index.html
git commit -m "Add privacy policy for App Store"
git push origin gh-pages
```

#### 2. 启用 GitHub Pages

1. 访问 GitHub 仓库页面
2. 点击 **Settings** → **Pages**
3. 在 **Source** 下选择：
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. 点击 **Save**

#### 3. 获取 URL

GitHub Pages URL 格式：
```
https://[你的用户名].github.io/[仓库名]/
```

例如：
```
https://zhizunbao0017.github.io/WhisperLine/
```

**注意**: 首次部署可能需要几分钟才能生效。

---

## 🌐 方案二：使用独立的 GitHub Pages 仓库

如果不想在主仓库中创建 `gh-pages` 分支，可以创建一个独立的仓库：

### 步骤

1. **创建新仓库** (例如: `whisperline-privacy-policy`)

2. **克隆并设置**:
```bash
git clone https://github.com/[你的用户名]/whisperline-privacy-policy.git
cd whisperline-privacy-policy
```

3. **复制隐私政策文件**:
```bash
cp ../WhisperLine/docs/privacy-policy.html index.html
```

4. **提交并推送**:
```bash
git add index.html
git commit -m "Initial commit: Privacy Policy"
git push origin main
```

5. **启用 GitHub Pages**:
   - Settings → Pages
   - Source: `main` branch, `/ (root)`

6. **URL**:
```
https://[你的用户名].github.io/whisperline-privacy-policy/
```

---

## 🔧 方案三：使用 Netlify（免费，快速）

### 步骤

1. **访问 Netlify**: https://www.netlify.com

2. **注册/登录** (可以使用 GitHub 账户)

3. **创建新站点**:
   - 点击 "Add new site" → "Deploy manually"
   - 或连接 GitHub 仓库

4. **上传文件**:
   - 将 `docs/privacy-policy.html` 重命名为 `index.html`
   - 拖拽到 Netlify 部署区域

5. **获取 URL**:
   - Netlify 会自动生成 URL，例如：
   ```
   https://whisperline-privacy-policy.netlify.app
   ```

6. **自定义域名** (可选):
   - 可以在 Netlify 设置中绑定自定义域名

---

## 📝 方案四：使用 Vercel（免费，快速）

### 步骤

1. **访问 Vercel**: https://vercel.com

2. **注册/登录** (可以使用 GitHub 账户)

3. **导入项目**:
   - 点击 "Add New Project"
   - 选择 GitHub 仓库或上传文件

4. **部署**:
   - Vercel 会自动检测并部署

5. **获取 URL**:
   - Vercel 会自动生成 URL，例如：
   ```
   https://whisperline-privacy-policy.vercel.app
   ```

---

## ✅ 验证部署

部署完成后，请验证：

1. **URL 可访问**: 在浏览器中打开 URL，确认页面正常显示
2. **内容完整**: 检查所有内容是否正确显示
3. **移动端友好**: 在手机上打开，确认响应式设计正常
4. **HTTPS**: 确保 URL 使用 HTTPS（所有上述方案都支持）

---

## 📱 在 App Store Connect 中使用

1. **登录 App Store Connect**: https://appstoreconnect.apple.com

2. **选择应用** → **App 信息**

3. **找到"隐私政策 URL"字段**

4. **输入部署的 URL**，例如：
   ```
   https://zhizunbao0017.github.io/WhisperLine/
   ```

5. **保存**

---

## 🔄 更新隐私政策

如果需要更新隐私政策：

1. **修改 HTML 文件**: `docs/privacy-policy.html`
2. **更新日期**: 修改 "Last Updated" 日期
3. **重新部署**:
   - GitHub Pages: 推送更改到 `gh-pages` 分支
   - Netlify/Vercel: 自动重新部署（如果连接了 Git）

---

## 📞 需要帮助？

如有问题，请联系: j8t@163.com

---

**推荐方案**: GitHub Pages（最简单，免费，与代码仓库集成）

