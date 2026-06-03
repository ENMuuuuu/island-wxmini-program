const API = require('../../utils/api');
const IslandRenderer = require('../../utils/island-renderer');
const { GROWTH_SPOTS, TW, TH, HW, HH, BD_BASE } = IslandRenderer;

const app = getApp();
const CHARGE_INTERVAL = 40;   // ms per tick
const CHARGE_INCREMENT = 6;   // progress per tick

Page({
  data: {
    statusBarHeight: 0,
    greeting: '早安',
    user: { nickname: '岛主' },
    habits: [],
    completedCount: 0,
    pendingCount: 0,
    totalStreak: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    // Co-build mode
    cobuildActive: false,
    partnerInfo: null,
    partnerDone: 0,
    partnerTotal: 0,
    partnerHabits: [],
    // Celebration overlay
    showCelebrate: false,
    celebrateText: '',
    particles: [],
    showNoteSheet: false,
    noteText: '',
    showBirthdayWish: false,
  },

  _pendingNoteCheckinId: '',
  _canvas: null,
  _ctx: null,
  _growthLayers: [],      // own lit layers
  _darkLayers: [],        // own dark/decayed layers
  _partnerLayers: [],     // partner lit layers (co-build)
  _chargeTimers: {},      // { habitId: interval }
  _animFrame: null,
  _imageCache: null,      // Map<string, WXImage>
  _imageCacheReady: false,

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const canvasH = Math.round(sysInfo.windowHeight * 0.48);
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '深夜好' : hour < 12 ? '早安' : hour < 18 ? '下午好' : '晚安';
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 0,
      canvasWidth: sysInfo.windowWidth,
      canvasHeight: canvasH,
      greeting,
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this._loadData();
    this._checkBirthday();
  },

  onReady() {
    this._initCanvas();
  },

  _initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select('#island-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this._canvas = canvas;
        this._ctx = ctx;
        this._preloadImages(canvas, () => {
          this._drawIsland();
        });
      });
  },

  _preloadImages(canvas, onReady) {
    const isoNames = [
      'dirtFarmland_S',
      'planks_S', 'planksHigh_S', 'planksHighOld_S',
      'cornYoung_S', 'corn_S', 'cornDouble_S',
      'sacksCrate_S',
      'hayBales_S', 'hayBalesStacked_S',
      'fenceLow_S', 'fenceHigh_S',
    ];
    const cache = new Map();
    const total = isoNames.length;
    let loaded = 0;
    let done = false;
    const ISO_BASE = '/images/kenney_isometric-miniature-farm/Isometric/';

    const finish = (cacheKey, img) => {
      if (done) return;
      if (img) cache.set(cacheKey, img);
      if (++loaded >= total) {
        done = true;
        this._imageCache = cache;
        this._imageCacheReady = true;
        onReady();
      }
    };

    isoNames.forEach(name => {
      const img = canvas.createImage();
      img.onload  = () => finish(name, img);
      img.onerror = () => finish(name, null);
      img.src = ISO_BASE + name + '.png';
    });

    // 4s 超时保险：确保即使某张图挂起也能继续渲染
    setTimeout(() => {
      if (!done) {
        done = true;
        this._imageCache = cache;
        this._imageCacheReady = true;
        onReady();
      }
    }, 4000);
  },

  async _loadData() {
    try {
      const res = await API.getHomeData();
      if (res.code !== 0) return;
      const { user, today_habits, completed_count, pending_count } = res.data;
      const totalStreak = today_habits.reduce((s, h) => s + (h.streak || 0), 0);

      // Build own lit layers
      const layers = [];
      // Build own dark layers
      const darkLayers = [];

      today_habits.forEach(h => {
        const litCount = h.growth_state ? h.growth_state.lit_layer_count : 0;
        const darkCount = h.growth_state ? h.growth_state.dark_layer_count : 0;

        for (let i = 0; i < litCount; i++) {
          layers.push({
            id: `${h.id}_${i}`,
            habit_id: h.id,
            layer_no: i + 1,
            theme_type: h.theme_type || 'island',
          });
        }
        for (let i = 0; i < darkCount; i++) {
          darkLayers.push({
            id: `${h.id}_dark_${i}`,
            habit_id: h.id,
            layer_no: litCount + i + 1,
            theme_type: h.theme_type || 'island',
            render_state: 'dark',
          });
        }
      });

      this._growthLayers = layers;
      this._darkLayers = darkLayers;

      this.setData({
        user,
        habits: today_habits.map(h => ({ ...h, chargeProgress: 0, isCharging: false })),
        completedCount: completed_count,
        pendingCount: pending_count,
        totalStreak,
      });

      this._drawIsland();

      // Load co-build data if active
      if (app.globalData.cobuildData) {
        this._loadCobuildData();
      } else {
        this.setData({ cobuildActive: false });
      }
    } catch (e) {
      console.error('loadData error', e);
    }
  },

  async _loadCobuildData() {
    try {
      const res = await API.getCobuildStatus();
      if (res.code !== 0) {
        this.setData({ cobuildActive: false });
        return;
      }
      const { partner, partner_habits, partner_done_count, partner_total_count } = res.data;

      // Build partner lit layers
      const partnerLayers = [];
      partner_habits.forEach(h => {
        const litCount = h.growth_state ? h.growth_state.lit_layer_count : 0;
        for (let i = 0; i < litCount; i++) {
          partnerLayers.push({
            id: `partner_${h.id}_${i}`,
            habit_id: h.id,
            layer_no: i + 1,
            theme_type: h.theme_type || 'island',
          });
        }
      });

      this._partnerLayers = partnerLayers;

      this.setData({
        cobuildActive: true,
        partnerInfo: partner,
        partnerHabits: partner_habits,
        partnerDone: partner_done_count,
        partnerTotal: partner_total_count,
      });

      this._drawIsland();
    } catch (e) {
      console.error('cobuild load error', e);
    }
  },

  _drawIsland(newLayerAnim) {
    if (!this._ctx || !this._canvas) return;
    if (!this._imageCacheReady) return;
    const { canvasWidth, canvasHeight } = this.data;
    IslandRenderer.renderIsland(
      this._ctx,
      canvasWidth,
      canvasHeight,
      this._growthLayers,
      newLayerAnim || null,
      this._darkLayers,
      this._partnerLayers,
      this._imageCache,
    );
  },

  // ---- Charge interaction ----

  onChargeTouchStart(e) {
    const habitId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const habit = this.data.habits[index];
    if (!habit || habit.today_record.status === 'completed') return;

    wx.vibrateShort({ type: 'light' });

    this._chargeTimers[habitId] = setInterval(() => {
      const idx = this.data.habits.findIndex(h => h.id === habitId);
      if (idx === -1) { this._stopCharge(habitId); return; }
      let progress = this.data.habits[idx].chargeProgress + CHARGE_INCREMENT;
      if (progress >= 100) {
        progress = 100;
        this._stopCharge(habitId);
        this._completeCheckin(idx);
      }
      this.setData({
        [`habits[${idx}].chargeProgress`]: progress,
        [`habits[${idx}].isCharging`]: true,
      });
    }, CHARGE_INTERVAL);
  },

  onChargeTouchEnd(e) {
    const habitId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    this._stopCharge(habitId);
    const habit = this.data.habits[index];
    if (habit && habit.chargeProgress < 100 && habit.today_record.status !== 'completed') {
      this.setData({
        [`habits[${index}].chargeProgress`]: 0,
        [`habits[${index}].isCharging`]: false,
      });
    }
  },

  _stopCharge(habitId) {
    if (this._chargeTimers[habitId]) {
      clearInterval(this._chargeTimers[habitId]);
      delete this._chargeTimers[habitId];
    }
  },

  async _completeCheckin(index) {
    const habit = this.data.habits[index];
    wx.vibrateShort({ type: 'heavy' });

    try {
      const res = await API.checkin({
        habit_id: habit.id,
        checkin_at: new Date().toISOString(),
      });
      if (res.code !== 0) throw new Error(res.message);

      const { new_layer, growth_state } = res.data;
      const newLayer = {
        ...new_layer,
        theme_type: habit.theme_type || 'island',
      };

      this._growthLayers.push(newLayer);

      // Update habit state
      const newHabits = [...this.data.habits];
      newHabits[index] = {
        ...newHabits[index],
        today_record: { ...newHabits[index].today_record, status: 'completed' },
        growth_state,
        streak: (newHabits[index].streak || 0) + 1,
        chargeProgress: 100,
        isCharging: false,
      };
      const completedCount = newHabits.filter(h => h.today_record.status === 'completed').length;

      this.setData({
        habits: newHabits,
        completedCount,
        pendingCount: newHabits.length - completedCount,
      });

      // Animate new layer
      this._animateNewLayer(newLayer);
      // Show celebration
      this._showCelebration(habit);
      // Save checkin id and show note sheet after animation settles
      this._pendingNoteCheckinId = res.data.checkin_id;
      setTimeout(() => {
        this.setData({ showNoteSheet: true, noteText: '' });
      }, 600);
    } catch (err) {
      console.error('checkin error', err);
      wx.showToast({ title: '打卡失败，请重试', icon: 'none' });
    }
  },

  _animateNewLayer(newLayer) {
    if (!this._canvas) return;

    const layerIndex = this._growthLayers.length - 1;
    const { canvasWidth, canvasHeight } = this.data;

    // Reproduce renderIsland's origin calculation to get screen coords
    const isoCols = 10, isoRows = 9;
    const islandW = (isoCols + isoRows) * TW / 2;
    const originX = (canvasWidth - islandW) / 2 + islandW / 2 - TW / 2;
    const originY = canvasHeight * 0.38 - (isoCols + isoRows) * TH / 4;

    const [col, row] = GROWTH_SPOTS[layerIndex % GROWTH_SPOTS.length];
    const screenX = originX + (col - row) * HW;
    const screenY = originY + (col + row) * HH;

    // Stack height at this column/row position
    let slotCount = 0;
    for (let i = 0; i <= layerIndex; i++) {
      const [c, r] = GROWTH_SPOTS[i % GROWTH_SPOTS.length];
      if (c === col && r === row) slotCount++;
    }
    // 精灵图顶部大致在 screenY + HH - SPRITE_H（即精灵底部对齐格底，往上 SPRITE_H）
    const spriteTop = screenY + HH - 96;
    const finalYOff = 0;

    // 农场风格粒子颜色
    const colors = ['#7BC67A', '#D4A853', '#A8D468', '#F0E0A0', '#8BC47A', '#D8A860'];
    const glowColor = '#7BC67A';

    // Spawn particles at the top-face center of the new block
    const NUM_P = 14;
    const particles = Array.from({ length: NUM_P }, (_, i) => {
      const angle = (i / NUM_P) * Math.PI * 2 + (i % 2) * 0.2;
      const spd = 0.7 + (i % 4) * 0.35;
      return {
        x: screenX,
        y: spriteTop,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.9,  // bias upward
        alpha: 0.88,
        size: 2.5 + (i % 3) * 0.8,
        color: colors[i % colors.length],
        decay: 0.016 + (i % 5) * 0.003,
      };
    });

    // Phase durations (ms)
    const DURATION     = 1500;
    const GROW_DUR     = 900;   // cube height emerges
    const RIPPLE_DUR   = 850;   // wave travels across island
    const GLOW_DUR     = 600;   // glow ring expands and fades

    // Guard against stale animations if user checks in twice quickly
    const animToken = {};
    this._animToken = animToken;

    const startTime = Date.now();

    const animate = () => {
      if (this._animToken !== animToken) return;  // superseded

      const elapsed   = Date.now() - startTime;
      const growProgress   = Math.min(elapsed / GROW_DUR,   1);
      const rippleProgress = Math.min(elapsed / RIPPLE_DUR, 1);
      const glowProgress   = Math.min(elapsed / GLOW_DUR,   1);

      // Update particle physics
      particles.forEach(p => {
        if (p.alpha > 0) {
          p.x    += p.vx;
          p.y    += p.vy;
          p.vy   += 0.055;  // gravity
          p.alpha = Math.max(0, p.alpha - p.decay);
          p.size  = Math.max(0.5, p.size - 0.045);
        }
      });

      this._drawIsland({
        layerId:        newLayer.id,
        growProgress,
        rippleProgress,
        rippleCol:      col,
        rippleRow:      row,
        glowProgress,
        glowX:          screenX,
        glowY:          screenY,
        finalYOff,
        glowColor,
        particles:      particles.filter(p => p.alpha > 0),
      });

      if (elapsed < DURATION) {
        this._animFrame = this._canvas.requestAnimationFrame(animate);
      } else {
        this._animFrame = null;
        this._drawIsland();
      }
    };

    this._canvas.requestAnimationFrame(animate);
  },

  _showCelebration(habit) {
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      color: ['#3DD8C4','#F5C842','#FF7B5C','#9B8EFF','#4CD97B'][i % 5],
    }));
    this.setData({
      showCelebrate: true,
      celebrateText: `+1 层 · 已坚持 ${(habit.streak || 0) + 1} 天`,
      particles,
    });
    setTimeout(() => this.setData({ showCelebrate: false }), 2200);
  },

  onGoToCreate() {
    wx.navigateTo({ url: '/pages/habit/create/index' });
  },

  onGoToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/habit/detail/index?id=${id}` });
  },

  onNoOp() {},  // prevent tap bubbling on charge button

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
      // silent fail — note is optional
    }
    this.setData({ showNoteSheet: false, noteText: '' });
    this._pendingNoteCheckinId = '';
    wx.showToast({ title: '心得已记录 ✦', icon: 'none', duration: 1500 });
  },

  _checkBirthday() {
    const user = app.globalData.userInfo;
    if (!user || !user.birthday) return;
    const today = new Date();
    const [, mm, dd] = user.birthday.split('-');
    if (
      parseInt(mm) === today.getMonth() + 1 &&
      parseInt(dd) === today.getDate()
    ) {
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

  onUnload() {
    Object.keys(this._chargeTimers).forEach(id => clearInterval(this._chargeTimers[id]));
  },
});
