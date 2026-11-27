// アトリエ管理（AI生成・拡大プレビュー・デフォルト戻し・分解・保護ロック）(atelier.js)
const ADMIN_USER_IDS = ['H-ORM8PM4M'];
function isAdminUser() {
  return ADMIN_USER_IDS.includes(String(userId || ''));
}

let stampBuilderState = {
  species: '',
  skinIdx: -1,
  previewImg: ''
};

function switchAiSub(sub, btn) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.ai-sub-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('ai-sub-' + sub);
  if (target) target.classList.add('active');
  refreshAiSpeciesSelects();
  renderSpeciesGallery();
  renderBgGallery();
  renderStampBuilderUI();
  renderStamps();
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

function getAssetLockKey(kind, idPart, idx) {
  return `${kind}:${idPart}:${idx}`;
}

function isAssetLocked(kind, idPart, idx) {
  try {
    const raw = localStorage.getItem('ff_asset_locks');
    const map = raw ? JSON.parse(raw) : {};
    return Boolean(map[getAssetLockKey(kind, idPart, idx)]);
  } catch (e) {
    return false;
  }
}

function toggleAssetLock(kind, idPart, idx) {
  try {
    const raw = localStorage.getItem('ff_asset_locks');
    const map = raw ? JSON.parse(raw) : {};
    const k = getAssetLockKey(kind, idPart, idx);
    if (map[k]) {
      delete map[k];
      showToast('ロックを解除しました 🔓');
    } else {
      map[k] = true;
      showToast('保護ロックをかけました 🔒');
    }
    localStorage.setItem('ff_asset_locks', JSON.stringify(map));
  } catch (e) {}

  if (kind === 'skin') renderSpeciesGallery();
  else if (kind === 'bg') renderBgGallery();
  else if (kind === 'stamp') renderStamps();
}

function shiftAssetLocksAfterRemove(kind, idPart, removedIdx) {
  try {
    const raw = localStorage.getItem('ff_asset_locks');
    const map = raw ? JSON.parse(raw) : {};
    const prefix = `${kind}:${idPart}:`;
    const nextMap = {};
    Object.keys(map).forEach(k => {
      if (!k.startsWith(prefix)) {
        nextMap[k] = map[k];
        return;
      }
      const n = Number(k.slice(prefix.length));
      if (n < removedIdx) nextMap[k] = map[k];
      else if (n > removedIdx) nextMap[`${prefix}${n - 1}`] = map[k];
    });
    localStorage.setItem('ff_asset_locks', JSON.stringify(nextMap));
  } catch (e) {}
}

