// パーティ編成・モンスター育成・スカウト・見た目選択システム (party.js)
function ensureStarterMonster() {
  if (!Array.isArray(captured)) captured = [];
  if (captured.length === 0) {
    const starter = {
      id: 'M_STARTER',
      icon: '🦊',
      name: 'フォックス',
      type: 'land',
      lv: 1,
      rarity: 'R',
      maxHp: 90,
      atk: 16,
      def: 5,
      ct: 1.7,
      traitId: 'land_lord',
      customSkin: null,
      customBgIdx: -1
    };
    captured.push(starter);
    if (!speciesSkins['フォックス']) {
      speciesSkins['フォックス'] = { list: [], activeIdx: -1, defaultIcon: '🦊' };
    }
  }
}

function getMonsterVisual(m) {
  if (!m) return '🐾';
  if (m.customSkin) return m.customSkin;
  return getSpeciesDisplay(m.name, m.icon);
}

function getMonStats(m) {
  let mult = (m.type === mode) ? 1.2 : 1.0;
  if (m.traitId === 'sea_lord' && mode === 'sea') mult += 0.4;
  if (m.traitId === 'land_lord' && mode === 'land') mult += 0.4;
  return {
    name: m.name,
    icon: m.icon,
    lv: Number(m.lv) || 1,
    maxHp: Number(m.maxHp) || (55 + (Number(m.lv) || 1) * 18),
    atk: Math.floor((Number(m.atk) || 10) * mult),
    def: Number(m.def) || (3 + (Number(m.lv) || 1) * 2),
    ct: Number(m.ct) || 2.0
  };
}

function resetBattleAllies() {
  ensureStarterMonster();
  if (!Array.isArray(party)) party = new Array(3).fill(null);
  while (party.length < 3) party.push(null);

  const validIds = party.filter(id => id && captured.some(m => m.id === id));
  if (validIds.length === 0 && captured.length > 0) {
    party = new Array(3).fill(null);
    captured.slice(0, 3).forEach((m, i) => {
      party.splice(i, 1, m.id);
    });
  }

  battleAllies = party.slice(0, 3).map(monId => {
    if (!monId) return null;
    const m = captured.find(x => x.id === monId);
    if (!m) return null;
    const st = getMonStats(m);
    return {
      name: st.name,
      icon: st.icon,
      lv: st.lv,
      maxHp: st.maxHp,
      hp: st.maxHp,
      atk: st.atk,
      def: st.def,
      maxCt: st.ct,
      ct: 0,
      monRef: m
    };
  });
}

function tryAutoRecruit(baseMon, curArea) {
  if (Math.random() >= 0.35) return false;
  const rRoll = Math.random();
  const rarity = rRoll < 0.08 ? 'SSR' : (rRoll < 0.28 ? 'SR' : (rRoll < 0.6 ? 'R' : 'N'));
  const mult = { N: 1, R: 1.4, SR: 2.0, SSR: 3.0 }[rarity];
  const trait = getRandomTrait();
  const newMon = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 99),
    icon: baseMon.icon, name: baseMon.name, type: mode, lv: 1, rarity,
    maxHp: Math.floor((55 + curArea * 15) * mult),
    atk: Math.floor((7 + curArea * 3) * mult),
    def: Math.floor((3 + curArea * 1.5) * mult),
    ct: Number(baseMon.ct) || 2.1,
    traitId: trait.id,
    customSkin: null,
    customBgIdx: -1
  };
  captured.push(newMon);
  if (!speciesSkins[baseMon.name]) speciesSkins[baseMon.name] = { list: [], activeIdx: -1, defaultIcon: baseMon.icon };
  const emptySlot = party.findIndex(x => x === null);
  if (emptySlot !== -1) party.splice(emptySlot, 1, newMon.id);
  resetBattleAllies();
  renderParty(); renderCaptured(); updateSelectOptions(); renderSpeciesGallery();
  showToast(`✨ [${rarity}] ${baseMon.name}が起き上がり仲間になった！`);
  return true;
}

function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  el.innerHTML = party.slice(0, 3).map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getMonsterVisual(m), idx = captured.findIndex(x => x.id === monId), st = getMonStats(m);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span><span>CT:${st.ct}s</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">HP:${st.maxHp} ATK:${st.atk}</div></div>`;
  }).join('');
}

