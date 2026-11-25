function switchAiSub(subName, btn) {
  document.querySelectorAll('.ai-sub-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('ai-sub-' + subName).classList.add('active'); btn.classList.add('active');
}
function updateCharCount(prefix) { document.getElementById(`${prefix}-count`).textContent = document.getElementById(`ai-${prefix}-prompt`).value.length; }
function toggleExtend(prefix) {
  const isExt = document.getElementById(`${prefix}-ext`).checked, inp = document.getElementById(`ai-${prefix}-prompt`), max = isExt ? 500 : 200;
  inp.maxLength = max; if (inp.value.length > max) inp.value = inp.value.slice(0, max);
  document.getElementById(`${prefix}-max`).textContent = max; document.getElementById(`${prefix}-cost`).textContent = isExt ? 250 : 200; updateCharCount(prefix);
}
function renderSpeciesGallery() {
  const spName = document.getElementById('ai-species-sel').value, box = document.getElementById('species-skin-gallery');
  if (!spName || !speciesSkins[spName]) { box.innerHTML = '<p style="grid-column:span 3;font-size:11px;color:#78909c;">先にモンスターを捕獲してください</p>'; return; }
  const data = speciesSkins[spName];
  let html = `<div class="slot-box ${data.activeIdx === -1 ? 'selected' : ''}" onclick="selectSkin('${spName}', -1)"><div class="lvl">標準</div><div class="icon">${data.defaultIcon}</div><div class="name">デフォルト</div></div>`;
  html += data.list.map((img, i) => `<div class="slot-box ${data.activeIdx === i ? 'selected' : ''}" onclick="selectSkin('${spName}', ${i})"><div class="lvl">限定#${i + 1}</div><div class="icon">${renderSprite(img, 36)}</div><div class="name">着せ替え${i + 1}</div></div>`).join('');
  box.innerHTML = html;
}
function selectSkin(spName, idx) {
  speciesSkins[spName].activeIdx = idx; renderSpeciesGallery(); renderCaptured(); renderCafe(); updateIconPreview(); showToast(`✨ ${spName}の見た目を変更！`);
}
async function generateAI(type) {
  const prefix = type === 'monster' ? 'mon' : type, isExt = document.getElementById(`${prefix}-ext`).checked, cost = isExt ? 250 : 200;
  if (gem < cost) return alert(`ジェム不足(${cost}💎必要)`);
  const promptInput = document.getElementById(`ai-${prefix}-prompt`).value;
  if (!promptInput) return alert('プロンプトを入力してください');
  let spName = '', stampText = '';
  if (type === 'monster') { spName = document.getElementById('ai-species-sel').value; if (!spName) return alert('先にモンスターを捕獲してください'); }
  else if (type === 'stamp') { spName = document.getElementById('stamp-species-sel').value; stampText = document.getElementById('stamp-text').value; }
  const statusEl = document.getElementById('ai-status'); statusEl.textContent = '🎨 AI描画中...（約10秒）'; gem -= cost; updateUI();
  try {
    const res = await fetch('/api/ai-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: spName ? `${spName} (${promptInput})` : promptInput, type, stampText }) });
    const data = await res.json();
    if (data.image) {
      if (type === 'monster') { speciesSkins[spName].list.push(data.image); speciesSkins[spName].activeIdx = speciesSkins[spName].list.length - 1; iconConfig.species = spName; renderSpeciesGallery(); renderCaptured(); renderCafe(); }
      else if (type === 'bg') { aiBackgrounds.push({ name: promptInput.slice(0, 8), img: data.image }); iconConfig.bgIdx = aiBackgrounds.length - 1; }
      else if (type === 'stamp') { aiStamps.push({ text: stampText || 'スタンプ', img: data.image }); renderStamps(); }
      updateSelectOptions(); updateIconPreview(); triggerAutoSave(true); statusEl.textContent = '✨ 完成＆自動保存しました！';
    } else statusEl.textContent = 'エラー: ' + (data.error || '生成失敗');
  } catch (e) { statusEl.textContent = '通信エラー'; }
}
function renderStamps() {
  const html = aiStamps.map((s, i) => `<div class="slot-box" onclick="sendStampChat(${i})"><div class="lvl">スタンプ</div><div class="icon">${renderSprite(s.img, 48)}</div><div class="name">${s.text}</div></div>`).join('');
  document.getElementById('stamp-gallery').innerHTML = html;
  document.getElementById('chat-stamp-bar').innerHTML = html || '<p style="grid-column:span 3;font-size:11px;color:#78909c;">AIアトリエでスタンプを作ると並びます</p>';
}
function updateSelectOptions() {
  const names = Object.keys(speciesSkins), spOpts = names.map(n => `<option value="${n}">${speciesSkins[n].defaultIcon} ${n}</option>`).join('');
  document.getElementById('ai-species-sel').innerHTML = spOpts || '<option value="">未捕獲</option>';
  document.getElementById('stamp-species-sel').innerHTML = '<option value="🐬 イルカ">🐬 イルカ(相棒)</option>' + spOpts;
  document.getElementById('icon-char-sel').innerHTML = '<option value="デフォルト">🐬 デフォルト</option>' + spOpts;
  document.getElementById('icon-bg-sel').innerHTML = '<option value="-1">デフォルト(水色グラデ)</option>' + aiBackgrounds.map((b, i) => `<option value="${i}">AI背景: ${b.name}</option>`).join('');
}
function updateIconPreview(save = true) {
  iconConfig.species = document.getElementById('icon-char-sel').value;
  iconConfig.bgIdx = parseInt(document.getElementById('icon-bg-sel').value);
  iconConfig.scale = parseFloat(document.getElementById('icon-scale').value);
  iconConfig.x = parseInt(document.getElementById('icon-x').value);
  iconConfig.y = parseInt(document.getElementById('icon-y').value);
  iconConfig.rotate = parseInt(document.getElementById('icon-rot').value);
  const preview = document.getElementById('icon-preview-box'), charLayer = document.getElementById('icon-char-layer');
  preview.style.backgroundImage = (iconConfig.bgIdx >= 0 && aiBackgrounds[iconConfig.bgIdx]) ? `url(${aiBackgrounds[iconConfig.bgIdx].img})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  const sp = speciesSkins[iconConfig.species], disp = sp ? getSpeciesDisplay(iconConfig.species, sp.defaultIcon) : '🐬';
  charLayer.innerHTML = disp.startsWith('data:image') ? renderSprite(disp, 76, '10px') : `<span style="font-size:52px;">${disp}</span>`;
  charLayer.style.transform = `translate(${iconConfig.x}px, ${iconConfig.y}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg)`;
  const mini = document.getElementById('hud-my-icon');
  mini.style.backgroundImage = preview.style.backgroundImage;
  mini.innerHTML = disp.startsWith('data:image') ? renderSprite(disp, 26, '6px') : disp;
  if (save) triggerAutoSave();
}
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active'); btn.classList.add('active');
  if (tabName === 'rank') loadRanking();
  if (tabName === 'cafe') renderCafe();
  if (tabName === 'shop' && typeof renderShop === 'function') renderShop();
  if (tabName === 'chat') { loadChat(); renderStamps(); }
}
function changePlayerName() {
  playerName = document.getElementById('player-name').value || 'ハンター';
  document.getElementById('hud-name').textContent = playerName; triggerAutoSave(true);
}
async function loadFromCloudById() {
  const targetId = document.getElementById('import-id-input').value.trim();
  if (!targetId) return;
  const res = await fetch(`/api/save?user_id=${encodeURIComponent(targetId)}`);
  const row = await res.json();
  if (row && row.save_json) { userId = targetId; localStorage.setItem('treasure_uid', userId); document.getElementById('my-user-id').textContent = userId; applySaveData(JSON.parse(row.save_json)); alert('データを復元しました！'); }
  else alert('データが見つかりません');
}
async function sendChat(stampImg = null) {
  const msg = stampImg ? `[STAMP]${stampImg}` : document.getElementById('chat-input').value;
  if (!msg) return; if (!stampImg) document.getElementById('chat-input').value = '';
  const sp = speciesSkins[iconConfig.species];
  const iconData = JSON.stringify({ emoji: sp ? sp.defaultIcon : '🐬', rotate: iconConfig.rotate });
  await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: playerName, icon_json: iconData, message: msg }) });
  loadChat();
}
function sendStampChat(idx) { if (aiStamps[idx]) sendChat(aiStamps[idx].img); }
async function loadChat() {
  try {
    const res = await fetch('/api/chat'); const list = await res.json();
    document.getElementById('chat-messages').innerHTML = list.map(c => {
      const ic = JSON.parse(c.icon_json || '{"emoji":"🐬","rotate":0}');
      const body = c.message.startsWith('[STAMP]') ? `<img src="${c.message.replace('[STAMP]', '')}" style="width:72px;height:72px;border-radius:10px;display:block;margin-top:4px;">` : c.message;
      return `<div class="chat-msg"><span style="display:inline-block;transform:rotate(${ic.rotate}deg)">${ic.emoji}</span> <b>${c.user_name}</b>: ${body}</div>`;
    }).join('') || 'まだメッセージがありません';
  } catch (e) {}
}
async function loadRanking() {
  try {
    const res = await fetch('/api/ranking'); const list = await res.json();
    document.getElementById('ranking-list').innerHTML = list.map((r, i) => `<div style="padding:6px 0;border-bottom:1px solid #eceff1;"><b>#${i + 1} ${r.user_name}</b> - 🌊海域${r.sea_area} / 🌲陸${r.land_area}</div>`).join('');
  } catch (e) {}
}
