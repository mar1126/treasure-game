// ステージ背景 AIイラスト自動生成＆カスタム画像対応システム (stage.js)
const customStageImages = { land: null, sea: null };
let isGeneratingStageBg = { land: false, sea: false };

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

async function autoGenerateStageArt(targetMode) {
  if (isGeneratingStageBg[targetMode]) return;
  if (customStageImages[targetMode]) return;
  if (typeof stageAiBg !== 'undefined' && stageAiBg && stageAiBg[targetMode]) return;

  isGeneratingStageBg[targetMode] = true;
  const prompt = targetMode === 'sea'
    ? 'breathtaking fantasy ocean horizon, crystal clear turquoise water, tropical islands in distance, sparkling sunlight on waves, anime RPG game background art, vibrant, masterpiece, no characters, no text'
    : 'breathtaking fantasy lush green meadow, rolling hills, ancient ruins in distance, sunlit sky with soft clouds, anime RPG game background art, vibrant, masterpiece, no characters, no text';

  try {
    const res = await fetch('/api/ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'bg' })
    });
    const data = await res.json();
    if (data && data.image) {
      if (typeof stageAiBg === 'undefined') window.stageAiBg = { land: null, sea: null };
      stageAiBg[targetMode] = data.image;
      renderStageBackground();
      if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
    }
  } catch (e) {
    console.error('Stage BG auto-gen failed:', e);
  } finally {
    isGeneratingStageBg[targetMode] = false;
  }
}

function renderStageBackground() {
  const bgEl = document.getElementById('battle-bg');
  const layer = document.getElementById('stage-art-layer');
  if (!bgEl || !layer) return;

  const currentMode = (typeof mode !== 'undefined' && mode === 'sea') ? 'sea' : 'land';
  bgEl.classList.toggle('land-mode', currentMode === 'land');
  bgEl.classList.remove('theme-day', 'theme-sunset', 'theme-night');

  // 1. GitHubの /images/bg_land.png または bg_sea.png があれば最優先表示
  if (customStageImages[currentMode]) {
    layer.innerHTML = `<img src="${customStageImages[currentMode]}" class="stage-custom-img" alt="stage"><div class="stage-vignette"></div>`;
    return;
  }

  // 2. AI生成済みの背景イラストがあれば表示
  if (typeof stageAiBg !== 'undefined' && stageAiBg && stageAiBg[currentMode]) {
    layer.innerHTML = `<img src="${stageAiBg[currentMode]}" class="stage-custom-img" alt="stage"><div class="stage-vignette"></div>`;
    return;
  }

  // 3. まだ画像がない場合は余計な図形を描かず、裏側でAIイラストを自動生成
  layer.innerHTML = `<div class="stage-vignette"></div>`;
  autoGenerateStageArt(currentMode);
}

window.addEventListener('DOMContentLoaded', () => {
  checkCustomStageImages();
  renderStageBackground();
});
