# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5项UI改进：登录页星空视觉重设计、添加页导航栏修复、打卡心得弹窗、个人信息编辑页（含生日祝福）、用户名可编辑。

**Architecture:** 纯前端改动为主；后端需求整理为独立 markdown 文档，不修改后端代码。所有新页面遵循现有深色主题（#060F1E 底色 + #3DD8C4 主色）。

**Tech Stack:** 微信小程序 WXML/WXSS/JS，Canvas 2D API，wx.chooseMedia，wx.setStorageSync

---

## 文件变更清单

| 操作 | 文件 |
|------|------|
| Modify | `pages/index/index.wxml` |
| Modify | `pages/index/index.wxss` |
| Modify | `pages/index/index.js` |
| Modify | `pages/habit/create/index.wxml` |
| Modify | `pages/habit/create/index.js` |
| Modify | `pages/habit/create/index.wxss` |
| Modify | `pages/home/home.wxml` |
| Modify | `pages/home/home.js` |
| Modify | `pages/home/home.wxss` |
| Modify | `pages/profile/index.wxml` |
| Modify | `pages/profile/index.js` |
| Modify | `utils/mock.js` |
| Modify | `utils/api.js` |
| Create | `pages/profile/edit/index.wxml` |
| Create | `pages/profile/edit/index.wxss` |
| Create | `pages/profile/edit/index.js` |
| Create | `pages/profile/edit/index.json` |
| Modify | `app.json` |
| Create | `docs/superpowers/plans/backend-requirements.md` |

---

## Task 1：修复添加习惯页导航栏被状态栏遮挡

**Files:**
- Modify: `pages/habit/create/index.wxml`
- Modify: `pages/habit/create/index.js`
- Modify: `pages/habit/create/index.wxss`

- [ ] **Step 1: 在 create/index.js 的 data 中加 statusBarHeight，onLoad 中读取**

```js
// pages/habit/create/index.js — data 块加：
statusBarHeight: 0,

// onLoad() 开头加：
const sysInfo = wx.getSystemInfoSync();
this.setData({ statusBarHeight: sysInfo.statusBarHeight || 0 });
```

- [ ] **Step 2: 在 create/index.wxml nav 上方加 status bar spacer**

```xml
<!-- pages/habit/create/index.wxml — .page 内第一行，nav 之前 -->
<view style="height: {{statusBarHeight}}px;"></view>
```

- [ ] **Step 3: 确认 nav padding-top 不额外叠加（保持现有 16rpx padding 不变）**

打开微信开发者工具模拟器，切换机型到 iPhone 14，确认返回箭头不再被时间栏覆盖。

- [ ] **Step 4: Commit**

```bash
git add pages/habit/create/index.wxml pages/habit/create/index.js
git commit -m "fix: add statusBarHeight spacer to create habit nav"
```

---

## Task 2：登录页星空粒子视觉重设计

**Files:**
- Modify: `pages/index/index.wxml`
- Modify: `pages/index/index.wxss`
- Modify: `pages/index/index.js`

- [ ] **Step 1: 替换 index.wxml 全部内容**

```xml
<view class="page">

  <!-- 粒子 canvas -->
  <canvas type="2d" id="star-canvas" class="star-canvas"></canvas>

  <!-- Splash -->
  <view class="splash {{showSplash ? '' : 'hidden'}}">
    <image class="splash-logo" src="/images/logo.png" mode="aspectFit"></image>
    <text class="splash-name">不荒岛</text>
  </view>

  <!-- Main content -->
  <view class="content {{showSplash ? 'hidden' : ''}}">

    <view class="header">
      <image class="logo-img" src="/images/logo.png" mode="aspectFit"></image>
      <text class="title">不荒岛</text>
      <text class="slogan">聚沙成塔，在方寸之间看见时间的形状</text>
    </view>

    <view class="actions">
      <view class="btn-login {{loading ? 'loading' : ''}}" bindtap="handleLogin">
        <text class="btn-text">{{loading ? '正在登岛…' : '微信一键登岛'}}</text>
      </view>
      <text class="disclaimer">登录即同意使用条款与隐私政策</text>
    </view>

  </view>
</view>
```

