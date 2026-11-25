// ステージ背景ハイブリッド描画システム (stage.js)
// ・通常時は高精細SVG＋アニメーション背景（昼・夕方・夜の時間帯変化つき）を描画
// ・GitHubに images/bg_land.png や images/bg_sea.png を置くと自動で画像背景に切り替え！

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
  // エリア進行に応じて 昼(0) → 夕方(1) → 夜・深海(2) と雰囲気が変化
  const mod = (area - 1) % 3;
  if (mod === 1) return 'sunset';
  if (mod === 2) return 'night';
  return 'day';
}

function renderStageBackground() {
  const bgEl = document.getElementById('battle-bg');
  const layer = document.getElementById('stage-art-layer');
  if (!bgEl || !layer) return;

  const cur = (typeof state !== 'undefined' && state[mode]) ? state[mode] : { area: 1 };
  const theme = getStageTimeTheme(cur.area || 1);

  bgEl.classList.remove('theme-day', 'theme-sunset', 'theme-night');
  bgEl.classList.add(`theme-${theme}`);

  // 1. カスタム画像（images/bg_land.png 等）が存在する場合はそちらを優先表示
  if (customStageImages[mode]) {
    layer.innerHTML = `<img src="${customStageImages[mode]}" class="stage-custom-img" alt="stage">`;
    return;
  }

  // 2. 高精細SVG＋アニメーション背景
  if (mode === 'land') {
    const sunColor = theme === 'night' ? '#fff9c4' : (theme === 'sunset' ? '#ffab40' : '#fff59d');
    const farHill = theme === 'night' ? '#1b3b2b' : (theme === 'sunset' ? '#5d4037' : '#66bb6a');
    const nearHill = theme === 'night' ? '#12291e' : (theme === 'sunset' ? '#3e2723' : '#43a047');
    const ground = theme === 'night' ? '#0d1f16' : (theme === 'sunset' ? '#2e1d18' : '#2e7d32');

    layer.innerHTML = `
      <svg class="stage-svg" viewBox="0 0 400 268" preserveAspectRatio="none">
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${sunColor}" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="${sunColor}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="315" cy="52" r="46" fill="url(#sunGlow)"/>
        <circle cx="315" cy="52" r="18" fill="${sunColor}" opacity="0.95"/>
        <path d="M0,155 Q90,105 195,148 T400,130 L400,268 L0,268 Z" fill="${farHill}" opacity="0.75"/>
        <path d="M0,175 Q120,135 240,172 T400,158 L400,268 L0,268 Z" fill="${nearHill}" opacity="0.9"/>
        <path d="M0,202 Q200,188 400,204 L400,268 L0,268 Z" fill="${ground}"/>
        <ellipse cx="200" cy="138" rx="58" ry="11" fill="rgba(0,0,0,0.28)"/>
      </svg>
      <div class="stage-cloud c1">☁️</div>
      <div class="stage-cloud c2">☁️</div>
      <div class="stage-tree t1">🌲</div>
      <div class="stage-tree t2">🌳</div>
    `;
  } else {
    const rayColor = theme === 'night' ? 'rgba(128,222,234,0.12)' : 'rgba(255,255,255,0.18)';
    const waveBack = theme === 'night' ? '#004d40' : '#0277bd';
    const waveFront = theme === 'night' ? '#00251a' : '#01579b';

    layer.innerHTML = `
      <svg class="stage-svg" viewBox="0 0 400 268" preserveAspectRatio="none">
        <polygon points="80,0 140,0 210,268 110,268" fill="${rayColor}"/>
        <polygon points="220,0 290,0 360,268 260,268" fill="${rayColor}"/>
        <path d="M0,165 Q100,145 200,165 T400,165 L400,268 L0,268 Z" fill="${waveBack}" opacity="0.7"/>
        <path d="M0,195 Q100,180 200,195 T400,195 L400,268 L0,268 Z" fill="${waveFront}" opacity="0.88"/>
        <ellipse cx="200" cy="138" rx="58" ry="11" fill="rgba(0,0,0,0.3)"/>
      </svg>
      <div class="stage-bubble b1">🫧</div>
      <div class="stage-bubble b2">🫧</div>
      <div class="stage-bubble b3">🫧</div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  checkCustomStageImages();
  renderStageBackground();
});
