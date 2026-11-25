let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = new Array(3).fill(null), gardenItems = [];
let party = new Array(3).fill(null);
let selectedMonIdx = -1;

let autoUnlocked = false, autoActive = false;
let speed2xUnlocked = false, speed2xActive = false;
let staminaFastUnlocked = false;

const MAX_STAMINA = 30;
let stamina = MAX_STAMINA;
let staminaUpdatedAt = Date.now();

let state = {
  sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0, inBattle: false, enemyCt: 0, shipCt: 0 },
  land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0, inBattle: false, enemyCt: 0, shipCt: 0 }
};

let battleAllies = new Array(3).fill(null);

const seaMonsters = [
  { icon: '🐙', name: 'オクトパス', ct: 2.2 },
  { icon: '🦈', name: 'シャーク', ct: 1.8 },
  { icon: '🦀', name: 'クラブ', ct: 2.6 },
  { icon: '🐡', name: 'ハリセンボン', ct: 2.0 },
  { icon: '🦑', name: 'ダイオウイカ', ct: 1.9 },
  { icon: '🐳', name: 'ホエール', ct: 2.8 }
];
const landMonsters = [
  { icon: '🦊', name: 'フォックス', ct: 1.7 },
  { icon: '🐗', name: 'ボア', ct: 2.1 },
  { icon: '🦎', name: 'リザード', ct: 1.9 },
  { icon: '🦉', name: 'オウル', ct: 1.6 },
  { icon: '🐻', name: 'グリズリー', ct: 2.7 },
  { icon: '🐉', name: 'ワイバーン', ct: 2.3 }
];

let captured = [], speciesSkins = {}, aiBackgrounds = [], aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

function getEnemyStats() {
  const cur = state[mode];
  const list = mode === 'sea' ? seaMonsters : landMonsters;
  const pickIdx = cur.idx % list.length;
  const baseMon = list.slice(pickIdx, pickIdx + 1).pop() || { icon: '🐙', name: 'オクトパス', ct: 2.2 };
  const baseAtkVal = mode === 'sea' ? 8 : 10;
  return {
    name: baseMon.name,
    icon: baseMon.icon,
    atk: Math.floor(baseAtkVal * Math.pow(1.22, cur.area - 1) + (cur.wave - 1) * 2),
    def: Math.floor((cur.area - 1) * 2 + (cur.wave - 1) * 0.5),
    ct: Number(baseMon.ct) || 2.2
  };
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
  const payload = {
    savedAt: Date.now(), playerName, gold, gem, baseAtk, level, upCost, mode,
    stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked,
    cafeLv, cafeCost, staff, gardenItems, party, state,
    captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig
  };
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem('treasure_save_' + userId, jsonStr);
  const badge = document.getElementById('save-indicator');
  clearTimeout(saveTimer);
  const doSync = async () => {
    lastCloudSyncAt = Date.now();
    if (badge) badge.textContent = '⏳ 同期中...';
    try {
      const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, user_name: playerName, save_json: jsonStr }) });
      if (!res.ok) throw new Error();
      if (badge) badge.textContent = '☁️ 自動保存済';
    } catch (e) { if (badge) badge.textContent = '📱 端末保存済'; }
  };
  const diff = Date.now() - lastCloudSyncAt;
  if (immediate || diff >= 15000) doSync();
  else { if (badge) badge.textContent = '📱 端末保存済'; saveTimer = setTimeout(doSync, 15000 - diff); }
}