- [ ] **Step 2: 替换 index.wxss 全部内容**

```css
page {
  height: 100%;
  background: #060F1E;
}

.page {
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* ---- Star canvas ---- */
.star-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ---- Splash ---- */
.splash {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.splash.hidden {
  opacity: 0;
  transform: scale(1.05);
  pointer-events: none;
}

.splash-logo {
  width: 160rpx;
  height: 160rpx;
  animation: splashFloat 1.5s ease-in-out infinite alternate;
}

@keyframes splashFloat {
  from { transform: translateY(0); }
  to   { transform: translateY(-16rpx); }
}

.splash-name {
  margin-top: 32rpx;
  font-size: 52rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #fff;
}

/* ---- Main content ---- */
.content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 120rpx 60rpx 100rpx;
  box-sizing: border-box;
  transition: opacity 0.5s ease;
}

.content.hidden {
  opacity: 0;
  pointer-events: none;
}

/* ---- Header ---- */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.logo-img {
  width: 220rpx;
  height: 220rpx;
  margin-bottom: 40rpx;
  animation: logoFloat 3.5s ease-in-out infinite;
  filter: drop-shadow(0 0 40rpx rgba(61,216,196,0.5));
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 40rpx rgba(61,216,196,0.4)); }
  50%       { transform: translateY(-18rpx); filter: drop-shadow(0 0 60rpx rgba(61,216,196,0.7)); }
}

.title {
  font-size: 72rpx;
  font-weight: 800;
  letter-spacing: 12rpx;
  color: #fff;
  margin-bottom: 24rpx;
}

.slogan {
  font-size: 26rpx;
  color: rgba(255,255,255,0.4);
  letter-spacing: 2rpx;
  text-align: center;
  line-height: 1.7;
  max-width: 480rpx;
}

/* ---- Actions ---- */
.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
}

.btn-login {
  width: 100%;
  height: 108rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #3DD8C4, #2ABCA8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60rpx rgba(61,216,196,0.4), 0 12rpx 40rpx rgba(0,0,0,0.4);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-login:active {
  transform: scale(0.96);
  box-shadow: 0 0 30rpx rgba(61,216,196,0.2);
}

.btn-login.loading {
  background: rgba(61,216,196,0.4);
  box-shadow: none;
}

.btn-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #060F1E;
  letter-spacing: 2rpx;
}

.btn-login.loading .btn-text {
  color: rgba(255,255,255,0.6);
}

.disclaimer {
  font-size: 22rpx;
  color: rgba(255,255,255,0.18);
  letter-spacing: 1rpx;
}
```

- [ ] **Step 3: 替换 index.js，加入粒子 canvas 初始化逻辑**

