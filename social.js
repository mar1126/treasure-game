// チャット・スタンプリアクション・ランキング・アイコン設定・タブ切替 (social.js)
let chatPollTimer = null;
let lastChatId = 0;
let chatStampDrawerOpen = false;
let chatReactTargetId = null;
let chatReactTargetName = '';

function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabName === 'cafe') {
    if (typeof renderCafe === 'function') renderCafe();
  } else if (tabName === 'shop') {
    if (typeof renderShop === 'function') renderShop();
  } else if (tabName === 'ai') {
    if (typeof refreshAiSpeciesSelects === 'function') refreshAiSpeciesSelects();
    if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
    if (typeof renderBgGallery === 'function') renderBgGallery();
    if (typeof renderStampBuilderUI === 'function') renderStampBuilderUI();
    if (typeof renderStamps === 'function') renderStamps();
  } else if (tabName === 'chat') {
    renderChatStampBar();
    loadChat(false);
    if (!chatPollTimer) chatPollTimer = setInterval(() => loadChat(true), 5000);
  } else if (tabName === 'rank') {
    updateIconPreview(false);
    loadRanking();
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMiniIconHtml(cfg) {
  const c = cfg || { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };
  const spName = (!c.species || c.species === 'デフォルト') ? 'スライム' : c.species;
  const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(spName) : 'EMBLEM:water:ス';
  const bgObj = (typeof c.bgIdx === 'number' && c.bgIdx >= 0 && Array.isArray(aiBackgrounds)) ? aiBackgrounds[c.bgIdx] : null;
  const bgUrl = bgObj ? (typeof bgObj === 'string' ? bgObj : bgObj.img) : '';
  const bgStyle = bgUrl ? `background-image:url(${bgUrl});` : 'background:linear-gradient(135deg,#4fc3f7,#0288d1);';
  const tx = Math.round((c.x || 0) * 0.3);
  const ty = Math.round((c.y || 0) * 0.3);
  return `<div style="width:36px;height:36px;flex-shrink:0;border-radius:10px;border:1.5px solid #cbd5e1;${bgStyle}background-size:cover;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <div style="transform:translate(${tx}px,${ty}px) scale(${c.scale || 1}) rotate(${c.rotate || 0}deg);display:flex;align-items:center;justify-content:center;">${renderSprite(disp, 26, '6px')}</div>
  </div>`;
}

function toggleChatStampDrawer() {
  chatStampDrawerOpen = !chatStampDrawerOpen;
  const drawer = document.getElementById('chat-stamp-drawer');
  const btn = document.getElementById('chat-stamp-toggle-btn');
  if (drawer) drawer.style.display = chatStampDrawerOpen ? 'block' : 'none';
  if (btn) {
    btn.style.background = chatStampDrawerOpen ? '#fff3e0' : '#f8fafc';
    btn.style.borderColor = chatStampDrawerOpen ? '#ff7043' : '#cbd5e1';
    btn.style.color = chatStampDrawerOpen ? '#ff7043' : '#64748b';
  }
  if (chatStampDrawerOpen) renderChatStampBar();
}

function startChatReaction(msgId, senderName) {
  chatReactTargetId = msgId;
  chatReactTargetName = senderName || 'ハンター';
  const banner = document.getElementById('chat-react-banner');
  const nameEl = document.getElementById('chat-react-target-name');
  if (nameEl) nameEl.textContent = `${chatReactTargetName} にスタンプで反応`;
  if (banner) banner.style.display = 'flex';
  if (!chatStampDrawerOpen) toggleChatStampDrawer();
}

function cancelChatReaction() {
  chatReactTargetId = null;
  chatReactTargetName = '';
  const banner = document.getElementById('chat-react-banner');
  if (banner) banner.style.display = 'none';
}
async function sendChatReaction(msgId, stampImg) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'react',
        target_id: msgId,
        user_id: userId,
        stamp_img: stampImg
      })
    });
    if (!res.ok) throw new Error();
    cancelChatReaction();
    loadChat(false);
  } catch (e) {
    showToast('リアクションの送信に失敗しました');
  }
}

function onSelectChatStamp(idx) {
  const st = Array.isArray(aiStamps) ? aiStamps[idx] : null;
  if (!st) return;
  const imgUrl = typeof st === 'string' ? st : (st.img || '');
  if (!imgUrl) return;
  if (chatReactTargetId) {
    sendChatReaction(chatReactTargetId, imgUrl);
  } else {
    sendChat(imgUrl);
  }
}

function renderReactionBadges(msgId, rawReactions) {
  let list = [];
  try {
    list = Array.isArray(rawReactions) ? rawReactions : (rawReactions ? JSON.parse(rawReactions) : []);
  } catch (e) { list = []; }
  if (!Array.isArray(list) || list.length === 0) return '';

  const grouped = [];
  list.forEach(r => {
    if (!r || !r.img) return;
    const found = grouped.find(g => g.img === r.img);
    if (found) found.count += 1;
    else grouped.push({ img: r.img, count: 1 });
  });

  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">` +
    grouped.map(g => `
      <button onclick="event.stopPropagation();sendChatReaction(${msgId}, '${g.img.replace(/'/g, "\\'")}')" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:10px;font-weight:bold;color:#475569;">
        <img src="${g.img}" style="width:16px;height:16px;object-fit:contain;">
        <span>${g.count}</span>
      </button>
    `).join('') +
  `</div>`;
}

function onChatScroll() {
  const box = document.getElementById('chat-messages');
  const btn = document.getElementById('chat-latest-btn');
  if (!box || !btn) return;
  const distFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
  btn.style.display = distFromBottom > 70 ? 'block' : 'none';
}

function scrollChatToBottom() {
  const box = document.getElementById('chat-messages');
  const btn = document.getElementById('chat-latest-btn');
  if (box) box.scrollTop = box.scrollHeight;
  if (btn) btn.style.display = 'none';
}

async function loadChat(silent = false) {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  const wasNearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;
  try {
    const res = await fetch('/api/chat');
    if (!res.ok) throw new Error();
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:24px;font-size:12px;">まだメッセージはありません</div>';
      return;
    }
    const maxId = list[list.length - 1].id || 0;
    const hasNew = maxId > lastChatId;
    lastChatId = maxId;

    box.innerHTML = list.map(m => {
      let cfg = null;
      try { cfg = typeof m.icon_json === 'string' ? JSON.parse(m.icon_json) : m.icon_json; } catch (e) {}
      const d = m.created_at ? new Date(m.created_at) : null;
      const timeStr = d && !isNaN(d) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
      const safeName = escapeHtml(m.user_name || 'ハンター');
      const bodyHtml = m.stamp_img
        ? `<div style="margin-top:3px;"><img src="${m.stamp_img}" style="width:88px;height:88px;object-fit:contain;border-radius:8px;"></div>`
        : `<div style="font-size:13px;color:#1e293b;line-height:1.45;word-break:break-all;">${escapeHtml(m.message)}</div>`;

      return `
        <div onclick="startChatReaction(${m.id}, '${safeName.replace(/'/g, "\\'")}')" style="display:flex;align-items:flex-start;gap:9px;padding:9px 4px;border-bottom:1px solid #f1f5f9;cursor:pointer;">
          ${renderMiniIconHtml(cfg)}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;">
              <span style="font-size:12px;font-weight:bold;color:#1e293b;">${safeName}</span>
              <span style="font-size:10px;color:#94a3b8;">${timeStr}</span>
            </div>
            ${bodyHtml}
            ${renderReactionBadges(m.id, m.reactions_json)}
          </div>
        </div>
      `;
    }).join('');

    if (!silent || wasNearBottom) {
      scrollChatToBottom();
    } else if (hasNew) {
      const btn = document.getElementById('chat-latest-btn');
      if (btn) btn.style.display = 'block';
    }
  } catch (e) {
    if (!silent) box.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;font-size:12px;">チャットを読み込めませんでした</div>';
  }
}

async function sendChat(stampImg = null) {
  const inp = document.getElementById('chat-input');
  const text = stampImg ? '' : (inp ? inp.value.trim() : '');
  if (!stampImg && !text) return;
  if (inp && !stampImg) inp.value = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_name: playerName,
        icon_json: JSON.stringify(iconConfig),
        message: text,
        stamp_img: stampImg || ''
      })
    });
    if (!res.ok) throw new Error();
    loadChat(false);
  } catch (e) {
    alert('チャット送信に失敗しました');
  }
}
function renderChatStampBar() {
  const bar = document.getElementById('chat-stamp-bar');
  if (!bar) return;
  const list = Array.isArray(aiStamps) ? aiStamps : [];
  if (list.length === 0) {
    bar.innerHTML = '<div style="grid-column:1/-1;font-size:11px;color:#94a3b8;text-align:center;padding:12px;">「アトリエ」タブでスタンプを作るとここに横5列で並びます</div>';
  } else {
    bar.innerHTML = list.map((st, idx) => {
      const imgUrl = typeof st === 'string' ? st : (st.img || '');
      return `
        <div onclick="onSelectChatStamp(${idx})" style="aspect-ratio:1/1;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;display:flex;align-items:center;justify-content:center;padding:2px;cursor:pointer;overflow:hidden;">
          <img src="${imgUrl}" style="width:100%;height:100%;object-fit:contain;">
        </div>
      `;
    }).join('');
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
    if (iconConfig && iconConfig.species) selChar.value = iconConfig.species;
  }
  if (selBg && Array.isArray(aiBackgrounds)) {
    const curVal = selBg.value;
    selBg.innerHTML = `<option value="-1">デフォルト背景</option>` +
      aiBackgrounds.map((b, i) => `<option value="${i}">AI背景 #${i + 1}</option>`).join('');
    if (iconConfig && typeof iconConfig.bgIdx === 'number' && iconConfig.bgIdx >= -1) {
      selBg.value = String(iconConfig.bgIdx);
    } else {
      selBg.value = curVal;
    }
  }

  if (!iconConfig) iconConfig = { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 };
  iconConfig.species = selChar ? selChar.value : (iconConfig.species || 'デフォルト');
  iconConfig.bgIdx = selBg ? Number(selBg.value) : -1;
  iconConfig.scale = Number(document.getElementById('icon-scale')?.value || 1.0);
  iconConfig.x = Number(document.getElementById('icon-x')?.value || 0);
  iconConfig.y = Number(document.getElementById('icon-y')?.value || 0);
  iconConfig.rotate = Number(document.getElementById('icon-rot')?.value || 0);

  const spName = iconConfig.species === 'デフォルト' ? 'スライム' : iconConfig.species;
  const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(spName) : 'EMBLEM:water:ス';
  const charLayer = document.getElementById('icon-char-layer');
  const previewBox = document.getElementById('icon-preview-box');
  const miniHud = document.getElementById('hud-my-icon');

  if (charLayer) {
    charLayer.innerHTML = renderSprite(disp, 64, '10px');
    charLayer.style.transform = `translate(${iconConfig.x}px, ${iconConfig.y}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg)`;
  }
  const bgObj = (iconConfig.bgIdx >= 0 && Array.isArray(aiBackgrounds)) ? aiBackgrounds[iconConfig.bgIdx] : null;
  const bgUrl = bgObj ? (typeof bgObj === 'string' ? bgObj : bgObj.img) : '';
  if (previewBox) {
    previewBox.style.backgroundImage = bgUrl ? `url(${bgUrl})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  }
  if (miniHud) {
    miniHud.innerHTML = `
      <div style="transform:translate(${Math.round(iconConfig.x * 0.25)}px,${Math.round(iconConfig.y * 0.25)}px) scale(${iconConfig.scale}) rotate(${iconConfig.rotate}deg);display:flex;align-items:center;justify-content:center;">
        ${renderSprite(disp, 22, '4px')}
      </div>
    `;
    miniHud.style.backgroundImage = bgUrl ? `url(${bgUrl})` : 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  }
  if (shouldSave && typeof triggerAutoSave === 'function') triggerAutoSave();
}
