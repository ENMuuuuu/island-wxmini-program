const API = require('../../utils/api');
const app = getApp();

Page({
  data: {
    statusBarHeight: 0,
    user: { nickname: '岛主' },
    habits: [],
    totalCheckins: 0,
    longestStreak: 0,
    activeCount: 0,
    loading: true,
    // Co-build mode
    cobuildActive: false,
    cobuildPartner: null,
    showInviteSheet: false,
    inviteCode: '',
    cobuildLoading: false,
    myInviteCode: 'ISLAND-2024',
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 0 });
    // Generate a stable personal invite code from user id
    const userId = (app.globalData.userInfo && app.globalData.userInfo.id) || 'u1';
    this.setData({ myInviteCode: 'ISLAND-' + userId.toUpperCase().replace('U','') + '2024' });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this._loadData();

    // Reflect cobuild state
    const cobuildData = app.globalData.cobuildData;
    this.setData({
      cobuildActive: !!cobuildData,
      cobuildPartner: cobuildData ? cobuildData.partner : null,
    });
  },

  async _loadData() {
    this.setData({ loading: true });
    try {
      const [meRes, habitsRes] = await Promise.all([
        API.getMe(),
        API.getHabits(),
      ]);
      const user = meRes.code === 0 ? meRes.data : app.globalData.userInfo;
      const habits = habitsRes.code === 0 ? habitsRes.data : [];
      // Use authoritative stats from UserProfile returned by /auth/me
      const totalCheckins = (user && user.total_checkin_count) || 0;
      const longestStreak = (user && user.current_streak_days) || 0;
      const activeCount = habits.filter(h => h.habit_status === 'active').length;
      this.setData({ user, habits, totalCheckins, longestStreak, activeCount, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onGoToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/habit/detail/index?id=${id}` });
  },

  onGoToCreate() {
    wx.navigateTo({ url: '/pages/habit/create/index' });
  },

  onGoToEdit() {
    wx.navigateTo({ url: '/pages/profile/edit/index' });
  },

  // Co-build: open invite sheet
  onShowInviteSheet() {
    this.setData({ showInviteSheet: true, inviteCode: '' });
  },

  onCloseInviteSheet() {
    this.setData({ showInviteSheet: false, inviteCode: '' });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  // Co-build: join with invite code
  async onJoinCobuild() {
    const code = this.data.inviteCode.trim();
    if (!code || this.data.cobuildLoading) return;

    this.setData({ cobuildLoading: true });
    try {
      const res = await API.joinCobuild(code);
      if (res.code !== 0) throw new Error(res.message || '邀请码无效');

      app.setCobuild(res.data);
      this.setData({
        cobuildActive: true,
        cobuildPartner: res.data.partner,
        showInviteSheet: false,
        cobuildLoading: false,
      });
      wx.showToast({ title: `✦ 已与 ${res.data.partner.nickname} 共建`, icon: 'none', duration: 2000 });
    } catch (err) {
      this.setData({ cobuildLoading: false });
      wx.showToast({ title: err.message || '加入失败，请检查邀请码', icon: 'none' });
    }
  },

  // Co-build: leave shared island
  onLeaveCobuild() {
    wx.showModal({
      title: '离开共建',
      content: `确定离开与「${this.data.cobuildPartner && this.data.cobuildPartner.nickname}」的共建空间吗？`,
      confirmText: '离开',
      confirmColor: '#FF7B5C',
      success: async (res) => {
        if (res.confirm) {
          await API.leaveCobuild();
          app.leaveCobuild();
          this.setData({ cobuildActive: false, cobuildPartner: null });
          wx.showToast({ title: '已离开共建', icon: 'none' });
        }
      },
    });
  },

  // Copy invite code to clipboard
  onCopyInviteCode() {
    wx.setClipboardData({
      data: this.data.myInviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' }),
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要离开不荒岛吗？',
      confirmText: '离开',
      confirmColor: '#FF7B5C',
      success: (res) => {
        if (res.confirm) app.logout();
      },
    });
  },
});
