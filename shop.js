// ショップ・アトリエ管理（元絵解析スタンプ＋管理者公式デフォルト設定対応）(shop.js)
const ADMIN_USER_IDS = ['H-ORM8PM4M'];
function isAdminUser() {
  return ADMIN_USER_IDS.includes(String(userId || ''));
}

let shopSubTab = 'gem';
let stampBuilderState = {
  species: '',
  skinIdx: -1,
  previewImg: ''
};

function switchShopSub(sub, btn) {
  shopSubTab = sub;
  document.querySelectorAll('.shop-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (sub === 'tank' && typeof openTankShop === 'function') {
    openTankShop(btn);
  } else {
    renderShop();
  }
}

function renderShop() {
  const box = document.getElementById('shop-list');
  if (!box) return;
  if (shopSubTab === 'tank' && typeof renderTankCardsDirect === 'function') {
    box.innerHTML = renderTankCardsDirect(Number(landTankTier) || 0);
    return;
  }

  const goldAmt = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 2000;
  const items = [
    { id: 'stamina', title: 'スタミナ全回復（30回復）', desc: '冒険に必要なスタミナを即座にMAX（30）まで回復します。', cost: 100, done: false },
    { id: 'gold', title: `ゴールド交換（+${goldAmt.toLocaleString()} G）`, desc: '現在の進行度に応じたゴールドを獲得します。', cost: 100, done: false },
    { id: 'auto', title: '階層間オート周回解放', desc: '階層クリア後に自動で次の階層へ出撃し続ける周回機能を解放します。', cost: 500, done: Boolean(autoUnlocked) },
    { id: 'speed2x', title: '戦闘速度 2倍速解放', desc: 'バトルの進行速度を2倍に切り替えられるようになります。', cost: 500, done: Boolean(speed2xUnlocked) },
    { id: 'staminaFast', title: 'スタミナ回復速度 2倍（30秒で1回復）', desc: 'スタミナの自然回復間隔が60秒から30秒に短縮されます。', cost: 800, done: Boolean(staminaFastUnlocked) }
  ];

  box.innerHTML = items.map(it => `
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">${it.title}</div>
        <div class="shop-item-desc">${it.desc}</div>
      </div>
      <div class="shop-item-action">
        ${it.done
          ? `<button class="shop-buy-btn done" disabled>解放済</button>`
          : `<button class="shop-buy-btn" onclick="buyShopItem('${it.id}', ${it.cost})">${it.cost} GEM</button>`
        }
      </div>
    </div>
  `).join('');
}

function buyShopItem(id, cost) {
  if (gem < cost) return alert(`ジェムが足りません（${cost} GEM 必要）`);
  if (id === 'stamina') {
    if (stamina >= MAX_STAMINA) return alert('スタミナはすでにMAXです');
    gem -= cost; stamina = MAX_STAMINA; staminaUpdatedAt = Date.now();
    showToast('スタミナが全回復しました！');
  } else if (id === 'gold') {
    const amt = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 2000;
    gem -= cost; gold += amt;
    showToast(`${amt.toLocaleString()} G を獲得しました！`);
  } else if (id === 'auto') {
    if (autoUnlocked) return;
    gem -= cost; autoUnlocked = true; autoActive = true;
    showToast('階層間オート周回を解放しました！');
  } else if (id === 'speed2x') {
    if (speed2xUnlocked) return;
    gem -= cost; speed2xUnlocked = true; speed2xActive = true;
    showToast('戦闘速度 2倍速を解放しました！');
  } else if (id === 'staminaFast') {
    if (staminaFastUnlocked) return;
    gem -= cost; staminaFastUnlocked = true;
    showToast('スタミナ回復速度が2倍になりました！');
  }
  renderShop(); updateUI(); triggerAutoSave(true);
}