```js
// pages/index/index.js
const API = require('../../utils/api');
const app = getApp();

Page({
  data: {
    loading: false,
    showSplash: true,
  },

  _starCanvas: null,
  _starCtx: null,
  _stars: [],
  _animFrame: null,

  onLoad() {
    if (app.requireLogin()) {
      wx.reLaunch({ url: '/pages/home/home' });
      return;
    }
    setTimeout(() => this.setData({ showSplash: false }), 800);
  },

  onReady() {
    this._initStars();
  },

  onUnload() {
    if (this._animFrame && this._starCanvas) {
      this._starCanvas.cancelAnimationFrame(this._animFrame);
    }
  },

  _initStars() {
    wx.createSelectorQuery()
      .in(this)
      .select('#star-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const W = res[0].width * dpr;
        const H = res[0].height * dpr;
        canvas.width = W;
        canvas.height = H;
        ctx.scale(dpr, dpr);
        this._starCanvas = canvas;
        this._starCtx = ctx;

        const CW = res[0].width;
        const CH = res[0].height;

        // 生成60个星点
        this._stars = Array.from({ length: 60 }, () => ({
          x: Math.random() * CW,
          y: Math.random() * CH,
          r: 0.5 + Math.random() * 1.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: 0.2 + Math.random() * 0.6,
          pulse: Math.random() * Math.PI * 2,
        }));

        this._CW = CW;
        this._CH = CH;
        this._drawStars();
      });
  },

  _drawStars() {
    const ctx = this._starCtx;
    const stars = this._stars;
    const CW = this._CW;
    const CH = this._CH;

    const animate = () => {
      ctx.clearRect(0, 0, CW, CH);

      // 连线（距离 < 100px）
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(61,216,196,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // 星点
      stars.forEach(s => {
        s.pulse += 0.02;
        const a = s.alpha * (0.7 + 0.3 * Math.sin(s.pulse));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();

        // 移动 + 边界回弹
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > CW) s.vx *= -1;
        if (s.y < 0 || s.y > CH) s.vy *= -1;
      });

      this._animFrame = this._starCanvas.requestAnimationFrame(animate);
    };

    this._animFrame = this._starCanvas.requestAnimationFrame(animate);
  },

  handleLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.login({
      success: async (res) => {
        try {
          const result = await API.login({
            login_code: res.code || 'mock_code',
            nickname: '岛主',
            avatar_url: '',
          });
          if (result.code === 0) {
            app.setLogin(result.data.token, result.data.user);
            wx.showToast({ title: '登岛成功 ✦', icon: 'none', duration: 1500 });
            setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 800);
          } else {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          }
        } catch (e) {
          wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        } finally {
          this.setData({ loading: false });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '授权失败', icon: 'none' });
      },
    });
  },
});
```

- [ ] **Step 4: 微信开发者工具预览，确认星空粒子动画正常、logo.png 显示正确、登录按钮可点击**

- [ ] **Step 5: Commit**

```bash
git add pages/index/index.wxml pages/index/index.wxss pages/index/index.js
git commit -m "feat: redesign login page with starfield particle canvas"
```

---

## Task 3：打卡心得弹窗

**Files:**
- Modify: `pages/home/home.wxml`
- Modify: `pages/home/home.wxss`
- Modify: `pages/home/home.js`
- Modify: `utils/mock.js`
- Modify: `utils/api.js`

- [ ] **Step 1: 在 home.js data 中加弹窗状态字段**

```js
// home.js data 块追加：
showNoteSheet: false,
noteText: '',
_pendingNoteCheckinId: '',   // 实例变量，不放 data
```

实际上 `_pendingNoteCheckinId` 作为实例变量加到 Page 对象顶层（与 `_canvas` 等并列）：
```js
_pendingNoteCheckinId: '',
```

- [ ] **Step 2: 修改 home.js `_completeCheckin` 方法，打卡成功后弹出心得窗**

在 `_showCelebration(habit)` 调用之后追加：

```js
// 保存本次打卡ID，用于提交心得
this._pendingNoteCheckinId = res.data.checkin_id;
// 延迟600ms等动画稳定后弹出心得窗
setTimeout(() => {
  this.setData({ showNoteSheet: true, noteText: '' });
}, 600);
```

- [ ] **Step 3: 在 home.js 加心得相关方法**

```js
onNoteInput(e) {
  this.setData({ noteText: e.detail.value });
},

onNoteSkip() {
  this.setData({ showNoteSheet: false, noteText: '' });
  this._pendingNoteCheckinId = '';
},

async onNoteSave() {
  const note = this.data.noteText.trim();
  if (!note) {
    this.onNoteSkip();
    return;
  }
  try {
    await API.saveCheckinNote(this._pendingNoteCheckinId, note);
  } catch (e) {
    // 静默失败，不影响主流程
  }
  this.setData({ showNoteSheet: false, noteText: '' });
  this._pendingNoteCheckinId = '';
  wx.showToast({ title: '心得已记录 ✦', icon: 'none', duration: 1500 });
},
```

- [ ] **Step 4: 在 home.wxml 底部（celebrate-overlay 之后）加心得弹窗**

