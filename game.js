let gold = 200, gem = 1000, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let state = { sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0 }, land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0 } };
const seaMonsters = [{ icon: '🐙', name: 'オクトパス' }, { icon: '🦈', name: 'シャーク' }, { icon: '🦀', name: 'クラブ' }, { icon: '🐡', name: 'ハリセンボン' }, { icon: '🦑', name: 'ダイオウイカ' }, { icon: '🐳', name: 'ホエール' }];
const landMonsters = [{ icon: '🦊', name: 'フォックス' }, { icon: '🐗', name: 'ボア' }, { icon: '🦎', name: 'リザード' }, { icon: '🦉', name: 'オウル' }, { icon: '🐻', name: 'グリズリー' }, { icon: '🐉', name: 'ワイバーン' }];
let captured = [];
let speciesSkins = {}; // 種族名: { list: [imgUrl...], activeIdx: -1 } (-1はデフォルト)
let aiBackgrounds = [];
let aiStamps = [];
let iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

function getSpeciesDisplay(name, defaultIcon) {
  const data = speciesSkins[name];
  if (data && data.activeIdx >= 0 && data.list[data.activeIdx]) {
    return data.list[data.activeIdx];
  }
  return defaultIcon;
}

function renderSprite(displayVal, size = 32, round = '8px') {
  if (displayVal && displayVal.startsWith('data:image')) {
    return `<img src="${displayVal}" style="width:${size}px;height:${size}px;border-radius:${round};object-fit:cover;vertical-align:middle;">`;
  }
  return displayVal;
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
  updateUI();
}

function showToast(text) {
  const el = document.getElementById('capture-msg'); el.textContent = text; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 1800);
}

function tryCapture(e) {
  e.stopPropagation();
  if (gold < 20) { showToast('ゴールド不足(20G)'); return; }
  gold -= 20;
  const cur = state[mode], list = mode === 'sea' ? seaMonsters : landMonsters, mon = list[cur.idx % list.length];
  if (Math.random() < ((cur.hp / cur.maxHp) < 0.4 ? 0.85 : 0.5)) {
    captured.push({ icon: mon.icon, name: mon.name, type: mode });
    if (!speciesSkins[mon.name]) speciesSkins[mon.name] = { list: [], activeIdx: -1, defaultIcon: mon.icon };
    renderCaptured(); updateSelectOptions(); renderSpeciesGallery(); showToast(`✨ ${mon.name}を捕獲した！`);
  } else { showToast(`💨 逃げられた！`); }
  updateUI();
}
function assignStaff(idx) {
  const mon = captured[idx], emptyIdx = staff.findIndex(s => s === null);
  if (emptyIdx !== -1) { staff[emptyIdx] = mon; showToast(`🍰 ${mon.name}を店員に配属！`); renderCafe(); updateUI(); }
  else { showToast('店員枠がいっぱいです'); }
}
function removeStaff(slotIdx) { if (staff[slotIdx]) { staff[slotIdx] = null; renderCafe(); updateUI(); } }

function renderCaptured() {
  document.getElementById('captured-list').innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon);
    const isAi = disp.startsWith('data:image');
    return `<div class="slot-box ${m.type}" onclick="assignStaff(${i})">
      <div class="lvl">${isAi ? '✨AI限定' : (m.type === 'sea' ? '🌊海' : '🌲陸')} #${i + 1}</div>
      <div class="icon">${renderSprite(disp, 40)}</div>
      <div class="name">${m.name}</div>
    </div>`;
  }).join('');
}

function renderCafe() {
  const roles = ['店長', 'ホール', 'キッチン'];
  document.getElementById('staff-slots').innerHTML = staff.map((s, i) => {
    if (!s) return `<div class="slot-box staff"><div class="lvl">${roles[i]}</div><div class="icon">➕</div><div class="name">空き枠</div></div>`;
    const disp = getSpeciesDisplay(s.name, s.icon);
    return `<div class="slot-box staff" onclick="removeStaff(${i})"><div class="lvl">${roles[i]}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${s.name}</div></div>`;
  }).join('');
  document.getElementById('garden-grid').innerHTML = Array(8).fill('').map((_, i) => {
    const item = gardenItems[i] || (staff[i] ? renderSprite(getSpeciesDisplay(staff[i].name, staff[i].icon), 28) : '');
    return `<div class="garden-cell">${item}</div>`;
  }).join('');
}

function upgradeCafe() { if (gold >= cafeCost) { gold -= cafeCost; cafeLv++; cafeCost = Math.floor(cafeCost * 1.6); updateUI(); } else alert('ゴールド不足'); }
function buyDecor(icon, cost) { if (gardenItems.length >= 8) return alert('満杯です'); if (gold >= cost) { gold -= cost; gardenItems.push(icon); renderCafe(); updateUI(); } else alert('ゴールド不足'); }