function switchAiSub(sub, btn) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.ai-sub-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('ai-sub-' + sub);
  if (target) target.classList.add('active');
  refreshAiSpeciesSelects();
  renderSpeciesGallery();
  renderStampBuilderUI();
  if (typeof renderStamps === 'function') renderStamps();
}

function refreshAiSpeciesSelects() {
  const allNames = (typeof ALL_MONSTER_SPECIES !== 'undefined')
    ? ALL_MONSTER_SPECIES.map(s => s.name)
    : Array.from(new Set((captured || []).map(m => m.name)));
  if (allNames.length === 0) allNames.push('スライム');

  const monSel = document.getElementById('ai-species-sel');
  if (monSel) {
    const prev = monSel.value;
    monSel.innerHTML = allNames.map(n => `<option value="${n}">${n}</option>`).join('');
    if (allNames.includes(prev)) monSel.value = prev;
  }
}

function updateCharCount(kind) {
  const inp = document.getElementById(`ai-${kind}-prompt`);
  const cnt = document.getElementById(`${kind}-count`);
  if (inp && cnt) cnt.textContent = inp.value.length;
}

function updateStampTextCount() {
  const inp = document.getElementById('stamp-text');
  const cnt = document.getElementById('stamp-text-count');
  if (inp && cnt) cnt.textContent = inp.value.length;
}

function toggleExtend(kind) {
  const chk = document.getElementById(`${kind}-ext`);
  const inp = document.getElementById(`ai-${kind}-prompt`);
  const maxEl = document.getElementById(`${kind}-max`);
  const costEl = document.getElementById(`${kind}-cost`);
  const isExt = chk ? chk.checked : false;
  if (inp) {
    inp.maxLength = isExt ? 500 : 200;
    if (!isExt && inp.value.length > 200) inp.value = inp.value.slice(0, 200);
  }
  if (maxEl) maxEl.textContent = isExt ? '500' : '200';
  if (costEl) costEl.textContent = isExt ? '250' : '200';
  updateCharCount(kind);
}
function renderSpeciesGallery() {
  refreshAiSpeciesSelects();
  const gal = document.getElementById('species-skin-gallery');
  const sel = document.getElementById('ai-species-sel');
  if (!gal || !sel) return;
  const spName = sel.value || 'スライム';
  const spData = (speciesSkins && speciesSkins[spName]) ? speciesSkins[spName] : { list: [], activeIdx: -1 };
  const list = Array.isArray(spData.list) ? spData.list : [];

  if (list.length === 0) {
    gal.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:#78909c;text-align:center;padding:8px;">「${spName}」のスキンはまだありません</div>`;
    return;
  }

  const adminMode = isAdminUser();
  gal.innerHTML = list.map((imgData, idx) => {
    const isAct = spData.activeIdx === idx;
    const adminBtn = adminMode
      ? `<button onclick="event.stopPropagation();promoteSkinToOfficialDefault('${spName}', ${idx})" style="margin-top:4px;width:100%;background:#0288d1;color:#fff;border:none;border-radius:5px;padding:3px 2px;font-size:9px;font-weight:bold;cursor:pointer;">公式デフォルト化</button>`
      : '';
    return `
      <div class="slot-box" onclick="equipSpeciesSkinFromGallery('${spName}', ${idx})" style="${isAct ? 'border:2px solid #ff7043;background:#fff8f6;' : ''}">
        <img src="${imgData}" style="width:68px;height:68px;object-fit:contain;border-radius:8px;">
        <div style="font-size:10px;font-weight:bold;color:${isAct ? '#ff7043' : '#546e7a'};margin-top:3px;">${isAct ? '★ 適用中' : 'タップで適用'}</div>
        ${adminBtn}
      </div>
    `;
  }).join('');
}

