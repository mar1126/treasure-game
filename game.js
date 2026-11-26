window.onerror = function(msg, url, line) {
  const errBox = document.createElement('div');
  errBox.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#d32f2f;color:#fff;font-size:11px;padding:8px;z-index:99999;word-break:break-all;';
  errBox.textContent = 'エラー発生: ' + msg + ' (' + (url || '').split('/').pop() + ':' + line + ')';
  document.body.appendChild(errBox);
};

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
function updateUI() {
  const secLeft = syncStamina();
  const stEl = document.getElementById('stamina-disp');
  const stTimerEl = document.getElementById('stamina-timer');
  if (stEl) stEl.textContent = stamina;
  if (stTimerEl) stTimerEl.textContent = stamina >= MAX_STAMINA ? 'MAX' : `${secLeft}s`;

  const goldEl = document.getElementById('gold');
  const gemEl = document.getElementById('gem');
  if (goldEl) goldEl.textContent = Math.floor(gold).toLocaleString();
  if (gemEl) gemEl.textContent = Math.floor(gem).toLocaleString();

  const inc = typeof getCafeIncome === 'function' ? getCafeIncome() : 0;
  const incHud = document.getElementById('cafe-income-hud');
  if (incHud) incHud.textContent = inc.toLocaleString();

  const stInfo = typeof getCurrentStageInfo === 'function' ? getCurrentStageInfo() : { id: 1, name: '街周辺' };
  const floorEl = document.getElementById('floor-text');
  if (floorEl) floorEl.textContent = `S${state.stage} ${stInfo.name} ${state.floor}-${state.wave} ▾`;

  const waveBtn = document.getElementById('hud-wave-mode-btn');
  if (waveBtn) {
    waveBtn.textContent = waveStopMode ? 'WAVE停止' : '階層連戦';
    waveBtn.classList.toggle('active', !waveStopMode);
  }

  const autoBtn = document.getElementById('hud-auto-btn');
  if (autoBtn) {
    autoBtn.style.display = autoUnlocked ? 'inline-block' : 'none';
    autoBtn.classList.toggle('active', autoActive);
  }

  const spdBtn = document.getElementById('hud-speed-btn');
  if (spdBtn) {
    spdBtn.style.display = speed2xUnlocked ? 'inline-block' : 'none';
    spdBtn.textContent = speed2xActive ? '2x' : '1x';
    spdBtn.classList.toggle('active', speed2xActive);
  }

  const startBtn = document.getElementById('start-battle-btn');
  const retreatBtn = document.getElementById('retreat-battle-btn');
  if (startBtn) startBtn.style.display = state.inBattle ? 'none' : 'block';
  if (retreatBtn) retreatBtn.style.display = state.inBattle ? 'block' : 'none';

  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`enemy-slot-${i}`);
    if (!slot) continue;
    const e = enemies.slice(i, i + 1).pop();
    if (!e) {
      slot.style.display = 'none';
      continue;
    }
    slot.style.display = 'block';
    slot.classList.toggle('dead', e.hp <= 0);
    const nameEl = slot.querySelector('.e-name');
    const hpEl = slot.querySelector('.e-hp-fill');
    const spEl = slot.querySelector('.e-sprite');
    if (nameEl) nameEl.textContent = `${e.name} (${Math.max(0, Math.ceil(e.hp))})`;
    if (hpEl) hpEl.style.width = `${Math.max(0, Math.min(100, (e.hp / (e.maxHp || 1)) * 100))}%`;
    if (spEl) {
      const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(e.rawName || e.name) : '魔';
      spEl.innerHTML = renderSprite(disp, 52, '10px');
    }
  }

  let totalPower = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 0;
  for (let i = 0; i < 3; i++) {
    const uSlot = document.getElementById(`ally-slot-${i}`);
    if (!uSlot) continue;
    const u = battleAllies.slice(i, i + 1).pop();
    const spEl = uSlot.querySelector('.unit-sprite');
    const hpTxt = uSlot.querySelector('.hp-text');
    const hpBar = document.getElementById(`ally-hp-${i}`);
    const ctBar = document.getElementById(`ally-ct-${i}`);

    if (!u) {
      uSlot.classList.remove('dead');
      if (spEl) spEl.innerHTML = '<span style="opacity:0.45;font-size:20px;">＋</span>';
      if (hpTxt) hpTxt.textContent = '空き枠';
      if (hpBar) hpBar.style.width = '0%';
      if (ctBar) ctBar.style.width = '0%';
      continue;
    }

    totalPower += (u.atk || 0) + Math.floor((u.maxHp || 0) / 5);
    uSlot.classList.toggle('dead', u.hp <= 0);
    if (spEl) {
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(u.monRef || u) : '魔';
      spEl.innerHTML = renderSprite(disp, 54, '10px');
    }
    if (hpTxt) hpTxt.textContent = `${u.name} ${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}`;
    if (hpBar) hpBar.style.width = `${Math.max(0, Math.min(100, (u.hp / (u.maxHp || 1)) * 100))}%`;
  }

  const pwrEl = document.getElementById('power-disp');
  if (pwrEl) pwrEl.textContent = totalPower.toLocaleString();

  if (typeof updateVehicleUI === 'function') updateVehicleUI();
}
function renderSprite(disp, size = 36, fontSize = '14px') {
  const val = String(disp || '');
  if (val.startsWith('data:image') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
    return `<img src="${val}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:6px;display:block;margin:0 auto;">`;
  }
  let bg = '#0288d1';
  let label = val;
  if (val.startsWith('EMBLEM:')) {
    const parts = val.split(':');
    const elem = parts.slice(1, 2).pop() || 'none';
    label = parts.slice(2, 3).pop() || '魔';
    const colors = {
      fire: '#ef5350',
      water: '#29b6f6',
      earth: '#66bb6a',
      sky: '#26a69a',
      light: '#ffa726',
      dark: '#7e57c2',
      none: '#78909c'
    };
    bg = colors[elem] || '#78909c';
  }
  const circleSize = Math.max(20, Math.round(size * 0.85));
  return `<div style="width:${circleSize}px;height:${circleSize}px;border-radius:50%;background:${bg};color:#ffffff;font-weight:bold;font-size:${fontSize};display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.25);margin:0 auto;">${String(label).slice(0, 2)}</div>`;
}

function updateSelectOptions() {
  if (typeof refreshAiSpeciesSelects === 'function') refreshAiSpeciesSelects();
}