function switchAiSub(subName, btn) {
  document.querySelectorAll('.ai-sub-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('ai-sub-' + subName).classList.add('active');
  btn.classList.add('active');
}

function updateCharCount(prefix) {
  const inp = document.getElementById(`ai-${prefix}-prompt`);
  document.getElementById(`${prefix}-count`).textContent = inp.value.length;
}

function toggleExtend(prefix) {
  const isExt = document.getElementById(`${prefix}-ext`).checked;
  const inp = document.getElementById(`ai-${prefix}-prompt`);
  const max = isExt ? 500 : 200;
  inp.maxLength = max;
  if (inp.value.length > max) inp.value = inp.value.slice(0, max);
  document.getElementById(`${prefix}-max`).textContent = max;
  document.getElementById(`${prefix}-cost`).textContent = isExt ? 250 : 200;
  updateCharCount(prefix);
}

function renderSpeciesGallery() {
  const spName = document.getElementById('ai-species-sel').value;
  const box = document.getElementById('species-skin-gallery');
  if (!spName || !speciesSkins[spName]) { box.innerHTML = '<p style="grid-column:span 3;font-size:11px;color:#78909c;">先にモンスターを捕獲してください</p>'; return; }
  const data = speciesSkins[spName];
  let html = `<div class="slot-box ${data.activeIdx === -1 ? 'selected' : ''}" onclick="selectSkin('${spName}', -1)">
    <div class="lvl">標準</div><div class="icon">${data.defaultIcon}</div><div class="name">デフォルト</div></div>`;
  html += data.list.map((img, i) => `<div class="slot-box ${data.activeIdx === i ? 'selected' : ''}" onclick="selectSkin('${spName}', ${i})">
    <div class="lvl">限定#${i + 1}</div><div class="icon">${renderSprite(img, 36)}</div><div class="name">着せ替え${i + 1}</div></div>`).join('');
  box.innerHTML = html;
}

function selectSkin(spName, idx) {
  speciesSkins[spName].activeIdx = idx;
  renderSpeciesGallery(); renderCaptured(); renderCafe(); updateIconPreview();
  showToast(`✨ ${spName}の見た目を変更しました！`);
}
async function generateAI(type) {
  const prefix = type === 'monster' ? 'mon' : type;
  const isExt = document.getElementById(`${prefix}-ext`).checked;
  const cost = isExt ? 250 : 200;
  if (gem < cost) { alert(`ジェムが足りません(${cost}💎必要)`); return; }

  const promptInput = document.getElementById(`ai-${prefix}-prompt`).value;
  if (!promptInput) { alert('プロンプトを入力してください'); return; }

  let spName = '';
  let stampText = '';
  if (type === 'monster') {
    spName = document.getElementById('ai-species-sel').value;
    if (!spName) { alert('先にモンスターを1体捕獲してください！'); return; }
  } else if (type === 'stamp') {
    spName = document.getElementById('stamp-species-sel').value;
    stampText = document.getElementById('stamp-text').value;
  }

  const statusEl = document.getElementById('ai-status');
  statusEl.textContent = '🎨 AIがあなた専用のイラストを描画中...（約10秒）';
  gem -= cost; updateUI();

  try {
    const finalPrompt = spName ? `${spName} (${promptInput})` : promptInput;
    const res = await fetch('/api/ai-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: finalPrompt, type, stampText }) });
    const data = await res.json();
    if (data.image) {
      if (type === 'monster') {
        speciesSkins[spName].list.push(data.image);
        speciesSkins[spName].activeIdx = speciesSkins[spName].list.length - 1;
        iconConfig.species = spName;
        renderSpeciesGallery(); renderCaptured(); renderCafe();
      } else if (type === 'bg') {
        aiBackgrounds.push({ name: promptInput.slice(0, 8), img: data.image });
        iconConfig.bgIdx = aiBackgrounds.length - 1;
      } else if (type === 'stamp') {
        aiStamps.push({ text: stampText || 'スタンプ', img: data.image });
        renderStamps();
      }
      updateSelectOptions(); updateIconPreview();
      statusEl.textContent = '✨ あなた専用のAIデザインが完成しました！';
    } else { statusEl.textContent = 'エラー: ' + (data.error || '生成失敗'); }
  } catch (e) { statusEl.textContent = '通信エラーが発生しました'; }
}

function renderStamps() {
  const html = aiStamps.map((s, i) => `<div class="slot-box" onclick="sendStampChat(${i})"><div class="lvl">スタンプ</div><div class="icon">${renderSprite(s.img, 48)}</div><div class="name">${s.text}</div></div>`).join('');
  document.getElementById('stamp-gallery').innerHTML = html;
  document.getElementById('chat-stamp-bar').innerHTML = html || '<p style="grid-column:span 3;font-size:11px;color:#78909c;">AIアトリエでスタンプを作るとここに並びます</p>';
}

function updateSelectOptions() {
  const names = Object.keys(speciesSkins);
  const spOpts = names.map(n => `<option value="${n}">${speciesSkins[n].defaultIcon} ${n}</option>`).join('');
  document.getElementById('ai-species-sel').innerHTML = spOpts || '<option value="">未捕獲</option>';
  document.getElementById('stamp-species-sel').innerHTML = '<option value="🐬 イルカ">🐬 イルカ(相棒)</option>' + spOpts;
  document.getElementById('icon-char-sel').innerHTML = '<option value="デフォルト">🐬 デフォルト</option>' + spOpts;
  document.getElementById('icon-bg-sel').innerHTML = '<option value="-1">デフォルト(水色グラデ)</option>' + aiBackgrounds.map((b, i) => `<option value="${i}">AI背景: ${b.name}</option>`).join('');
}

function updateIconPreview() {
  iconConfig.species = document.getElementById('icon-char-sel').value;
  iconConfig.bgIdx = parseInt(document.getElementById('icon-bg-sel').value);
  iconConfig.scale = parseFloat(document.getElementById('icon-scale').value);
  iconConfig.x = parseInt(document.getElementById('icon-x').value);
  iconConfig.y = parseInt(document.getElementById('icon-y').value);
  iconConfig.rotate = parseInt(document.getElementById('icon-rot').value);
  const preview = document.getElementById('icon-preview-box'), charLayer = document.getElementById('icon-char-layer');
  preview.style.backgroundImage = (iconConfig.bgIdx >= 0 && aiBackgrounds[iconConfig.bgIdx]) ? `url(${aiBackgrounds[iconConfig.bgIdx].img})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  const sp = speciesSkins[iconConfig.species];
  const disp = sp ? getSpeciesDisplay(iconConfig.species, sp.defaultIcon) : '🐬';
  charLayer.innerHTML = disp.startsWith('data:image') ? renderSprite(disp, 72, '12px') : `<span style="font-size:52px;">${disp}</span>`;
  charLayer.style.transform = `translate(${iconConfig.x}px, ${iconConfig.y}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg)`;
  const mini = document.getElementById('hud-my-icon');
  mini.style.backgroundImage = preview.style.backgroundImage;
  mini.innerHTML = disp.startsWith('data:image') ? renderSprite(disp, 24, '50%') : disp;
}

function damageEnemy(dmg) {
  const cur = state[mode]; cur.hp -= dmg;
  if (cur.hp <= 0) {
    gold += cur.area * 25; cur.wave++; cur.idx++;
    if (cur.wave > 5) { cur.wave = 1; cur.area++; }
    cur.maxHp = Math.floor((mode === 'sea' ? 100 : 120) * Math.pow(1.3, cur.area - 1)); cur.hp = cur.maxHp;
  }
  updateUI();
}
function tapAttack() { damageEnemy(getTotalAtk()); }
setInterval(() => { damageEnemy(Math.floor(getTotalAtk() / 2) || 1); gold += getCafeIncome(); updateUI(); }, 1000);
function upgradeUnit() { if (gold >= upCost) { gold -= upCost; level++; baseAtk += 8; upCost = Math.floor(upCost * 1.4); updateUI(); } else alert('ゴールド不足'); }

function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active'); btn.classList.add('active');
  if (tabName === 'rank') loadRanking();
  if (tabName === 'cafe') renderCafe();
  if (tabName === 'chat') { loadChat(); renderStamps(); }
}

async function sendChat(stampImg = null) {
  const name = document.getElementById('chat-name').value || 'ハンター';
  const msg = stampImg ? `[STAMP]${stampImg}` : document.getElementById('chat-input').value;
  if (!msg) return;
  if (!stampImg) document.getElementById('chat-input').value = '';
  const sp = speciesSkins[iconConfig.species];
  const iconData = JSON.stringify({ emoji: sp ? sp.defaultIcon : '🐬', rotate: iconConfig.rotate });
  await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon_json: iconData, message: msg }) });
  loadChat();
}
function sendStampChat(idx) { if (aiStamps[idx]) sendChat(aiStamps[idx].img); }

async function loadChat() {
  try {
    const res = await fetch('/api/chat'); const data = await res.json();
    document.getElementById('chat-list').innerHTML = data.map(c => {
      const ic = JSON.parse(c.icon_json || '{"emoji":"🐬","rotate":0}');
      const content = c.message.startsWith('[STAMP]') ? renderSprite(c.message.replace('[STAMP]', ''), 72, '10px') : c.message;
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #eee;"><div style="width:32px;height:32px;border-radius:50%;background:#e1f5fe;display:flex;align-items:center;justify-content:center;font-size:18px;transform:rotate(${ic.rotate}deg);">${ic.emoji}</div><div><div style="font-size:11px;font-weight:bold;color:#0277bd;">${c.name}</div><div style="font-size:13px;">${content}</div></div></div>`;
    }).join('');
  } catch (e) {}
}

async function saveToD1() {
  const name = document.getElementById('player-name').value || 'ハンター';
  await fetch('/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score: gold }) });
  document.getElementById('save-msg').textContent = 'D1に保存しました！'; loadRanking();
}
async function loadRanking() {
  try {
    const res = await fetch('/api/scores'); const data = await res.json();
    document.getElementById('ranking-list').innerHTML = data.map((r, i) => `<li style="padding:6px 0; border-bottom:1px solid #e0f2f1;">${i+1}位: <b>${r.name}</b> - ${r.score.toLocaleString()} G</li>`).join('');
  } catch (e) {}
}
renderCafe(); updateSelectOptions(); renderSpeciesGallery(); renderStamps(); updateUI();
