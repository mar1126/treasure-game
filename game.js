let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000;
let landTankTier = 0, landTankLv = 1, landUpCost = 500;

let cafeLv = 1, cafeCost = 80, staff = new Array(3).fill(null), gardenItems = [];
let party = new Array(3).fill(null);
let trainingSlots = new Array(3).fill(null);
let selectedMonIdx = -1;

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

let saveTimer = null, lastCloudSyncAt = 0;
function triggerAutoSave(immediate = false) {
  const cleanState = {
    stage: state.stage,
    floor: state.floor,
    wave: 1,
    maxStage: state.maxStage,
    maxFloorByStage: state.maxFloorByStage
  };
  const payload = {
    savedAt: Date.now(), playerName, gold, gem,
    landTankTier, landTankLv, landUpCost,
    stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked, waveStopMode,
    cafeLv, cafeCost, staff, gardenItems, party, trainingSlots, state: cleanState,
    captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig
  };
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem('treasure_save_' + userId, jsonStr);
  const badge = document.getElementById('save-indicator');
  clearTimeout(saveTimer);
  const doSync = async () => {
    lastCloudSyncAt = Date.now();
    if (badge) badge.textContent = '同期中...';
    try {
      const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, user_name: playerName, save_json: jsonStr }) });
      if (!res.ok) throw new Error();
      if (badge) badge.textContent = '自動保存済';
    } catch (e) { if (badge) badge.textContent = '端末保存済'; }
  };
  const diff = Date.now() - lastCloudSyncAt;
  if (immediate || diff >= 15000) doSync();
  else { if (badge) badge.textContent = '端末保存済'; saveTimer = setTimeout(doSync, 15000 - diff); }
}
function applySaveData(data) {
  if (!data) return;
  playerName = data.playerName || 'ハンター';
  gold = data.gold ?? 200; gem = data.gem ?? 1000;

  landTankTier = Number(data.landTankTier) || 0;
  landTankLv = Number(data.landTankLv) || 1;
  landUpCost = Number(data.landUpCost) || 500;

  autoUnlocked = Boolean(data.autoUnlocked);
  speed2xUnlocked = Boolean(data.speed2xUnlocked);
  staminaFastUnlocked = Boolean(data.staminaFastUnlocked);
  waveStopMode = Boolean(data.waveStopMode);
  stamina = data.stamina ?? MAX_STAMINA; staminaUpdatedAt = data.staminaUpdatedAt || Date.now(); syncStamina();
  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80;
  staff = Array.isArray(data.staff) ? data.staff.slice(0, 3) : new Array(3).fill(null);
  while (staff.length < 3) staff.push(null);
  gardenItems = data.gardenItems || [];

  const rawParty = Array.isArray(data.party) ? data.party : [];
  party = [rawParty.slice(0, 1).pop() ?? null, rawParty.slice(1, 2).pop() ?? null, rawParty.slice(2, 3).pop() ?? null];

  const rawTrain = Array.isArray(data.trainingSlots) ? data.trainingSlots : [];
  trainingSlots = [rawTrain.slice(0, 1).pop() ?? null, rawTrain.slice(1, 2).pop() ?? null, rawTrain.slice(2, 3).pop() ?? null];

  if (data.state) {
    const s = data.state.land ? data.state.land : data.state;
    const stg = Math.min(10, Math.max(1, Number(s.stage) || 1));
    const flr = Math.min(50, Math.max(1, Number(s.floor) || Number(s.area) || 1));
    state = {
      stage: stg,
      floor: flr,
      wave: 1,
      maxStage: Math.max(stg, Number(s.maxStage) || 1),
      maxFloorByStage: s.maxFloorByStage || { [stg]: flr },
      enemies: [],
      inBattle: false,
      shipCt: 0
    };
  }

  captured = (data.captured || []).map((m, idx) => {
    const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : { name: 'スライム', elem: 'water', baseHp: 58, baseAtk: 10, baseDef: 3, ct: 1.8 };
    const validName = ALL_MONSTER_SPECIES.some(x => x.name === m.name) ? m.name : sp.name;
    const initSkills = Array.from(new Set(Array.isArray(m.skills) && m.skills.length > 0 ? m.skills : [typeof getSpeciesInnateSkillId === 'function' ? getSpeciesInnateSkillId(validName) : 'tackle']));
    const initTraits = Array.from(new Set(Array.isArray(m.traits) && m.traits.length > 0 ? m.traits : [typeof getSpeciesInnateTraitId === 'function' ? getSpeciesInnateTraitId(validName) : 'valor']));
    return {
      id: m.id || ('M' + idx),
      name: validName,
      elem: m.elem || sp.elem || 'none',
      lv: Number(m.lv) || 1,
      maxLv: Number(m.maxLv) || 10,
      exp: Number(m.exp) || 0,
      plus: Number(m.plus) || 0,
      bonusHp: Number(m.bonusHp) || 0,
      bonusAtk: Number(m.bonusAtk) || 0,
      bonusDef: Number(m.bonusDef) || 0,
      baseHp: Number(m.baseHp) || sp.baseHp,
      baseAtk: Number(m.baseAtk) || sp.baseAtk,
      baseDef: Number(m.baseDef) || sp.baseDef,
      ct: Number(m.ct) || sp.ct,
      skills: initSkills,
      traits: initTraits,
      customSkin: m.customSkin || null,
      customBgIdx: (typeof m.customBgIdx === 'number') ? m.customBgIdx : -1
    };
  });

  speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;
  if (document.getElementById('player-name')) document.getElementById('player-name').value = playerName;
  if (document.getElementById('hud-name')) document.getElementById('hud-name').textContent = playerName;
  if (document.getElementById('icon-scale')) {
    document.getElementById('icon-scale').value = iconConfig.scale; document.getElementById('icon-x').value = iconConfig.x;
    document.getElementById('icon-y').value = iconConfig.y; document.getElementById('icon-rot').value = iconConfig.rotate;
  }

  ensureWaveEnemies();
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderShop === 'function') renderShop();
  if (typeof updateSelectOptions === 'function') updateSelectOptions();
  if (document.getElementById('icon-char-sel')) { document.getElementById('icon-char-sel').value = iconConfig.species; document.getElementById('icon-bg-sel').value = iconConfig.bgIdx; }
  if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
  if (typeof renderStamps === 'function') renderStamps();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  updateUI();
}