```xml
<!-- 心得遮罩 -->
<view
  class="note-mask {{showNoteSheet ? 'show' : ''}}"
  bindtap="onNoteSkip"
></view>

<!-- 心得底部弹窗 -->
<view class="note-sheet {{showNoteSheet ? 'show' : ''}}">
  <view class="note-handle"></view>
  <text class="note-title">记录今天的心得</text>
  <text class="note-sub">点击其他区域可跳过</text>
  <view class="note-input-wrap" catchtap="">
    <textarea
      class="note-input"
      placeholder="今天感觉怎么样？有什么收获？"
      placeholder-class="note-ph"
      value="{{noteText}}"
      bindinput="onNoteInput"
      maxlength="200"
      auto-height
      focus="{{showNoteSheet}}"
    ></textarea>
    <text class="note-count">{{noteText.length}}/200</text>
  </view>
  <view class="note-actions">
    <view class="note-skip-btn" catchtap="onNoteSkip">
      <text class="note-skip-text">跳过</text>
    </view>
    <view
      class="note-save-btn {{noteText.trim() ? '' : 'disabled'}}"
      catchtap="onNoteSave"
    >
      <text class="note-save-text">保存心得 ✦</text>
    </view>
  </view>
</view>
```

- [ ] **Step 5: 在 home.wxss 末尾追加心得弹窗样式**

```css
/* ---- Note sheet ---- */
.note-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0);
  z-index: 60;
  pointer-events: none;
  transition: background 0.3s ease;
}
.note-mask.show {
  background: rgba(0,0,0,0.6);
  pointer-events: auto;
}

.note-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #0D1B2E;
  border-top: 1rpx solid rgba(255,255,255,0.08);
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  padding: 20rpx 48rpx 80rpx;
  z-index: 61;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
}
.note-sheet.show {
  transform: translateY(0);
}

.note-handle {
  width: 80rpx;
  height: 8rpx;
  border-radius: 9999rpx;
  background: rgba(255,255,255,0.12);
  margin: 0 auto 36rpx;
}

.note-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
}

.note-sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.3);
  margin-bottom: 32rpx;
}

.note-input-wrap {
  background: rgba(255,255,255,0.05);
  border: 1rpx solid rgba(255,255,255,0.1);
  border-radius: 20rpx;
  padding: 24rpx 28rpx 16rpx;
  margin-bottom: 32rpx;
  position: relative;
}

.note-input {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #fff;
  line-height: 1.6;
}

.note-ph { color: rgba(255,255,255,0.2); }

.note-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: rgba(255,255,255,0.2);
  margin-top: 8rpx;
}

.note-actions {
  display: flex;
  gap: 20rpx;
}

.note-skip-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 9999rpx;
  background: rgba(255,255,255,0.06);
  border: 1rpx solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-skip-text {
  font-size: 28rpx;
  color: rgba(255,255,255,0.4);
}

.note-save-btn {
  flex: 2;
  height: 96rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #3DD8C4, #2ABCA8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(61,216,196,0.3);
  transition: all 0.2s ease;
}

.note-save-btn:active { transform: scale(0.97); }

.note-save-btn.disabled {
  background: rgba(255,255,255,0.08);
  box-shadow: none;
}

.note-save-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #060F1E;
}

.note-save-btn.disabled .note-save-text {
  color: rgba(255,255,255,0.3);
}
```

- [ ] **Step 6: 在 utils/api.js 中加 `saveCheckinNote` 方法**

```js
// utils/api.js — API 对象内追加：
async saveCheckinNote(checkinId, note) {
  if (USE_MOCK) return MOCK.saveCheckinNote(checkinId, note);
  return request('PATCH', `/checkins/${checkinId}/note`, { note });
},
```

- [ ] **Step 7: 在 utils/mock.js 中加 `saveCheckinNote` mock**

```js
// utils/mock.js — MOCK 对象内追加：
async saveCheckinNote(checkinId, note) {
  await delay(200);
  return ok({ checkin_id: checkinId, note });
},
```

- [ ] **Step 8: 测试：打卡一个习惯，确认动画结束后弹出心得窗；输入文字点保存看到 toast；点遮罩层跳过弹窗消失**

- [ ] **Step 9: Commit**

