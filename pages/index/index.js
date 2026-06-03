const API = require('../../utils/api');
const app = getApp();

Page({
  data: {
    loading: false,
    showSplash: true,
  },

  _starCanvas: null,
  _starCtx: null,
  _stars: [],
  _animFrame: null,

  onLoad() {
    if (app.requireLogin()) {
      wx.reLaunch({ url: '/pages/home/home' });
      return;
    }
    setTimeout(() => this.setData({ showSplash: false }), 800);
  },

  onReady() {
    this._initStars();
  },

  onUnload() {
    if (this._animFrame && this._starCanvas) {
      this._starCanvas.cancelAnimationFrame(this._animFrame);
    }
  },

  _initStars() {
    wx.createSelectorQuery()
      .in(this)
      .select('#star-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const W = res[0].width * dpr;
        const H = res[0].height * dpr;
        canvas.width = W;
        canvas.height = H;
        ctx.scale(dpr, dpr);
        this._starCanvas = canvas;
        this._starCtx = ctx;

        const CW = res[0].width;
        const CH = res[0].height;

        this._stars = Array.from({ length: 60 }, () => ({
          x: Math.random() * CW,
          y: Math.random() * CH,
          r: 0.5 + Math.random() * 1.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: 0.2 + Math.random() * 0.6,
          pulse: Math.random() * Math.PI * 2,
        }));

        this._CW = CW;
        this._CH = CH;
        this._drawStars();
      });
  },

  _drawStars() {
    const ctx = this._starCtx;
    const stars = this._stars;
    const CW = this._CW;
    const CH = this._CH;

    const animate = () => {
      ctx.clearRect(0, 0, CW, CH);

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(61,216,196,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      stars.forEach(s => {
        s.pulse += 0.02;
        const a = s.alpha * (0.7 + 0.3 * Math.sin(s.pulse));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();

        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > CW) s.vx *= -1;
        if (s.y < 0 || s.y > CH) s.vy *= -1;
      });

      this._animFrame = this._starCanvas.requestAnimationFrame(animate);
    };

    this._animFrame = this._starCanvas.requestAnimationFrame(animate);
  },

  handleLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.login({
      success: async (res) => {
        try {
          const result = await API.login({
            login_code: res.code || 'mock_code',
            nickname: '岛主',
            avatar_url: '',
          });
          if (result.code === 0) {
            app.setLogin(result.data.token, result.data.user);
            wx.showToast({ title: '登岛成功 ✦', icon: 'none', duration: 1500 });
            setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 800);
          } else {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          }
        } catch (e) {
          wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        } finally {
          this.setData({ loading: false });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '授权失败', icon: 'none' });
      },
    });
  },
});