function renderCaptured() {
  const el = document.getElementById('captured-list');
  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getMonsterVisual(m), inParty = party.includes(m.id);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span>${inParty ? '<span class="badge-tag">編成中</span>' : ''}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">ATK:${m.atk} DEF:${m.def || 4}</div></div>`;
  }).join('');
}

function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured.slice(idx, idx + 1).pop(); if (!m) return;
  const disp = getMonsterVisual(m), sk = getMonsterSkill(m.name), tr = getMonsterTrait(m.traitId), st = getMonStats(m);
  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = m.name;
  document.getElementById('modal-mon-rarity').textContent = `レア度: ${m.rarity} / ${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'}`;
  document.getElementById('modal-mon-lv').textContent = `Lv.${m.lv}`;
  document.getElementById('modal-mon-atk').innerHTML = `HP:${st.maxHp} / ATK:${st.atk}<br>DEF:${st.def} / CT:${st.ct}秒`;
  document.getElementById('modal-mon-terrain').textContent = m.type === 'sea' ? '🌊 海（海戦で攻撃+20%）' : '🌲 陸（陸戦で攻撃+20%）';
  document.getElementById('modal-mon-skill').innerHTML = `<b>${sk.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${sk.desc}</span>`;
  document.getElementById('modal-mon-trait').innerHTML = `<b>${tr.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${tr.desc}</span>`;
  document.getElementById('modal-party-btn').textContent = party.includes(m.id) ? '❌ パーティから外す' : '⚔️ バトルパーティに編成する';
  document.getElementById('modal-lvup-btn').textContent = `⬆️ 個別強化する（費用: ${m.lv * 30} G）`;
  document.getElementById('mon-modal').style.display = 'flex';
}
function closeMonModal() { document.getElementById('mon-modal').style.display = 'none'; }

function togglePartyFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop(); if (!m) return;
  const pIdx = party.indexOf(m.id);
  if (pIdx !== -1) {
    if (party.filter(x => x !== null).length <= 1) return alert('パーティには最低1体必要です！');
    party.splice(pIdx, 1, null); showToast(`${m.name}をパーティから外しました`);
  } else {
    const empty = party.findIndex(x => x === null);
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです！');
    party.splice(empty, 1, m.id); showToast(`⚔️ ${m.name}をパーティに編成！`);
  }
  if (!state[mode].inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}

function levelUpMonFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop(); if (!m) return;
  const cost = m.lv * 30;
  if (gold < cost) return alert('ゴールド不足！');
  gold -= cost;
  m.lv++;
  m.maxHp = (m.maxHp || 68) + Math.floor(14 + m.lv * 3);
  m.atk += Math.floor(4 + m.lv * 1.5);
  m.def = (m.def || 4) + Math.floor(2 + m.lv * 0.8);
  if (!state[mode].inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
// 「〇〇の画像」見た目カスタマイズ選択モーダル用ロジック
let skinPickerState = { monIdx: -1, selectedSkinIdx: -1, selectedBgIdx: -1, individualOnly: false };

function openSkinPickerModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (!speciesSkins[m.name]) {
    speciesSkins[m.name] = { list: [], activeIdx: -1, defaultIcon: m.icon };
  }
  const spData = speciesSkins[m.name];
  let initialSkinIdx = spData.activeIdx;
  if (m.customSkin) {
    const foundIdx = spData.list.indexOf(m.customSkin);
    if (foundIdx !== -1) initialSkinIdx = foundIdx;
  }

  skinPickerState = {
    monIdx: selectedMonIdx,
    selectedSkinIdx: initialSkinIdx,
    selectedBgIdx: (typeof m.customBgIdx === 'number') ? m.customBgIdx : (spData.activeBgIdx ?? -1),
    individualOnly: Boolean(m.customSkin)
  };

  document.getElementById('skin-picker-title').textContent = `${m.name}の画像`;
  const chk = document.getElementById('skin-individual-chk');
  if (chk) chk.checked = skinPickerState.individualOnly;

  renderSkinPickerOptions();
  document.getElementById('skin-picker-modal').style.display = 'flex';
}

function closeSkinPickerModal() {
  document.getElementById('skin-picker-modal').style.display = 'none';
}

function selectPickerSkin(idx) {
  skinPickerState.selectedSkinIdx = idx;
  renderSkinPickerOptions();
}

function selectPickerBg(idx) {
  skinPickerState.selectedBgIdx = idx;
  renderSkinPickerOptions();
}

