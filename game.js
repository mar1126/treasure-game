let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let party = [null, null, null];
let selectedMonIdx = -1;

// スタミナ設定（最大30・1分に1回復・バトル開始で1消費）
const MAX_STAMINA = 30;
const STAMINA_RECOVERY_MS = 60 * 1000;
let stamina = MAX_STAMINA;
let staminaUpdatedAt = Date.now();

// バトル状態（inBattle: 現在の敵と戦闘中かどうか）
let state = {
  sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0, inBattle: false },
  land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0, inBattle: false }
};

const seaMonsters = [{ icon: '🐙', name: 'オクトパス' }, { icon: '🦈', name: 'シャーク' }, { icon: '🦀', name: 'クラブ' }, { icon: '🐡', name: 'ハリセンボン' }, { icon: '🦑', name: 'ダイオウイカ' }, { icon: '🐳', name: 'ホエール' }];
const landMonsters = [{ icon: '🦊', name: 'フォックス' }, { icon: '🐗', name: 'ボア' }, { icon: '🦎', name: 'リザード' }, { icon: '🦉', name: 'オウル' }, { icon: '🐻', name: 'グリズリー' }, { icon: '🐉', name: 'ワイバーン' }];
let captured = [], speciesSkins = {}, aiBackgrounds = [], aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

// 1分ごとに1回復する計算
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

// セーブ処理（D1書き込み負荷軽減＆巻き戻り防止）
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

  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80; staff = data.staff || [null, null, null]; gardenItems = data.gardenItems || [];
  party = data.party || [null, null, null];
  if (data.state) {
    state = data.state;
    if (state.sea) state.sea.inBattle = Boolean(state.sea.inBattle);
    if (state.land) state.land.inBattle = Boolean(state.land.inBattle);
  }
  captured = (data.captured || []).map((m, idx) => ({
    id: m.id || ('M' + idx), icon: m.icon, name: m.name, type: m.type,
    lv: m.lv || 1, rarity: m.rarity || 'N', atk: m.atk || 8, traitId: m.traitId || 'gold_up'
  }));
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
  return (data && data.activeIdx >= 0 && data.list[data.activeIdx]) ? data.list[data.activeIdx] : defaultIcon;
}
function renderSprite(displayVal, size = 32, round = '8px') {
  return (displayVal && displayVal.startsWith('data:image')) ? `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:cover;vertical-align:middle;">` : displayVal;
}
function getMonEffectiveAtk(m) {
  let mult = (m.type === mode) ? 1.2 : 1.0;
  if (m.traitId === 'sea_lord' && mode === 'sea') mult += 0.4;
  if (m.traitId === 'land_lord' && mode === 'land') mult += 0.4;
  return Math.floor(m.atk * mult);
}
function getTotalAtk() {
  let partyAtk = 0;
  party.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m) partyAtk += getMonEffectiveAtk(m);
  });
  return baseAtk + partyAtk;
}
function getCafeIncome() {
  const active = staff.filter(s => s !== null);
  if (active.length === 0) return 0;
  const cafeTraitBonus = active.filter(s => s.traitId === 'cafe_star').length * 0.35;
  return Math.floor(active.length * 6 * cafeLv * (1 + gardenItems.length * 0.15 + cafeTraitBonus));
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

  const cur = state[mode], list = mode === 'sea' ? seaMonsters : landMonsters, mon = list[cur.idx % list.length];
  document.getElementById('gold').textContent = gold.toLocaleString();
  document.getElementById('gem').textContent = gem.toLocaleString();
  document.getElementById('floor-text').textContent = mode === 'sea' ? `🌊 海域 ${cur.area}-${cur.wave}` : `🌲 陸地 ${cur.area}-${cur.wave}`;

  const startBtn = document.getElementById('start-battle-btn');
  if (cur.inBattle) {
    document.getElementById('enemy-name').textContent = `⚔️ ${mon.name}`;
    if (startBtn) startBtn.style.display = 'none';
  } else {
    document.getElementById('enemy-name').textContent = `${mon.name} (待機中)`;
    if (startBtn) startBtn.style.display = 'inline-block';
  }

  document.getElementById('enemy-sprite').textContent = mon.icon;
  document.getElementById('enemy-hp-text').textContent = Math.max(0, cur.hp);
  document.getElementById('enemy-hp-bar').style.width = `${(cur.hp / cur.maxHp) * 100}%`;

  const allyLvEl = document.getElementById('ally-lv');
  if (allyLvEl) allyLvEl.textContent = level;
  document.getElementById('power-disp').textContent = getTotalAtk();
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

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    if (!el) continue;
    const m = captured.find(x => x.id === party[i]);
    if (m) {
      const disp = getSpeciesDisplay(m.name, m.icon);
      el.innerHTML = `<div class="unit-sprite">${renderSprite(disp, 36, '8px')}</div><div class="hp-text">${m.name} Lv.${m.lv}</div>`;
    } else {
      el.innerHTML = `<div class="unit-sprite">${i === 0 ? '⛵' : '⬜'}</div><div class="hp-text">${i === 0 ? '船 ATK:' + baseAtk : '空き枠'}</div>`;
    }
  }
}