function applySaveData(data) {
  if (!data) return;
  playerName = data.playerName || 'ハンター';
  gold = data.gold ?? 200; gem = data.gem ?? 1000; baseAtk = data.baseAtk ?? 10; level = data.level ?? 1; upCost = data.upCost ?? 50; mode = data.mode || 'sea';
  autoUnlocked = Boolean(data.autoUnlocked);
  speed2xUnlocked = Boolean(data.speed2xUnlocked);
  staminaFastUnlocked = Boolean(data.staminaFastUnlocked);
  stamina = data.stamina ?? MAX_STAMINA; staminaUpdatedAt = data.staminaUpdatedAt || Date.now(); syncStamina();
  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80;
  staff = Array.isArray(data.staff) ? data.staff.slice(0, 3) : new Array(3).fill(null);
  while (staff.length < 3) staff.push(null);
  gardenItems = data.gardenItems || [];
  const rawParty = Array.isArray(data.party) ? data.party : [];
  party = [rawParty.slice(0, 1).pop() ?? null, rawParty.slice(1, 2).pop() ?? null, rawParty.slice(2, 3).pop() ?? null];
  if (data.state) {
    state = data.state;
    if (state.sea) { state.sea.inBattle = false; state.sea.enemyCt = 0; state.sea.shipCt = 0; }
    if (state.land) { state.land.inBattle = false; state.land.enemyCt = 0; state.land.shipCt = 0; }
  }
  captured = (data.captured || []).map((m, idx) => {
    const baseData = [...seaMonsters, ...landMonsters].find(x => x.name === m.name);
    return { id: m.id || ('M' + idx), icon: m.icon, name: m.name, type: m.type, lv: m.lv || 1, rarity: m.rarity || 'N', maxHp: m.maxHp || (55 + (m.lv || 1) * 18), atk: m.atk || 8, def: m.def || (3 + (m.lv || 1) * 2), ct: Number(m.ct) || (baseData ? baseData.ct : 2.1), traitId: m.traitId || 'gold_up' };
  });
  speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;
  if (document.getElementById('player-name')) document.getElementById('player-name').value = playerName;
  if (document.getElementById('hud-name')) document.getElementById('hud-name').textContent = playerName;
  if (document.getElementById('icon-scale')) {
    document.getElementById('icon-scale').value = iconConfig.scale; document.getElementById('icon-x').value = iconConfig.x;
    document.getElementById('icon-y').value = iconConfig.y; document.getElementById('icon-rot').value = iconConfig.rotate;
  }
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (bg && btn) {
    if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  }
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
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
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof renderParty === 'function') renderParty();
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
  const payload = { savedAt: Date.now(), playerName, gold, gem, baseAtk, level, upCost, mode, stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked, cafeLv, cafeCost, staff, gardenItems, party, state, captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig };
  localStorage.setItem('treasure_save_' + userId, JSON.stringify(payload));
});

