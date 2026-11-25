let userId = localStorage.getItem('treasure_uid') || ('H-' + Math.random().toString(36).substring(2, 10).toUpperCase());
localStorage.setItem('treasure_uid', userId);
let playerName = 'ハンター';
let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let state = { sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0 }, land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0 } };
const seaMonsters = [{ icon: '🐙', name: 'オクトパス' }, { icon: '🦈', name: 'シャーク' }, { icon: '🦀', name: 'クラブ' }, { icon: '🐡', name: 'ハリセンボン' }, { icon: '🦑', name: 'ダイオウイカ' }, { icon: '🐳', name: 'ホエール' }];
const landMonsters = [{ icon: '🦊', name: 'フォックス' }, { icon: '🐗', name: 'ボア' }, { icon: '🦎', name: 'リザード' }, { icon: '🦉', name: 'オウル' }, { icon: '🐻', name: 'グリズリー' }, { icon: '🐉', name: 'ワイバーン' }];
let captured = [], speciesSkins = {}, aiBackgrounds = [], aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

let saveTimer = null;
function triggerAutoSave(immediate = false) {
  const payload = { playerName, gold, gem, baseAtk, level, upCost, mode, cafeLv, cafeCost, staff, gardenItems, state, captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig };
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
  if (data.state) state = data.state;
  captured = data.captured || []; speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;

  document.getElementById('player-name').value = playerName;
  document.getElementById('hud-name').textContent = playerName;
  document.getElementById('icon-scale').value = iconConfig.scale;
  document.getElementById('icon-x').value = iconConfig.x;
  document.getElementById('icon-y').value = iconConfig.y;
  document.getElementById('icon-rot').value = iconConfig.rotate;
  const bg = document.getElementById('battle-bg'), btn = document.getElementById('mode-switch-btn');
  if (mode === 'land') { bg.classList.add('land-mode'); btn.textContent = '🌊 海へ戻る'; } else { bg.classList.remove('land-mode'); btn.textContent = '🌲 陸へ行く'; }
  renderCaptured(); renderCafe(); updateSelectOptions();
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
function getTotalAtk() { return baseAtk + (captured.length * 3); }
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
  document.getElementById('atk-power').textContent = getTotalAtk();
  document.getElementById('power-disp').textContent = getTotalAtk();
  document.getElementById('up-cost').textContent = upCost.toLocaleString();
  document.querySelectorAll('.lv-sync').forEach(el => el.textContent = level);
  const inc = getCafeIncome();
  document.getElementById('cafe-income-hud').textContent = inc;
  document.getElementById('cafe-rate').textContent = inc;
  document.getElementById('cafe-lv').textContent = cafeLv;
  document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  document.getElementById('garden-bonus').textContent = gardenItems.length * 15;
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
    captured.push({ icon: mon.icon, name: mon.name, type: mode });
    if (!speciesSkins[mon.name]) speciesSkins[mon.name] = { list: [], activeIdx: -1, defaultIcon: mon.icon };
    renderCaptured(); updateSelectOptions(); renderSpeciesGallery(); showToast(`✨ ${mon.name}を捕獲した！`);
  } else showToast(`💨 逃げられた！`);
  updateUI(); triggerAutoSave();
}
function assignStaff(idx) {
  const mon = captured[idx], emptyIdx = staff.findIndex(s => s === null);
  if (emptyIdx !== -1) { staff[emptyIdx] = mon; showToast(`🍰 ${mon.name}を店員に配属！`); renderCafe(); updateUI(); triggerAutoSave(); }
  else showToast('店員枠がいっぱいです');
}
function removeStaff(slotIdx) { if (staff[slotIdx]) { staff[slotIdx] = null; renderCafe(); updateUI(); triggerAutoSave(); } }
function renderCaptured() {
  if (captured.length === 0) return;
  document.getElementById('captured-list').innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon), isAi = disp.startsWith('data:image');
    return `<div class="slot-box ${m.type}" onclick="assignStaff(${i})"><div class="lvl">${isAi ? '✨AI限定' : (m.type === 'sea' ? '🌊海' : '🌲陸')} #${i + 1}</div><div class="icon">${renderSprite(disp, 40)}</div><div class="name">${m.name}</div></div>`;
  }).join('');
}
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
