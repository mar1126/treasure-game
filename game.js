let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = new Array(3).fill(null), gardenItems = [];
let party = new Array(3).fill(null);
let selectedMonIdx = -1;

const MAX_STAMINA = 30;
const STAMINA_RECOVERY_MS = 60 * 1000;
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
  const baseMon = list.at(cur.idx % list.length);
  const baseAtkVal = mode === 'sea' ? 8 : 10;
  return {
    name: baseMon.name,
    icon: baseMon.icon,
    atk: Math.floor(baseAtkVal * Math.pow(1.22, cur.area - 1) + (cur.wave - 1) * 2),
    def: Math.floor((cur.area - 1) * 2 + (cur.wave - 1) * 0.5),
    ct: baseMon.ct || 2.2
  };
}

function syncStamina() {
  if (stamina >= MAX_STAMINA) {
    stamina = MAX_STAMINA;
    staminaUpdatedAt = Date.now();
    return;
  }
  const now = Date.now();
  const elapsed = now - staminaUpdatedAt;
  const recovered = Math.floor(elapsed / STAMINA_RECOVERY_MS);
  if (recovered > 0) {
    stamina = Math.min(MAX_STAMINA, stamina + recovered);
    staminaUpdatedAt = (stamina >= MAX_STAMINA) ? now : staminaUpdatedAt + (recovered * STAMINA_RECOVERY_MS);
  }
}

let saveTimer = null;
let lastCloudSyncAt = 0;
const CLOUD_SYNC_INTERVAL_MS = 15000;

function triggerAutoSave(immediate = false) {
  const savedAt = Date.now();
  const payload = {
    savedAt, playerName, gold, gem, baseAtk, level, upCost, mode,
    stamina, staminaUpdatedAt,
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
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_name: playerName, save_json: jsonStr })
      });
      if (!res.ok) throw new Error('Save failed');
      if (badge) badge.textContent = '☁️ 自動保存済';
    } catch (e) {
      if (badge) badge.textContent = '📱 端末保存済';
    }
  };

  const timeSinceLastSync = Date.now() - lastCloudSyncAt;
  if (immediate || timeSinceLastSync >= CLOUD_SYNC_INTERVAL_MS) {
    doSync();
  } else {
    if (badge) badge.textContent = '📱 端末保存済';
    saveTimer = setTimeout(doSync, CLOUD_SYNC_INTERVAL_MS - timeSinceLastSync);
  }
}