function toggleMode(e) {
  e.stopPropagation(); mode = mode === 'sea' ? 'land' : 'sea';
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  updateUI(); triggerAutoSave();
}
function showToast(text) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = text; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}
function tryCapture(e) {
  e.stopPropagation();
  if (gold < 20) return showToast('ゴールド不足(20G)');
  gold -= 20;
  const cur = state[mode], list = mode === 'sea' ? seaMonsters : landMonsters, mon = list[cur.idx % list.length];
  if (Math.random() < ((cur.hp / cur.maxHp) < 0.4 ? 0.85 : 0.5)) {
    const rRoll = Math.random();
    const rarity = rRoll < 0.08 ? 'SSR' : (rRoll < 0.28 ? 'SR' : (rRoll < 0.6 ? 'R' : 'N'));
    const mult = { N: 1, R: 1.4, SR: 2.0, SSR: 3.0 }[rarity];
    const trait = getRandomTrait();
    const newMon = { id: 'M' + Date.now() + Math.floor(Math.random()*99), icon: mon.icon, name: mon.name, type: mode, lv: 1, rarity, atk: Math.floor((6 + cur.area * 3) * mult), traitId: trait.id };
    captured.push(newMon);
    if (!speciesSkins[mon.name]) speciesSkins[mon.name] = { list: [], activeIdx: -1, defaultIcon: mon.icon };
    const emptySlot = party.findIndex(x => x === null);
    if (emptySlot !== -1) party[emptySlot] = newMon.id;
    renderParty(); renderCaptured(); updateSelectOptions(); renderSpeciesGallery(); showToast(`✨ [${rarity}] ${mon.name}を捕獲！`);
  } else showToast(`💨 逃げられた！`);
  updateUI(); triggerAutoSave();
}
function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  el.innerHTML = party.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getSpeciesDisplay(m.name, m.icon), idx = captured.findIndex(x => x.id === monId);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span><span>⚔️${getMonEffectiveAtk(m)}</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div></div>`;
  }).join('');
}
function renderCaptured() {
  const el = document.getElementById('captured-list');
  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon), inParty = party.includes(m.id);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span>${inParty ? '<span class="badge-tag">編成中</span>' : ''}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">ATK: ${m.atk}</div></div>`;
  }).join('');
}
function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured[idx]; if (!m) return;
  const disp = getSpeciesDisplay(m.name, m.icon), sk = getMonsterSkill(m.name), tr = getMonsterTrait(m.traitId);
  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = m.name;
  document.getElementById('modal-mon-rarity').textContent = `レア度: ${m.rarity} / ${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'}`;
  document.getElementById('modal-mon-lv').textContent = `Lv.${m.lv}`;
  document.getElementById('modal-mon-atk').textContent = `${m.atk}（現在実効値: ${getMonEffectiveAtk(m)}）`;
  document.getElementById('modal-mon-terrain').textContent = m.type === 'sea' ? '🌊 海（海戦で攻撃+20%）' : '🌲 陸（陸戦で攻撃+20%）';
  document.getElementById('modal-mon-skill').innerHTML = `<b>${sk.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${sk.desc}</span>`;
  document.getElementById('modal-mon-trait').innerHTML = `<b>${tr.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${tr.desc}</span>`;
  document.getElementById('modal-party-btn').textContent = party.includes(m.id) ? '❌ パーティから外す' : '⚔️ バトルパーティに編成する';
  document.getElementById('modal-lvup-btn').textContent = `⬆️ 個別強化する（費用: ${m.lv * 30} G）`;
  document.getElementById('mon-modal').style.display = 'flex';
}
function closeMonModal() { document.getElementById('mon-modal').style.display = 'none'; }
function togglePartyFromModal() {
  const m = captured[selectedMonIdx]; if (!m) return;
  const pIdx = party.indexOf(m.id);
  if (pIdx !== -1) { party[pIdx] = null; showToast(`${m.name}をパーティから外しました`); }
  else {
    const empty = party.findIndex(x => x === null);
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです！');
    party[empty] = m.id; showToast(`⚔️ ${m.name}をパーティに編成！`);
  }
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
function levelUpMonFromModal() {
  const m = captured[selectedMonIdx]; if (!m) return;
  const cost = m.lv * 30;
  if (gold < cost) return alert('ゴールド不足！');
  gold -= cost; m.lv++; m.atk += Math.floor(4 + m.lv * 1.5);
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
function assignStaffFromModal() { assignStaff(selectedMonIdx); closeMonModal(); }
function assignStaff(idx) {
  const mon = captured[idx], emptyIdx = staff.findIndex(s => s === null);
  if (emptyIdx !== -1) { staff[emptyIdx] = mon; showToast(`🍰 ${mon.name}を店員に配属！`); renderCafe(); updateUI(); triggerAutoSave(); }
  else showToast('店員枠がいっぱいです');
}
function removeStaff(slotIdx) { if (staff[slotIdx]) { staff[slotIdx] = null; renderCafe(); updateUI(); triggerAutoSave(); } }
function renderCafe() {
  const roles = ['店長', 'ホール', 'キッチン'];
  const staffEl = document.getElementById('staff-slots');
  if (staffEl) {
    staffEl.innerHTML = staff.map((s, i) => !s
      ? `<div class="slot-box staff"><div class="lvl">${roles[i]}</div><div class="icon">➕</div><div class="name">空き枠</div></div>`
      : `<div class="slot-box staff" onclick="removeStaff(${i})"><div class="lvl">${roles[i]}</div><div class="icon">${renderSprite(getSpeciesDisplay(s.name, s.icon), 36)}</div><div class="name">${s.name}</div></div>`).join('');
  }
  const gardenEl = document.getElementById('garden-grid');
  if (gardenEl) {
    gardenEl.innerHTML = Array(8).fill('').map((_, i) => `<div class="garden-cell">${gardenItems[i] || (staff[i] ? renderSprite(getSpeciesDisplay(staff[i].name, staff[i].icon), 28) : '')}</div>`).join('');
  }
}
function upgradeCafe() { if (gold >= cafeCost) { gold -= cafeCost; cafeLv++; cafeCost = Math.floor(cafeCost * 1.6); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }
function buyDecor(icon, cost) { if (gardenItems.length >= 8) return alert('満杯です'); if (gold >= cost) { gold -= cost; gardenItems.push(icon); renderCafe(); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }

// バトル開始処理（タップ攻撃の代わり：スタミナを1消費してオート戦闘開始）
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

  if (stamina === MAX_STAMINA) {
    staminaUpdatedAt = Date.now();
  }
  stamina -= 1;
  cur.inBattle = true;
  showToast('⚔️ バトル開始！（スタミナ -1）');
  triggerAutoSave();
  updateUI();
}

function damageEnemy(dmg) {
  const cur = state[mode];
  if (!cur.inBattle) return;

  let finalDmg = dmg;
  for (const monId of party) {
    const m = captured.find(x => x.id === monId);
    if (!m) continue;
    const sk = getMonsterSkill(m.name);
    const bonusRate = m.traitId === 'crit_master' ? 0.1 : 0;
    if (Math.random() < (sk.rate + bonusRate)) {
      finalDmg = Math.floor(finalDmg * sk.mult);
      showToast(`⚡ ${m.name}の【${sk.name}】発動！(${finalDmg}ダメージ)`);
      break;
    }
  }

  cur.hp -= finalDmg;
  if (cur.hp <= 0) {
    const goldTraitCount = party.map(id => captured.find(x => x.id === id)).filter(m => m && m.traitId === 'gold_up').length;
    gold += Math.floor(cur.area * 25 * (1 + goldTraitCount * 0.3));
    cur.wave++; cur.idx++;
    if (cur.wave > 5) { cur.wave = 1; cur.area++; }
    cur.maxHp = Math.floor((mode === 'sea' ? 100 : 120) * Math.pow(1.3, cur.area - 1));
    cur.hp = cur.maxHp;
    cur.inBattle = false;
    showToast('🎉 討伐完了！ゴールド獲得！');
    triggerAutoSave();
  }
  updateUI();
}

setInterval(() => {
  damageEnemy(getTotalAtk());
  gold += getCafeIncome();
  updateUI();
}, 1000);

function upgradeUnit() { if (gold >= upCost) { gold -= upCost; level++; baseAtk += 8; upCost = Math.floor(upCost * 1.4); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }
