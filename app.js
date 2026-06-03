const storage = require('./utils/storage');
const API = require('./utils/api');

App({
  globalData: {
    userInfo: null,
    token: '',
    isLoggedIn: false,
    systemInfo: null,
    cobuildData: null,   // { partner, cobuild_id } when co-build mode is active
  },

  onLaunch() {
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = sysInfo;

    const token = storage.get(storage.KEYS.TOKEN, '');
    const user = storage.get(storage.KEYS.USER, null);
    const cobuild = storage.get('cobuild_data', null);
    if (token && user) {
      this.globalData.token = token;
      this.globalData.userInfo = user;
      this.globalData.isLoggedIn = true;
    }
    if (cobuild) {
      this.globalData.cobuildData = cobuild;
    }
  },

  setLogin(token, user) {
    this.globalData.token = token;
    this.globalData.userInfo = user;
    this.globalData.isLoggedIn = true;
    storage.set(storage.KEYS.TOKEN, token);
    storage.set(storage.KEYS.USER, user);
  },

  logout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.cobuildData = null;
    storage.remove(storage.KEYS.TOKEN);
    storage.remove(storage.KEYS.USER);
    wx.reLaunch({ url: '/pages/index/index' });
  },

  setCobuild(data) {
    this.globalData.cobuildData = data;
    storage.set('cobuild_data', data);
  },

  leaveCobuild() {
    this.globalData.cobuildData = null;
    storage.remove('cobuild_data');
  },

  requireLogin() {
    return !!this.globalData.token;
  },
});
