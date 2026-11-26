// ゲーム状態・UI描画・進行制御 (game.js)
let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000;
let landTankTier = 0, landTankLv = 1, landUpCost = 500;

let cafeLv = 1, cafeCost = 80, staff = new Array(3).fill(null), gardenItems = [];
let party = new Array(3).fill(null);
let trainingSlots = new Array(3).fill(null);
let selectedMonIdx = -1;
let maxCaptured = 50;
let monsterSubTab = 'list';

let autoUnlocked = false, autoActive = false;
let speed2xUnlocked = false, speed2xActive = false;
let staminaFastUnlocked = false;
let waveStopMode = false;

const MAX_STAMINA = 30;
let stamina = MAX_STAMINA;
let staminaUpdatedAt = Date.now();

let state = {
  stage: 1,
  floor: 1,
  wave: 1,
  maxStage: 1,
  maxFloorByStage: { 1: 1 },
  enemies: [],
  inBattle: false,
  shipCt: 0
};

let battleAllies = new Array(3).fill(null);
let captured = [], speciesSkins = {}, aiBackgrounds = [], aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

function switchMonsterSubTab(subName) {
  monsterSubTab = subName;
  const listPane = document.getElementById('mon-sub-list');
  const trainPane = document.getElementById('mon-sub-train');
  const btnList = document.getElementById('tab-btn-mon-list');
  const btnTrain = document.getElementById('tab-btn-mon-train');
  if (listPane) listPane.style.display = subName === 'list' ? 'block' : 'none';
  if (trainPane) trainPane.style.display = subName === 'train' ? 'block' : 'none';
  if (btnList) btnList.classList.toggle('active', subName === 'list');
  if (btnTrain) btnTrain.classList.toggle('active', subName === 'train');
}

function expandMonsterBox(e) {
  if (e) e.stopPropagation();
  const curMax = Number(maxCaptured) || 50;
  if (curMax >= 300) return alert('仲間所持枠はすでに最大（300体）です！');
  if (!confirm(`100 GEM を消費して仲間所持枠を +10体 拡張しますか？\n（現在: ${curMax}体 → 拡張後: ${Math.min(300, curMax + 10)}体）`)) return;
  if (gem < 100) return alert('ジェムが足りません（100 GEM 必要）');
  gem -= 100;
  maxCaptured = Math.min(300, curMax + 10);
  if (typeof renderCaptured === 'function') renderCaptured();
  updateUI();
  triggerAutoSave(true);
  showToast(`仲間所持枠が ${maxCaptured}体 に拡張されました！`);
}

function ensureWaveEnemies() {
  if (!state.stage) state.stage = 1;
  if (!state.floor) state.floor = 1;
  if (!state.wave) state.wave = 1;
  if (!state.maxStage) state.maxStage = state.stage;
  if (!state.maxFloorByStage) state.maxFloorByStage = { [state.stage]: state.floor };
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) {
    state.enemies = typeof getFixedWaveEnemies === 'function'
      ? getFixedWaveEnemies(state.stage, state.floor, state.wave)
      : [];
  }
  return state.enemies;
}

function getShopGoldAmount() {
  const score = (state.stage || 1) * 10 + (state.floor || 1);
  return score * 120;
}

function syncStamina() {
  const intervalMs = typeof getStaminaIntervalMs === 'function' ? getStaminaIntervalMs() : 60000;
  if (stamina >= MAX_STAMINA) { stamina = MAX_STAMINA; staminaUpdatedAt = Date.now(); return; }
  const now = Date.now(), elapsed = now - staminaUpdatedAt;
  const recovered = Math.floor(elapsed / intervalMs);
  if (recovered > 0) {
    stamina = Math.min(MAX_STAMINA, stamina + recovered);
    staminaUpdatedAt = (stamina >= MAX_STAMINA) ? now : staminaUpdatedAt + (recovered * intervalMs);
  }
}

function getSpeciesDisplay(name) {
  const clean = String(name || '').replace(/^\[強敵\]\s*/, '');
  const defVisual = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(clean) : `EMBLEM:none:${clean.slice(0, 1)}`;
  const data = speciesSkins[clean];
  if (!data || data.activeIdx < 0) return defVisual;
  return data.list.slice(data.activeIdx, data.activeIdx + 1).pop() || defVisual;
}

function renderSprite(displayVal, size = 32, round = '8px') {
  if (!displayVal) return '';
  if (displayVal.startsWith('data:image') || displayVal.startsWith('/')) {
    return `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:contain;vertical-align:middle;">`;
  }
  if (displayVal.startsWith('EMBLEM:')) {
    const parts = displayVal.split(':');
    const elemKey = parts.slice(1, 2).pop() || 'none';
    const char = parts.slice(2, 3).pop() || '魔';
    const elInfo = typeof getElementInfo === 'function' ? getElementInfo(elemKey) : { color: '#546e7a', bg: '#eceff1' };
    const fontSize = Math.max(11, Math.floor(size * 0.48));
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${elInfo.bg};color:${elInfo.color};border:2px solid ${elInfo.color};font-weight:900;font-size:${fontSize}px;box-shadow:0 2px 5px rgba(0,0,0,0.2);">${char}</span>`;
  }
  return displayVal;
}

function getTotalPower() {
  let p = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 0;
  party.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m && typeof getMonStats === 'function') { const st = getMonStats(m); p += st.atk + Math.floor(st.def / 2); }
  });
  return p;
}

function triggerMotion(elementId, className) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(className); void el.offsetWidth; el.classList.add(className);
}

function showDamagePopup(targetId, text, typeClass = '') {
  const targetEl = document.getElementById(targetId), fxLayer = document.getElementById('fx-layer') || document.getElementById('battle-bg');
  if (!targetEl || !fxLayer) return;
  const rect = targetEl.getBoundingClientRect(), bgRect = fxLayer.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = `dmg-popup ${typeClass}`; popup.textContent = text;
  popup.style.left = `${(rect.left - bgRect.left) + (rect.width / 2) + ((Math.random() - 0.5) * 24)}px`;
  popup.style.top = `${(rect.top - bgRect.top) + 6}px`;
  fxLayer.appendChild(popup); setTimeout(() => popup.remove(), 800);
}
