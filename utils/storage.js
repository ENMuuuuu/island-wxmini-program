const KEYS = {
  TOKEN: 'island_token',
  USER: 'island_user',
};

function get(key, defaultVal = null) {
  try {
    const val = wx.getStorageSync(key);
    return (val !== '' && val !== null && val !== undefined) ? val : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    return false;
  }
}

function clear() {
  try {
    wx.clearStorageSync();
  } catch (e) {}
}

module.exports = { KEYS, get, set, remove, clear };
