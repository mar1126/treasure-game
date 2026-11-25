let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let party = [null, null, null];
let selectedMonIdx = -1;
let state = { sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0 }, land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0 } };
const seaMonsters = [{ icon: '🐙', name: 'オクトパス', skill: '墨噴射' }, { icon: '🦈', name: 'シャーク', skill: '鋭い牙' }, { icon: '🦀', name: 'クラブ', skill: '硬い甲羅' }, { icon: '🐡', name: 'ハリセンボン', skill: '毒針連打' }, { icon: '🦑', name: 'ダイオウイカ', skill: '深海の圧力' }, { icon: '🐳', name: 'ホエール', skill: '巨大津波' }];
const landMonsters = [{ icon: '🦊', name: 'フォックス', skill: '狐火' }, { icon: '🐗', name: 'ボア', skill: '猛突進' }, { icon: '🦎', name: 'リザード', skill: '尻尾斬り' }, { icon: '🦉', name: 'オウル', skill: '夜目の狙撃' }, { icon: '🐻', name: 'グリズリー', skill: '剛腕の一撃' }, { icon: '🐉', name: 'ワイバーン', skill: '竜の咆哮' }];
let captured = [], speciesSkins = {}, aiBackgrounds = [], aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

let saveTimer = null;
function triggerAutoSave(immediate = false) {
  const payload = { playerName, gold, gem, baseAtk, level, upCost, mode, cafeLv, cafeCost, staff, gardenItems, party, state, captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig };
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem('treasure_save_' + userId, jsonStr);
  const badge = document.getElementById('save-indicator');
  if (badge) badge.textContent = '⏳ 保存中...';
  clearTimeout(saveTimer);
  const doSync = async () => {
    try {
      await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, user_name: playerName, save_json: jsonStr }) });
      if (badge) badge.textContent = '☁️ 自動保存済';
    } catch (e) { if (badge) badge.textContent = '📱 端末保存済'; }
  };
  if (immediate) doSync(); else saveTimer = setTimeout(doSync, 800);
}

function applySaveData(data) {
  if (!data) return;
  playerName = data.playerName || 'ハンター';
  gold = data.gold ?? 200; gem = data.gem ?? 1000; baseAtk = data.baseAtk ?? 10; level = data.level ?? 1; upCost = data.upCost ?? 50; mode = data.mode || 'sea';
  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80; staff = data.staff || [null, null, null]; gardenItems = data.gardenItems || [];
  party = data.party || [null, null, null];
  if (data.state) state = data.state;
  captured = (data.captured || []).map((m, idx) => ({ id: m.id || ('M' + idx), icon: m.icon, name: m.name, type: m.type, lv: m.lv || 1, rarity: m.rarity || 'N', atk: m.atk || 8, skill: m.skill || '突撃' }));
  speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;

  document.getElementById('player-name').value = playerName;
  document.getElementById('hud-name').textContent = playerName;
  document.getElementById('icon-scale').value = iconConfig.scale;
  document.getElementById('icon-x').value = iconConfig.x;
  document.getElementById('icon-y').value = iconConfig.y;
  document.getElementById('icon-rot').value = iconConfig.rotate;
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  renderParty(); renderCaptured(); renderCafe(); updateSelectOptions();
  document.getElementById('icon-char-sel').value = iconConfig.species;
  document.getElementById('icon-bg-sel').value = iconConfig.bgIdx;
  renderSpeciesGallery(); renderStamps(); updateIconPreview(false); updateUI();
}
async function initCloudLoad() {
  document.getElementById('my-user-id').textContent = userId;
  const local = localStorage.getItem('treasure_save_' + userId);
  if (local) applySaveData(JSON.parse(local));
  try {
    const res = await fetch(`/api/save?user_id=${encodeURIComponent(userId)}`);
    const row = await res.json();
    if (row && row.save_json) applySaveData(JSON.parse(row.save_json));
  } catch (e) {}
}
window.addEventListener('beforeunload', () => triggerAutoSave(true));