function applySaveData(data) {
  if (!data) return;
  playerName = data.playerName || 'ハンター';
  gold = data.gold ?? 200; gem = data.gem ?? 1000; baseAtk = data.baseAtk ?? 10; level = data.level ?? 1; upCost = data.upCost ?? 50; mode = data.mode || 'sea';
  stamina = data.stamina ?? MAX_STAMINA;
  staminaUpdatedAt = data.staminaUpdatedAt || Date.now();
  syncStamina();

  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80;
  staff = Array.isArray(data.staff) ? data.staff.slice(0, 3) : new Array(3).fill(null);
  while (staff.length < 3) staff.push(null);
  gardenItems = data.gardenItems || [];

  const rawParty = Array.isArray(data.party) ? data.party : [];
  party = [rawParty.at(0) ?? null, rawParty.at(1) ?? null, rawParty.at(2) ?? null];

  if (data.state) {
    state = data.state;
    if (state.sea) { state.sea.inBattle = false; state.sea.enemyCt = 0; state.sea.shipCt = 0; }
    if (state.land) { state.land.inBattle = false; state.land.enemyCt = 0; state.land.shipCt = 0; }
  }
  captured = (data.captured || []).map((m, idx) => {
    const baseData = [...seaMonsters, ...landMonsters].find(x => x.name === m.name);
    return {
      id: m.id || ('M' + idx), icon: m.icon, name: m.name, type: m.type,
      lv: m.lv || 1, rarity: m.rarity || 'N',
      maxHp: m.maxHp || (55 + (m.lv || 1) * 18),
      atk: m.atk || 8,
      def: m.def || (3 + (m.lv || 1) * 2),
      ct: m.ct || (baseData ? baseData.ct : 2.1),
      traitId: m.traitId || 'gold_up'
    };
  });
  speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;

  const pNameEl = document.getElementById('player-name');
  if (pNameEl) pNameEl.value = playerName;
  const hudNameEl = document.getElementById('hud-name');
  if (hudNameEl) hudNameEl.textContent = playerName;

  if (document.getElementById('icon-scale')) {
    document.getElementById('icon-scale').value = iconConfig.scale;
    document.getElementById('icon-x').value = iconConfig.x;
    document.getElementById('icon-y').value = iconConfig.y;
    document.getElementById('icon-rot').value = iconConfig.rotate;
  }

  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (bg && btn) {
    if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; }
    else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  }
  resetBattleAllies();
  renderParty(); renderCaptured(); renderCafe(); updateSelectOptions();
  if (document.getElementById('icon-char-sel')) {
    document.getElementById('icon-char-sel').value = iconConfig.species;
    document.getElementById('icon-bg-sel').value = iconConfig.bgIdx;
  }
  renderSpeciesGallery(); renderStamps(); updateIconPreview(false); updateUI();
}
async function initCloudLoad() {
  const idEl = document.getElementById('my-user-id');
  if (idEl) idEl.textContent = userId;

  let localData = null;
  const localStr = localStorage.getItem('treasure_save_' + userId);
  if (localStr) {
    try { localData = JSON.parse(localStr); applySaveData(localData); } catch (e) {}
  } else {
    resetBattleAllies();
    renderParty(); renderCaptured(); renderCafe(); updateSelectOptions();
    renderSpeciesGallery(); renderStamps(); updateIconPreview(false); updateUI();
  }

  try {
    const res = await fetch(`/api/save?user_id=${encodeURIComponent(userId)}`);
    const row = await res.json();
    if (row && row.save_json) {
      const cloudData = JSON.parse(row.save_json);
      if (!localData || (cloudData.savedAt || 0) > (localData.savedAt || 0)) {
        applySaveData(cloudData);
      }
    }
  } catch (e) {}
}

window.addEventListener('beforeunload', () => {
  const payload = {
    savedAt: Date.now(), playerName, gold, gem, baseAtk, level, upCost, mode,
    stamina, staminaUpdatedAt, cafeLv, cafeCost, staff, gardenItems, party, state,
    captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig
  };
  localStorage.setItem('treasure_save_' + userId, JSON.stringify(payload));
});

function getSpeciesDisplay(name, defaultIcon) {
  const data = speciesSkins[name];
  return (data && data.activeIdx >= 0 && data.list.at(data.activeIdx)) ? data.list.at(data.activeIdx) : defaultIcon;
}
function renderSprite(displayVal, size = 32, round = '8px') {
  return (displayVal && displayVal.startsWith('data:image')) ? `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:cover;vertical-align:middle;">` : displayVal;
}
function getTotalPower() {
  let p = mode === 'sea' ? baseAtk : 0;
  party.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m) {
      const st = getMonStats(m);
      p += st.atk + Math.floor(st.def / 2);
    }
  });
  return p;
}

