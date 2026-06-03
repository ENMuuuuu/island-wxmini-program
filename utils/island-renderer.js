// Isometric island renderer — v9 Farm Village
// 精灵序列支持方向后缀（_S/_E/_N/_W），多格拼合成完整房屋立面
// yShift = 各精灵底部透明留白（像素级实测），让内容底边贴地

const TW = 64, TH = 32;
const HW = TW / 2, HH = TH / 2;

// 所有 Kenney 精灵原始尺寸 256×512，渲染宽固定 64px，高 128px（保持1:2比例）
const SPRITE_W = 64;
const SPRITE_H = 128;

// ── 岛屿格子布局 ─────────────────────────────────────────────────
const ISLAND_TILES = [
  [4,0,'t'],[5,0,'t'],
  [3,1,'t'],[4,1,'i'],[5,1,'i'],[6,1,'t'],
  [2,2,'t'],[3,2,'i'],[4,2,'i'],[5,2,'i'],[6,2,'i'],[7,2,'t'],
  [1,3,'t'],[2,3,'i'],[3,3,'i'],[4,3,'i'],[5,3,'i'],[6,3,'i'],[7,3,'i'],[8,3,'t'],
  [1,4,'t'],[2,4,'i'],[3,4,'i'],[4,4,'i'],[5,4,'i'],[6,4,'i'],[7,4,'i'],[8,4,'t'],
  [1,5,'t'],[2,5,'i'],[3,5,'i'],[4,5,'i'],[5,5,'i'],[6,5,'i'],[7,5,'i'],[8,5,'t'],
  [2,6,'t'],[3,6,'i'],[4,6,'i'],[5,6,'i'],[6,6,'i'],[7,6,'t'],
  [3,7,'t'],[4,7,'i'],[5,7,'i'],[6,7,'t'],
  [4,8,'t'],[5,8,'t'],
];

// ── 区域分配 ─────────────────────────────────────────────────────
// 干草堆：2格（顶部）
// 玉米田：9格（左侧区域）
// 水池：2格（右中）
// 地板：10格（中央木板路）
// 木箱：6格（右侧）
// 围栏：1格（左下角装饰）
const HAY_KEYS   = new Set(['4,1','5,1']);
const CORN_KEYS  = new Set(['2,3','2,4','2,5','3,2','3,3','3,4','3,5','4,2','4,3']);
const WATER_KEY  = new Set(['6,3','6,4']);
const PATH_KEYS  = new Set(['5,2','4,4','5,3','5,4','4,5','5,5','4,6','5,6','4,7','5,7']);
const CRATE_KEYS = new Set(['6,2','7,3','7,4','6,5','7,5','6,6']);
const FENCE_KEYS = new Set(['3,6']);

// ── 精灵序列定义 ──────────────────────────────────────────────────
const SEQ_HAY = {
  sprites: ['dirtFarmland_S', 'hayBales_S', 'hayBalesStacked_S'],
  yShifts: [0, 8, 12],
};
const SEQ_CORN = {
  sprites: ['dirtFarmland_S', 'cornYoung_S', 'corn_S', 'cornDouble_S'],
  yShifts: [0, 7, 7, 6],
};
const SEQ_CRATE = {
  sprites: ['dirtFarmland_S', 'sacksCrate_S'],
  yShifts: [0, 12],
};
const SEQ_PATH = {
  sprites: ['planks_S', 'planksHigh_S'],
  yShifts: [0, 0],
};
const SEQ_FENCE = {
  sprites: ['dirtFarmland_S', 'fenceLow_S', 'fenceHigh_S'],
  yShifts: [0, 0, 0],
};

const KEY_DECAY    = 'planksHighOld_S';
const YSHIFT_DECAY = 0;

function getSpriteSeq(key) {
  if (HAY_KEYS.has(key))   return SEQ_HAY;
  if (CORN_KEYS.has(key))  return SEQ_CORN;
  if (CRATE_KEYS.has(key)) return SEQ_CRATE;
  if (PATH_KEYS.has(key))  return SEQ_PATH;
  if (FENCE_KEYS.has(key)) return SEQ_FENCE;
  return SEQ_CORN;
}