function renderSkinPickerOptions() {
  const m = captured.slice(skinPickerState.monIdx, skinPickerState.monIdx + 1).pop();
  if (!m) return;
  const spData = speciesSkins[m.name] || { list: [], activeIdx: -1, defaultIcon: m.icon };
  const defVisual = typeof getDefaultMonsterVisual === 'function' ? getDefaultMonsterVisual(m.name, m.icon) : m.icon;

  // 1. 画像一覧（一番左：デフォルト、2番目以降：AI生成画像）
  const imgRow = document.getElementById('skin-picker-images');
  if (imgRow) {
    const defSelected = skinPickerState.selectedSkinIdx === -1 ? 'selected' : '';
    let html = `
      <div class="picker-thumb ${defSelected}" onclick="selectPickerSkin(-1)">
        ${renderSprite(defVisual, 44, '6px')}
      </div>
    `;
    html += spData.list.map((imgData, idx) => {
      const sel = skinPickerState.selectedSkinIdx === idx ? 'selected' : '';
      return `
        <div class="picker-thumb ${sel}" onclick="selectPickerSkin(${idx})">
          <span class="picker-star">⭐</span>
          ${renderSprite(imgData, 44, '6px')}
        </div>
      `;
    }).join('');
    imgRow.innerHTML = html;
  }

  // 2. 背景一覧（なし / AI生成背景）
  const bgRow = document.getElementById('skin-picker-bgs');
  if (bgRow) {
    const noneSel = skinPickerState.selectedBgIdx === -1 ? 'selected' : '';
    let bgHtml = `<div class="picker-thumb ${noneSel}" onclick="selectPickerBg(-1)" style="font-size:11px;font-weight:bold;color:#546e7a;">なし</div>`;
    bgHtml += (aiBackgrounds || []).map((bg, idx) => {
      const sel = skinPickerState.selectedBgIdx === idx ? 'selected' : '';
      return `
        <div class="picker-thumb ${sel}" onclick="selectPickerBg(${idx})">
          <span class="picker-star">⭐</span>
          <img src="${bg.img}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;">
        </div>
      `;
    }).join('');
    bgRow.innerHTML = bgHtml;
  }

  // 3. 中央の大型プレビュー（キャラ立ち絵＋背景合成）
  const previewBox = document.getElementById('skin-picker-preview');
  if (previewBox) {
    const chosenVisual = (skinPickerState.selectedSkinIdx >= 0 && spData.list[skinPickerState.selectedSkinIdx])
      ? spData.list[skinPickerState.selectedSkinIdx]
      : defVisual;
    const chosenBg = (skinPickerState.selectedBgIdx >= 0 && aiBackgrounds[skinPickerState.selectedBgIdx])
      ? aiBackgrounds[skinPickerState.selectedBgIdx].img
      : null;

    previewBox.style.backgroundImage = chosenBg ? `url(${chosenBg})` : 'none';
    previewBox.style.backgroundColor = chosenBg ? 'transparent' : '#f1f5f9';
    previewBox.innerHTML = chosenVisual.startsWith('data:image') || chosenVisual.startsWith('/')
      ? `<img src="${chosenVisual}" style="width:140px;height:140px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));">`
      : `<span style="font-size:84px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.25));">${chosenVisual}</span>`;
  }
}

function applySkinPicker() {
  const m = captured.slice(skinPickerState.monIdx, skinPickerState.monIdx + 1).pop();
  if (!m) return;
  const spData = speciesSkins[m.name] || { list: [], activeIdx: -1, defaultIcon: m.icon };
  const isIndiv = document.getElementById('skin-individual-chk')?.checked || false;

  const chosenImg = (skinPickerState.selectedSkinIdx >= 0 && spData.list[skinPickerState.selectedSkinIdx])
    ? spData.list[skinPickerState.selectedSkinIdx]
    : null;

  if (isIndiv) {
    // この個体だけに設定する
    m.customSkin = chosenImg;
    m.customBgIdx = skinPickerState.selectedBgIdx;
  } else {
    // 種族全体に設定する（個体専用の上書きは解除）
    m.customSkin = null;
    m.customBgIdx = -1;
    spData.activeIdx = skinPickerState.selectedSkinIdx;
    spData.activeBgIdx = skinPickerState.selectedBgIdx;
  }

  if (!state[mode].inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  renderParty();
  renderCaptured();
  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  updateUI();
  triggerAutoSave(true);

  closeSkinPickerModal();
  openMonModal(skinPickerState.monIdx);
  showToast(`✨ ${m.name}の見た目を変更しました！`);
}
