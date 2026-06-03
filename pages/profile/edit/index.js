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
    this.setData({ showBirthdayPicker: true });
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
