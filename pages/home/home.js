// 1. 引入你修改好 module.exports 的地图数据
const mapData = require('../../images/Sample1.js'); 

Page({
  data: {
    // 初始设为空数组，我们将通过解析 Sample1.js 动态生成地基
    islandBlocks: [], 
    
    // 今日打卡习惯列表
    habits: [
      { id: 'h1', title: '深度阅读 30 分钟', streak: 5, icon: '/images/book.png', completed: false, chargeProgress: 0, materialSrc: '/images/logo.png' },
      { id: 'h2', title: '完成 3 公里夜跑', streak: 12, icon: '/images/run.png', completed: false, chargeProgress: 0, materialSrc: '/images/logo.png' },
      { id: 'h3', title: '23:30 前入睡', streak: 2, icon: '/images/sleep.png', completed: false, chargeProgress: 0, materialSrc: '/images/logo.png' }
    ]
  },

  timer: null, // 存储长按定时器

  onLoad: function () {
    // 页面加载时，执行解析 Tiled 地图的逻辑
    this.renderIslandFromTiled();
  },

  // ========== 核心一：解析 Sample1.js 并转换为 2.5D 屏幕坐标 ==========
  renderIslandFromTiled: function () {
    // 【重要参数配置】
    const tileWidth = 256;  // 屏幕上菱形块的宽度 (根据你的素材大小微调)
    const tileHeight = 128;  // 屏幕上菱形块的高度
    
    // 从 Sample1.js 中读取地图的列数和数据层
    const mapColumns = mapData.width; 
    const layerData = mapData.layers[0].data; 
    
    let blocks = [];

    // 整体偏移量：为了让生成的岛屿在屏幕上半区的正中间显示
    const offsetX = 260; 
    const offsetY = 80;

    layerData.forEach((tileId, index) => {
      // tileId 为 0 代表 Tiled 里这个格子是空的，直接跳过
      if (tileId === 0) return; 

      // 1. 将一维数组索引转换为网格的 行(row) 和 列(col)
      const col = index % mapColumns;
      const row = Math.floor(index / mapColumns);

      // 2. 等距视角 (Isometric) 坐标转换公式
      const screenX = (col - row) * (tileWidth / 2);
      const screenY = (col + row) * (tileHeight / 2);

      // 3. 将计算好的基础方块推入数组
      blocks.push({
        id: `base_${index}`,
        src: '/images/logo.png', // 暂时用默认图，后续替换为真正的地基素材
        x: screenX + offsetX,
        y: screenY + offsetY,
        z: row + col, // 基础层级
        isActive: true,
        isNew: false
      });
    });

    // 将解析好的地基渲染到页面
    this.setData({
      islandBlocks: blocks
    });
  },

  // ========== 微交互：手指按下，开始蓄力 ==========
  handleTouchStart: function (e) {
    const index = e.currentTarget.dataset.index;
    let currentHabit = this.data.habits[index];
    
    wx.vibrateShort({ type: 'light' });

    this.timer = setInterval(() => {
      let progress = this.data.habits[index].chargeProgress;
      if (progress >= 100) {
        clearInterval(this.timer);
        this.completeHabit(index);
      } else {
        progress += 8;
        this.setData({
          [`habits[${index}].chargeProgress`]: Math.min(progress, 100)
        });
      }
    }, 50);
  },

  // ========== 微交互：手指松开，停止或重置蓄力 ==========
  handleTouchEnd: function (e) {
    clearInterval(this.timer);
    const index = e.currentTarget.dataset.index;
    const progress = this.data.habits[index].chargeProgress;

    if (progress < 100 && !this.data.habits[index].completed) {
      this.setData({
        [`habits[${index}].chargeProgress`]: 0
      });
    }
  },

  // ========== 核心二：完成打卡，触发“随机寻址”与“动态堆叠” ==========
  completeHabit: function (index) {
    const habit = this.data.habits[index];
    
    wx.vibrateShort({ type: 'heavy' });
    wx.showToast({ title: '能量注入!', icon: 'none', duration: 1000 });

    this.setData({
      [`habits[${index}].completed`]: true,
      [`habits[${index}].streak`]: habit.streak + 1
    });

    const currentBlocks = this.data.islandBlocks;
    
    // 过滤出所有“地基坑位”（带有 'base_' 前缀的方块）
    const baseBlocks = currentBlocks.filter(b => b.id.startsWith('base_'));
    if (baseBlocks.length === 0) return; 

    // 1. 随机找一个坑位掉落 (模拟自然生长)
    const randomBaseIndex = Math.floor(Math.random() * baseBlocks.length);
    const targetBase = baseBlocks[randomBaseIndex];

    // 2. 扫描这个坑位上已经叠了多少个方块 (如果X坐标一样，说明在同一个柱子上)
    const stackedCount = currentBlocks.filter(b => b.x === targetBase.x).length;

    // 3. 方块的视觉厚度参数（非常重要！如果叠起来有缝隙或者吃进去了，请微调这个数值）
    const blockThickness = 30; 

    // 4. 构造新方块，自动叠加 Y 坐标和 Z 层级
    const newBlock = {
      id: 'new_' + Date.now(),
      src: habit.materialSrc, 
      x: targetBase.x, // X 坐标和底座对齐
      y: targetBase.y - (stackedCount * blockThickness), // Y 坐标根据已有的高度向上“垫高”
      z: targetBase.z + stackedCount * 10, // Z 层级增加，确保覆盖下方的方块
      isActive: true,
      isNew: true 
    };

    const newIslandBlocks = currentBlocks.concat(newBlock);

    this.setData({
      islandBlocks: newIslandBlocks
    });

    // 5. 动画结束后，清除掉落状态
    setTimeout(() => {
      newIslandBlocks[newIslandBlocks.length - 1].isNew = false;
      this.setData({ islandBlocks: newIslandBlocks });
    }, 600);
  }
});