function triggerMotion(elementId, className) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function showDamagePopup(targetId, text, typeClass = '') {
  const targetEl = document.getElementById(targetId);
  const fxLayer = document.getElementById('fx-layer') || document.getElementById('battle-bg');
  if (!targetEl || !fxLayer) return;

  const rect = targetEl.getBoundingClientRect();
  const bgRect = fxLayer.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = `dmg-popup ${typeClass}`;
  popup.textContent = text;

  const offsetX = (Math.random() - 0.5) * 28;
  popup.style.left = `${(rect.left - bgRect.left) + (rect.width / 2) + offsetX}px`;
  popup.style.top = `${(rect.top - bgRect.top) + 8}px`;

  fxLayer.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function updateUI() {
  syncStamina();
  const stDisp = document.getElementById('stamina-disp');
  const stTimer = document.getElementById('stamina-timer');
  if (stDisp) stDisp.textContent = stamina;
  if (stTimer) {
    if (stamina >= MAX_STAMINA) {
      stTimer.textContent = 'MAX';
    } else {
      const remainSec = Math.max(1, Math.ceil((STAMINA_RECOVERY_MS - (Date.now() - staminaUpdatedAt)) / 1000));
      const m = String(Math.floor(remainSec / 60)).padStart(2, '0');
      const s = String(remainSec % 60).padStart(2, '0');
      stTimer.textContent = `(${m}:${s})`;
    }
  }

  const cur = state[mode];
  const eStats = getEnemyStats();
  document.getElementById('gold').textContent = gold.toLocaleString();
  document.getElementById('gem').textContent = gem.toLocaleString();
  document.getElementById('floor-text').textContent = mode === 'sea' ? `🌊 海域 ${cur.area}-${cur.wave}` : `🌲 陸地 ${cur.area}-${cur.wave}`;

  const startBtn = document.getElementById('start-battle-btn');
  if (cur.inBattle) {
    document.getElementById('enemy-name').textContent = `⚔️ ${eStats.name}`;
    if (startBtn) startBtn.style.display = 'none';
  } else {
    document.getElementById('enemy-name').textContent = `${eStats.name} (待機中)`;
    if (startBtn) startBtn.style.display = 'inline-block';
  }

  document.getElementById('enemy-sprite').textContent = eStats.icon;
  document.getElementById('enemy-hp-text').textContent = Math.max(0, cur.hp);
  document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (cur.hp / cur.maxHp) * 100)}%`;
  const enemyCtBar = document.getElementById('enemy-ct-bar');
  if (enemyCtBar) enemyCtBar.style.width = `${Math.min(100, (cur.enemyCt / eStats.ct) * 100)}%`;

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    if (!el) continue;
    const unit = battleAllies.at(i);
    if (unit) {
      el.classList.toggle('dead', unit.hp <= 0);
      const disp = getSpeciesDisplay(unit.name, unit.icon);
      const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
      const ctPct = unit.hp > 0 ? Math.min(100, (unit.ct / unit.maxCt) * 100) : 0;
      el.innerHTML = `
        <div class="unit-sprite">${renderSprite(disp, 28, '6px')}</div>
        <div class="hp-text">${unit.name} ${Math.max(0, unit.hp)}/${unit.maxHp}</div>
        <div class="bar-bg"><div class="ally-hp-fill" style="width:${hpPct}%"></div></div>
        <div class="bar-bg" style="height:4px;"><div class="ct-fill" style="width:${ctPct}%"></div></div>
      `;
    } else {
      el.classList.remove('dead');
      el.innerHTML = `
        <div class="unit-sprite">⬜</div>
        <div class="hp-text">空き枠</div>
        <div class="bar-bg"><div class="ally-hp-fill" style="width:0%"></div></div>
        <div class="bar-bg" style="height:4px;"><div class="ct-fill" style="width:0%"></div></div>
      `;
    }
  }

  const allyLvEl = document.getElementById('ally-lv');
  if (allyLvEl) allyLvEl.textContent = level;
  document.getElementById('power-disp').textContent = getTotalPower();
  document.getElementById('up-cost').textContent = upCost.toLocaleString();

  const inc = getCafeIncome();
  document.getElementById('cafe-income-hud').textContent = inc;
  const cafeRateEl = document.getElementById('cafe-rate');
  if (cafeRateEl) cafeRateEl.textContent = inc;
  const cafeLvEl = document.getElementById('cafe-lv');
  if (cafeLvEl) cafeLvEl.textContent = cafeLv;
  const cafeCostEl = document.getElementById('cafe-cost');
  if (cafeCostEl) cafeCostEl.textContent = cafeCost.toLocaleString();
  const gardenBonusEl = document.getElementById('garden-bonus');
  if (gardenBonusEl) gardenBonusEl.textContent = gardenItems.length * 15;
}
function toggleMode(e) {
  e.stopPropagation(); mode = mode === 'sea' ? 'land' : 'sea';
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  if (!state[mode].inBattle) resetBattleAllies();
  updateUI(); triggerAutoSave();
}
function showToast(text) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = text; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

function startBattle(e) {
  if (e) e.stopPropagation();
  const cur = state[mode];
  if (cur.inBattle) return;

  syncStamina();
  if (stamina < 1) {
    showToast('⚡ スタミナ不足！（1分で1回復）');
    updateUI();
    return;
  }

  if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
  stamina -= 1;
  resetBattleAllies();
  cur.hp = cur.maxHp;
  cur.enemyCt = 0;
  cur.shipCt = 0;
  cur.inBattle = true;
  triggerAutoSave();
  updateUI();
}

function handleEnemyDefeat(cur, eStats) {
  const goldTraitCount = party.map(id => captured.find(x => x.id === id)).filter(m => m && m.traitId === 'gold_up').length;
  const rewardGold = Math.floor(cur.area * 25 * (1 + goldTraitCount * 0.3));
  gold += rewardGold;

  const recruited = tryAutoRecruit(eStats, cur.area);
  if (!recruited) showToast(`🎉 討伐完了！+${rewardGold}G`);

  cur.wave++; cur.idx++;
  if (cur.wave > 5) { cur.wave = 1; cur.area++; }
  cur.maxHp = Math.floor((mode === 'sea' ? 100 : 120) * Math.pow(1.3, cur.area - 1));
  cur.hp = cur.maxHp;
  cur.enemyCt = 0;
  cur.shipCt = 0;
  cur.inBattle = false;
  resetBattleAllies();
  triggerAutoSave();
  updateUI();
}

let tickCount = 0;
setInterval(() => {
  tickCount++;
  if (tickCount % 5 === 0) gold += getCafeIncome();

  const cur = state[mode];
  if (!cur.inBattle) {
    if (tickCount % 5 === 0) updateUI();
    return;
  }

  const dt = 0.2;
  if (battleAllies.every(u => u === null)) {
    resetBattleAllies();
  }
  const eStats = getEnemyStats();

  for (let i = 0; i < 3; i++) {
    const u = battleAllies.at(i);
    if (!u || u.hp <= 0) continue;
    u.ct += dt;
    if (u.ct >= u.maxCt) {
      u.ct = 0;
      let rawAtk = u.atk;
      let isCrit = false;

      if (u.monRef) {
        const sk = getMonsterSkill(u.name);
        const bonusRate = u.monRef.traitId === 'crit_master' ? 0.1 : 0;
        if (Math.random() < (sk.rate + bonusRate)) {
          rawAtk = Math.floor(rawAtk * sk.mult);
          isCrit = true;
        }
      }

      const dmg = Math.max(1, rawAtk - Math.floor(eStats.def / 2));
      cur.hp -= dmg;

      triggerMotion(`ally-slot-${i}`, 'atk-motion');
      triggerMotion('enemy-unit-box', 'hit-motion');
      showDamagePopup('enemy-unit-box', isCrit ? `💥-${dmg}` : `-${dmg}`, isCrit ? 'crit' : '');

      if (cur.hp <= 0) {
        handleEnemyDefeat(cur, eStats);
        return;
      }
    }
  }

  if (typeof processShipSupport === 'function' && processShipSupport(cur, eStats, dt)) {
    return;
  }

  cur.enemyCt += dt;
  if (cur.enemyCt >= eStats.ct) {
    cur.enemyCt = 0;
    const aliveIndices = Array.from({ length: 3 }, (_, idx) => idx).filter(idx => battleAllies.at(idx) && battleAllies.at(idx).hp > 0);
    if (aliveIndices.length > 0) {
      const targetIdx = aliveIndices.at(Math.floor(Math.random() * aliveIndices.length));
      const targetUnit = battleAllies.at(targetIdx);
      const dmg = Math.max(1, eStats.atk - Math.floor(targetUnit.def / 2));
      targetUnit.hp -= dmg;

      triggerMotion('enemy-unit-box', 'atk-motion');
      triggerMotion(`ally-slot-${targetIdx}`, 'hit-motion');
      showDamagePopup(`ally-slot-${targetIdx}`, `-${dmg}`, 'ally-dmg');

      const stillAlive = Array.from({ length: 3 }, (_, idx) => idx).some(idx => battleAllies.at(idx) && battleAllies.at(idx).hp > 0);
      if (!stillAlive) {
        cur.hp = cur.maxHp;
        cur.enemyCt = 0;
        cur.shipCt = 0;
        cur.inBattle = false;
        resetBattleAllies();
        showToast('💀 全滅…仲間を強化しよう！');
        triggerAutoSave();
      }
    }
  }

  updateUI();
}, 200);