function isOfficialDefaultAsset(kind, idPart, imgUrl) {
  if (!imgUrl || typeof officialAssets !== 'object' || !officialAssets) return false;
  if (kind === 'skin') {
    return Boolean(officialAssets[`mon:${idPart}`] && officialAssets[`mon:${idPart}`] === imgUrl);
  }
  return Object.values(officialAssets).includes(imgUrl);
}
function openAssetPreviewModal(kind, idPart, idx, mode = 'view') {
  const modal = document.getElementById('asset-preview-modal');
  const imgBox = document.getElementById('asset-preview-big-img');
  const actBox = document.getElementById('asset-preview-actions');
  if (!modal || !imgBox || !actBox) return;

  let imgUrl = '';
  let isEquipped = false;
  if (kind === 'skin') {
    const spData = speciesSkins[idPart];
    if (idx < 0) {
      imgUrl = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(idPart) : '';
      isEquipped = !spData || Number(spData.activeIdx ?? -1) < 0;
    } else {
      imgUrl = spData && spData.list ? spData.list[idx] : '';
      isEquipped = spData && spData.activeIdx === idx;
    }
  } else if (kind === 'bg') {
    const item = aiBackgrounds[idx];
    imgUrl = typeof item === 'string' ? item : (item ? item.img : '');
  } else if (kind === 'stamp') {
    const item = aiStamps[idx];
    imgUrl = typeof item === 'string' ? item : (item ? item.img : '');
  }
  if (!imgUrl) return;

  const isDefault = (kind === 'skin' && idx < 0) || isOfficialDefaultAsset(kind, idPart, imgUrl);
  const locked = isAssetLocked(kind, idPart, idx);
  const isBg = kind === 'bg';

  const existingFloatBtn = document.getElementById('floating-dismantle-btn');
  if (existingFloatBtn) existingFloatBtn.remove();

  if (!locked && !isDefault && mode === 'view') {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'floating-dismantle-btn';
    floatBtn.onclick = (e) => {
      e.stopPropagation();
      openAssetPreviewModal(kind, idPart, idx, 'dismantle');
    };
    floatBtn.innerHTML = `<span style="font-size:13px;">✦</span><span>分解する</span>`;
    floatBtn.style.cssText = [
      'position:fixed',
      'top:44px',
      'left:14px',
      'z-index:1160',
      'display:inline-flex',
      'align-items:center',
      'gap:5px',
      'padding:7px 14px',
      'border-radius:20px',
      'border:1px solid rgba(255,255,255,0.45)',
      'background:rgba(24,32,44,0.82)',
      'backdrop-filter:blur(6px)',
      'color:#ffffff',
      'font-size:12px',
      'font-weight:bold',
      'letter-spacing:0.04em',
      'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
      'cursor:pointer'
    ].join(';');
    modal.appendChild(floatBtn);
  }

  imgBox.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:${isBg ? 'cover' : 'contain'};border-radius:${isBg ? '16px' : '0'};pointer-events:none;">`;

  if (mode === 'dismantle' && !isDefault && !locked) {
    const label = kind === 'skin' ? 'スキン' : (kind === 'bg' ? '背景' : 'スタンプ');
    actBox.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#ffffff;border-radius:16px;padding:16px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.25);">
        <div style="font-size:14px;font-weight:bold;color:#1e293b;line-height:1.5;margin-bottom:4px;">この${label}を分解して 50 GEM に還元しますか？</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:12px;">※分解した${label}は元に戻せません</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button onclick="event.stopPropagation();openAssetPreviewModal('${kind}','${idPart}',${idx},'view')" style="padding:10px;border-radius:10px;border:1.5px solid #cbd5e1;background:#ffffff;font-size:13px;font-weight:bold;color:#334155;cursor:pointer;">キャンセル</button>
          <button onclick="event.stopPropagation();executeDismantleAsset('${kind}','${idPart}',${idx})" style="padding:10px;border-radius:10px;border:none;background:#ff7043;font-size:13px;font-weight:bold;color:#ffffff;cursor:pointer;">分解する (+50 GEM)</button>
        </div>
      </div>
    `;
  } else {
    let btns = '';
    if (kind === 'skin' && !isEquipped) {
      const targetIdx = isDefault ? -1 : idx;
      const btnLabel = isDefault ? '★ デフォルトの見た目に戻す' : '★ このスキンを適用する';
      btns += `<button onclick="event.stopPropagation();equipSpeciesSkinFromGallery('${idPart}',${targetIdx});closeAssetPreviewModal();" style="background:#ffffff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:bold;color:#ff7043;cursor:pointer;">${btnLabel}</button>`;
    }
    if (!isDefault) {
      btns += `<button onclick="event.stopPropagation();toggleAssetLock('${kind}','${idPart}',${idx});openAssetPreviewModal('${kind}','${idPart}',${idx},'view');" style="background:#ffffff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:bold;color:#334155;cursor:pointer;">${locked ? '🔒 ロック解除する' : '🔓 保護ロックする'}</button>`;
      if (kind === 'skin' && isAdminUser()) {
        btns += `<button onclick="event.stopPropagation();promoteSkinToOfficialDefault('${idPart}',${idx});closeAssetPreviewModal();" style="background:#0288d1;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:bold;color:#ffffff;cursor:pointer;">【管理者】公式デフォルトに設定</button>`;
      }
    }
    actBox.innerHTML = btns;
  }

  modal.style.display = 'flex';
}

function closeAssetPreviewModal() {
  const existingFloatBtn = document.getElementById('floating-dismantle-btn');
  if (existingFloatBtn) existingFloatBtn.remove();
  const modal = document.getElementById('asset-preview-modal');
  if (modal) modal.style.display = 'none';
}

function executeDismantleAsset(kind, idPart, idx) {
  closeAssetPreviewModal();
  if (kind === 'skin') dismantleSkin(idPart, idx, true);
  else if (kind === 'bg') dismantleBg(idx, true);
  else if (kind === 'stamp') dismantleStamp(idx, true);
}

function buildSquareAssetCard(kind, idPart, idx, imgUrl, isEquipped) {
  const isDefault = (kind === 'skin' && idx < 0) || isOfficialDefaultAsset(kind, idPart, imgUrl);
  const locked = isAssetLocked(kind, idPart, idx);
  const borderStyle = isEquipped ? 'border:2px solid #ffb300;' : 'border:1.5px solid #cbd5e1;';
  const starBadge = isEquipped
    ? `<span style="position:absolute;top:3px;left:4px;font-size:11px;color:#ffb300;text-shadow:0 1px 2px rgba(0,0,0,0.4);">★</span>`
    : (isDefault
        ? `<span style="position:absolute;top:3px;left:4px;font-size:9px;background:#0288d1;color:#fff;padding:0 4px;border-radius:4px;font-weight:bold;">公式</span>`
        : (locked ? `<span style="position:absolute;top:3px;left:4px;font-size:10px;">🔒</span>` : ''));
  const fit = kind === 'bg' ? 'cover' : 'contain';

  return `
    <div onclick="openAssetPreviewModal('${kind}','${idPart}',${idx},'view')" style="aspect-ratio:1/1;${borderStyle}border-radius:10px;background:#ffffff;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;padding:3px;">
      ${starBadge}
      <img src="${imgUrl}" style="width:100%;height:100%;object-fit:${fit};border-radius:6px;">
    </div>
  `;
}
function renderSpeciesGallery() {
  refreshAiSpeciesSelects();
  const gal = document.getElementById('species-skin-gallery');
  const sel = document.getElementById('ai-species-sel');
  if (!gal || !sel) return;
  const spName = sel.value || 'スライム';
  const spData = (speciesSkins && speciesSkins[spName]) ? speciesSkins[spName] : { list: [], activeIdx: -1 };
  const list = Array.isArray(spData.list) ? spData.list : [];

  gal.style.gridTemplateColumns = 'repeat(4, 1fr)';

  const defVis = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(spName) : '';
  const isDefActive = Number(spData.activeIdx ?? -1) < 0;
  let html = '';
  if (String(defVis).startsWith('data:image')) {
    html += buildSquareAssetCard('skin', spName, -1, defVis, isDefActive);
  }

  html += list.map((imgData, idx) => {
    if (String(defVis) === String(imgData)) return '';
    return buildSquareAssetCard('skin', spName, idx, imgData, spData.activeIdx === idx);
  }).join('');

  gal.innerHTML = html || `<div style="grid-column:1/-1;font-size:11px;color:#78909c;text-align:center;padding:8px;">「${spName}」のスキンはまだありません</div>`;
}

function dismantleSkin(spName, idx, skipConfirm = false) {
  if (idx < 0) return;
  const spData = speciesSkins[spName];
  if (!spData || !Array.isArray(spData.list) || !spData.list[idx]) return;
  if (isOfficialDefaultAsset('skin', spName, spData.list[idx])) return;
  if (isAssetLocked('skin', spName, idx)) return alert('ロック中のため分解できません');
  if (!skipConfirm && !confirm(`この「${spName}」のスキンを分解して 50 GEM に還元しますか？`)) return;

  spData.list.splice(idx, 1);
  if (spData.activeIdx === idx) spData.activeIdx = -1;
  else if (spData.activeIdx > idx) spData.activeIdx -= 1;

  (captured || []).forEach(m => {
    if (m && m.name === spName && typeof m.customSkinIdx === 'number') {
      if (m.customSkinIdx === idx) m.customSkinIdx = null;
      else if (m.customSkinIdx > idx) m.customSkinIdx -= 1;
    }
  });

  shiftAssetLocksAfterRemove('skin', spName, idx);
  gem += 50;
  if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  renderSpeciesGallery();
  updateUI();
  triggerAutoSave(true);
  showToast('スキンを分解して +50 GEM 獲得しました！');
}

function renderBgGallery() {
  const gal = document.getElementById('bg-gallery');
  if (!gal) return;
  const list = Array.isArray(aiBackgrounds) ? aiBackgrounds : [];
  gal.style.gridTemplateColumns = 'repeat(4, 1fr)';
  if (list.length === 0) {
    gal.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:#78909c;text-align:center;padding:8px;">生成したアイコン背景はまだありません</div>`;
    return;
  }
  gal.innerHTML = list.map((bgItem, idx) => {
    const imgUrl = typeof bgItem === 'string' ? bgItem : (bgItem.img || '');
    return buildSquareAssetCard('bg', 'all', idx, imgUrl, false);
  }).join('');
}

