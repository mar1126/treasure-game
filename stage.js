// ステージ背景ハイブリッド描画システム - 美麗アート版 (stage.js)
const customStageImages = { land: null, sea: null };

function checkCustomStageImages() {
  ['land', 'sea'].forEach(type => {
    const img = new Image();
    img.onload = () => {
      customStageImages[type] = `/images/bg_${type}.png`;
      renderStageBackground();
    };
    img.src = `/images/bg_${type}.png`;
  });
}

function getStageTimeTheme(area) {
  const mod = (Number(area || 1) - 1) % 3;
  if (mod === 1) return 'sunset';
  if (mod === 2) return 'night';
  return 'day';
}

function renderStageBackground() {
  const bgEl = document.getElementById('battle-bg');
  const layer = document.getElementById('stage-art-layer');
  if (!bgEl || !layer) return;

  const currentMode = (typeof mode !== 'undefined' && mode === 'sea') ? 'sea' : 'land';
  const cur = (typeof state !== 'undefined' && state[currentMode]) ? state[currentMode] : { area: 1 };
  const theme = getStageTimeTheme(cur.area);

  bgEl.classList.toggle('land-mode', currentMode === 'land');
  bgEl.classList.remove('theme-day', 'theme-sunset', 'theme-night');
  bgEl.classList.add(`theme-${theme}`);

  // 1. AI生成背景があれば最優先
  if (typeof stageAiBg !== 'undefined' && stageAiBg && stageAiBg[currentMode]) {
    layer.innerHTML = `<img src="${stageAiBg[currentMode]}" class="stage-custom-img" alt="stage"><div class="stage-vignette"></div>`;
    return;
  }

  // 2. カスタム画像があれば表示
  if (customStageImages[currentMode]) {
    layer.innerHTML = `<img src="${customStageImages[currentMode]}" class="stage-custom-img" alt="stage"><div class="stage-vignette"></div>`;
    return;
  }

  // 3. 高精細SVG＋多層ライティング背景
  if (currentMode === 'sea') {
    const skyTop = theme === 'night' ? '#061126' : (theme === 'sunset' ? '#2c1654' : '#0288d1');
    const skyHor = theme === 'night' ? '#132a4a' : (theme === 'sunset' ? '#ff7043' : '#80deea');
    const seaTop = theme === 'night' ? '#082038' : (theme === 'sunset' ? '#311b92' : '#00acc1');
    const seaDeep = theme === 'night' ? '#020b18' : (theme === 'sunset' ? '#120826' : '#013a63');
    const sunCol = theme === 'night' ? '#fffde7' : (theme === 'sunset' ? '#ffd54f' : '#ffffff');

    layer.innerHTML = `
      <svg class="stage-svg" viewBox="0 0 400 268" preserveAspectRatio="none">
        <defs>
          <linearGradient id="seaSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${skyTop}"/>
            <stop offset="100%" stop-color="${skyHor}"/>
          </linearGradient>
          <linearGradient id="seaWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${seaTop}"/>
            <stop offset="55%" stop-color="${seaDeep}"/>
            <stop offset="100%" stop-color="#011627"/>
          </linearGradient>
          <radialGradient id="seaSunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${sunCol}" stop-opacity="0.95"/>
            <stop offset="40%" stop-color="${sunCol}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${sunCol}" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="sunPath" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${sunCol}" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="${sunCol}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- 空 -->
        <rect x="0" y="0" width="400" height="106" fill="url(#seaSky)"/>
        <!-- 太陽/月の光輪 -->
        <circle cx="290" cy="64" r="56" fill="url(#seaSunGlow)"/>
        <circle cx="290" cy="64" r="15" fill="${sunCol}" opacity="0.95"/>
        <!-- 遠景の島シルエット -->
        <path d="M18,106 Q52,82 88,106 Z" fill="${seaDeep}" opacity="0.5"/>
        <path d="M72,106 Q98,91 125,106 Z" fill="${seaDeep}" opacity="0.35"/>
        <!-- 海面 -->
        <rect x="0" y="106" width="400" height="162" fill="url(#seaWater)"/>
        <!-- 水面の光の道（サンロード） -->
        <polygon points="275,106 305,106 345,268 235,268" fill="url(#sunPath)"/>
        <!-- 水平線の輝き -->
        <line x1="0" y1="106" x2="400" y2="106" stroke="${sunCol}" stroke-width="1.5" opacity="0.7"/>
        <!-- きらめく水面の波紋 -->
        <ellipse cx="290" cy="116" rx="34" ry="2.5" fill="${sunCol}" opacity="0.5"/>
        <ellipse cx="288" cy="128" rx="46" ry="3" fill="${sunCol}" opacity="0.35"/>
        <ellipse cx="292" cy="144" rx="58" ry="3.5" fill="${sunCol}" opacity="0.22"/>
        <!-- 手前のうねる波レイヤー -->
        <path d="M0,175 Q100,162 200,175 T400,172 L400,268 L0,268 Z" fill="rgba(0,188,212,0.22)"/>
        <path d="M0,196 Q110,185 220,196 T400,193 L400,268 L0,268 Z" fill="rgba(1,42,74,0.65)"/>
        <!-- 敵の足元の水面の影 -->
        <ellipse cx="200" cy="144" rx="54" ry="10" fill="rgba(0,10,25,0.45)"/>
      </svg>
      <div class="stage-particle p1"></div>
      <div class="stage-particle p2"></div>
      <div class="stage-particle p3"></div>
    `;
  } else {
    const skyTop = theme === 'night' ? '#070f1d' : (theme === 'sunset' ? '#3e1e38' : '#1e88e5');
    const skyHor = theme === 'night' ? '#162b45' : (theme === 'sunset' ? '#ff8a65' : '#b3e5fc');
    const mtFar = theme === 'night' ? '#102232' : (theme === 'sunset' ? '#5d3a4a' : '#5c8d89');
    const hillMid = theme === 'night' ? '#0d261c' : (theme === 'sunset' ? '#4a2c2a' : '#388e3c');
    const hillFront = theme === 'night' ? '#071710' : (theme === 'sunset' ? '#2c1816' : '#1b5e20');
    const rayCol = theme === 'night' ? 'rgba(179,229,252,0.12)' : 'rgba(255,249,196,0.26)';

    layer.innerHTML = `
      <svg class="stage-svg" viewBox="0 0 400 268" preserveAspectRatio="none">
        <defs>
          <linearGradient id="landSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${skyTop}"/>
            <stop offset="100%" stop-color="${skyHor}"/>
          </linearGradient>
          <linearGradient id="landGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${hillMid}"/>
            <stop offset="100%" stop-color="${hillFront}"/>
          </linearGradient>
        </defs>
        <!-- 空 -->
        <rect x="0" y="0" width="400" height="175" fill="url(#landSky)"/>
        <!-- 遠くの山脈シルエット -->
        <polygon points="0,145 65,92 145,138 230,84 315,135 400,96 400,180 0,180" fill="${mtFar}" opacity="0.75"/>
        <!-- 斜めに差し込む光の筋（ゴッドレイ） -->
        <polygon points="260,0 330,0 210,220 110,220" fill="${rayCol}"/>
        <polygon points="340,0 395,0 310,220 245,220" fill="${rayCol}"/>
        <!-- 中景の丘 -->
        <path d="M0,152 Q115,124 235,150 T400,142 L400,268 L0,268 Z" fill="${hillMid}"/>
        <!-- 手前の大地 -->
        <path d="M0,184 Q200,170 400,186 L400,268 L0,268 Z" fill="url(#landGround)"/>
        <!-- 敵の足元の柔らかい影 -->
        <ellipse cx="200" cy="144" rx="54" ry="10" fill="rgba(0,15,5,0.42)"/>
      </svg>
      <div class="stage-particle p1"></div>
      <div class="stage-particle p2"></div>
      <div class="stage-particle p3"></div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  checkCustomStageImages();
  renderStageBackground();
});
