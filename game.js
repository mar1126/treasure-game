let gold = 200, gem = 100, baseAtk = 10, level = 1, upCost = 50, mode = 'sea';
let cafeLv = 1, cafeCost = 80, staff = [null, null, null], gardenItems = [];
let state = { sea: { area: 1, wave: 1, maxHp: 100, hp: 100, idx: 0 }, land: { area: 1, wave: 1, maxHp: 120, hp: 120, idx: 0 } };
const seaMonsters = [{ icon: '🐙', name: 'オクトパス' }, { icon: '🦈', name: 'シャーク' }, { icon: '🦀', name: 'クラブ' }, { icon: '🐡', name: 'ハリセンボン' }, { icon: '🦑', name: 'ダイオウイカ' }, { icon: '🐳', name: 'ホエール' }];
const landMonsters = [{ icon: '🦊', name: 'フォックス' }, { icon: '🐗', name: 'ボア' }, { icon: '🦎', name: 'リザード' }, { icon: '🦉', name: 'オウル' }, { icon: '🐻', name: 'グリズリー' }, { icon: '🐉', name: 'ワイバーン' }];
let captured = [];
let aiBackgrounds = [];
let iconConfig = { charIdx: -1, bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };

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
    captured.push({ icon: mon.icon, name: mon.name, type: mode, aiImg: null });
    renderCaptured(); updateSelectOptions(); showToast(`✨ ${mon.name}を捕獲した！`);
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
  document.getElementById('captured-list').innerHTML = captured.map((m, i) => `
    <div class="slot-box ${m.type}" onclick="assignStaff(${i})">
      <div class="lvl">${m.aiImg ? '✨AI限定' : (m.type === 'sea' ? '🌊海' : '🌲陸')} #${i + 1}</div>
      <div class="icon">${m.aiImg ? `<img src="${m.aiImg}" style="width:42px;height:42px;border-radius:8px;object-fit:cover;">` : m.icon}</div>
      <div class="name">${m.name}</div>
    </div>`).join('');
}

function renderCafe() {
  const roles = ['店長', 'ホール', 'キッチン'];
  document.getElementById('staff-slots').innerHTML = staff.map((s, i) => s
    ? `<div class="slot-box staff" onclick="removeStaff(${i})"><div class="lvl">${roles[i]}</div><div class="icon">${s.aiImg ? `<img src="${s.aiImg}" style="width:36px;height:36px;border-radius:6px;">` : s.icon}</div><div class="name">${s.name}</div></div>`
    : `<div class="slot-box staff"><div class="lvl">${roles[i]}</div><div class="icon">➕</div><div class="name">空き枠</div></div>`).join('');
  document.getElementById('garden-grid').innerHTML = Array(8).fill('').map((_, i) => `<div class="garden-cell">${gardenItems[i] || (staff[i] ? staff[i].icon : '')}</div>`).join('');
}

function upgradeCafe() { if (gold >= cafeCost) { gold -= cafeCost; cafeLv++; cafeCost = Math.floor(cafeCost * 1.6); updateUI(); } else alert('ゴールド不足'); }
function buyDecor(icon, cost) { if (gardenItems.length >= 8) return alert('満杯です'); if (gold >= cost) { gold -= cost; gardenItems.push(icon); renderCafe(); updateUI(); } else alert('ゴールド不足'); }