function getSpeciesDisplay(name, defaultIcon) {
  const data = speciesSkins[name];
  return (data && data.activeIdx >= 0 && data.list[data.activeIdx]) ? data.list[data.activeIdx] : defaultIcon;
}
function renderSprite(displayVal, size = 32, round = '8px') {
  return (displayVal && displayVal.startsWith('data:image')) ? `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:cover;vertical-align:middle;">` : displayVal;
}
function getTotalAtk() {
  let partyAtk = 0;
  party.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m) partyAtk += Math.floor(m.atk * (m.type === mode ? 1.2 : 1.0));
  });
  return baseAtk + partyAtk;
}
function getCafeIncome() {
  const activeStaff = staff.filter(s => s !== null).length;
  return activeStaff === 0 ? 0 : Math.floor(activeStaff * 6 * cafeLv * (1 + gardenItems.length * 0.15));
}
function updateUI() {
  const cur = state[mode], list = mode === 'sea' ? seaMonsters : landMonsters, mon = list[cur.idx % list.length];
  document.getElementById('gold').textContent = gold.toLocaleString();
  document.getElementById('gem').textContent = gem.toLocaleString();
  document.getElementById('floor-text').textContent = mode === 'sea' ? `🌊 海域 ${cur.area}-${cur.wave}` : `🌲 陸地 ${cur.area}-${cur.wave}`;
  document.getElementById('enemy-name').textContent = mon.name;
  document.getElementById('enemy-sprite').textContent = mon.icon;
  document.getElementById('enemy-hp-text').textContent = Math.max(0, cur.hp);
  document.getElementById('enemy-hp-bar').style.width = `${(cur.hp / cur.maxHp) * 100}%`;
  document.getElementById('ally-lv').textContent = level;
  document.getElementById('power-disp').textContent = getTotalAtk();
  document.getElementById('up-cost').textContent = upCost.toLocaleString();
  const inc = getCafeIncome();
  document.getElementById('cafe-income-hud').textContent = inc;
  document.getElementById('cafe-rate').textContent = inc;
  document.getElementById('cafe-lv').textContent = cafeLv;
  document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  document.getElementById('garden-bonus').textContent = gardenItems.length * 15;

  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ally-slot-${i}`);
    const m = captured.find(x => x.id === party[i]);
    if (m) {
      const disp = getSpeciesDisplay(m.name, m.icon);
      el.innerHTML = `<div class="unit-sprite">${renderSprite(disp, 38, '8px')}</div><div class="hp-text">Lv.${m.lv} ATK:${m.atk}</div>`;
    } else {
      el.innerHTML = `<div class="unit-sprite">${i === 0 ? '🚤' : '➕'}</div><div class="hp-text">${i === 0 ? '探索船 ATK:' + baseAtk : '未編成'}</div>`;
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
  const el = document.getElementById('capture-msg'); el.textContent = text; el.style.display = 'block';
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
    const newMon = { id: 'M' + Date.now() + Math.floor(Math.random()*99), icon: mon.icon, name: mon.name, type: mode, lv: 1, rarity, atk: Math.floor((6 + cur.area * 3) * mult), skill: mon.skill };
    captured.push(newMon);
    if (!speciesSkins[mon.name]) speciesSkins[mon.name] = { list: [], activeIdx: -1, defaultIcon: mon.icon };
    const emptySlot = party.findIndex(x => x === null);
    if (emptySlot !== -1) party[emptySlot] = newMon.id;
    renderParty(); renderCaptured(); updateSelectOptions(); renderSpeciesGallery(); showToast(`✨ [${rarity}] ${mon.name}を捕獲！`);
  } else showToast(`💨 逃げられた！`);
  updateUI(); triggerAutoSave();
}
function renderParty() {
  document.getElementById('party-slots').innerHTML = party.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getSpeciesDisplay(m.name, m.icon), idx = captured.findIndex(x => x.id === monId);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span><span>⚔️${m.atk}</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div></div>`;
  }).join('');
}
function renderCaptured() {
  if (captured.length === 0) return;
  document.getElementById('captured-list').innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon), inParty = party.includes(m.id);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span>${inParty ? '<span class="badge-tag">編成中</span>' : ''}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">ATK: ${m.atk}</div></div>`;
  }).join('');
}
function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured[idx]; if (!m) return;
  const disp = getSpeciesDisplay(m.name, m.icon);
  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = m.name;
  document.getElementById('modal-mon-rarity').textContent = `レア度: ${m.rarity} / ${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'}`;
  document.getElementById('modal-mon-lv').textContent = `Lv.${m.lv}`;
  document.getElementById('modal-mon-atk').textContent = `${m.atk}（得意地形で ${Math.floor(m.atk * 1.2)}）`;
  document.getElementById('modal-mon-terrain').textContent = m.type === 'sea' ? '🌊 海（海戦で攻撃+20%）' : '🌲 陸（陸戦で攻撃+20%）';
  document.getElementById('modal-mon-skill').textContent = m.skill || '突撃';
  const inParty = party.includes(m.id);
  document.getElementById('modal-party-btn').textContent = inParty ? '❌ パーティから外す' : '⚔️ バトルパーティに編成する';
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
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです！先に誰かを外してください');
    party[empty] = m.id; showToast(`⚔️ ${m.name}をパーティに編成しました！`);
  }
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
function levelUpMonFromModal() {
  const m = captured[selectedMonIdx]; if (!m) return;
  const cost = m.lv * 30;
  if (gold < cost) return alert('ゴールドが足りません！');
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
  document.getElementById('staff-slots').innerHTML = staff.map((s, i) => !s
    ? `<div class="slot-box staff"><div class="lvl">${roles[i]}</div><div class="icon">➕</div><div class="name">空き枠</div></div>`
    : `<div class="slot-box staff" onclick="removeStaff(${i})"><div class="lvl">${roles[i]}</div><div class="icon">${renderSprite(getSpeciesDisplay(s.name, s.icon), 36)}</div><div class="name">${s.name}</div></div>`).join('');
  document.getElementById('garden-grid').innerHTML = Array(8).fill('').map((_, i) => `<div class="garden-cell">${gardenItems[i] || (staff[i] ? renderSprite(getSpeciesDisplay(staff[i].name, staff[i].icon), 28) : '')}</div>`).join('');
}
function upgradeCafe() { if (gold >= cafeCost) { gold -= cafeCost; cafeLv++; cafeCost = Math.floor(cafeCost * 1.6); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }
function buyDecor(icon, cost) { if (gardenItems.length >= 8) return alert('満杯です'); if (gold >= cost) { gold -= cost; gardenItems.push(icon); renderCafe(); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }
function damageEnemy(dmg) {
  const cur = state[mode]; cur.hp -= dmg;
  if (cur.hp <= 0) {
    gold += cur.area * 25; cur.wave++; cur.idx++;
    if (cur.wave > 5) { cur.wave = 1; cur.area++; }
    cur.maxHp = Math.floor((mode === 'sea' ? 100 : 120) * Math.pow(1.3, cur.area - 1)); cur.hp = cur.maxHp;
    triggerAutoSave();
  }
  updateUI();
}
function tapAttack() { damageEnemy(getTotalAtk()); }
setInterval(() => { damageEnemy(Math.floor(getTotalAtk() / 2) || 1); gold += getCafeIncome(); updateUI(); }, 1000);
function upgradeUnit() { if (gold >= upCost) { gold -= upCost; level++; baseAtk += 8; upCost = Math.floor(upCost * 1.4); updateUI(); triggerAutoSave(); } else alert('ゴールド不足'); }
