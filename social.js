// チャット・スタンプ・ランキング・プロフィール編集 (social.js)
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (tabName === 'cafe' && typeof renderCafe === 'function') renderCafe();
  if (tabName === 'shop' && typeof renderShop === 'function') renderShop();
  if (tabName === 'chat') {
    renderStamps();
    loadChat();
  }
  if (tabName === 'rank') {
    loadRanking();
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadChat() {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  box.innerHTML = '<div style="color:#78909c;text-align:center;padding:12px;">読み込み中...</div>';
  try {
    const res = await fetch('/api/chat');
    if (!res.ok) throw new Error('API Error: ' + res.status);
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = '<div style="color:#78909c;text-align:center;padding:12px;">まだメッセージがありません。最初の挨拶を送ってみよう！</div>';
      return;
    }
    box.innerHTML = list.map(row => {
      const name = escapeHtml(row.user_name || 'ハンター');
      const time = row.created_at ? new Date(row.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
      let bodyHtml = '';
      if (row.stamp_img && row.stamp_img.startsWith('data:image')) {
        bodyHtml = `<div style="margin-top:4px;"><img src="${row.stamp_img}" style="width:72px;height:72px;border-radius:10px;object-fit:contain;border:1px solid #cfd8dc;"></div>`;
      } else {
        bodyHtml = `<div style="color:#263238;margin-top:2px;word-break:break-all;">${escapeHtml(row.message)}</div>`;
      }
      return `
        <div class="chat-msg">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#0288d1;font-weight:bold;">
            <span>${name}</span>
            <span style="color:#90a4ae;font-weight:normal;">${time}</span>
          </div>
          ${bodyHtml}
        </div>
      `;
    }).join('');
    box.scrollTop = box.scrollHeight;
  } catch (e) {
    box.innerHTML = '<div style="color:#e53935;font-size:11px;padding:10px;">チャット通信エラー：Cloudflareの「functions/api/chat.js」またはD1データベース設定を確認してください。</div>';
  }
}

async function sendChat(stampImg = null, stampLabel = '') {
  const inp = document.getElementById('chat-input');
  const text = stampImg ? (stampLabel || 'スタンプ') : (inp ? inp.value.trim() : '');
  if (!text && !stampImg) return;

  if (inp && !stampImg) inp.value = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_name: playerName || 'ハンター',
        message: text,
        stamp_img: stampImg || ''
      })
    });
    if (!res.ok) throw new Error();
    await loadChat();
  } catch (e) {
    alert('チャットの送信に失敗しました（サーバー未設定または通信エラー）');
  }
}

function renderStamps() {
  const bar = document.getElementById('chat-stamp-bar');
  const gal = document.getElementById('stamp-gallery');
  const list = Array.isArray(aiStamps) ? aiStamps : [];

  if (bar) {
    if (list.length === 0) {
      bar.innerHTML = '<div style="grid-column:1/-1;font-size:10px;color:#90a4ae;">「AI生成」タブでスタンプを作るとここから即送信できます</div>';
    } else {
      bar.innerHTML = list.map((st, idx) => `
        <div class="slot-box" onclick="sendChat(aiStamps[${idx}].img, aiStamps[${idx}].text)" style="padding:4px;">
          <img src="${st.img}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;">
          <div style="font-size:9px;font-weight:bold;color:#37474f;margin-top:2px;">${escapeHtml(st.text || 'スタンプ')}</div>
        </div>
      `).join('');
    }
  }
  if (gal) {
    gal.innerHTML = list.map(st => `
      <div class="slot-box" style="padding:4px;">
        <img src="${st.img}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;">
        <div style="font-size:9px;font-weight:bold;">${escapeHtml(st.text || '')}</div>
      </div>
    `).join('');
  }
}

async function loadRanking() {
  const box = document.getElementById('ranking-list');
  if (!box) return;
  box.innerHTML = '読み込み中...';
  try {
    const res = await fetch('/api/ranking');
    if (!res.ok) throw new Error();
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = 'ランキングデータがありません';
      return;
    }
    box.innerHTML = list.map((r, idx) => `
      <div style="display:flex;justify-content:space-between;padding:6px 4px;border-bottom:1px solid #eceff1;">
        <span><b>${idx + 1}位</b> ${escapeHtml(r.user_name || 'ハンター')}</span>
        <span style="color:#ff7043;font-weight:bold;">Stage${r.max_stage || 1}-${r.max_floor || 1}</span>
      </div>
    `).join('');
  } catch (e) {
    box.innerHTML = 'ランキングを取得できませんでした';
  }
}

function changePlayerName() {
  const inp = document.getElementById('player-name');
  if (!inp) return;
  playerName = inp.value.trim() || 'ハンター';
  if (document.getElementById('hud-name')) document.getElementById('hud-name').textContent = playerName;
  triggerAutoSave(true);
  showToast('プレイヤー名を変更しました');
}

function updateIconPreview(shouldSave = true) {
  const selChar = document.getElementById('icon-char-sel');
  const selBg = document.getElementById('icon-bg-sel');
  if (selChar && selChar.options.length <= 1 && typeof ALL_MONSTER_SPECIES !== 'undefined') {
    selChar.innerHTML = `<option value="デフォルト">デフォルト（スライム）</option>` +
      ALL_MONSTER_SPECIES.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    if (iconConfig.species) selChar.value = iconConfig.species;
  }
  if (selBg && Array.isArray(aiBackgrounds)) {
    const curVal = selBg.value;
    selBg.innerHTML = `<option value="-1">デフォルト背景</option>` +
      aiBackgrounds.map((b, i) => `<option value="${i}">AI背景 #${i + 1}</option>`).join('');
    selBg.value = curVal;
  }

  iconConfig.species = selChar ? selChar.value : (iconConfig.species || 'デフォルト');
  iconConfig.bgIdx = selBg ? Number(selBg.value) : -1;
  iconConfig.scale = Number(document.getElementById('icon-scale')?.value || 1.0);
  iconConfig.x = Number(document.getElementById('icon-x')?.value || 0);
  iconConfig.y = Number(document.getElementById('icon-y')?.value || 0);
  iconConfig.rotate = Number(document.getElementById('icon-rot')?.value || 0);

  const spName = iconConfig.species === 'デフォルト' ? 'スライム' : iconConfig.species;
  const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(spName) : 'ス';
  const charLayer = document.getElementById('icon-char-layer');
  const previewBox = document.getElementById('icon-preview-box');
  const miniHud = document.getElementById('hud-my-icon');

  if (charLayer) {
    charLayer.innerHTML = renderSprite(disp, 64, '10px');
    charLayer.style.transform = `translate(${iconConfig.x}px, ${iconConfig.y}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg)`;
  }
  const bgObj = (iconConfig.bgIdx >= 0 && Array.isArray(aiBackgrounds)) ? aiBackgrounds[iconConfig.bgIdx] : null;
  if (previewBox) {
    previewBox.style.backgroundImage = bgObj ? `url(${bgObj.img})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  }
  if (miniHud) {
    miniHud.innerHTML = renderSprite(disp, 22, '4px');
    if (bgObj) miniHud.style.backgroundImage = `url(${bgObj.img})`;
  }
  if (shouldSave && typeof triggerAutoSave === 'function') triggerAutoSave();
}

async function loadFromCloudById() {
  const inp = document.getElementById('import-id-input');
  const targetId = inp ? inp.value.trim() : '';
  if (!targetId) return alert('引き継ぎIDを入力してください');
  try {
    const res = await fetch(`/api/save?user_id=${encodeURIComponent(targetId)}`);
    const row = await res.json();
    if (!row || !row.save_json) return alert('指定されたIDのセーブデータが見つかりません');
    userId = targetId;
    localStorage.setItem('treasure_uid', userId);
    if (document.getElementById('my-user-id')) document.getElementById('my-user-id').textContent = userId;
    applySaveData(JSON.parse(row.save_json));
    alert('データを復元しました！');
  } catch (e) {
    alert('データの復元に失敗しました');
  }
}
