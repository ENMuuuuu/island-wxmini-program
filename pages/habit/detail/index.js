const API = require('../../../utils/api');
const IslandRenderer = require('../../../utils/island-renderer');

Page({
  data: {
    habitId: '',
    habit: null,
    loading: true,
    calendarYear: 0,
    calendarMonth: 0,
    calendarDays: [],
    weekdays: ['日','一','二','三','四','五','六'],
    growthLayers: [],
    darkLayers: [],
    canvasWidth: 0,
    canvasHeight: 0,
    activeTab: 'island',  // 'island' | 'calendar'
    repairing: false,
  },

  _canvas: null,
  _ctx: null,
  _imageCache: null,
  _imageCacheReady: false,

  onLoad(options) {
    const id = options.id;
    const sysInfo = wx.getSystemInfoSync();
    const now = new Date();
    this.setData({
      habitId: id,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1,
      canvasWidth: sysInfo.windowWidth,
      canvasHeight: Math.round(sysInfo.windowWidth * 0.55),
    });
    this._loadHabit();
  },

  onReady() {
    this._initCanvas();
  },

  _initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select('#detail-canvas')
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

    setTimeout(() => {
      if (!done) {
        done = true;
        this._imageCache = cache;
        this._imageCacheReady = true;
        onReady();
      }
    }, 4000);
  },

  async _loadHabit() {
    const { habitId, calendarYear, calendarMonth } = this.data;
    this.setData({ loading: true });
    try {
      const [habitRes, layersRes, calendarRes] = await Promise.all([
        API.getHabit(habitId),
        API.getGrowthLayers(habitId),
        API.getHabitCalendar(habitId, `${calendarYear}-${String(calendarMonth).padStart(2,'0')}`),
      ]);

      // getGrowthLayers now returns { lit: [...], dark: [...] }
      const layersData = layersRes.code === 0 ? layersRes.data : { lit: [], dark: [] };
      const litLayers = (layersData && layersData.lit) ? layersData.lit : [];
      const darkLayers = (layersData && layersData.dark) ? layersData.dark : [];

      const calDays = calendarRes.code === 0
        ? this._buildCalendar(calendarRes.data.days, calendarYear, calendarMonth)
        : [];

      this.setData({
        habit: habitRes.data,
        growthLayers: litLayers,
        darkLayers,
        calendarDays: calDays,
        loading: false,
      });
      if (this._imageCacheReady) {
        this._drawIsland();
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  _buildCalendar(days, year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true });
    days.forEach(d => cells.push({ ...d, day: parseInt(d.date.split('-')[2]) }));
    return cells;
  },

  _drawIsland() {
    if (!this._ctx) return;
    const { canvasWidth, canvasHeight, growthLayers, darkLayers } = this.data;
    IslandRenderer.renderIsland(
      this._ctx, canvasWidth, canvasHeight,
      growthLayers, null,
      darkLayers, null,
      this._imageCache || new Map(),
    );
  },

  async onChangeCalendarMonth(e) {
    const dir = e.currentTarget.dataset.dir;
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth += dir;
    if (calendarMonth > 12) { calendarYear++; calendarMonth = 1; }
    if (calendarMonth < 1)  { calendarYear--; calendarMonth = 12; }
    this.setData({ calendarYear, calendarMonth });

    try {
      const res = await API.getHabitCalendar(
        this.data.habitId,
        `${calendarYear}-${String(calendarMonth).padStart(2,'0')}`,
      );
      if (res.code === 0) {
        const calDays = this._buildCalendar(res.data.days, calendarYear, calendarMonth);
        this.setData({ calendarDays: calDays });
      }
    } catch (e) {}
  },

  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    if (e.currentTarget.dataset.tab === 'island') {
      setTimeout(() => {
        if (!this._ctx) this._initCanvas();
        else this._drawIsland();
      }, 50);
    }
  },

  // Repair one decayed layer — converts it back to a lit block
  async onRepairLayer() {
    if (this.data.repairing) return;
    const { habit, darkLayers, growthLayers } = this.data;
    if (!habit || !darkLayers.length) return;

    this.setData({ repairing: true });
    wx.vibrateShort({ type: 'light' });

    try {
      const res = await API.repairLayer(habit.id);
      if (res.code !== 0) throw new Error(res.message);

      const { repaired_layer, growth_state } = res.data;

      // Move last dark layer to lit layers
      const newDark = darkLayers.slice(0, -1);
      const newLit = [...growthLayers, repaired_layer];

      this.setData({
        growthLayers: newLit,
        darkLayers: newDark,
        'habit.growth_state': growth_state,
        repairing: false,
      });

      this._drawIsland();
      wx.showToast({ title: '✦ 方块已治愈！继续坚持吧', icon: 'none', duration: 2000 });
    } catch (err) {
      this.setData({ repairing: false });
      wx.showToast({ title: err.message || '治愈失败，请重试', icon: 'none' });
    }
  },

  async onPauseHabit() {
    const { habit } = this.data;
    const newStatus = habit.habit_status === 'paused' ? 'active' : 'paused';
    const label = newStatus === 'paused' ? '暂停' : '恢复';
    wx.showModal({
      title: `${label}习惯`,
      content: `确定要${label}「${habit.name}」吗？`,
      confirmText: label,
      success: async (res) => {
        if (res.confirm) {
          await API.updateHabitStatus(habit.id, newStatus);
          this.setData({ 'habit.habit_status': newStatus });
          wx.showToast({ title: `已${label}`, icon: 'none' });
        }
      },
    });
  },

  onBack() {
    wx.navigateBack();
  },
});
