let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let party = [null, null]; // 枠0は船(固定)、枠1・2に仲間モンスターを最大2体編成
let selectedMonIdx = -1;

// スタミナ設定（最大30・1分に1回復・バトル開始で1消費）
const MAX_STAMINA = 30;
const STAMINA_RECOVERY_MS = 60 * 1000;
let stamina = MAX_STAMINA;
let staminaUpdatedAt = Date.now();

// バトル状態（敵CT・攻撃力も管理）
let state = {
  sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0, inBattle: false, enemyCt: 0 },
  land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0, inBattle: false, enemyCt: 0 }
};

// バトル中の味方3枠の個別リアルタイム状態（HP・最大HP・ATK・DEF・CT・最大CT）
let battleAllies = [
  { hp: 100, maxHp: 100, atk: 10, def: 4, ct: 0, maxCt: 2.0 },
  null,
  null
];

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

// 船の個別ステータス計算
function getShipStats() {
  return {
    name: '探索船',
    icon: '⛵',
    lv: level,
    maxHp: 80 + level * 25,
    atk: baseAtk,
    def: 3 + level * 2,
    ct: 2.0
  };
}

// モンスターの個別実効ステータス計算（HP・ATK・DEF・CT）
function getMonStats(m) {
  let mult = (m.type === mode) ? 1.2 : 1.0;
  if (m.traitId === 'sea_lord' && mode === 'sea') mult += 0.4;
  if (m.traitId === 'land_lord' && mode === 'land') mult += 0.4;
  const maxHp = m.maxHp || (50 + m.lv * 18);
  const def = m.def || (2 + m.lv * 2);
  const ct = m.ct || 2.2;
  return {
    name: m.name,
    icon: m.icon,
    lv: m.lv,
    maxHp,
    atk: Math.floor(m.atk * mult),
    def,
    ct
  };
}

// バトル用ユニット配列の初期化（戦闘開始時・編成変更時にHPとCTをリセット）
function resetBattleAllies() {
  const ship = getShipStats();
  battleAllies[0] = { ...ship, hp: ship.maxHp, ct: 0 };
  for (let i = 0; i < 2; i++) {
    const m = captured.find(x => x.id === party[i]);
    if (m) {
      const st = getMonStats(m);
      battleAllies[i + 1] = { ...st, monRef: m, hp: st.maxHp, ct: 0 };
    } else {
      battleAllies[i + 1] = null;
    }
  }
}

// 敵の攻撃力・防御力・CT取得
function getEnemyStats() {
  const cur = state[mode];
  const list = mode === 'sea' ? seaMonsters : landMonsters;
  const baseMon = list[cur.idx % list.length];
  const baseAtkVal = mode === 'sea' ? 8 : 10;
  return {
    name: baseMon.name,
    icon: baseMon.icon,
    atk: Math.floor(baseAtkVal * Math.pow(1.22, cur.area - 1) + (cur.wave - 1) * 2),
    def: Math.floor((cur.area - 1) * 2 + (cur.wave - 1) * 0.5),
    ct: baseMon.ct || 2.2
  };
}
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

// セーブ処理
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
  // 旧3枠データ互換（最大2枠へ調整）
  const rawParty = data.party || [null, null];
  party = [rawParty[0] ?? null, rawParty[1] ?? null];

  if (data.state) {
    state = data.state;
    if (state.sea) { state.sea.inBattle = false; state.sea.enemyCt = 0; }
    if (state.land) { state.land.inBattle = false; state.land.enemyCt = 0; }
  }
  captured = (data.captured || []).map((m, idx) => {
    const baseData = [...seaMonsters, ...landMonsters].find(x => x.name === m.name);
    return {
      id: m.id || ('M' + idx), icon: m.icon, name: m.name, type: m.type,
      lv: m.lv || 1, rarity: m.rarity || 'N',
      maxHp: m.maxHp || (50 + (m.lv || 1) * 18),
      atk: m.atk || 8,
      def: m.def || (2 + (m.lv || 1) * 2),
      ct: m.ct || (baseData ? baseData.ct : 2.2),
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
function getTotalPower() {
  let p = getShipStats().atk + Math.floor(getShipStats().def / 2);
  party.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m) {
      const st = getMonStats(m);
      p += st.atk + Math.floor(st.def / 2);
    }
  });
  return p;
}
function getCafeIncome() {
  const active = staff.filter(s => s !== null);
  if (active.length === 0) return 0;
  const cafeTraitBonus = active.filter(s => s.traitId === 'cafe_star').length * 0.35;
  return Math.floor(active.length * 6 * cafeLv * (1 + gardenItems.length * 0.15 + cafeTraitBonus));
}