async function initCloudLoad() {
  const idEl = document.getElementById('my-user-id');
  if (idEl) idEl.textContent = userId;
  let localData = null;
  const localStr = localStorage.getItem('treasure_save_' + userId);
  if (localStr) {
    try { localData = JSON.parse(localStr); applySaveData(localData); } catch (e) {}
  } else {
    ensureWaveEnemies();
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderTraining === 'function') renderTraining();
    if (typeof renderCaptured === 'function') renderCaptured();
    if (typeof renderCafe === 'function') renderCafe();
    if (typeof renderShop === 'function') renderShop();
    if (typeof updateSelectOptions === 'function') updateSelectOptions();
    if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
    if (typeof renderStamps === 'function') renderStamps();
    if (typeof updateIconPreview === 'function') updateIconPreview(false);
    updateUI();
  }
  try {
    const res = await fetch(`/api/save?user_id=${encodeURIComponent(userId)}`);
    const row = await res.json();
    if (row && row.save_json) {
      const cloudData = JSON.parse(row.save_json);
      if (!localData || (cloudData.savedAt || 0) > (localData.savedAt || 0)) applySaveData(cloudData);
    }
  } catch (e) {}
}

window.addEventListener('beforeunload', () => {
  const cleanState = { stage: state.stage, floor: state.floor, wave: 1, maxStage: state.maxStage, maxFloorByStage: state.maxFloorByStage };
  const payload = { savedAt: Date.now(), playerName, gold, gem, landTankTier, landTankLv, landUpCost, stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked, waveStopMode, cafeLv, cafeCost, staff, gardenItems, party, trainingSlots, state: cleanState, captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig };
  localStorage.setItem('treasure_save_' + userId, JSON.stringify(payload));
});

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
    const fontSize = Math.max(12, Math.floor(size * 0.48));
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
  if (state.inBattle) return alert('戦闘中は階層移動できません。先に「退却」を押してください。');
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
  if (state.inBattle) {
    if (startBtn) startBtn.style.display = 'none';
    if (retreatBtn) retreatBtn.style.display = 'inline-block';
  } else {
    if (startBtn) startBtn.style.display = 'inline-block';
    if (retreatBtn) retreatBtn.style.display = 'none';
  }

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
      const nextHtml = renderSprite(disp, 40, '6px');
      if (sprEl.innerHTML !== nextHtml) sprEl.innerHTML = nextHtml;
    }
  }

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    if (!el) continue;
    const unit = battleAllies.slice(i, i + 1).pop();
    if (!el.querySelector('.ally-ct-bar')) {
      el.innerHTML = `<div class="unit-sprite"></div><div class="hp-text"></div><div class="bar-bg"><div class="ally-hp-fill"></div></div><div class="bar-bg" style="height:6px;margin-top:2px;"><div class="ct-fill ally-ct-bar"></div></div>`;
    }
    const spriteEl = el.querySelector('.unit-sprite');
    const textEl = el.querySelector('.hp-text');
    const hpBarEl = el.querySelector('.ally-hp-fill');

    if (unit) {
      el.classList.toggle('dead', unit.hp <= 0);
      const disp = (unit.monRef && typeof getMonsterVisual === 'function') ? getMonsterVisual(unit.monRef) : getSpeciesDisplay(unit.name);
      const nextHtml = renderSprite(disp, 30, '6px');
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

function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.inBattle) return;
  syncStamina();
  if (stamina < 1) {
    if (autoActive) { autoActive = false; showToast('スタミナ切れのため周回を停止しました'); }
    else showToast('スタミナ不足です（ショップで回復可能）');
    updateUI(); return;
  }
  if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
  stamina -= 1;

  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, state.wave) : [];
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  state.shipCt = 0;
  state.inBattle = true;
  triggerAutoSave();
  updateUI();
}

function retreatBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!state.inBattle) return;
  state.inBattle = false;
  state.wave = 1;
  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
  if (autoActive) autoActive = false;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  showToast('バトルから退却しました');
  updateUI();
}

function handleWaveClear() {
  const enemies = state.enemies || [];
  let totalGold = 0, totalExp = 0;
  enemies.forEach(e => {
    totalGold += Number(e.goldReward) || 15;
    totalExp += Number(e.expReward) || 12;
  });

  let goldMult = 1.0;
  party.forEach(id => {
    const m = captured.find(x => x.id === id);
    if (m && typeof getMonStats === 'function') goldMult += (getMonStats(m).goldMult - 1.0);
  });
  const finalGold = Math.floor(totalGold * goldMult);
  gold += finalGold;

  let anyLevelUp = false;
  const activeMons = party.map(id => captured.find(x => x.id === id)).filter(Boolean);
  activeMons.forEach(m => {
    if (typeof grantExpToMonster === 'function' && grantExpToMonster(m, totalExp)) anyLevelUp = true;
  });

  const trainExp = Math.max(1, Math.floor(totalExp * 0.1));
  (trainingSlots || []).forEach(id => {
    const tm = captured.find(x => x.id === id);
    if (tm && typeof grantExpToMonster === 'function') grantExpToMonster(tm, trainExp);
  });

  let recruited = false;
  try {
    const targetForRecruit = enemies[Math.floor(Math.random() * enemies.length)];
    recruited = (targetForRecruit && typeof tryAutoRecruit === 'function') ? tryAutoRecruit(targetForRecruit) : false;
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderTraining === 'function') renderTraining();
    if (typeof renderCaptured === 'function') renderCaptured();
  } catch (err) { console.error(err); }

  if (state.wave < 5) {
    state.wave++;
    state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, state.wave) : [];

    if (waveStopMode) {
      state.inBattle = false;
      if (autoActive) autoActive = false;
      if (!recruited) {
        showToast(anyLevelUp ? `レベルアップ！WAVE ${state.wave}/5 の前で停止しました` : `WAVEクリア（+${finalGold}G / +${totalExp}EXP）`);
      }
      triggerAutoSave();
      updateUI();
      return;
    }

    syncStamina();
    if (stamina < 1) {
      state.inBattle = false;
      if (autoActive) autoActive = false;
      showToast(`WAVEクリア(+${finalGold}G) / スタミナ不足のため停止しました`);
      triggerAutoSave();
      updateUI();
      return;
    }
    if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
    stamina -= 1;
    if (!recruited) {
      showToast(anyLevelUp ? `レベルアップ！WAVE ${state.wave}/5 へ` : `WAVE ${state.wave}/5 突入（+${finalGold}G / +${totalExp}EXP）`);
    }
    updateUI();
    return;
  }

  state.inBattle = false;
  state.wave = 1;

  if (state.floor < 50) {
    state.floor++;
    state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, state.floor);
    showToast(`${state.floor - 1}階踏破！次は ${state.floor}-1（+${finalGold}G）`);
  } else if (state.stage < 10) {
    state.stage++;
    state.floor = 1;
    state.maxStage = Math.max(state.maxStage || 1, state.stage);
    state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, 1);
    const stgInfo = typeof getStageInfo === 'function' ? getStageInfo(state.stage) : { name: `Stage ${state.stage}` };
    showToast(`ステージ踏破！新エリア「${stgInfo.name}」解放`);
  } else {
    showToast(`最終階層 50-5 クリア！（+${finalGold}G / +${totalExp}EXP）`);
  }

  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  triggerAutoSave();
  updateUI();

  if (autoActive && !waveStopMode) {
    const delay = speed2xActive ? 350 : 700;
    setTimeout(() => { if (autoActive && !state.inBattle) startBattle(); }, delay);
  }
}
let lastFrameTime = performance.now();
let cafeSecTimer = 0;