async function promoteSkinToOfficialDefault(spName, idx) {
  if (!isAdminUser()) return;
  const spData = speciesSkins[spName];
  if (!spData || !Array.isArray(spData.list) || !spData.list[idx]) return;
  if (!confirm(`【管理者機能】\n「${spName}」のこのスキンを全プレイヤー共通の「公式デフォルト画像」に設定しますか？`)) return;
  try {
    await saveOfficialAsset(`mon:${spName}`, spData.list[idx]);
    if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderCaptured === 'function') renderCaptured();
    updateUI();
    showToast(`【管理者】「${spName}」の公式デフォルトを更新しました！`);
  } catch (e) {
    alert('公式デフォルト更新エラー: ' + e.message);
  }
}

function equipSpeciesSkinFromGallery(spName, idx) {
  if (!speciesSkins[spName]) return;
  speciesSkins[spName].activeIdx = idx;
  if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCafe === 'function') renderCafe();
  renderSpeciesGallery();
  updateUI();
  triggerAutoSave(true);
  showToast(`${spName}のスキンを適用しました！`);
}

function getStampSelectedSourceVisual() {
  const sp = stampBuilderState.species;
  if (!sp) return '';
  const spData = (speciesSkins && speciesSkins[sp]) ? speciesSkins[sp] : null;
  if (stampBuilderState.skinIdx >= 0 && spData && Array.isArray(spData.list) && spData.list[stampBuilderState.skinIdx]) {
    return spData.list[stampBuilderState.skinIdx];
  }
  return typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(sp) : `EMBLEM:none:${sp.slice(0, 1)}`;
}

function renderStampBuilderUI() {
  const emptyArea = document.getElementById('stamp-select-empty');
  const activeArea = document.getElementById('stamp-select-active');
  const srcBox = document.getElementById('stamp-source-preview');
  const resBox = document.getElementById('stamp-result-preview');
  if (!emptyArea || !activeArea) return;

  if (!stampBuilderState.species) {
    emptyArea.style.display = 'flex';
    activeArea.style.display = 'none';
    return;
  }

  emptyArea.style.display = 'none';
  activeArea.style.display = 'block';
  const srcVisual = getStampSelectedSourceVisual();
  if (srcBox) srcBox.innerHTML = renderSprite(srcVisual, 92, '18px');
  if (resBox) {
    resBox.innerHTML = stampBuilderState.previewImg
      ? `<img src="${stampBuilderState.previewImg}" style="width:100%;height:100%;object-fit:contain;">`
      : '';
  }
}

