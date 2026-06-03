const storage = require('./storage');
const MOCK = require('./mock');

// Set to false when real backend is running
const USE_MOCK = false;
const BASE_URL = 'https://7935dec9.r3.cpolar.cn/api/v1';

function getToken() {
  return storage.get(storage.KEYS.TOKEN, '');
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: { 'Content-Type': 'application/json', ...authHeader() },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ code: res.statusCode, message: res.data && res.data.message || '请求失败' });
        }
      },
      fail(err) {
        reject({ code: -1, message: '网络错误，请检查连接' });
      },
    });
  });
}

const API = {
  async login(params) {
    if (USE_MOCK) return MOCK.login(params);
    return request('POST', '/auth/login', params);
  },

  async getMe() {
    if (USE_MOCK) return MOCK.getMe();
    return request('GET', '/auth/me');
  },

  async getHomeData() {
    if (USE_MOCK) return MOCK.getHomeData();
    return request('GET', '/users/me/home');
  },

  async getThemes() {
    if (USE_MOCK) return MOCK.getThemes();
    return request('GET', '/growth/themes');
  },

  async getHabits(params) {
    if (USE_MOCK) return MOCK.getHabits(params);
    const qs = params && params.status ? `?status=${params.status}` : '';
    return request('GET', '/habits' + qs);
  },

  async getHabit(id) {
    if (USE_MOCK) return MOCK.getHabit(id);
    return request('GET', `/habits/${id}`);
  },

  async createHabit(params) {
    if (USE_MOCK) return MOCK.createHabit(params);
    return request('POST', '/habits', params);
  },

  async updateHabitStatus(id, status) {
    if (USE_MOCK) return MOCK.updateHabitStatus(id, status);
    return request('PATCH', `/habits/${id}/status`, { status });
  },

  async checkin(params) {
    if (USE_MOCK) return MOCK.checkin(params);
    return request('POST', '/checkins', params);
  },

  async getHabitCalendar(id, yearMonth) {
    if (USE_MOCK) return MOCK.getHabitCalendar(id, yearMonth);
    return request('GET', `/habits/${id}/calendar?year_month=${yearMonth}`);
  },

  // Returns { code, data: { lit: [...], dark: [...] } }
  // Backend returns flat list[LayerView] — we split by render_state here
  async getGrowthLayers(habitId) {
    if (USE_MOCK) return MOCK.getGrowthLayers(habitId);
    const res = await request('GET', `/growth/habits/${habitId}/layers`);
    if (res.code !== 0) return res;
    const layers = res.data || [];
    return {
      code: 0,
      message: 'ok',
      data: {
        lit:  layers.filter(l => l.render_state !== 'dark'),
        dark: layers.filter(l => l.render_state === 'dark'),
      },
    };
  },

  // Repair one decayed (dark) layer on a habit
  // Backend: POST /growth/habits/{id}/repair — no body needed
  async repairLayer(habitId) {
    if (USE_MOCK) return MOCK.repairLayer(habitId);
    const res = await request('POST', `/growth/habits/${habitId}/repair`);
    return res;
  },

  // Co-build: get partner + combined island status
  async getCobuildStatus() {
    if (USE_MOCK) return MOCK.getCobuildStatus();
    return request('GET', '/cobuild/status');
  },

  // Co-build: join a shared island with invite code
  async joinCobuild(code) {
    if (USE_MOCK) return MOCK.joinCobuild(code);
    return request('POST', '/cobuild/join', { invite_code: code });
  },

  // Co-build: leave shared island
  async leaveCobuild() {
    if (USE_MOCK) return MOCK.leaveCobuild();
    return request('POST', '/cobuild/leave');
  },

  async saveCheckinNote(checkinId, note) {
    if (USE_MOCK) return MOCK.saveCheckinNote(checkinId, note);
    return request('PATCH', `/checkins/${checkinId}/note`, { note });
  },

  async updateProfile(params) {
    if (USE_MOCK) return MOCK.updateProfile(params);
    return request('PUT', '/users/me/profile', params);
  },
};

module.exports = API;