function getSpeciesDisplay(name, defaultIcon) {
  const data = speciesSkins[name];
  if (!data || data.activeIdx < 0) return defaultIcon;
  return data.list.slice(data.activeIdx, data.activeIdx + 1).pop() || defaultIcon;
}
function renderSprite(displayVal, size = 32, round = '8px') {
  return (displayVal && displayVal.startsWith('data:image')) ? `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:cover;vertical-align:middle;">` : displayVal;
}
function getTotalPower() {
  let p = mode === 'sea' ? baseAtk : 0;
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
  popup.style.left = `${(rect.left - bgRect.left) + (rect.width / 2) + ((Math.random() - 0.5) * 28)}px`;
  popup.style.top = `${(rect.top - bgRect.top) + 8}px`;
  fxLayer.appendChild(popup); setTimeout(() => popup.remove(), 800);
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
    autoBtn.textContent = autoActive ? '🔄 自動ON' : '🔄 自動OFF';
    autoBtn.classList.toggle('active', autoActive);
  }
  const speedBtn = document.getElementById('hud-speed-btn');
  if (speedBtn) {
    speedBtn.style.display = speed2xUnlocked ? 'inline-block' : 'none';
    speedBtn.textContent = speed2xActive ? '▷▷ 2x' : '▷ 1x';
    speedBtn.classList.toggle('active', speed2xActive);
  }

  const cur = state[mode], eStats = getEnemyStats();
  document.getElementById('gold').textContent = gold.toLocaleString();
  document.getElementById('gem').textContent = gem.toLocaleString();
  document.getElementById('floor-text').textContent = mode === 'sea' ? `🌊 海域 ${cur.area}-${cur.wave}` : `🌲 陸地 ${cur.area}-${cur.wave}`;
  const startBtn = document.getElementById('start-battle-btn');
  if (cur.inBattle) { document.getElementById('enemy-name').textContent = `⚔️ ${eStats.name}`; if (startBtn) startBtn.style.display = 'none'; }
  else { document.getElementById('enemy-name').textContent = `${eStats.name} (待機中)`; if (startBtn) startBtn.style.display = 'inline-block'; }
  document.getElementById('enemy-sprite').textContent = eStats.icon;
  document.getElementById('enemy-hp-text').textContent = Math.max(0, cur.hp);
  document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (cur.hp / cur.maxHp) * 100)}%`;

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
      const disp = getSpeciesDisplay(unit.name, unit.icon);
      const nextHtml = renderSprite(disp, 28, '6px');
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
  if (document.getElementById('ally-lv')) document.getElementById('ally-lv').textContent = level;
  document.getElementById('power-disp').textContent = getTotalPower();
  document.getElementById('up-cost').textContent = upCost.toLocaleString();
  const inc = typeof getCafeIncome === 'function' ? getCafeIncome() : 0;
  document.getElementById('cafe-income-hud').textContent = inc;
  if (document.getElementById('cafe-rate')) document.getElementById('cafe-rate').textContent = inc;
  if (document.getElementById('cafe-lv')) document.getElementById('cafe-lv').textContent = cafeLv;
  if (document.getElementById('cafe-cost')) document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  if (document.getElementById('garden-bonus')) document.getElementById('garden-bonus').textContent = gardenItems.length * 15;
}
function toggleMode(e) {
  e.stopPropagation(); mode = mode === 'sea' ? 'land' : 'sea';
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  if (!state[mode].inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  updateUI(); triggerAutoSave();
}
function showToast(text) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = text; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 1800);
}
function toggleAutoMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!autoUnlocked) return;
  autoActive = !autoActive;
  showToast(autoActive ? '🔄 自動戦闘: ON' : '⏸️ 自動戦闘: OFF');
  updateUI();
  if (autoActive && !state[mode].inBattle && stamina >= 1) startBattle();
}
function toggleSpeedMode(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!speed2xUnlocked) return;
  speed2xActive = !speed2xActive;
  showToast(speed2xActive ? '▷▷ 戦闘速度: 2倍速' : '▷ 戦闘速度: 通常(1x)');
  updateUI();
}
function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const cur = state[mode]; if (cur.inBattle) return;
  syncStamina();
  if (stamina < 1) {
    if (autoActive) { autoActive = false; showToast('⚡ スタミナ切れのため自動戦闘停止'); }
    else showToast('⚡ スタミナ不足！ショップで回復できます');
    updateUI(); return;
  }
  if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
  stamina -= 1;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  cur.hp = cur.maxHp; cur.enemyCt = 0; cur.shipCt = 0; cur.inBattle = true;
  triggerAutoSave(); updateUI();
}
function handleEnemyDefeat(cur, eStats) {
  cur.inBattle = false;
  const goldTraitCount = party.map(id => captured.find(x => x.id === id)).filter(m => m && m.traitId === 'gold_up').length;
  const rewardGold = Math.floor(cur.area * 25 * (1 + goldTraitCount * 0.3));
  gold += rewardGold;
  const recruited = typeof tryAutoRecruit === 'function' ? tryAutoRecruit(eStats, cur.area) : false;
  if (!recruited) showToast(`🎉 討伐完了！+${rewardGold}G`);
  cur.wave++; cur.idx++;
  if (cur.wave > 5) { cur.wave = 1; cur.area++; }
  cur.maxHp = Math.floor((mode === 'sea' ? 100 : 120) * Math.pow(1.3, cur.area - 1));
  cur.hp = cur.maxHp; cur.enemyCt = 0; cur.shipCt = 0;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  triggerAutoSave(); updateUI();
  if (autoActive) {
    const delay = speed2xActive ? 350 : 700;
    setTimeout(() => { if (autoActive && !state[mode].inBattle) startBattle(); }, delay);
  }
}

let lastFrameTime = performance.now();
let cafeSecTimer = 0;

function battleFrameLoop(now) {
  const rawDt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  cafeSecTimer += rawDt;
  if (cafeSecTimer >= 1.0) {
    cafeSecTimer -= 1.0;
    if (typeof getCafeIncome === 'function') gold += getCafeIncome();
    if (!state[mode].inBattle) updateUI();
  }

  const cur = state[mode];
  if (cur.inBattle) {
    const dt = (speed2xUnlocked && speed2xActive) ? rawDt * 2.0 : rawDt;
    if ((!battleAllies || battleAllies.every(u => !u)) && typeof resetBattleAllies === 'function') resetBattleAllies();
    const eStats = getEnemyStats();
    let needsUiSync = false;

    for (let i = 0; i < 3; i++) {
      const u = battleAllies.slice(i, i + 1).pop();
      const ctBar = document.querySelector(`#ally-slot-${i} .ally-ct-bar`);
      if (!u || u.hp <= 0) {
        if (ctBar) ctBar.style.width = '0%';
        continue;
      }
      u.ct = (Number(u.ct) || 0) + dt;
      const limitCt = Number(u.maxCt) || 2.0;

      if (u.ct >= limitCt) {
        u.ct = 0;
        let rawAtk = u.atk || 10, isCrit = false;
        if (u.monRef && typeof getMonsterSkill === 'function') {
          const sk = getMonsterSkill(u.name), bonusRate = u.monRef.traitId === 'crit_master' ? 0.1 : 0;
          if (Math.random() < (sk.rate + bonusRate)) { rawAtk = Math.floor(rawAtk * sk.mult); isCrit = true; }
        }
        const dmg = Math.max(1, rawAtk - Math.floor(eStats.def / 2));
        cur.hp -= dmg;
        triggerMotion(`ally-slot-${i}`, 'atk-motion'); triggerMotion('enemy-unit-box', 'hit-motion');
        showDamagePopup('enemy-unit-box', isCrit ? `💥-${dmg}` : `-${dmg}`, isCrit ? 'crit' : '');
        needsUiSync = true;

        if (cur.hp <= 0) {
          handleEnemyDefeat(cur, eStats);
          requestAnimationFrame(battleFrameLoop);
          return;
        }
      }
      if (ctBar) ctBar.style.width = `${Math.min(100, (u.ct / limitCt) * 100)}%`;
    }

    if (typeof processShipSupport === 'function' && processShipSupport(cur, eStats, dt)) {
      requestAnimationFrame(battleFrameLoop);
      return;
    }

    cur.enemyCt = (Number(cur.enemyCt) || 0) + dt;
    const enemyCtBar = document.getElementById('enemy-ct-bar');
    if (cur.enemyCt >= eStats.ct) {
      cur.enemyCt = 0;
      const aliveIndices = Array.of(0, 1, 2).filter(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; });
      if (aliveIndices.length > 0) {
        const targetIdx = aliveIndices.slice(Math.floor(Math.random() * aliveIndices.length)).shift();
        const targetUnit = battleAllies.slice(targetIdx, targetIdx + 1).pop();
        const dmg = Math.max(1, eStats.atk - Math.floor(targetUnit.def / 2));
        targetUnit.hp -= dmg;
        triggerMotion('enemy-unit-box', 'atk-motion'); triggerMotion(`ally-slot-${targetIdx}`, 'hit-motion');
        showDamagePopup(`ally-slot-${targetIdx}`, `-${dmg}`, 'ally-dmg');
        needsUiSync = true;

        if (!Array.of(0, 1, 2).some(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; })) {
          cur.hp = cur.maxHp; cur.enemyCt = 0; cur.shipCt = 0; cur.inBattle = false;
          if (autoActive) autoActive = false;
          if (typeof resetBattleAllies === 'function') resetBattleAllies();
          showToast('💀 全滅…仲間を強化しよう！'); triggerAutoSave();
          needsUiSync = true;
        }
      }
    }
    if (enemyCtBar) enemyCtBar.style.width = `${Math.min(100, (cur.enemyCt / eStats.ct) * 100)}%`;

    if (needsUiSync) updateUI();
  }

  requestAnimationFrame(battleFrameLoop);
}
requestAnimationFrame(battleFrameLoop);
