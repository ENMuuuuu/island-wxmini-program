Page({
  data: {
    inviteCode: '' // 存储用户输入的邀请码
  },

  onLoad: function (options) {
    // 页面初始化
  },

  // 双向绑定输入框的值
  handleInput: function (e) {
    this.setData({
      inviteCode: e.detail.value
    });
  },

  // 核心逻辑：个人一键登岛
  handleLogin: function () {
    wx.showLoading({
      title: '正在唤醒海岛...',
      mask: true
    });

    // 模拟网络请求与登录过程（敏捷开发策略）
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '登岛成功',
        icon: 'success',
        duration: 1500
      });
      
      setTimeout(() => {
        wx.reLaunch({ 
          url: '/pages/home/home'
        });
      }, 1500);
    }, 1200);
  },

  // 核心逻辑：社会化交互 - 加入同伴海岛
  handleJoin: function () {
    const code = this.data.inviteCode.trim();
    if (!code) {
      wx.showToast({
        title: '请输入同伴的邀请码',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({
      title: '正在寻找同伴...',
      mask: true
    });

    // 模拟校验邀请码并建立共建连接的过程
    setTimeout(() => {
      wx.hideLoading();
      // 这里可以根据实际逻辑判断邀请码是否正确，此处模拟成功
      wx.showToast({
        title: '成功加入营地',
        icon: 'success',
        duration: 1500
      });
      
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/home/home'
        });
      }, 1500);
    }, 1500);
  }
});