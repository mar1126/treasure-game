// ゲーム状態・UI描画・進行制御 (game.js)
let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000;
let landTankTier = 0, landTankLv = 1, landUpCost = 500;

let cafeLv = 1, cafeCost = 80, staff = new Array(3).fill(null), gardenItems = [];
let party = new Array(3).fill(null);
let maxTrainingSlots = 3;
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
  const breedPane = document.getElementById('mon-sub-breed');
  const btnList = document.getElementById('tab-btn-mon-list');
  const btnTrain = document.getElementById('tab-btn-mon-train');
  const btnBreed = document.getElementById('tab-btn-mon-breed');

  if (listPane) listPane.style.display = subName === 'list' ? 'block' : 'none';
  if (trainPane) trainPane.style.display = subName === 'train' ? 'block' : 'none';
  if (breedPane) breedPane.style.display = subName === 'breed' ? 'block' : 'none';

  if (btnList) btnList.classList.toggle('active', subName === 'list');
  if (btnTrain) btnTrain.classList.toggle('active', subName === 'train');
  if (btnBreed) btnBreed.classList.toggle('active', subName === 'breed');

  if (subName === 'breed' && typeof renderBreedTab === 'function') {
    renderBreedTab();
  }
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

function expandTrainingBox(e) {
  if (e) e.stopPropagation();
  const curMax = Number(maxTrainingSlots) || 3;
  if (curMax >= 20) return alert('訓練場の枠はすでに最大（20枠）です！');
  if (!confirm(`300 GEM を消費して訓練場の枠を +1枠 拡張しますか？\n（現在: ${curMax}枠 → 拡張後: ${curMax + 1}枠）`)) return;
  if (gem < 300) return alert('ジェムが足りません（300 GEM 必要）');
  gem -= 300;
  maxTrainingSlots = Math.min(20, curMax + 1);
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < maxTrainingSlots) trainingSlots.push(null);
  if (typeof renderTraining === 'function') renderTraining();
  updateUI();
  triggerAutoSave(true);
  showToast(`訓練場の枠が ${maxTrainingSlots}枠 に拡張されました！`);
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
function openFloorSelectModal(e) {
  if (e) e.stopPropagation();
  if (state.inBattle || state.wave > 1) return alert('階層の途中では移動できません。先に「退却」を押してください。');
  const box = document.getElementById('floor-select-list');
  if (!box) return;

  const maxStg = state.maxStage || 1;
  let html = '';
  for (let s = 1; s <= maxStg; s++) {
    const stgInfo = typeof getStageInfo === 'function' ? getStageInfo(s) : { name: `Stage ${s}` };
    const maxFlr = (s < maxStg) ? 50 : (state.maxFloorByStage?.[s] || 1);
    html += `<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:4px;">Stage${s} ${stgInfo.name}（到達: ${maxFlr}/50階）</div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">`;
    for (let f = 1; f <= maxFlr; f++) {
      const isCur = (s === state.stage && f === state.floor);
      html += `<button onclick="jumpToStageFloor(${s}, ${f})" style="padding:6px 2px;border-radius:6px;border:1px solid ${isCur ? '#ff7043' : '#cfd8dc'};background:${isCur ? '#ff7043' : '#f8fdff'};color:${isCur ? '#fff' : '#263238'};font-size:11px;font-weight:bold;cursor:pointer;">${f}F</button>`;
    }
    html += `</div></div>`;
  }
  box.innerHTML = html;
  document.getElementById('floor-modal').style.display = 'flex';
}

function closeFloorSelectModal() { document.getElementById('floor-modal').style.display = 'none'; }

function jumpToStageFloor(targetStg, targetFlr) {
  state.stage = targetStg;
  state.floor = targetFlr;
  state.wave = 1;
  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(targetStg, targetFlr, 1) : [];
  state.inBattle = false;
  closeFloorSelectModal(); updateUI(); triggerAutoSave();
  const stgInfo = typeof getStageInfo === 'function' ? getStageInfo(targetStg) : { name: `Stage${targetStg}` };
  showToast(`Stage${targetStg} ${stgInfo.name} ${targetFlr}-1 に移動しました`);
}

function toggleWaveStopMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  waveStopMode = !waveStopMode;
  showToast(waveStopMode ? '進行設定: 1ウェーブ毎に停止' : '進行設定: 階層最後まで連戦');
  updateUI();
  triggerAutoSave();
}

function showToast(text) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = text; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

function toggleAutoMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!autoUnlocked) return;
  autoActive = !autoActive;
  showToast(autoActive ? '階層間オート周回: ON' : '階層間オート周回: OFF');
  updateUI();
  if (autoActive && !state.inBattle && stamina >= 1) startBattle();
}

function toggleSpeedMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!speed2xUnlocked) return;
  speed2xActive = !speed2xActive;
  showToast(speed2xActive ? '戦闘速度: 2倍速' : '戦闘速度: 通常(1x)');
  updateUI();
}

