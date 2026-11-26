// グローバル変数・基本UI・画面演出・サブタブ管理 (game.js)
let userId = localStorage.getItem('treasure_uid');
if (!userId) {
  userId = 'H-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  localStorage.setItem('treasure_uid', userId);
}

let playerName = 'ハンター';
let gold = 200;
let gem = 1000;
let stamina = 30;
const MAX_STAMINA = 30;
let staminaUpdatedAt = Date.now();

let autoUnlocked = false;
let autoActive = false;
let speed2xUnlocked = false;
let speed2xActive = false;
let staminaFastUnlocked = false;
let waveStopMode = false;

let maxCaptured = 50;
let maxTrainingSlots = 3;

let landTankTier = 0;
let landTankLv = 1;
let landUpCost = 500;

let cafeLv = 1;
let cafeUpgradeCost = 80;
let gardenBonus = 0;
let staff = [null, null, null];

let captured = [];
let party = [null, null, null];
let trainingSlots = [null, null, null];
let battleAllies = [null, null, null];
let selectedMonIdx = -1;

let speciesSkins = {};
let aiBackgrounds = [];
let aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

let state = {
  stage: 1,
  floor: 1,
  wave: 1,
  maxStage: 1,
  maxFloorByStage: { 1: 1 },
  inBattle: false,
  shipCt: 0,
  enemies: []
};

function showToast(msg) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 2200);
}

function triggerMotion(slotId, className) {
  const el = document.getElementById(slotId);
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 380);
}

function showDamagePopup(slotId, text, typeClass = '') {
  const slot = document.getElementById(slotId);
  const fx = document.getElementById('fx-layer');
  if (!slot || !fx) return;
  const sRect = slot.getBoundingClientRect();
  const fRect = fx.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'dmg-popup' + (typeClass ? ' ' + typeClass : '');
  div.textContent = text;
  div.style.left = `${(sRect.left - fRect.left) + sRect.width / 2}px`;
  div.style.top = `${(sRect.top - fRect.top) + 6}px`;
  fx.appendChild(div);
  setTimeout(() => div.remove(), 820);
}

function syncStamina() {
  const intervalMs = staminaFastUnlocked ? 30000 : 60000;
  if (stamina >= MAX_STAMINA) {
    stamina = MAX_STAMINA;
    staminaUpdatedAt = Date.now();
    return 0;
  }
  const now = Date.now();
  const elapsed = now - staminaUpdatedAt;
  if (elapsed >= intervalMs) {
    const recovered = Math.floor(elapsed / intervalMs);
    stamina = Math.min(MAX_STAMINA, stamina + recovered);
    staminaUpdatedAt = stamina >= MAX_STAMINA ? now : (staminaUpdatedAt + recovered * intervalMs);
  }
  if (stamina >= MAX_STAMINA) return 0;
  return Math.ceil((intervalMs - (Date.now() - staminaUpdatedAt)) / 1000);
}

function toggleWaveStopMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  waveStopMode = !waveStopMode;
  updateUI();
  triggerAutoSave();
  showToast(waveStopMode ? 'WAVE毎停止モードに切り替えました' : '階層連戦モードに切り替えました');
}

function toggleAutoMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!autoUnlocked) return;
  autoActive = !autoActive;
  updateUI();
  triggerAutoSave();
  showToast(autoActive ? '階層間オート周回：ON' : '階層間オート周回：OFF');
}

function toggleSpeedMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!speed2xUnlocked) return;
  speed2xActive = !speed2xActive;
  updateUI();
  triggerAutoSave();
  showToast(speed2xActive ? '戦闘速度：2倍速' : '戦闘速度：通常（1x）');
}

function switchMonsterSubTab(sub) {
  const listEl = document.getElementById('mon-sub-list');
  const trainEl = document.getElementById('mon-sub-train');
  const breedEl = document.getElementById('mon-sub-breed');
  if (listEl) listEl.style.display = sub === 'list' ? 'block' : 'none';
  if (trainEl) trainEl.style.display = sub === 'train' ? 'block' : 'none';
  if (breedEl) breedEl.style.display = sub === 'breed' ? 'block' : 'none';

  document.getElementById('tab-btn-mon-list')?.classList.toggle('active', sub === 'list');
  document.getElementById('tab-btn-mon-train')?.classList.toggle('active', sub === 'train');
  document.getElementById('tab-btn-mon-breed')?.classList.toggle('active', sub === 'breed');

  if (sub === 'train' && typeof renderTraining === 'function') renderTraining();
  if (sub === 'breed' && typeof renderBreedTab === 'function') renderBreedTab();
}

function expandMonsterBox(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const cur = Number(maxCaptured) || 50;
  if (cur >= 200) return alert('仲間枠は最大上限（200枠）に達しています');
  if (!confirm(`仲間一覧の所持枠を +10枠（${cur} → ${cur + 10}枠）拡張しますか？\n費用: 200 GEM`)) return;
  if (gem < 200) return alert('ジェムが足りません（200 GEM 必要）');
  gem -= 200;
  maxCaptured = cur + 10;
  if (typeof renderCaptured === 'function') renderCaptured();
  updateUI();
  triggerAutoSave(true);
  showToast(`仲間枠を ${maxCaptured}枠 に拡張しました！`);
}

function expandTrainingBox(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const cur = Number(maxTrainingSlots) || 3;
  if (cur >= 20) return alert('訓練場の枠は最大上限（20枠）に達しています');
  if (!confirm(`訓練場の配置枠を +1枠（${cur} → ${cur + 1}枠）拡張しますか？\n費用: 300 GEM`)) return;
  if (gem < 300) return alert('ジェムが足りません（300 GEM 必要）');
  gem -= 300;
  maxTrainingSlots = cur + 1;
  while (trainingSlots.length < maxTrainingSlots) trainingSlots.push(null);
  if (typeof renderTraining === 'function') renderTraining();
  updateUI();
  triggerAutoSave(true);
  showToast(`訓練場を ${maxTrainingSlots}枠 に拡張しました！`);
}