function dismantleBg(idx, skipConfirm = false) {
  if (!Array.isArray(aiBackgrounds) || !aiBackgrounds[idx]) return;
  const imgUrl = typeof aiBackgrounds[idx] === 'string' ? aiBackgrounds[idx] : (aiBackgrounds[idx].img || '');
  if (isOfficialDefaultAsset('bg', 'all', imgUrl)) return;
  if (isAssetLocked('bg', 'all', idx)) return alert('ロック中のため分解できません');
  if (!skipConfirm && !confirm('この背景を分解して 50 GEM に還元しますか？')) return;

  aiBackgrounds.splice(idx, 1);
  if (typeof iconConfig === 'object' && iconConfig !== null) {
    if (Number(iconConfig.bgIdx) === idx) iconConfig.bgIdx = -1;
    else if (Number(iconConfig.bgIdx) > idx) iconConfig.bgIdx = Number(iconConfig.bgIdx) - 1;
  }

  shiftAssetLocksAfterRemove('bg', 'all', idx);
  gem += 50;
  renderBgGallery();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  updateUI();
  triggerAutoSave(true);
  showToast('背景を分解して +50 GEM 獲得しました！');
}

function renderStamps() {
  const gal = document.getElementById('stamp-gallery');
  if (!gal) return;
  const list = Array.isArray(aiStamps) ? aiStamps : [];
  gal.style.gridTemplateColumns = 'repeat(4, 1fr)';
  if (list.length === 0) { gal.innerHTML = ''; return; }
  gal.innerHTML = list.map((st, idx) => {
    const imgUrl = typeof st === 'string' ? st : (st.img || '');
    return buildSquareAssetCard('stamp', 'all', idx, imgUrl, false);
  }).join('');
}

