Component({
  data: {
    selected: 0,
    tabs: [
      { text: '岛屿', icon: '🏝', page: '/pages/home/home' },
      { text: '我的', icon: '👤', page: '/pages/profile/index' },
    ],
  },

  methods: {
    switchTab(e) {
      const idx = e.currentTarget.dataset.index;
      const page = this.data.tabs[idx].page;
      wx.switchTab({ url: page });
    },
  },
});