function battleFrameLoop(now) {
  try {
    const rawDt = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    cafeSecTimer += rawDt;
    if (cafeSecTimer >= 1.0) {
      cafeSecTimer -= 1.0;
      if (typeof getCafeIncome === 'function') gold += getCafeIncome();
      if (!state.inBattle) updateUI();
    }

    if (state.inBattle) {
      const dt = (speed2xUnlocked && speed2xActive) ? rawDt * 2.0 : rawDt;
      if ((!battleAllies || battleAllies.every(u => !u)) && typeof resetBattleAllies === 'function') resetBattleAllies();
      const enemies = ensureWaveEnemies();
      let needsUiSync = false;

      for (let i = 0; i < 3; i++) {
        const u = battleAllies.slice(i, i + 1).pop();
        const ctBar = document.querySelector(`#ally-slot-${i} .ally-ct-bar`);
        if (!u || u.hp <= 0) { if (ctBar) ctBar.style.width = '0%'; continue; }
        u.ct = (Number(u.ct) || 0) + dt;
        const limitCt = Number(u.maxCt) || 2.0;

        if (u.ct >= limitCt) {
          u.ct = 0;
          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            const st = u.monRef && typeof getMonStats === 'function' ? getMonStats(u.monRef) : { bonusSkillRate: 0, bonusSkillDmg: 0, lifesteal: 0, lowHpAtk: 0, elemBoosts: {} };
            const skillIds = u.monRef?.skills || ['tackle'];
            const firedSkill = typeof rollOneBattleSkill === 'function' ? rollOneBattleSkill(skillIds, st.bonusSkillRate) : null;

            const atkElem = firedSkill ? (firedSkill.elem || 'none') : 'none';
            const elemBonus = (atkElem !== 'none' && st.elemBoosts?.[atkElem]) ? st.elemBoosts[atkElem] : 0;
            const lowHpBonus = (u.hp <= u.maxHp * 0.5) ? (st.lowHpAtk || 0) : 0;
            const skillMult = firedSkill ? (firedSkill.mult + st.bonusSkillDmg + elemBonus) : 1.0;
            const targets = (firedSkill && firedSkill.aoe) ? aliveEnemies : [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]];

            let totalDealt = 0;
            targets.forEach(tgt => {
              const elemMult = typeof getElementMultiplier === 'function' ? getElementMultiplier(atkElem, tgt.elem) : 1.0;
              const rawDmg = Math.floor((Number(u.atk) || 10) * (1 + lowHpBonus) * skillMult * elemMult);
              const dmg = Math.max(1, rawDmg - Math.floor((tgt.def || 0) / 2));
              tgt.hp -= dmg;
              totalDealt += dmg;
              triggerMotion(`enemy-slot-${tgt.slot}`, 'hit-motion');
              const label = elemMult > 1 ? `弱点 -${dmg}` : (elemMult < 1 ? `耐性 -${dmg}` : (firedSkill ? `${firedSkill.name} -${dmg}` : `-${dmg}`));
              showDamagePopup(`enemy-slot-${tgt.slot}`, label, (firedSkill || elemMult > 1) ? 'crit' : '');
            });

            const healRate = (st.lifesteal || 0) + (firedSkill?.drain || 0);
            if (healRate > 0 && totalDealt > 0) u.hp = Math.min(u.maxHp, u.hp + Math.max(1, Math.floor(totalDealt * healRate)));

            triggerMotion(`ally-slot-${i}`, 'atk-motion');
            needsUiSync = true;
            if (enemies.every(e => e.hp <= 0)) { handleWaveClear(); requestAnimationFrame(battleFrameLoop); return; }
          }
        }
        if (ctBar) ctBar.style.width = `${Math.min(100, (u.ct / limitCt) * 100)}%`;
      }

      if (typeof getTankSupportAtk === 'function' && typeof getEquippedTank === 'function' && getEquippedTank()) {
        state.shipCt = (Number(state.shipCt) || 0) + dt;
        const vInterval = typeof getTankInterval === 'function' ? getTankInterval() : 3.2;
        if (state.shipCt >= vInterval) {
          state.shipCt = 0;
          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            const tgt = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const vDmg = Math.max(1, getTankSupportAtk() - Math.floor((tgt.def || 0) / 3));
            tgt.hp -= vDmg;
            triggerMotion(`enemy-slot-${tgt.slot}`, 'hit-motion');
            showDamagePopup(`enemy-slot-${tgt.slot}`, `砲撃 -${vDmg}`, 'ship-dmg');
            needsUiSync = true;
            if (enemies.every(e => e.hp <= 0)) { handleWaveClear(); requestAnimationFrame(battleFrameLoop); return; }
          }
        }
      }

      for (let ei = 0; ei < enemies.length; ei++) {
        const e = enemies[ei];
        if (!e || e.hp <= 0) continue;
        e.curCt = (Number(e.curCt) || 0) + dt;
        const eCtBar = document.querySelector(`#enemy-slot-${e.slot} .e-ct-fill`);
        if (e.curCt >= (Number(e.ct) || 2.0)) {
          e.curCt = 0;
          const aliveAllies = Array.of(0, 1, 2).filter(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; });
          if (aliveAllies.length > 0) {
            const tIdx = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
            const tUnit = battleAllies.slice(tIdx, tIdx + 1).pop();
            const dmg = Math.max(1, (Number(e.atk) || 8) - Math.floor((Number(tUnit.def) || 0) / 2));
            tUnit.hp -= dmg;
            triggerMotion(`enemy-slot-${e.slot}`, 'atk-motion');
            triggerMotion(`ally-slot-${tIdx}`, 'hit-motion');
            showDamagePopup(`ally-slot-${tIdx}`, `-${dmg}`, 'ally-dmg');
            needsUiSync = true;

            if (!Array.of(0, 1, 2).some(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; })) {
              state.inBattle = false; state.wave = 1;
              state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
              if (autoActive) autoActive = false;
              if (typeof resetBattleAllies === 'function') resetBattleAllies();
              showToast('全滅しました…訓練や配合で仲間を強化しよう');
              triggerAutoSave();
              needsUiSync = true;
              break;
            }
          }
        }
        if (eCtBar) eCtBar.style.width = `${Math.min(100, (e.curCt / (Number(e.ct) || 2.0)) * 100)}%`;
      }

      if (needsUiSync) updateUI();
    }
  } catch (err) { console.error(err); }
  requestAnimationFrame(battleFrameLoop);
}
requestAnimationFrame(battleFrameLoop);