function openStampMonsterModal() {
  const modal = document.getElementById('stamp-picker-modal');
  const titleEl = document.getElementById('stamp-modal-title');
  const bodyEl = document.getElementById('stamp-modal-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = 'スタンプにしたいモンスターを選択';
  const list = (typeof ALL_MONSTER_SPECIES !== 'undefined') ? ALL_MONSTER_SPECIES : [{ name: 'スライム', elem: 'water' }];

  bodyEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-height:340px;overflow-y:auto;padding:2px;">
      ${list.map(sp => {
        const vis = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(sp.name) : `EMBLEM:${sp.elem}:${sp.name.slice(0, 1)}`;
        return `
          <div onclick="openStampSkinStep('${sp.name}')" style="aspect-ratio:1/1;border:1.5px solid #cbd5e1;border-radius:10px;background:#ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:3px;">
            ${renderSprite(vis, 46, '10px')}
          </div>
        `;
      }).join('')}
    </div>
  `;
  modal.style.display = 'flex';
}

function openStampSkinStep(spName) {
  const titleEl = document.getElementById('stamp-modal-title');
  const bodyEl = document.getElementById('stamp-modal-body');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = `${spName}のスタンプの元にする絵`;
  const defVis = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(spName) : `EMBLEM:none:${spName.slice(0, 1)}`;
  const spData = (speciesSkins && speciesSkins[spName]) ? speciesSkins[spName] : { list: [] };
  const skins = Array.isArray(spData.list) ? spData.list : [];

  let cardsHtml = `
    <div onclick="confirmStampSource('${spName}', -1)" style="width:74px;height:74px;border:2px solid #ff7043;border-radius:12px;background:#ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:4px;">
      ${renderSprite(defVis, 62, '14px')}
    </div>
  `;
  cardsHtml += skins.map((imgData, idx) => `
    <div onclick="confirmStampSource('${spName}', ${idx})" style="width:74px;height:74px;border:1.5px solid #cbd5e1;border-radius:12px;background:#ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:4px;position:relative;">
      <span style="position:absolute;top:3px;left:4px;font-size:10px;color:#ffb300;">★</span>
      <img src="${imgData}" style="width:62px;height:62px;object-fit:contain;">
    </div>
  `).join('');

  bodyEl.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;min-height:140px;align-content:flex-start;">
      ${cardsHtml}
    </div>
  `;
}

function confirmStampSource(spName, skinIdx) {
  stampBuilderState.species = spName;
  stampBuilderState.skinIdx = skinIdx;
  stampBuilderState.previewImg = '';
  closeStampMonsterModal();
  renderStampBuilderUI();
}

function closeStampMonsterModal() {
  const modal = document.getElementById('stamp-picker-modal');
  if (modal) modal.style.display = 'none';
}
function removeWhiteBackground(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const d = imgData.data;
        const visited = new Uint8Array(size * size);
        const queue = [];
        const isNearWhite = (idx) => d[idx * 4] > 232 && d[idx * 4 + 1] > 232 && d[idx * 4 + 2] > 232;

        for (let x = 0; x < size; x++) queue.push(x, (size - 1) * size + x);
        for (let y = 0; y < size; y++) queue.push(y * size, y * size + (size - 1));

        while (queue.length > 0) {
          const p = queue.pop();
          if (visited[p]) continue;
          visited[p] = 1;
          if (!isNearWhite(p)) continue;
          d[p * 4 + 3] = 0;
          const x = p % size, y = Math.floor(p / size);
          if (x > 0) queue.push(p - 1);
          if (x < size - 1) queue.push(p + 1);
          if (y > 0) queue.push(p - size);
          if (y < size - 1) queue.push(p + size);
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function composeStampWithCaption(cleanImgUrl, captionText) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 8, 4, size - 16, size - 28);

      const text = String(captionText || '').trim();
      if (text) {
        ctx.font = '900 32px "Zen Maru Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(text, size / 2, size - 8, size - 20);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3e2723';
        ctx.strokeText(text, size / 2, size - 8, size - 20);
        ctx.fillStyle = '#ff7043';
        ctx.fillText(text, size / 2, size - 8, size - 20);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(cleanImgUrl);
    img.src = cleanImgUrl;
  });
}

async function saveOfficialAsset(assetKey, imageData) {
  const res = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_key: assetKey, image_data: imageData })
  });
  if (!res.ok) throw new Error('公式アセットの保存に失敗しました');
  if (typeof officialAssets === 'object') officialAssets[assetKey] = imageData;
}

