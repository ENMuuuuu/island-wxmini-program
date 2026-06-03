const API = require('../../../utils/api');

// Display metadata for each theme type — maps theme_type to UI labels
const THEME_META = {
  building: { emoji: '🏗', desc: '从地基到摩天楼，30层成长' },
  island:   { emoji: '🏝', desc: '从礁石到热带雨林，50层成长' },
  stars:    { emoji: '✨', desc: '从暗夜到星河，40层绽放' },
};

const CATEGORIES = [
  { id: 'learning', name: '学习',  emoji: '📚' },
  { id: 'fitness',  name: '运动',  emoji: '🏃' },
  { id: 'health',   name: '健康',  emoji: '🌿' },
  { id: 'mindful',  name: '冥想',  emoji: '🧘' },
  { id: 'work',     name: '工作',  emoji: '💼' },
  { id: 'other',    name: '其他',  emoji: '⭐' },
];

Page({
  data: {
    name: '',
    description: '',
    selectedThemeIdx: 0,
    selectedCategoryIdx: 0,
    remindTime: '21:00',
    // Themes loaded from API — each has { id (int), name, theme_type, total_layers, emoji, desc }
    themes: [],
    categories: CATEGORIES,
    submitting: false,
    step: 1,  // 1: basic info, 2: theme selection
    statusBarHeight: 0,
  },

  async onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 0 });
    await this._loadThemes();
  },

  async _loadThemes() {
    try {
      const res = await API.getThemes();
      if (res.code === 0 && res.data && res.data.length > 0) {
        const themes = res.data.map(t => ({
          id: t.id,
          name: t.name,
          type: t.theme_type,
          emoji: (THEME_META[t.theme_type] || {}).emoji || '🌿',
          desc: (THEME_META[t.theme_type] || {}).desc || `${t.total_layers}层成长`,
        }));
        this.setData({ themes });
      }
    } catch (e) {
      // Non-fatal: themes list stays empty, user can't submit which is fine
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onSelectTheme(e) {
    this.setData({ selectedThemeIdx: e.currentTarget.dataset.index });
  },

  onSelectCategory(e) {
    this.setData({ selectedCategoryIdx: e.currentTarget.dataset.index });
  },

  onTimeChange(e) {
    this.setData({ remindTime: e.detail.value });
  },

  onNavBack() {
    if (this.data.step === 2) {
      this.setData({ step: 1 });
    } else {
      wx.navigateBack();
    }
  },

  onNextStep() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入习惯名称', icon: 'none' });
      return;
    }
    if (this.data.themes.length === 0) {
      wx.showToast({ title: '主题加载中，请稍后', icon: 'none' });
      return;
    }
    this.setData({ step: 2 });
  },

  onPrevStep() {
    this.setData({ step: 1 });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const { name, description, selectedThemeIdx, selectedCategoryIdx, remindTime, themes } = this.data;
    if (themes.length === 0) {
      wx.showToast({ title: '主题数据未加载', icon: 'none' });
      return;
    }
    const theme = themes[selectedThemeIdx];
    const category = CATEGORIES[selectedCategoryIdx];

    this.setData({ submitting: true });
    try {
      const res = await API.createHabit({
        name: name.trim(),
        description: description.trim(),
        category: category.id,
        frequency_type: 'daily',
        goal_times_per_day: 1,
        theme_id: theme.id,   // int from API
        start_date: new Date().toISOString().split('T')[0],
        schedule: {
          repeat_type: 'daily',
          remind_time: remindTime,
          timezone: 'Asia/Shanghai',
        },
      });

      if (res.code === 0) {
        wx.showToast({ title: '习惯已创建 ✦', icon: 'none', duration: 1500 });
        setTimeout(() => wx.navigateBack(), 800);
      } else {
        wx.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