function updateUI() {
  syncStamina();
  const intervalMs = typeof getStaminaIntervalMs === 'function' ? getStaminaIntervalMs() : 60000;
  const stDisp = document.getElementById('stamina-disp'), stTimer = document.getElementById('stamina-timer');
  if (stDisp) stDisp.textContent = stamina;
  if (stTimer) {
    if (stamina >= MAX_STAMINA) stTimer.textContent = 'MAX';
    else {
      const sec = Math.max(1, Math.ceil((intervalMs - (Date.now() - staminaUpdatedAt)) / 1000));
      stTimer.textContent = `(${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')})`;
    }
  }
  const autoBtn = document.getElementById('hud-auto-btn');
  if (autoBtn) {
    autoBtn.style.display = autoUnlocked ? 'inline-block' : 'none';
    autoBtn.textContent = autoActive ? '周回ON' : '周回OFF';
    autoBtn.classList.toggle('active', autoActive);
  }
  const speedBtn = document.getElementById('hud-speed-btn');
  if (speedBtn) {
    speedBtn.style.display = speed2xUnlocked ? 'inline-block' : 'none';
    speedBtn.textContent = speed2xActive ? '2x' : '1x';
    speedBtn.classList.toggle('active', speed2xActive);
  }
  const waveBtn = document.getElementById('hud-wave-mode-btn');
  if (waveBtn) {
    waveBtn.textContent = waveStopMode ? '1W停止' : '階層連戦';
    waveBtn.classList.toggle('active', !waveStopMode);
  }

  const enemies = ensureWaveEnemies();
  const stgInfo = typeof getStageInfo === 'function' ? getStageInfo(state.stage) : { name: '街周辺' };

  document.getElementById('gold').textContent = gold.toLocaleString();
  document.getElementById('gem').textContent = gem.toLocaleString();

  const floorEl = document.getElementById('floor-text');
  if (floorEl) {
    floorEl.textContent = `S${state.stage} ${stgInfo.name} ${state.floor}-${state.wave} ▾`;
  }
  if (typeof renderStageBackground === 'function') renderStageBackground();

  const startBtn = document.getElementById('start-battle-btn');
  const retreatBtn = document.getElementById('retreat-battle-btn');
  if (startBtn) startBtn.style.display = state.inBattle ? 'none' : 'inline-block';
  if (retreatBtn) retreatBtn.style.display = (state.inBattle || state.wave > 1) ? 'inline-block' : 'none';

  for (let i = 0; i < 3; i++) {
    const box = document.getElementById(`enemy-slot-${i}`);
    if (!box) continue;
    const e = enemies.slice(i, i + 1).pop();
    if (!e) { box.style.display = 'none'; continue; }
    box.style.display = 'block';
    box.classList.toggle('dead', e.hp <= 0);
    const nameEl = box.querySelector('.e-name');
    const hpEl = box.querySelector('.e-hp-fill');
    const sprEl = box.querySelector('.e-sprite');
    if (nameEl) nameEl.textContent = `${e.name} (${Math.max(0, e.hp)})`;
    if (hpEl) hpEl.style.width = `${Math.max(0, Math.min(100, (e.hp / (e.maxHp || 1)) * 100))}%`;
    if (sprEl) {
      const disp = getSpeciesDisplay(e.rawName || e.name);
      const nextHtml = renderSprite(disp, 36, '6px');
      if (sprEl.innerHTML !== nextHtml) sprEl.innerHTML = nextHtml;
    }
  }

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    if (!el) continue;
    const unit = battleAllies.slice(i, i + 1).pop();
    if (!el.querySelector('.ally-ct-bar')) {
      el.innerHTML = `<div class="unit-sprite"></div><div class="hp-text"></div><div class="bar-bg"><div class="ally-hp-fill"></div></div><div class="bar-bg" style="height:5px;margin-top:2px;"><div class="ct-fill ally-ct-bar"></div></div>`;
    }
    const spriteEl = el.querySelector('.unit-sprite');
    const textEl = el.querySelector('.hp-text');
    const hpBarEl = el.querySelector('.ally-hp-fill');

    if (unit) {
      el.classList.toggle('dead', unit.hp <= 0);
      const disp = (unit.monRef && typeof getMonsterVisual === 'function') ? getMonsterVisual(unit.monRef) : getSpeciesDisplay(unit.name);
      const nextHtml = renderSprite(disp, 26, '6px');
      if (spriteEl.innerHTML !== nextHtml) spriteEl.innerHTML = nextHtml;
      spriteEl.style.opacity = '1';
      textEl.style.opacity = '1';
      textEl.textContent = `${unit.name} ${Math.max(0, unit.hp)}/${unit.maxHp}`;
      hpBarEl.style.width = `${Math.max(0, Math.min(100, (unit.hp / (unit.maxHp || 100)) * 100))}%`;
    } else {
      el.classList.remove('dead');
      if (spriteEl.textContent !== '＋') spriteEl.textContent = '＋';
      spriteEl.style.opacity = '0.4';
      textEl.style.opacity = '0.7';
      textEl.textContent = '空き枠';
      hpBarEl.style.width = '0%';
    }
  }

  const upBtn = document.getElementById('vehicle-upgrade-btn');
  if (upBtn) {
    const eq = typeof getEquippedTank === 'function' ? getEquippedTank() : null;
    if (!eq) {
      upBtn.textContent = '戦車 未所持（ショップの「兵器工房」タブで購入）';
      upBtn.style.background = '#90a4ae';
    } else {
      const vLv = typeof getTankLevel === 'function' ? getTankLevel() : 1;
      const vCost = typeof getTankUpCost === 'function' ? getTankUpCost() : 500;
      upBtn.innerHTML = `${eq.name}を強化 Lv.${vLv}（費用: ${vCost.toLocaleString()} G）`;
      upBtn.style.background = '#ff7043';
    }
  }

  document.getElementById('power-disp').textContent = getTotalPower().toLocaleString();
  const inc = typeof getCafeIncome === 'function' ? getCafeIncome() : 0;
  document.getElementById('cafe-income-hud').textContent = inc;
  if (document.getElementById('cafe-rate')) document.getElementById('cafe-rate').textContent = inc;
  if (document.getElementById('cafe-lv')) document.getElementById('cafe-lv').textContent = cafeLv;
  if (document.getElementById('cafe-cost')) document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  if (document.getElementById('garden-bonus')) document.getElementById('garden-bonus').textContent = gardenItems.length * 15;
}