async function generateAI(type) {
  if (gem < 20) { alert('ジェムが足りません(20💎必要)'); return; }
  const promptInput = type === 'monster' ? document.getElementById('ai-mon-prompt').value : document.getElementById('ai-bg-prompt').value;
  if (!promptInput) { alert('AIへの指示（プロンプト）を入力してください'); return; }
  if (type === 'monster' && captured.length === 0) { alert('先にモンスターを1体捕獲してください！'); return; }
  const statusEl = document.getElementById('ai-status');
  statusEl.textContent = '🎨 AIがあなた専用のイラストを描画中...（約10秒）';
  gem -= 20; updateUI();
  try {
    const res = await fetch('/api/ai-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptInput, type }) });
    const data = await res.json();
    if (data.image) {
      if (type === 'monster') {
        const targetIdx = parseInt(document.getElementById('ai-target-mon').value);
        captured[targetIdx].aiImg = data.image; iconConfig.charIdx = targetIdx;
        renderCaptured(); renderCafe();
      } else {
        aiBackgrounds.push({ name: promptInput.slice(0, 8), img: data.image });
        iconConfig.bgIdx = aiBackgrounds.length - 1;
      }
      updateSelectOptions(); updateIconPreview();
      statusEl.textContent = '✨ あなた専用のAIデザインが完成しました！';
    } else { statusEl.textContent = 'エラー: ' + (data.error || '生成失敗'); }
  } catch (e) { statusEl.textContent = '通信エラーが発生しました'; }
}
function updateSelectOptions() {
  const charSel = document.getElementById('icon-char-sel');
  const aiTarget = document.getElementById('ai-target-mon');
  const opts = captured.map((m, i) => `<option value="${i}">#${i+1} ${m.name} ${m.aiImg ? '(AI着せ替え済)' : ''}</option>`).join('');
  charSel.innerHTML = `<option value="-1">デフォルト(🐬)</option>` + opts;
  aiTarget.innerHTML = opts || `<option value="-1">モンスター未捕獲</option>`;
  const bgSel = document.getElementById('icon-bg-sel');
  bgSel.innerHTML = `<option value="-1">デフォルト(水色グラデ)</option>` + aiBackgrounds.map((b, i) => `<option value="${i}">AI背景: ${b.name}</option>`).join('');
}

function updateIconPreview() {
  iconConfig.charIdx = parseInt(document.getElementById('icon-char-sel').value);
  iconConfig.bgIdx = parseInt(document.getElementById('icon-bg-sel').value);
  iconConfig.scale = parseFloat(document.getElementById('icon-scale').value);
  iconConfig.x = parseInt(document.getElementById('icon-x').value);
  iconConfig.y = parseInt(document.getElementById('icon-y').value);
  iconConfig.rotate = parseInt(document.getElementById('icon-rot').value);
  const preview = document.getElementById('icon-preview-box');
  const charLayer = document.getElementById('icon-char-layer');
  preview.style.backgroundImage = (iconConfig.bgIdx >= 0 && aiBackgrounds[iconConfig.bgIdx]) ? `url(${aiBackgrounds[iconConfig.bgIdx].img})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  const mon = iconConfig.charIdx >= 0 ? captured[iconConfig.charIdx] : null;
  charLayer.innerHTML = mon ? (mon.aiImg ? `<img src="${mon.aiImg}" style="width:70px;height:70px;border-radius:12px;">` : `<span style="font-size:52px;">${mon.icon}</span>`) : `<span style="font-size:52px;">🐬</span>`;
  charLayer.style.transform = `translate(${iconConfig.x}px, ${iconConfig.y}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg)`;
  const mini = document.getElementById('hud-my-icon');
  mini.style.backgroundImage = preview.style.backgroundImage;
  mini.innerHTML = mon ? (mon.aiImg ? `<img src="${mon.aiImg}" style="width:24px;height:24px;border-radius:50%;">` : mon.icon) : '🐬';
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
  if (tabName === 'chat') loadChat();
}

async function sendChat() {
  const name = document.getElementById('chat-name').value || 'ハンター';
  const msg = document.getElementById('chat-input').value;
  if (!msg) return;
  document.getElementById('chat-input').value = '';
  const mon = iconConfig.charIdx >= 0 ? captured[iconConfig.charIdx] : null;
  const iconData = JSON.stringify({ emoji: mon ? mon.icon : '🐬', rotate: iconConfig.rotate });
  await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon_json: iconData, message: msg }) });
  loadChat();
}

async function loadChat() {
  try {
    const res = await fetch('/api/chat'); const data = await res.json();
    document.getElementById('chat-list').innerHTML = data.map(c => {
      const ic = JSON.parse(c.icon_json || '{"emoji":"🐬","rotate":0}');
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #eee;"><div style="width:32px;height:32px;border-radius:50%;background:#e1f5fe;display:flex;align-items:center;justify-content:center;font-size:18px;transform:rotate(${ic.rotate}deg);">${ic.emoji}</div><div><div style="font-size:11px;font-weight:bold;color:#0277bd;">${c.name}</div><div style="font-size:13px;">${c.message}</div></div></div>`;
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
renderCafe(); updateSelectOptions(); updateUI();
