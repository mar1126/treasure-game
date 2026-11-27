// ステージ定義・ステージ背景表示・階層移動モーダル (stage.js)
const STAGE_MASTER = [
  { stage: 1, name: '街周辺',     bg: 'linear-gradient(180deg, #81c784 0%, #388e3c 65%, #1b5e20 100%)' },
  { stage: 2, name: '深緑の森',   bg: 'linear-gradient(180deg, #4db6ac 0%, #00796b 65%, #004d40 100%)' },
  { stage: 3, name: '古代遺跡',   bg: 'linear-gradient(180deg, #ffd54f 0%, #f57c00 65%, #5d4037 100%)' },
  { stage: 4, name: '灼熱の火山', bg: 'linear-gradient(180deg, #ff8a65 0%, #d84315 65%, #3e2723 100%)' },
  { stage: 5, name: '氷結の雪原', bg: 'linear-gradient(180deg, #81d4fa 0%, #0288d1 65%, #01579b 100%)' },
  { stage: 6, name: '天空の浮島', bg: 'linear-gradient(180deg, #90caf9 0%, #1976d2 65%, #0d47a1 100%)' },
  { stage: 7, name: '幽玄の沼地', bg: 'linear-gradient(180deg, #9575cd 0%, #512da8 65%, #1a237e 100%)' },
  { stage: 8, name: '竜の渓谷',   bg: 'linear-gradient(180deg, #e57373 0%, #c62828 65%, #212121 100%)' },
  { stage: 9, name: '魔王城前',   bg: 'linear-gradient(180deg, #7986cb 0%, #283593 65%, #12005e 100%)' },
  { stage: 10, name: '創世の神殿', bg: 'linear-gradient(180deg, #fff176 0%, #fbc02d 55%, #4a148c 100%)' }
];

function getStageInfo(stageNum) {
  const s = Math.min(10, Math.max(1, Number(stageNum) || 1));
  return STAGE_MASTER[s - 1] || STAGE_MASTER;
}

function renderStageBackground() {
  const bgEl = document.getElementById('battle-bg');
  const layer = document.getElementById('stage-art-layer');
  const floorEl = document.getElementById('floor-text');
  if (!bgEl || !layer) return;

  const sNum = (typeof state !== 'undefined' && state.stage) ? Number(state.stage) : 1;
  const fNum = (typeof state !== 'undefined' && state.floor) ? Number(state.floor) : 1;
  const info = getStageInfo(sNum);

  if (floorEl) {
    floorEl.textContent = `S${sNum} ${info.name} ${sNum}-${fNum} ▾`;
  }

  const officialStageImg = (typeof officialAssets === 'object' && officialAssets)
    ? officialAssets[`stage:${sNum}`]
    : null;

  if (officialStageImg) {
    layer.innerHTML = `<img src="${officialStageImg}" class="stage-custom-img" alt="S${sNum}"><div class="stage-vignette"></div>`;
  } else {
    bgEl.style.background = info.bg;
    layer.innerHTML = '';
  }
}

function openFloorSelectModal(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  const modal = document.getElementById('floor-modal');
  const listEl = document.getElementById('floor-select-list');
  if (!modal || !listEl) return;

  const curStage = Number(state?.stage || 1);
  const reachedStage = Math.max(curStage, Number(state?.maxStage || 1));

  let html = '';
  for (let s = 1; s <= reachedStage; s++) {
    const info = getStageInfo(s);
    const savedMaxF = (state?.maxFloorByStage && state.maxFloorByStage[s]) ? Number(state.maxFloorByStage[s]) : 1;
    const maxF = (s < reachedStage) ? 10 : Math.max(savedMaxF, s === curStage ? Number(state?.floor || 1) : 1);
    html += `<div style="font-size:12px;font-weight:bold;color:#0277bd;margin:8px 0 4px;">S${s} ${info.name}</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:6px;">`;
    for (let f = 1; f <= maxF; f++) {
      const isCur = (curStage === s && Number(state?.floor || 1) === f);
      html += `<button onclick="jumpToStageFloor(${s},${f})" style="padding:6px 2px;border-radius:8px;border:1.5px solid ${isCur ? '#ff7043' : '#cfd8dc'};background:${isCur ? '#fff3e0' : '#ffffff'};color:${isCur ? '#e65100' : '#37474f'};font-size:11px;font-weight:bold;cursor:pointer;">${s}-${f}</button>`;
    }
    html += `</div>`;
  }
  listEl.innerHTML = html;
  modal.style.display = 'flex';
}

function closeFloorSelectModal() {
  const modal = document.getElementById('floor-modal');
  if (modal) modal.style.display = 'none';
}

function jumpToStageFloor(s, f) {
  if (typeof state !== 'undefined') {
    state.inBattle = false;
    state.stage = s;
    state.floor = f;
    state.wave = 1;
  }
  closeFloorSelectModal();
  renderStageBackground();
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
  if (typeof updateUI === 'function') updateUI();
  showToast(`S${s} ${getStageInfo(s).name} ${s}-${f} へ移動しました`);
}

window.addEventListener('DOMContentLoaded', () => {
  renderStageBackground();
  setTimeout(() => {
    renderStageBackground();
    if (typeof updateIconPreview === 'function') updateIconPreview(false);
  }, 600);
  setTimeout(() => {
    renderStageBackground();
    if (typeof updateIconPreview === 'function') updateIconPreview(false);
  }, 1800);
});
