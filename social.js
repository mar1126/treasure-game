// チャット・スタンプリアクション・ランキング・プロフィール編集 (social.js)
let chatStampOpen = false;
let chatReactTarget = null; // { id, name }

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

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
  if (diffSec < 60) return 'たった今';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${Math.floor(diffHour / 24)}日前`;
}

function getMyChatIconPayload() {
  const spName = (!iconConfig || iconConfig.species === 'デフォルト') ? 'スライム' : iconConfig.species;
  const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(spName) : 'EMBLEM:water:ス';
  const bgObj = (iconConfig && iconConfig.bgIdx >= 0 && Array.isArray(aiBackgrounds)) ? aiBackgrounds[iconConfig.bgIdx] : null;
  return JSON.stringify({
    disp,
    bg: bgObj ? bgObj.img : '',
    scale: iconConfig?.scale || 1.0,
    x: iconConfig?.x || 0,
    y: iconConfig?.y || 0,
    rotate: iconConfig?.rotate || 0
  });
}

function renderChatUserAvatar(iconJsonStr) {
  let info = null;
  try { if (iconJsonStr) info = JSON.parse(iconJsonStr); } catch (e) {}
  const disp = info?.disp || 'EMBLEM:water:ス';
  const bgStyle = info?.bg
    ? `background-image:url(${info.bg});background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,#4fc3f7,#0288d1);`;
  const sc = info?.scale || 1.0;
  const tx = Math.round((info?.x || 0) * 0.35);
  const ty = Math.round((info?.y || 0) * 0.35);
  const rot = info?.rotate || 0;
  return `
    <div style="width:40px;height:40px;flex-shrink:0;border-radius:10px;${bgStyle}border:1.5px solid #cfd8dc;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="transform:translate(${tx}px,${ty}px) scale(${sc}) rotate(${rot}deg);display:flex;align-items:center;justify-content:center;">
        ${renderSprite(disp, 32, '6px')}
      </div>
    </div>
  `;
}

function toggleChatStampDrawer() {
  chatStampOpen = !chatStampOpen;
  if (!chatStampOpen) chatReactTarget = null;
  updateChatTrayUI();
}

function startChatReaction(msgId, userName) {
  chatReactTarget = { id: msgId, name: userName || 'ハンター' };
  chatStampOpen = true;
  updateChatTrayUI();
}

function cancelChatReaction() {
  chatReactTarget = null;
  updateChatTrayUI();
}

function updateChatTrayUI() {
  const banner = document.getElementById('chat-react-banner');
  const bannerText = document.getElementById('chat-react-target-name');
  const tray = document.getElementById('chat-stamp-drawer');
  const toggleBtn = document.getElementById('chat-stamp-toggle-btn');

  if (banner) {
    banner.style.display = chatReactTarget ? 'flex' : 'none';
    if (bannerText && chatReactTarget) {
      bannerText.textContent = `${chatReactTarget.name} にスタンプで反応`;
    }
  }
  if (tray) {
    tray.style.display = chatStampOpen ? 'block' : 'none';
  }
  if (toggleBtn) {
    toggleBtn.style.background = chatStampOpen ? '#fff3e0' : '#f8fafc';
    toggleBtn.style.borderColor = chatStampOpen ? '#ff7043' : '#cbd5e1';
    toggleBtn.style.color = chatStampOpen ? '#ff7043' : '#64748b';
  }
}

function scrollChatToBottom() {
  const box = document.getElementById('chat-messages');
  const btn = document.getElementById('chat-latest-btn');
  if (box) box.scrollTop = box.scrollHeight;
  if (btn) btn.style.display = 'none';
}

function onChatScroll() {
  const box = document.getElementById('chat-messages');
  const btn = document.getElementById('chat-latest-btn');
  if (!box || !btn) return;
  const distFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
  btn.style.display = distFromBottom > 60 ? 'inline-block' : 'none';
}
async function loadChat(keepScroll = false) {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  if (!keepScroll && box.innerHTML.trim() === '') {
    box.innerHTML = '<div style="color:#78909c;text-align:center;padding:16px;">読み込み中...</div>';
  }
  try {
    const res = await fetch('/api/chat');
    if (!res.ok) throw new Error();
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = '<div style="color:#78909c;text-align:center;padding:16px;">まだメッセージがありません。最初の挨拶を送ってみよう！</div>';
      return;
    }

    const wasNearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;

    box.innerHTML = list.map(row => {
      const name = escapeHtml(row.user_name || 'ハンター');
      const relTime = formatRelativeTime(row.created_at);
      const avatarHtml = renderChatUserAvatar(row.user_icon);

      let contentHtml = '';
      if (row.stamp_img && row.stamp_img.startsWith('data:image')) {
        contentHtml = `<div style="margin-top:4px;"><img src="${row.stamp_img}" style="width:96px;height:96px;border-radius:10px;object-fit:contain;"></div>`;
      } else {
        contentHtml = `<div style="color:#1e293b;font-size:13px;line-height:1.45;margin-top:3px;word-break:break-all;">${escapeHtml(row.message)}</div>`;
      }

      let reactList = [];
      try { reactList = JSON.parse(row.reactions || '[]'); } catch (e) { reactList = []; }
      let reactionsHtml = '';
      if (Array.isArray(reactList) && reactList.length > 0) {
        reactionsHtml = `
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
            ${reactList.map(r => `<img src="${r.img}" style="width:36px;height:36px;border-radius:7px;object-fit:contain;background:#f8fafc;border:1px solid #e2e8f0;padding:1px;">`).join('')}
          </div>
        `;
      }

      const safeNameArg = String(row.user_name || 'ハンター').replace(/'/g, "\\'");

      return `
        <div onclick="startChatReaction(${row.id}, '${safeNameArg}')" style="display:flex;align-items:flex-start;gap:10px;padding:10px 6px;border-bottom:1px solid #e2e8f0;cursor:pointer;">
          ${avatarHtml}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-size:12px;font-weight:bold;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
              <span style="font-size:10px;color:#94a3b8;flex-shrink:0;">${relTime}</span>
            </div>
            ${contentHtml}
            ${reactionsHtml}
          </div>
        </div>
      `;
    }).join('');

    if (!keepScroll || wasNearBottom) {
      scrollChatToBottom();
    } else {
      onChatScroll();
    }
  } catch (e) {
    box.innerHTML = '<div style="color:#e53935;font-size:11px;padding:12px;">チャット通信エラー：設定を確認してください</div>';
  }
}

async function onSelectChatStamp(idx) {
  const list = Array.isArray(aiStamps) ? aiStamps : [];
  const st = list.slice(idx, idx + 1).pop();
  if (!st || !st.img) return;

  if (chatReactTarget && chatReactTarget.id) {
    const targetId = chatReactTarget.id;
    chatReactTarget = null;
    chatStampOpen = false;
    updateChatTrayUI();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          message_id: targetId,
          user_id: userId,
          stamp_img: st.img
        })
      });
      if (res.ok) await loadChat(true);
    } catch (e) {}
    return;
  }

  chatStampOpen = false;
  updateChatTrayUI();
  await sendChat(st.img, st.text || 'スタンプ');
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
        user_icon: getMyChatIconPayload(),
        message: text,
        stamp_img: stampImg || ''
      })
    });
    if (!res.ok) throw new Error();
    await loadChat(false);
  } catch (e) {
    alert('チャットの送信に失敗しました');
  }
}

function renderStamps() {
  const bar = document.getElementById('chat-stamp-bar');
  const gal = document.getElementById('stamp-gallery');
  const list = Array.isArray(aiStamps) ? aiStamps : [];

  if (bar) {
    if (list.length === 0) {
      bar.innerHTML = '<div style="grid-column:1/-1;font-size:11px;color:#94a3b8;text-align:center;padding:12px;">「AI生成」タブでスタンプを作るとここに横5列で並びます</div>';
    } else {
      bar.innerHTML = list.map((st, idx) => `
        <div onclick="onSelectChatStamp(${idx})" style="aspect-ratio:1/1;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;display:flex;align-items:center;justify-content:center;padding:2px;cursor:pointer;overflow:hidden;">
          <img src="${st.img}" style="width:100%;height:100%;object-fit:contain;">
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
  const val = inp.value.trim();
  if (val === 'testgem') {
    inp.value = playerName || 'ハンター';
    gem += 10000;
    updateUI();
    triggerAutoSave(true);
    showToast('テスト用 +10,000 GEM を追加しました！');
    return;
  }
  playerName = val || 'ハンター';
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