```bash
git add pages/home/home.wxml pages/home/home.wxss pages/home/home.js utils/api.js utils/mock.js
git commit -m "feat: add post-checkin note sheet"
```

---

## Task 4：个人信息编辑页（用户名+头像+个性签名+生日）

**Files:**
- Create: `pages/profile/edit/index.wxml`
- Create: `pages/profile/edit/index.wxss`
- Create: `pages/profile/edit/index.js`
- Create: `pages/profile/edit/index.json`
- Modify: `pages/profile/index.wxml`
- Modify: `pages/profile/index.js`
- Modify: `app.json`
- Modify: `utils/api.js`
- Modify: `utils/mock.js`

- [ ] **Step 1: 在 app.json pages 数组中注册新页面**

在 `"pages/profile/index"` 之后加：
```json
"pages/profile/edit/index"
```

- [ ] **Step 2: 创建 pages/profile/edit/index.json**

```json
{
  "navigationBarTitleText": "编辑资料",
  "navigationBarBackgroundColor": "#060F1E",
  "navigationBarTextStyle": "white"
}
```

- [ ] **Step 3: 创建 pages/profile/edit/index.wxml**

```xml
<view class="page">
  <view style="height: {{statusBarHeight}}px;"></view>

  <!-- Nav -->
  <view class="nav">
    <view class="nav-back" bindtap="onBack">
      <text class="nav-back-icon">←</text>
    </view>
    <text class="nav-title">编辑资料</text>
    <view class="nav-save {{saving ? 'loading' : ''}}" bindtap="onSave">
      <text class="nav-save-text">{{saving ? '保存中' : '保存'}}</text>
    </view>
  </view>

  <!-- Avatar -->
  <view class="avatar-section" bindtap="onChooseAvatar">
    <view class="avatar-wrap">
      <image wx:if="{{avatarUrl}}" class="avatar-img" src="{{avatarUrl}}" mode="aspectFill"></image>
      <view wx:else class="avatar-placeholder">
        <text class="avatar-emoji">🏝</text>
      </view>
      <view class="avatar-edit-badge">
        <text class="avatar-edit-icon">✎</text>
      </view>
    </view>
    <text class="avatar-hint">点击更换头像</text>
  </view>

  <!-- Fields -->
  <view class="fields">
    <view class="field-item">
      <text class="field-label">昵称</text>
      <input
        class="field-input"
        value="{{nickname}}"
        bindinput="onNicknameInput"
        placeholder="输入你的昵称"
        placeholder-class="field-ph"
        maxlength="20"
      />
    </view>

    <view class="field-divider"></view>

    <view class="field-item">
      <text class="field-label">个性签名</text>
      <input
        class="field-input"
        value="{{bio}}"
        bindinput="onBioInput"
        placeholder="一句话介绍自己"
        placeholder-class="field-ph"
        maxlength="50"
      />
    </view>

    <view class="field-divider"></view>

    <view class="field-item" bindtap="onPickBirthday">
      <text class="field-label">生日</text>
      <view class="field-picker-row">
        <text class="field-picker-val {{birthday ? '' : 'empty'}}">
          {{birthday || '选择生日'}}
        </text>
        <text class="field-arrow">›</text>
      </view>
    </view>
  </view>

  <!-- Birthday picker (shown inline when active) -->
  <view wx:if="{{showBirthdayPicker}}" class="birthday-picker-wrap" catchtap="">
    <picker
      mode="date"
      value="{{birthday || '2000-01-01'}}"
      start="1900-01-01"
      end="{{todayStr}}"
      bindchange="onBirthdayChange"
      bindcancel="onBirthdayCancel"
    >
      <view class="birthday-picker-trigger" bindtap="onBirthdayPickerTap">
        <text>{{birthday || '选择日期'}}</text>
      </view>
    </picker>
  </view>

</view>
```

- [ ] **Step 4: 创建 pages/profile/edit/index.wxss**

