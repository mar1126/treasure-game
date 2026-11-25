// ステージ背景表示システム (stage.js)
// GitHubの images/bg_land.png（陸）と images/bg_sea.png（海）を自動表示します

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

function renderStageBackground() {
  const bgEl = document.getElementById('battle-bg');
  const layer = document.getElementById('stage-art-layer');
  if (!bgEl || !layer) return;

  const currentMode = (typeof mode !== 'undefined' && mode === 'sea') ? 'sea' : 'land';
  bgEl.classList.toggle('land-mode', currentMode === 'land');
  bgEl.classList.remove('theme-day', 'theme-sunset', 'theme-night');

  if (customStageImages[currentMode]) {
    layer.innerHTML = `<img src="${customStageImages[currentMode]}" class="stage-custom-img" alt="stage"><div class="stage-vignette"></div>`;
  } else {
    layer.innerHTML = '';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  checkCustomStageImages();
  renderStageBackground();
});