// 攻撃・被弾モーション再生
function triggerMotion(elementId, className) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// ダメージ数字ポップアップ表示
function showDamagePopup(targetId, text, typeClass = '') {
  const targetEl = document.getElementById(targetId);
  const battleBg = document.getElementById('battle-bg');
  if (!targetEl || !battleBg) return;

  const rect = targetEl.getBoundingClientRect();
  const bgRect = battleBg.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = `dmg-popup ${typeClass}`;
  popup.textContent = text;

  const offsetX = (Math.random() - 0.5) * 28;
  popup.style.left = `${(rect.left - bgRect.left) + (rect.width / 2) + offsetX}px`;
  popup.style.top = `${(rect.top - bgRect.top) + 8}px`;

  battleBg.appendChild(popup);
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

  // 味方3枠の個別HP・CT表示更新
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    if (!el) continue;
    const unit = battleAllies[i];
    if (unit) {
      el.classList.toggle('dead', unit.hp <= 0);
      const disp = i === 0 ? '⛵' : getSpeciesDisplay(unit.name, unit.icon);
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

// 敵を倒した時に確率（35%）で自動仲間加入（個別HP/ATK/DEF/CT付き）
function tryAutoRecruit(baseMon, curArea) {
  if (Math.random() >= 0.35) return false;
  const rRoll = Math.random();
  const rarity = rRoll < 0.08 ? 'SSR' : (rRoll < 0.28 ? 'SR' : (rRoll < 0.6 ? 'R' : 'N'));
  const mult = { N: 1, R: 1.4, SR: 2.0, SSR: 3.0 }[rarity];
  const trait = getRandomTrait();
  const newMon = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 99),
    icon: baseMon.icon, name: baseMon.name, type: mode, lv: 1, rarity,
    maxHp: Math.floor((55 + curArea * 15) * mult),
    atk: Math.floor((7 + curArea * 3) * mult),
    def: Math.floor((3 + curArea * 1.5) * mult),
    ct: baseMon.ct || 2.2,
    traitId: trait.id
  };
  captured.push(newMon);
  if (!speciesSkins[baseMon.name]) speciesSkins[baseMon.name] = { list: [], activeIdx: -1, defaultIcon: baseMon.icon };
  const emptySlot = party.findIndex(x => x === null);
  if (emptySlot !== -1) party[emptySlot] = newMon.id;
  resetBattleAllies();
  renderParty(); renderCaptured(); updateSelectOptions(); renderSpeciesGallery();
  showToast(`✨ [${rarity}] ${baseMon.name}が起き上がり仲間になった！`);
  return true;
}

function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  const ship = getShipStats();
  let html = `<div class="slot-box"><div class="lvl"><span>船(固定)</span><span>Lv.${ship.lv}</span></div><div class="icon">⛵</div><div class="name">探索船</div><div class="sub">HP:${ship.maxHp} ATK:${ship.atk}</div></div>`;
  html += party.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getSpeciesDisplay(m.name, m.icon), idx = captured.findIndex(x => x.id === monId), st = getMonStats(m);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span><span>CT:${st.ct}s</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">HP:${st.maxHp} ATK:${st.atk}</div></div>`;
  }).join('');
  el.innerHTML = html;
}

function renderCaptured() {
  const el = document.getElementById('captured-list');
  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon), inParty = party.includes(m.id);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span>${inParty ? '<span class="badge-tag">編成中</span>' : ''}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">ATK:${m.atk} DEF:${m.def || 4}</div></div>`;
  }).join('');
}

function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured[idx]; if (!m) return;
  const disp = getSpeciesDisplay(m.name, m.icon), sk = getMonsterSkill(m.name), tr = getMonsterTrait(m.traitId), st = getMonStats(m);
  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = m.name;
  document.getElementById('modal-mon-rarity').textContent = `レア度: ${m.rarity} / ${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'}`;
  document.getElementById('modal-mon-lv').textContent = `Lv.${m.lv}`;
  document.getElementById('modal-mon-atk').innerHTML = `HP:${st.maxHp} / ATK:${st.atk}<br>DEF:${st.def} / CT:${st.ct}秒`;
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
    if (empty === -1) return alert('パーティ（2枠）がいっぱいです！');
    party[empty] = m.id; showToast(`⚔️ ${m.name}をパーティに編成！`);
  }
  if (!state[mode].inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}