```css
page {
  height: 100%;
  background: #060F1E;
  color: #fff;
}

.page {
  min-height: 100%;
}

/* ---- Nav ---- */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 40rpx;
}

.nav-back-icon {
  font-size: 44rpx;
  color: rgba(255,255,255,0.6);
  padding: 8rpx 8rpx 8rpx 0;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.nav-save {
  padding: 12rpx 28rpx;
  background: linear-gradient(135deg, #3DD8C4, #2ABCA8);
  border-radius: 9999rpx;
  transition: opacity 0.2s ease;
}

.nav-save.loading { opacity: 0.5; }

.nav-save-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #060F1E;
}

/* ---- Avatar ---- */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0 56rpx;
}

.avatar-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 20rpx;
}

.avatar-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(61,216,196,0.3);
}

.avatar-placeholder {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(61,216,196,0.2), rgba(61,216,196,0.05));
  border: 3rpx solid rgba(61,216,196,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-emoji { font-size: 72rpx; }

.avatar-edit-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #3DD8C4;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #060F1E;
}

.avatar-edit-icon {
  font-size: 24rpx;
  color: #060F1E;
  font-weight: 700;
}

.avatar-hint {
  font-size: 24rpx;
  color: rgba(255,255,255,0.3);
}

/* ---- Fields ---- */
.fields {
  margin: 0 40rpx;
  background: rgba(255,255,255,0.04);
  border: 1rpx solid rgba(255,255,255,0.07);
  border-radius: 28rpx;
  overflow: hidden;
}

.field-item {
  display: flex;
  align-items: center;
  padding: 32rpx 32rpx;
  gap: 24rpx;
  min-height: 100rpx;
}

.field-label {
  font-size: 28rpx;
  color: rgba(255,255,255,0.5);
  flex-shrink: 0;
  width: 120rpx;
}

.field-input {
  flex: 1;
  font-size: 28rpx;
  color: #fff;
  text-align: right;
}

.field-ph { color: rgba(255,255,255,0.2); }

.field-picker-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
}

.field-picker-val {
  font-size: 28rpx;
  color: #fff;
}

.field-picker-val.empty { color: rgba(255,255,255,0.2); }

.field-arrow {
  font-size: 32rpx;
  color: rgba(255,255,255,0.2);
}

.field-divider {
  height: 1rpx;
  background: rgba(255,255,255,0.06);
  margin: 0 32rpx;
}

/* ---- Birthday picker trigger (invisible, used by picker component) ---- */
.birthday-picker-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0;
  overflow: hidden;
}

.birthday-picker-trigger {
  width: 100%;
  height: 1rpx;
}
```

- [ ] **Step 5: 创建 pages/profile/edit/index.js**

```js
const API = require('../../../utils/api');
const app = getApp();

Page({
  data: {
    statusBarHeight: 0,
    nickname: '',
    bio: '',
    birthday: '',
    avatarUrl: '',
    saving: false,
    showBirthdayPicker: false,
    todayStr: new Date().toISOString().split('T')[0],
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const user = app.globalData.userInfo || {};
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 0,
      nickname: user.nickname || '',
      bio: user.bio || '',
      birthday: user.birthday || '',
      avatarUrl: user.avatar_url || '',
    });
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },
  onBioInput(e)      { this.setData({ bio: e.detail.value }); },

  onPickBirthday() {
    // 使用 picker 组件——直接用 picker mode=date 绑定到 field-item
    // 此处触发 picker 弹出
    this.setData({ showBirthdayPicker: true });
    // picker 组件会立即弹出，无需额外操作
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value, showBirthdayPicker: false });
  },

  onBirthdayCancel() {
    this.setData({ showBirthdayPicker: false });
  },

  onBirthdayPickerTap() {},

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.setData({ avatarUrl: tempPath });
      },
    });
  },

  async onSave() {
    if (this.data.saving) return;
    const { nickname, bio, birthday, avatarUrl } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const res = await API.updateProfile({ nickname: nickname.trim(), bio, birthday, avatar_url: avatarUrl });
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      // 更新全局 userInfo
      const newUser = { ...(app.globalData.userInfo || {}), nickname: nickname.trim(), bio, birthday, avatar_url: avatarUrl };
      app.globalData.userInfo = newUser;
      wx.showToast({ title: '已保存 ✦', icon: 'none', duration: 1500 });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  onBack() { wx.navigateBack(); },
});
```