// ── 成长轨迹 ─────────────────────────────────────────────────────
// Phase 1: 干草+玉米翻土 (11)
// Phase 2: 地板铺设 (10)
// Phase 3: 木箱+围栏出现 (7)
// Phase 4: 干草升级+玉米发芽 (11)
// Phase 5: 地板升高 (10)
// Phase 6: 玉米长高 (9)
// Phase 7: 前3格结穗 (3)
const GROWTH_SPOTS = [
  // Phase 1: 干草出现 + 玉米翻土
  [4,1],[5,1],[2,3],[3,4],[2,4],[3,5],[3,2],[3,3],[4,2],[4,3],[2,5],
  // Phase 2: 地板铺设
  [5,2],[4,4],[5,3],[5,4],[4,5],[5,5],[4,6],[5,6],[4,7],[5,7],
  // Phase 3: 木箱摆放 + 围栏立起
  [6,2],[7,3],[7,4],[6,5],[7,5],[6,6],[3,6],
  // Phase 4: 干草升级 + 玉米发芽
  [4,1],[5,1],[2,3],[3,4],[2,4],[3,5],[3,2],[3,3],[4,2],[4,3],[2,5],
  // Phase 5: 地板升高
  [5,2],[4,4],[5,3],[5,4],[4,5],[5,5],[4,6],[5,6],[4,7],[5,7],
  // Phase 6: 玉米长高
  [2,3],[3,4],[2,4],[3,5],[3,2],[3,3],[4,2],[4,3],[2,5],
  // Phase 7: 前3格结穗
  [2,3],[3,4],[2,4],
];
// Total = 11+10+7+11+10+9+3 = 61

// ── 坐标转换 ──────────────────────────────────────────────────────
function gridToScreen(col, row, ox, oy) {
  return { x: ox + (col - row) * HW, y: oy + (col + row) * HH };
}

// ── 精灵绘制 ─────────────────────────────────────────────────────
// 按原始宽高比 1:2 渲染（SPRITE_W=64, SPRITE_H=128）
// yShift: 精灵向上偏移像素，让高建筑"高耸"
// scaleT: 动画进度 0→1，新精灵从地面"长出"
function drawSprite(ctx, img, x, y, yShift, yOff, scaleT) {
  if (!img) return;
  var t  = scaleT == null ? 1 : Math.max(0, Math.min(1.15, scaleT));
  var drawH = Math.round(SPRITE_H * t);
  if (drawH <= 0) return;
  var drawX = Math.round(x - SPRITE_W / 2);
  // 底边对齐 y+HH，再向上偏移 yShift（让建筑离地更高）
  var drawY = Math.round(y + HH - drawH + (yShift || 0) + (yOff || 0));
  ctx.drawImage(img, drawX, drawY, SPRITE_W, drawH);
}