function levelUpMonFromModal() {
  const m = captured[selectedMonIdx]; if (!m) return;
  const cost = m.lv * 30;
  if (gold < cost) return alert('ゴールド不足！');
  gold -= cost;
  m.lv++;
  m.maxHp = (m.maxHp || 68) + Math.floor(14 + m.lv * 3);
  m.atk += Math.floor(4 + m.lv * 1.5);
  m.def = (m.def || 4) + Math.floor(2 + m.lv * 0.8);
  if (!state[mode].inBattle) resetBattleAllies();
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
// バトル開始処理（スタミナ1消費＋個別HP/CTリセット）
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
  cur.inBattle = true;
  triggerAutoSave();
  updateUI();
}

// 0.2秒刻みのリアルタイムCT進行バトルループ
let tickCount = 0;
setInterval(() => {
  tickCount++;
  if (tickCount % 5 === 0) {
    gold += getCafeIncome(); // カフェ収入は1秒ごと
  }

  const cur = state[mode];
  if (!cur.inBattle) {
    if (tickCount % 5 === 0) updateUI();
    return;
  }

  const dt = 0.2;
  const eStats = getEnemyStats();

  // 1. 味方3枠の個別CT加算＆行動処理
  for (let i = 0; i < 3; i++) {
    const u = battleAllies[i];
    if (!u || u.hp <= 0) continue;
    u.ct += dt;
    if (u.ct >= u.maxCt) {
      u.ct = 0;
      let rawAtk = u.atk;
      let isCrit = false;

      if (i > 0 && u.monRef) {
        const sk = getMonsterSkill(u.name);
        const bonusRate = u.monRef.traitId === 'crit_master' ? 0.1 : 0;
        if (Math.random() < (sk.rate + bonusRate)) {
          rawAtk = Math.floor(rawAtk * sk.mult);
          isCrit = true;
        }
      }

      const dmg = Math.max(1, rawAtk - Math.floor(eStats.def / 2));
      cur.hp -= dmg;

      // 攻撃＆被弾モーション＋数字ポップアップ
      triggerMotion(`ally-slot-${i}`, 'atk-motion');
      triggerMotion('enemy-unit-box', 'hit-motion');
      showDamagePopup('enemy-unit-box', isCrit ? `💥-${dmg}` : `-${dmg}`, isCrit ? 'crit' : '');

      // 撃破判定
      if (cur.hp <= 0) {
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
        cur.inBattle = false;
        resetBattleAllies();
        triggerAutoSave();
        updateUI();
        return;
      }
    }
  }

  // 2. 敵のCT加算＆反撃処理
  cur.enemyCt += dt;
  if (cur.enemyCt >= eStats.ct) {
    cur.enemyCt = 0;
    const aliveIndices = [0, 1, 2].filter(idx => battleAllies[idx] && battleAllies[idx].hp > 0);
    if (aliveIndices.length > 0) {
      const targetIdx = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
      const targetUnit = battleAllies[targetIdx];
      const dmg = Math.max(1, eStats.atk - Math.floor(targetUnit.def / 2));
      targetUnit.hp -= dmg;

      triggerMotion('enemy-unit-box', 'atk-motion');
      triggerMotion(`ally-slot-${targetIdx}`, 'hit-motion');
      showDamagePopup(`ally-slot-${targetIdx}`, `-${dmg}`, 'ally-dmg');

      // 全滅判定
      const stillAlive = [0, 1, 2].some(idx => battleAllies[idx] && battleAllies[idx].hp > 0);
      if (!stillAlive) {
        cur.hp = cur.maxHp;
        cur.enemyCt = 0;
        cur.inBattle = false;
        resetBattleAllies();
        showToast('💀 全滅…船と仲間を強化しよう！');
        triggerAutoSave();
      }
    }
  }

  updateUI();
}, 200);

function upgradeUnit() {
  if (gold >= upCost) {
    gold -= upCost; level++; baseAtk += 8; upCost = Math.floor(upCost * 1.4);
    if (!state[mode].inBattle) resetBattleAllies();
    renderParty(); updateUI(); triggerAutoSave();
  } else alert('ゴールド不足');
}