- [ ] **Step 6: 修改 profile/index.wxml，头像区域加 bindtap 跳转编辑页**

将 `.profile-header` 的 `<view class="avatar-wrap">` 和 `.user-info` 包裹在一个可点击 view 里：

```xml
<!-- 替换现有 profile-header 内容 -->
<view class="profile-header" bindtap="onGoToEdit">
  <view class="avatar-wrap">
    <view class="avatar">
      <image wx:if="{{user.avatar_url}}" class="avatar-img-real" src="{{user.avatar_url}}" mode="aspectFill"></image>
      <text wx:else class="avatar-emoji">🏝</text>
    </view>
    <view class="avatar-edit-dot"></view>
  </view>
  <view class="user-info">
    <text class="user-name">{{user.nickname || '岛主'}}</text>
    <text class="user-bio wx:if={{user.bio}}">{{user.bio}}</text>
    <text class="user-since">加入不荒岛 · 坚持中</text>
  </view>
  <text class="profile-edit-arrow">›</text>
</view>
```

- [ ] **Step 7: 在 profile/index.wxss 追加新样式**

```css
.avatar-img-real {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
}

.avatar-edit-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #3DD8C4;
  border: 3rpx solid #060F1E;
}

.avatar-wrap {
  position: relative;
}

.user-bio {
  display: block;
  font-size: 22rpx;
  color: rgba(255,255,255,0.4);
  margin-bottom: 4rpx;
}

.profile-edit-arrow {
  font-size: 40rpx;
  color: rgba(255,255,255,0.2);
  margin-left: auto;
}
```

- [ ] **Step 8: 在 profile/index.js 加 `onGoToEdit` 方法**

```js
onGoToEdit() {
  wx.navigateTo({ url: '/pages/profile/edit/index' });
},
```

- [ ] **Step 9: 在 utils/api.js 加 `updateProfile` 方法**

```js
async updateProfile(params) {
  if (USE_MOCK) return MOCK.updateProfile(params);
  return request('PUT', '/users/me/profile', params);
},
```

- [ ] **Step 10: 在 utils/mock.js 加 `updateProfile` mock，并在 mockUser 加 bio/birthday 字段**

```js
// mockUser 加字段：
const mockUser = {
  id: 'u1',
  nickname: '岛主',
  avatar_url: '',
  bio: '',
  birthday: '',
  created_at: '2026-04-15T00:00:00Z',
};

// MOCK 对象追加：
async updateProfile(params) {
  await delay(400);
  if (params.nickname !== undefined) mockUser.nickname = params.nickname;
  if (params.bio !== undefined)      mockUser.bio = params.bio;
  if (params.birthday !== undefined) mockUser.birthday = params.birthday;
  if (params.avatar_url !== undefined) mockUser.avatar_url = params.avatar_url;
  return ok({ ...mockUser });
},
```

- [ ] **Step 11: 测试：进入我的页，点击头像区域跳转编辑页；修改昵称/签名/生日后保存，返回个人页看到更新**

- [ ] **Step 12: Commit**

```bash
git add pages/profile/edit/ pages/profile/index.wxml pages/profile/index.js pages/profile/index.wxss utils/api.js utils/mock.js app.json
git commit -m "feat: add profile edit page with nickname/bio/birthday/avatar"
```

---

## Task 5：生日祝福弹窗

**Files:**
- Modify: `pages/home/home.wxml`
- Modify: `pages/home/home.wxss`
- Modify: `pages/home/home.js`

- [ ] **Step 1: 在 home.js data 加生日弹窗状态**

```js
showBirthdayWish: false,
```

- [ ] **Step 2: 在 home.js `onShow` 末尾（`_loadData()` 调用之后）加生日检测**

```js
this._checkBirthday();
```

- [ ] **Step 3: 在 home.js 加 `_checkBirthday` 方法**

```js
_checkBirthday() {
  const user = app.globalData.userInfo;
  if (!user || !user.birthday) return;
  const today = new Date();
  const [, mm, dd] = user.birthday.split('-');
  if (
    parseInt(mm) === today.getMonth() + 1 &&
    parseInt(dd) === today.getDate()
  ) {
    // 每次进入 onShow 都检查，用 storage 防止当天重复弹
    const storage = require('../../utils/storage');
    const key = 'birthday_wish_' + today.toISOString().split('T')[0];
    if (!storage.get(key, false)) {
      storage.set(key, true);
      setTimeout(() => this.setData({ showBirthdayWish: true }), 1200);
    }
  }
},

onCloseBirthdayWish() {
  this.setData({ showBirthdayWish: false });
},
```

- [ ] **Step 4: 在 home.wxml 底部加生日祝福弹窗（note-sheet 之后）**

```xml
<!-- 生日祝福弹窗 -->
<view class="bday-overlay {{showBirthdayWish ? 'show' : ''}}" bindtap="onCloseBirthdayWish">
  <view class="bday-card" catchtap="">
    <text class="bday-emoji">🎂</text>
    <text class="bday-title">生日快乐！</text>
    <text class="bday-sub">{{user.nickname || '岛主'}}，祝你今天幸福满满</text>
    <text class="bday-wish">愿你的岛屿，和你的梦想一起生长 🏝</text>
    <view class="bday-btn" bindtap="onCloseBirthdayWish">
      <text class="bday-btn-text">谢谢 ✦</text>
    </view>
  </view>
</view>
```

- [ ] **Step 5: 在 home.wxss 末尾加生日弹窗样式**

```css
/* ---- Birthday wish overlay ---- */
.bday-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: background 0.4s ease;
}

.bday-overlay.show {
  background: rgba(0,0,0,0.7);
  pointer-events: auto;
}

.bday-card {
  width: 560rpx;
  background: #0D1B2E;
  border: 1rpx solid rgba(61,216,196,0.2);
  border-radius: 40rpx;
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 0 80rpx rgba(61,216,196,0.15), 0 40rpx 80rpx rgba(0,0,0,0.4);
  transform: scale(0.85);
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
}

.bday-overlay.show .bday-card {
  transform: scale(1);
  opacity: 1;
}

.bday-emoji {
  font-size: 96rpx;
  line-height: 1;
  margin-bottom: 8rpx;
}

.bday-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 4rpx;
}

.bday-sub {
  font-size: 28rpx;
  color: rgba(255,255,255,0.6);
  text-align: center;
}

.bday-wish {
  font-size: 26rpx;
  color: rgba(61,216,196,0.7);
  text-align: center;
  line-height: 1.6;
  margin-top: 8rpx;
}

.bday-btn {
  margin-top: 32rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #3DD8C4, #2ABCA8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(61,216,196,0.3);
}

.bday-btn:active { transform: scale(0.97); }

.bday-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #060F1E;
}
```

- [ ] **Step 6: 测试：在 mock.js 将 mockUser.birthday 设为今天日期（如 `'2026-05-29'`），进入首页确认祝福弹窗出现；关闭后再次进 onShow 不再弹出（storage 防重复）**

- [ ] **Step 7: 测试完后将 mockUser.birthday 改回空字符串 `''`**

- [ ] **Step 8: Commit**

```bash
git add pages/home/home.wxml pages/home/home.wxss pages/home/home.js
git commit -m "feat: birthday wish overlay on home page"
```

---

## 自检（Spec Coverage）

| 需求 | 对应 Task |
|------|-----------|
| 登录界面为第一个界面（splash 时间缩短） | Task 2 Step 3（splash 800ms） |
| 登录页视觉重设计（星空粒子+logo.png） | Task 2 |
| 添加返回图标被时间遮挡 | Task 1 |
| 打卡心得弹窗（打卡后自动弹出，可跳过，可补记） | Task 3 |
| 个人信息编辑页（昵称+头像+签名+生日） | Task 4 |
| 生日祝福弹窗 | Task 5 |
| 后端需求文档 | 见 backend-requirements.md |