async function generateAI(type) {
  const statusEl = document.getElementById('ai-status');
  const kindKey = type === 'monster' ? 'mon' : type;
  const isExt = document.getElementById(`${kindKey}-ext`)?.checked || false;
  let cost = isExt ? 250 : 200;

  let rawInput = '';
  let species = 'スライム';
  let stampText = '';
  let sourceImg = '';

  if (type === 'monster') {
    species = document.getElementById('ai-species-sel')?.value || 'スライム';
    rawInput = document.getElementById('ai-mon-prompt')?.value.trim() || '';
    if (!rawInput) return alert('どんな姿にするかプロンプトを入力してください');
  } else if (type === 'bg') {
    rawInput = document.getElementById('ai-bg-prompt')?.value.trim() || '';
    if (!rawInput) return alert('どんな背景にするかプロンプトを入力してください');
  } else if (type === 'stamp') {
    if (!stampBuilderState.species) return alert('先に「スタンプにしたいモンスター」を選択してください');
    species = stampBuilderState.species;
    stampText = document.getElementById('stamp-text')?.value.trim() || '';
    rawInput = document.getElementById('ai-stamp-prompt')?.value.trim() || '';
    const vis = getStampSelectedSourceVisual();
    if (String(vis).startsWith('data:image')) sourceImg = vis;
  }

  let officialMonsterCmd = false;
  let officialStageNum = 0;
  let cleanPrompt = rawInput;

  if (type === 'monster' && isAdminUser() && /^(!公式|！公式|@default)\s*/i.test(rawInput)) {
    officialMonsterCmd = true;
    cleanPrompt = rawInput.replace(/^(!公式|！公式|@default)\s*/i, '').trim();
    cost = 0;
  } else if (type === 'bg' && isAdminUser()) {
    const m = rawInput.match(/^(?:!背景|！背景|@stage)(\d{1,2})\s*(.*)$/i);
    if (m) {
      officialStageNum = Math.min(10, Math.max(1, Number(m.slice(1, 2).pop())));
      cleanPrompt = (m.slice(2, 3).pop() || '').trim();
      cost = 0;
    }
  }

  if (cost > 0 && gem < cost) return alert(`ジェムが足りません（${cost} GEM 必要）`);

  if (statusEl) statusEl.textContent = '生成中（約5〜10秒）...';
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, species, prompt: cleanPrompt, stamp_text: stampText, source_img: sourceImg })
    });
    const data = await res.json();
    if (!res.ok || !data.image) throw new Error(data.error || '生成に失敗しました');

    if (cost > 0) gem -= cost;

    if (officialMonsterCmd) {
      const cleanImg = await removeWhiteBackground(data.image);
      await saveOfficialAsset(`mon:${species}`, cleanImg);
      if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof renderParty === 'function') renderParty();
      if (typeof renderCaptured === 'function') renderCaptured();
      updateUI();
      if (statusEl) statusEl.textContent = '公式登録完了！';
      showToast(`【管理者】「${species}」の公式デフォルト画像を更新しました！`);
      return;
    }

    if (officialStageNum > 0) {
      await saveOfficialAsset(`stage:${officialStageNum}`, data.image);
      updateUI();
      if (statusEl) statusEl.textContent = '公式背景登録完了！';
      showToast(`【管理者】ステージ${officialStageNum}の公式背景を更新しました！`);
      return;
    }

    if (type === 'monster') {
      const cleanImg = await removeWhiteBackground(data.image);
      if (!speciesSkins[species]) speciesSkins[species] = { list: [], activeIdx: -1 };
      speciesSkins[species].list.push(cleanImg);
      speciesSkins[species].activeIdx = speciesSkins[species].list.length - 1;
      if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof renderParty === 'function') renderParty();
      if (typeof renderCaptured === 'function') renderCaptured();
      renderSpeciesGallery();
      showToast(`${species}の新しいスキンを生成＆適用しました！`);
    } else if (type === 'bg') {
      if (!Array.isArray(aiBackgrounds)) aiBackgrounds = [];
      aiBackgrounds.push({ img: data.image, prompt: cleanPrompt });
      if (typeof updateIconPreview === 'function') updateIconPreview(false);
      showToast('新しいアイコン背景を生成しました！');
    } else if (type === 'stamp') {
      const cleanImg = await removeWhiteBackground(data.image);
      const finalStamp = await composeStampWithCaption(cleanImg, stampText);
      stampBuilderState.previewImg = finalStamp;
      renderStampBuilderUI();
      if (!Array.isArray(aiStamps)) aiStamps = [];
      aiStamps.push({ img: finalStamp, text: stampText || species, species });
      if (typeof renderStamps === 'function') renderStamps();
      showToast('新しいチャットスタンプを生成しました！');
    }

    updateUI();
    triggerAutoSave(true);
    if (statusEl) statusEl.textContent = '生成完了！';
  } catch (e) {
    if (statusEl) statusEl.textContent = 'エラー発生';
    alert('生成エラー: ' + e.message);
  }
}