function dismantleStamp(idx, skipConfirm = false) {
  if (!Array.isArray(aiStamps) || !aiStamps[idx]) return;
  if (isAssetLocked('stamp', 'all', idx)) return alert('ロック中のため分解できません');
  if (!skipConfirm && !confirm('このスタンプを分解して 50 GEM に還元しますか？')) return;

  aiStamps.splice(idx, 1);
  shiftAssetLocksAfterRemove('stamp', 'all', idx);
  gem += 50;
  renderStamps();
  if (typeof renderChatStampBar === 'function') renderChatStampBar();
  updateUI();
  triggerAutoSave(true);
  showToast('スタンプを分解して +50 GEM 獲得しました！');
}

async function promoteSkinToOfficialDefault(spName, idx) {
  if (!isAdminUser()) return;
  const spData = speciesSkins[spName];
  if (!spData || !Array.isArray(spData.list) || !spData.list[idx]) return;
  if (!confirm(`【管理者機能】\n「${spName}」のこのスキンを全プレイヤー共通の「公式デフォルト画像」に設定しますか？`)) return;
  try {
    const targetImg = spData.list[idx];
    await saveOfficialAsset(`mon:${spName}`, targetImg);
    spData.list.splice(idx, 1);
    spData.activeIdx = -1;
    shiftAssetLocksAfterRemove('skin', spName, idx);
    if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderCaptured === 'function') renderCaptured();
    renderSpeciesGallery();
    updateUI();
    triggerAutoSave(true);
    showToast(`【管理者】「${spName}」の公式デフォルトを更新しました！`);
  } catch (e) {
    alert('公式デフォルト更新エラー: ' + e.message);
  }
}

function equipSpeciesSkinFromGallery(spName, idx) {
  if (!speciesSkins[spName]) speciesSkins[spName] = { list: [], activeIdx: -1 };
  speciesSkins[spName].activeIdx = idx;
  if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCafe === 'function') renderCafe();
  renderSpeciesGallery();
  updateUI();
  triggerAutoSave(true);
  showToast(idx < 0 ? `${spName}をデフォルトの見た目にしました！` : `${spName}のスキンを適用しました！`);
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

function flattenImageOnWhite(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
    if (String(vis).startsWith('data:image')) sourceImg = await flattenImageOnWhite(vis);
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
      renderBgGallery();
      if (typeof updateIconPreview === 'function') updateIconPreview(false);
      showToast('新しいアイコン背景を生成しました！');
    } else if (type === 'stamp') {
      const cleanImg = await removeWhiteBackground(data.image);
      const finalStamp = await composeStampWithCaption(cleanImg, stampText);
      stampBuilderState.previewImg = finalStamp;
      renderStampBuilderUI();
      if (!Array.isArray(aiStamps)) aiStamps = [];
      aiStamps.push({ img: finalStamp, text: stampText || species, species });
      renderStamps();
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