// ── 地面底板 ─────────────────────────────────────────────────────
function drawBaseDiamond(ctx, x, y, tileType) {
  var isInner = tileType === 'i';
  var tA = isInner ? '#C8B88A' : '#D4C9A0';
  var tB = isInner ? '#A89870' : '#BEB490';
  var g = ctx.createLinearGradient(x - HW, y - HH, x + HW, y + HH);
  g.addColorStop(0, tA);
  g.addColorStop(1, tB);
  ctx.beginPath();
  ctx.moveTo(x,    y - HH);
  ctx.lineTo(x+HW, y);
  ctx.lineTo(x,    y + HH);
  ctx.lineTo(x-HW, y);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ── 水池 ──────────────────────────────────────────────────────────
function drawWaterTile(ctx, x, y, t) {
  ctx.save();
  var wg = ctx.createLinearGradient(x - HW, y - HH, x + HW, y + HH);
  wg.addColorStop(0,   '#3A7FBF');
  wg.addColorStop(0.5, '#2E6BAA');
  wg.addColorStop(1,   '#1E5590');
  ctx.beginPath();
  ctx.moveTo(x,    y - HH);
  ctx.lineTo(x+HW, y);
  ctx.lineTo(x,    y + HH);
  ctx.lineTo(x-HW, y);
  ctx.closePath();
  ctx.fillStyle = wg;
  ctx.fill();
  var shimmer = t || 0;
  ctx.globalAlpha = 0.18 + Math.sin(shimmer * 2) * 0.06;
  ctx.strokeStyle = '#A8D8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - HW * 0.5, y - HH * 0.2);
  ctx.quadraticCurveTo(x, y - HH * 0.5, x + HW * 0.5, y - HH * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - HW * 0.3, y + HH * 0.15);
  ctx.quadraticCurveTo(x + HW * 0.2, y - HH * 0.1, x + HW * 0.6, y + HH * 0.1);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#5AB0E0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x,    y - HH);
  ctx.lineTo(x+HW, y);
  ctx.lineTo(x,    y + HH);
  ctx.lineTo(x-HW, y);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── 海洋+夜空背景 ─────────────────────────────────────────────────
function drawOcean(ctx, width, height, ox, oy) {
  var sky = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  sky.addColorStop(0,   '#0F1E2E');
  sky.addColorStop(0.7, '#071624');
  sky.addColorStop(1,   '#040E1A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  var sea = ctx.createLinearGradient(0, height * 0.28, 0, height);
  sea.addColorStop(0, '#0C2035');
  sea.addColorStop(1, '#040C18');
  ctx.fillStyle = sea;
  ctx.fillRect(0, height * 0.28, width, height * 0.72);

  var moonX = width * 0.78, moonY = height * 0.07;
  ctx.save();
  ctx.globalAlpha = 0.85;
  var moonGrad = ctx.createRadialGradient(moonX, moonY, 1, moonX, moonY, 14);
  moonGrad.addColorStop(0, '#FFF9E8');
  moonGrad.addColorStop(0.6, '#EEE8D0');
  moonGrad.addColorStop(1, 'rgba(238,232,208,0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  var halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 50);
  halo.addColorStop(0, '#FFFCE0');
  halo.addColorStop(1, 'rgba(255,252,224,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  var stars = [
    [0.05,0.04,0.8],[0.12,0.09,0.6],[0.22,0.03,0.9],[0.31,0.07,0.7],
    [0.42,0.04,0.5],[0.52,0.08,0.8],[0.61,0.02,0.6],[0.68,0.11,0.9],
    [0.73,0.05,0.5],[0.85,0.09,0.7],[0.92,0.03,0.8],
    [0.08,0.15,0.5],[0.18,0.17,0.7],[0.38,0.13,0.6],[0.58,0.15,0.5],
    [0.72,0.17,0.8],[0.88,0.14,0.6],[0.95,0.10,0.7],
  ];
  for (var si = 0; si < stars.length; si++) {
    ctx.globalAlpha = stars[si][2] * 0.7;
    ctx.fillStyle = '#E8F0FF';
    ctx.beginPath();
    ctx.arc(stars[si][0] * width, stars[si][1] * height, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.07;
  for (var i = 0; i < 4; i++) {
    var ry = height * (0.62 + i * 0.07);
    var rw = width * (0.35 - i * 0.04);
    var rg = ctx.createLinearGradient((width - rw)/2, ry, (width + rw)/2, ry);
    rg.addColorStop(0, 'rgba(200,220,255,0)');
    rg.addColorStop(0.5, '#C8DCFF');
    rg.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect((width - rw) / 2, ry, rw, 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  var waveFracs = [0.44, 0.54, 0.64, 0.74, 0.84];
  for (var wi = 0; wi < waveFracs.length; wi++) {
    ctx.strokeStyle = 'rgba(160,200,240,' + (0.025 + wi * 0.004) + ')';
    ctx.lineWidth = 1;
    var wy = waveFracs[wi] * height;
    ctx.beginPath();
    for (var wx = 0; wx <= width; wx += 7) {
      var yy = wy + Math.sin((wx / width) * Math.PI * 3.5 + wi * 1.1) * (1.2 + wi * 0.4);
      if (wx === 0) { ctx.moveTo(wx, yy); } else { ctx.lineTo(wx, yy); }
    }
    ctx.stroke();
  }
  ctx.restore();

  var reefX = ox - 20, reefY = oy + 6 * HH + 40;
  var rg2 = ctx.createRadialGradient(reefX, reefY, 0, reefX, reefY, 90);
  rg2.addColorStop(0, 'rgba(100,190,130,0.1)');
  rg2.addColorStop(1, 'rgba(100,190,130,0)');
  ctx.fillStyle = rg2;
  ctx.fillRect(0, 0, width, height);
}

// ── 伙伴格高亮 ────────────────────────────────────────────────────
function drawPartnerOutline(ctx, x, y, yOff) {
  var dy = y + (yOff || 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(245,200,66,0.8)';
  ctx.lineWidth = 1.8;
  if (ctx.setLineDash) { ctx.setLineDash([3, 2]); }
  ctx.beginPath();
  ctx.moveTo(x,    dy - HH);
  ctx.lineTo(x+HW, dy);
  ctx.lineTo(x,    dy + HH);
  ctx.lineTo(x-HW, dy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(245,200,66,0.9)';
  var corners = [[x,dy-HH],[x+HW,dy],[x,dy+HH],[x-HW,dy]];
  for (var ci = 0; ci < corners.length; ci++) {
    ctx.beginPath();
    ctx.arc(corners[ci][0], corners[ci][1], 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ctx.setLineDash) { ctx.setLineDash([]); }
  ctx.restore();
}

// ── 弹簧缓动 ─────────────────────────────────────────────────────
function easeOutSpring(t) {
  var c4 = (2 * Math.PI) / 3;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ── 粒子 ─────────────────────────────────────────────────────────
function drawParticles(ctx, particles) {
  if (!particles || !particles.length) return;
  ctx.save();
  for (var pi = 0; pi < particles.length; pi++) {
    var p = particles[pi];
    if (p.alpha <= 0) continue;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.size);
    ctx.lineTo(p.x + p.size * 0.65, p.y);
    ctx.lineTo(p.x, p.y + p.size);
    ctx.lineTo(p.x - p.size * 0.65, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── 光圈扩散 ─────────────────────────────────────────────────────
function drawGlowRing(ctx, x, y, yOff, progress, color) {
  if (progress <= 0 || progress >= 1) return;
  var dy = y + (yOff || 0);
  var scale = 1 + progress * 2.2;
  ctx.save();
  ctx.globalAlpha = (1 - progress) * 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.4, 2.2 * (1 - progress));
  ctx.beginPath();
  ctx.moveTo(x,             dy - HH * scale);
  ctx.lineTo(x + HW*scale,  dy);
  ctx.lineTo(x,             dy + HH * scale);
  ctx.lineTo(x - HW*scale,  dy);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── 主渲染函数 ────────────────────────────────────────────────────
function renderIsland(ctx, width, height, growthLayers, newLayerAnim, darkLayers, partnerLayers, imageCache) {
  var litLayers   = growthLayers  || [];
  var decayLayers = darkLayers    || [];
  var ptnrLayers  = partnerLayers || [];
  var cache       = imageCache    || new Map();

  var isoCols = 10, isoRows = 9;
  var islandW = (isoCols + isoRows) * TW / 2;
  var originX = (width - islandW) / 2 + islandW / 2 - TW / 2;
  var originY = height * 0.38 - (isoCols + isoRows) * TH / 4;

  ctx.clearRect(0, 0, width, height);
  drawOcean(ctx, width, height, originX, originY);

  // 统计每格 slotCount
  var slotCountMap = {};
  for (var li = 0; li < litLayers.length; li++) {
    var spot = GROWTH_SPOTS[li % GROWTH_SPOTS.length];
    var key = spot[0] + ',' + spot[1];
    slotCountMap[key] = (slotCountMap[key] || 0) + 1;
  }

  // decay 格
  var decayKeyMap = {};
  for (var di = 0; di < decayLayers.length; di++) {
    var dspot = GROWTH_SPOTS[(litLayers.length + di) % GROWTH_SPOTS.length];
    decayKeyMap[dspot[0] + ',' + dspot[1]] = true;
  }

  // 伙伴格
  var ptnrSet = {};
  for (var pi2 = 0; pi2 < ptnrLayers.length; pi2++) {
    var pspot = GROWTH_SPOTS[(pi2 + 5) % GROWTH_SPOTS.length];
    ptnrSet[pspot[0] + ',' + pspot[1]] = true;
  }

  // 动画格
  var animKey = null;
  if (newLayerAnim && litLayers.length > 0) {
    var aspot = GROWTH_SPOTS[(litLayers.length - 1) % GROWTH_SPOTS.length];
    animKey = aspot[0] + ',' + aspot[1];
  }

  var waterPhase = newLayerAnim ? (Date.now() / 1000) : 0;

  // painter's algorithm：按 col+row 深度排序，同深度按 yShift 排（高建筑后绘制）
  var items = [];
  for (var ti = 0; ti < ISLAND_TILES.length; ti++) {
    var tile = ISLAND_TILES[ti];
    var col = tile[0], row = tile[1], tileType = tile[2];
    var k = col + ',' + row;
    var yShiftEst = 0;
    if (!WATER_KEY.has(k) && tileType === 'i') {
      var sc = slotCountMap[k] || 0;
      if (sc > 0) {
        var seqE = getSpriteSeq(k);
        yShiftEst = seqE.yShifts[Math.min(sc - 1, seqE.yShifts.length - 1)];
      } else if (decayKeyMap[k]) {
        yShiftEst = YSHIFT_DECAY;
      }
    }
    items.push({
      sortKey: col + row + row * 0.01 + yShiftEst * 0.0005,
      col: col, row: row, tileType: tileType,
    });
  }
  items.sort(function(a, b) { return a.sortKey - b.sortKey; });

  for (var ii = 0; ii < items.length; ii++) {
    var item = items[ii];
    var col = item.col, row = item.row, tileType = item.tileType;
    var pos = gridToScreen(col, row, originX, originY);
    var x = pos.x, y = pos.y;
    var key = col + ',' + row;

    if (WATER_KEY.has(key)) {
      drawWaterTile(ctx, x, y, waterPhase);
      continue;
    }

    drawBaseDiamond(ctx, x, y, tileType);

    var slotCount = slotCountMap[key] || 0;
    var isDecay   = decayKeyMap[key]  || false;
    var isAnim    = (animKey === key);

    var spriteName = null;
    var yShift     = 0;

    if (isDecay) {
      spriteName = KEY_DECAY;
      yShift     = YSHIFT_DECAY;
    } else if (slotCount > 0 && tileType === 'i') {
      var seq2   = getSpriteSeq(key);
      var seqIdx = Math.min(slotCount - 1, seq2.sprites.length - 1);
      spriteName = seq2.sprites[seqIdx];
      yShift     = seq2.yShifts[seqIdx];
    }

    if (spriteName) {
      var img = cache.get(spriteName); // 序列键已含方向后缀

      // ripple 偏移
      var yOff = 0;
      if (!isAnim && newLayerAnim && newLayerAnim.rippleProgress > 0 && newLayerAnim.rippleCol != null) {
        var dist  = Math.abs(col - newLayerAnim.rippleCol) + Math.abs(row - newLayerAnim.rippleRow);
        var delay = dist * 0.10;
        var localT = Math.max(0, Math.min(1, (newLayerAnim.rippleProgress - delay) / 0.28));
        if (localT > 0 && localT < 1) { yOff = -Math.sin(localT * Math.PI) * 5; }
      }

      // 弹出动画
      var scaleT = 1;
      if (isAnim && newLayerAnim) {
        var gp = newLayerAnim.growProgress != null
          ? Math.min(newLayerAnim.growProgress, 1)
          : Math.min(newLayerAnim.progress || 1, 1);
        scaleT = easeOutSpring(gp);
      }

      if (isDecay) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        drawSprite(ctx, img, x, y, yShift, yOff, scaleT);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#FF3020';
        var dh = Math.round(SPRITE_H * scaleT);
        ctx.fillRect(Math.round(x - SPRITE_W/2), Math.round(y + HH - dh + yShift + yOff), SPRITE_W, dh);
        ctx.restore();
      } else {
        drawSprite(ctx, img, x, y, yShift, yOff, scaleT);
      }

      if (ptnrSet[key]) { drawPartnerOutline(ctx, x, y, yOff); }
    }
  }

  if (newLayerAnim && newLayerAnim.glowProgress > 0 && newLayerAnim.glowX != null) {
    drawGlowRing(
      ctx, newLayerAnim.glowX, newLayerAnim.glowY,
      newLayerAnim.finalYOff || 0, newLayerAnim.glowProgress,
      newLayerAnim.glowColor || '#8BC47A'
    );
  }
  if (newLayerAnim && newLayerAnim.particles && newLayerAnim.particles.length) {
    drawParticles(ctx, newLayerAnim.particles);
  }
}

module.exports = { renderIsland: renderIsland, GROWTH_SPOTS: GROWTH_SPOTS, TW: TW, TH: TH, HW: HW, HH: HH, BD_BASE: 0 };
