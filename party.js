// パーティ編成・経験値成長・訓練場・見た目選択システム (party.js)
function ensureStarterMonster() {
  if (!Array.isArray(captured)) captured = [];
  if (captured.length === 0) {
    const sp = getSpeciesData('フォックス');
    const starter = {
      id: 'M_STARTER',
      icon: sp.icon,
      name: sp.name,
      type: 'land',
      lv: 1,
      maxLv: 10,
      exp: 0,
      plus: 0,
      bonusHp: 0,
      bonusAtk: 0,
      bonusDef: 0,
      baseHp: sp.baseHp,
      baseAtk: sp.baseAtk,
      baseDef: sp.baseDef,
      ct: sp.ct,
      skills: [getSpeciesInnateSkillId(sp.name)],
      traits: [getSpeciesInnateTraitId(sp.name)],
      customSkin: null,
      customBgIdx: -1
    };
    captured.push(starter);
    if (!speciesSkins[sp.name]) {
      speciesSkins[sp.name] = { list: [], activeIdx: -1, defaultIcon: sp.icon };
    }
  }
}

function getNextLevelExp(lv) {
  return Math.floor(25 * Math.pow(1.22, lv - 1));
}

function getMonsterVisual(m) {
  if (!m) return '🐾';
  if (m.customSkin) return m.customSkin;
  return getSpeciesDisplay(m.name, m.icon);
}

// 複数特性をすべて合算して実戦ステータスを算出
function getMonStats(m) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : { baseHp: 70, baseAtk: 12, baseDef: 4, ct: 1.8 };
  const lv = Number(m.lv) || 1;
  const bHp = Number(m.baseHp) || sp.baseHp || 70;
  const bAtk = Number(m.baseAtk) || sp.baseAtk || 12;
  const bDef = Number(m.baseDef) || sp.baseDef || 4;
  const inhHp = Number(m.bonusHp) || 0;
  const inhAtk = Number(m.bonusAtk) || 0;
  const inhDef = Number(m.bonusDef) || 0;

  let maxHp = Math.floor((bHp + inhHp) * (1 + (lv - 1) * 0.16));
  let atk = Math.floor((bAtk + inhAtk) * (1 + (lv - 1) * 0.15));
  let def = Math.floor((bDef + inhDef) * (1 + (lv - 1) * 0.14));
  let ct = Number(m.ct) || sp.ct || 1.8;

  // 得意地形ボーナス
  if (m.type === mode) atk = Math.floor(atk * 1.15);

  // 所持している全特性（最大5つ）のボーナスを重複適用
  const traitIds = Array.isArray(m.traits) ? m.traits : (m.traitId ? [m.traitId] : []);
  let hpMult = 1.0, atkMult = 1.0, defMult = 1.0, ctReduce = 0;
  let bonusSkillRate = 0, bonusSkillDmg = 0, lifesteal = 0, expMult = 1.0, goldMult = 1.0;

  traitIds.forEach(tid => {
    const tr = getMonsterTrait(tid);
    if (!tr) return;
    if (tr.stat === 'hp') hpMult += tr.val;
    if (tr.stat === 'atk') atkMult += tr.val;
    if (tr.stat === 'def') defMult += tr.val;
    if (tr.stat === 'ct') ctReduce += tr.val;
    if (tr.stat === 'seaAtk' && mode === 'sea') atkMult += tr.val;
    if (tr.stat === 'landAtk' && mode === 'land') atkMult += tr.val;
    if (tr.stat === 'rate') bonusSkillRate += tr.val;
    if (tr.stat === 'skillMult') bonusSkillDmg += tr.val;
    if (tr.stat === 'heal') lifesteal += tr.val;
    if (tr.stat === 'exp') expMult += tr.val;
    if (tr.stat === 'gold') goldMult += tr.val;
  });

  maxHp = Math.floor(maxHp * hpMult);
  atk = Math.floor(atk * atkMult);
  def = Math.floor(def * defMult);
  ct = Math.max(0.6, Number((ct * Math.max(0.4, 1.0 - ctReduce)).toFixed(2)));

  return {
    name: m.name,
    icon: m.icon,
    lv,
    maxLv: Number(m.maxLv) || 10,
    plus: Number(m.plus) || 0,
    maxHp,
    atk,
    def,
    ct,
    bonusSkillRate,
    bonusSkillDmg,
    lifesteal,
    expMult,
    goldMult
  };
}

// 経験値付与＆自動レベルアップ（レベル上限まで）
function grantExpToMonster(m, amount) {
  if (!m || amount <= 0) return false;
  const maxLv = Number(m.maxLv) || 10;
  if ((m.lv || 1) >= maxLv) {
    m.lv = maxLv;
    m.exp = 0;
    return false;
  }
  const st = getMonStats(m);
  m.exp = (Number(m.exp) || 0) + Math.floor(amount * st.expMult);
  let leveledUp = false;
  while ((m.lv || 1) < maxLv) {
    const need = getNextLevelExp(m.lv || 1);
    if (m.exp >= need) {
      m.exp -= need;
      m.lv = (m.lv || 1) + 1;
      leveledUp = true;
    } else {
      break;
    }
  }
  if ((m.lv || 1) >= maxLv) m.exp = 0;
  return leveledUp;
}

function resetBattleAllies() {
  ensureStarterMonster();
  if (!Array.isArray(party)) party = new Array(3).fill(null);
  while (party.length < 3) party.push(null);
  if (!Array.isArray(trainingSlots)) trainingSlots = new Array(3).fill(null);
  while (trainingSlots.length < 3) trainingSlots.push(null);

  const validIds = party.filter(id => id && captured.some(m => m.id === id) && !trainingSlots.includes(id));
  if (validIds.length === 0 && captured.length > 0) {
    party = new Array(3).fill(null);
    const avail = captured.filter(m => !trainingSlots.includes(m.id));
    avail.slice(0, 3).forEach((m, i) => party.splice(i, 1, m.id));
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
      plus: st.plus,
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

// 仲間加入（階層が進んでも初期ステータスは種族基本値で固定・レア度なし）
function tryAutoRecruit(enemyObj) {
  if (Math.random() >= 0.32) return false;
  const rawName = enemyObj.rawName || enemyObj.name.replace('👑 ', '');
  const sp = getSpeciesData(rawName);
  const newMon = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 999),
    icon: sp.icon,
    name: sp.name,
    type: sp.type,
    lv: 1,
    maxLv: 10,
    exp: 0,
    plus: 0,
    bonusHp: 0,
    bonusAtk: 0,
    bonusDef: 0,
    baseHp: sp.baseHp,
    baseAtk: sp.baseAtk,
    baseDef: sp.baseDef,
    ct: sp.ct,
    skills: [getSpeciesInnateSkillId(sp.name)],
    traits: [getSpeciesInnateTraitId(sp.name)],
    customSkin: null,
    customBgIdx: -1
  };
  captured.push(newMon);
  if (!speciesSkins[sp.name]) speciesSkins[sp.name] = { list: [], activeIdx: -1, defaultIcon: sp.icon };
  const emptySlot = party.findIndex(x => x === null);
  if (emptySlot !== -1 && !trainingSlots.includes(newMon.id)) {
    party.splice(emptySlot, 1, newMon.id);
  }
  resetBattleAllies();
  renderParty(); renderCaptured(); renderTraining(); updateSelectOptions(); renderSpeciesGallery();
  showToast(`✨ ${sp.name}が起き上がり仲間になった！`);
  return true;
}

function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  el.innerHTML = party.slice(0, 3).map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getMonsterVisual(m), idx = captured.findIndex(x => x.id === monId), st = getMonStats(m);
    const plusTag = st.plus > 0 ? `+${st.plus}` : '';
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>Lv.${st.lv}/${st.maxLv}</span><span>${plusTag}</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}${plusTag}</div><div class="sub">HP:${st.maxHp} ATK:${st.atk}</div></div>`;
  }).join('');
}

function renderTraining() {
  const el = document.getElementById('training-slots');
  if (!el) return;
  if (!Array.isArray(trainingSlots)) trainingSlots = new Array(3).fill(null);
  el.innerHTML = trainingSlots.slice(0, 3).map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box" onclick="alert('仲間一覧からモンスターをタップして訓練場へ配置できます（戦闘EXPの10%を獲得）')"><div class="lvl">訓練${slotIdx + 1}</div><div class="icon">🏋️</div><div class="name">空き枠</div><div class="sub">EXP 10%獲得</div></div>`;
    const disp = getMonsterVisual(m), st = getMonStats(m);
    const plusTag = st.plus > 0 ? `+${st.plus}` : '';
    return `<div class="slot-box staff" onclick="removeFromTraining(${slotIdx})"><div class="lvl"><span>Lv.${st.lv}/${st.maxLv}</span><span>解除</span></div><div class="icon">${renderSprite(disp, 34)}</div><div class="name">${m.name}${plusTag}</div><div class="sub">訓練中(10%)</div></div>`;
  }).join('');
}

function assignTrainingFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (party.includes(m.id)) return alert('バトル編成中のモンスターは訓練場に入れられません！先にパーティから外してください。');
  if (trainingSlots.includes(m.id)) return alert('すでに訓練場に入っています！');
  const empty = trainingSlots.findIndex(x => x === null);
  if (empty === -1) return alert('訓練場（3枠）がいっぱいです！訓練場枠をタップして解除してください。');
  trainingSlots.splice(empty, 1, m.id);
  closeMonModal();
  renderTraining(); renderCaptured(); triggerAutoSave();
  showToast(`🏋️ ${m.name}を訓練場に配置しました！`);
}

function removeFromTraining(slotIdx) {
  trainingSlots.splice(slotIdx, 1, null);
  renderTraining(); renderCaptured(); triggerAutoSave();
  showToast('🏋️ 訓練場から外しました');
}

function renderCaptured() {
  const el = document.getElementById('captured-list');
  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getMonsterVisual(m), inParty = party.includes(m.id), inTrain = (trainingSlots || []).includes(m.id);
    const st = getMonStats(m), plusTag = st.plus > 0 ? `+${st.plus}` : '';
    let badge = '';
    if (inParty) badge = '<span class="badge-tag">編成中</span>';
    else if (inTrain) badge = '<span class="badge-tag" style="background:#f57c00;">訓練中</span>';
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>Lv.${st.lv}/${st.maxLv}</span>${badge}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}${plusTag}</div><div class="sub">ATK:${st.atk} DEF:${st.def}</div></div>`;
  }).join('');
}
function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured.slice(idx, idx + 1).pop(); if (!m) return;
  const disp = getMonsterVisual(m), st = getMonStats(m);
  const plusTag = st.plus > 0 ? ` +${st.plus}` : '';
  const needExp = getNextLevelExp(st.lv);
  const expText = st.lv >= st.maxLv ? 'MAX（上限到達）' : `${m.exp || 0} / ${needExp}`;

  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = `${m.name}${plusTag}`;
  document.getElementById('modal-mon-rarity').textContent = `${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'} / 配合値: +${st.plus}`;
  document.getElementById('modal-mon-lv').innerHTML = `Lv.${st.lv} / ${st.maxLv}<br><span style="font-size:10px;color:#546e7a;font-weight:normal;">EXP: ${expText}</span>`;
  document.getElementById('modal-mon-atk').innerHTML = `HP:${st.maxHp} / ATK:${st.atk}<br>DEF:${st.def} / CT:${st.ct}秒`;
  document.getElementById('modal-mon-terrain').textContent = m.type === 'sea' ? '🌊 海（海戦で攻撃+15%）' : '🌲 陸（陸戦で攻撃+15%）';

  const skillIds = Array.isArray(m.skills) && m.skills.length > 0 ? m.skills : [getSpeciesInnateSkillId(m.name)];
  document.getElementById('modal-mon-skill').innerHTML = skillIds.map((sid, sIdx) => {
    const sk = getSkillById(sid);
    return `<div style="margin-bottom:3px;"><b>${sIdx === 0 ? '★' : '・'}${sk.name}</b> <span style="font-size:10px;color:#546e7a;font-weight:normal;">(${sk.desc})</span></div>`;
  }).join('');

  const traitIds = Array.isArray(m.traits) && m.traits.length > 0 ? m.traits : (m.traitId ? [m.traitId] : [getSpeciesInnateTraitId(m.name)]);
  document.getElementById('modal-mon-trait').innerHTML = traitIds.map((tid, tIdx) => {
    const tr = getMonsterTrait(tid);
    return `<div style="margin-bottom:3px;"><b>${tIdx === 0 ? '★' : '・'}${tr.name}</b> <span style="font-size:10px;color:#546e7a;font-weight:normal;">(${tr.desc})</span></div>`;
  }).join('');

  document.getElementById('modal-party-btn').textContent = party.includes(m.id) ? '❌ パーティから外す' : '⚔️ バトルパーティに編成する';
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
    if ((trainingSlots || []).includes(m.id)) {
      return alert('訓練場に入っているモンスターはバトル編成に入れられません！先に訓練場から外してください。');
    }
    const empty = party.findIndex(x => x === null);
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです！');
    party.splice(empty, 1, m.id); showToast(`⚔️ ${m.name}をパーティに編成！`);
  }
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

  const imgRow = document.getElementById('skin-picker-images');
  if (imgRow) {
    const defSelected = skinPickerState.selectedSkinIdx === -1 ? 'selected' : '';
    let html = `<div class="picker-thumb ${defSelected}" onclick="selectPickerSkin(-1)">${renderSprite(defVisual, 44, '6px')}</div>`;
    html += spData.list.map((imgData, idx) => {
      const sel = skinPickerState.selectedSkinIdx === idx ? 'selected' : '';
      return `<div class="picker-thumb ${sel}" onclick="selectPickerSkin(${idx})"><span class="picker-star">⭐</span>${renderSprite(imgData, 44, '6px')}</div>`;
    }).join('');
    imgRow.innerHTML = html;
  }

  const bgRow = document.getElementById('skin-picker-bgs');
  if (bgRow) {
    const noneSel = skinPickerState.selectedBgIdx === -1 ? 'selected' : '';
    let bgHtml = `<div class="picker-thumb ${noneSel}" onclick="selectPickerBg(-1)" style="font-size:11px;font-weight:bold;color:#546e7a;">なし</div>`;
    bgHtml += (aiBackgrounds || []).map((bg, idx) => {
      const sel = skinPickerState.selectedBgIdx === idx ? 'selected' : '';
      return `<div class="picker-thumb ${sel}" onclick="selectPickerBg(${idx})"><span class="picker-star">⭐</span><img src="${bg.img}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;"></div>`;
    }).join('');
    bgRow.innerHTML = bgHtml;
  }

  const previewBox = document.getElementById('skin-picker-preview');
  if (previewBox) {
    const chosenVisual = (skinPickerState.selectedSkinIdx >= 0 && spData.list[skinPickerState.selectedSkinIdx])
      ? spData.list[skinPickerState.selectedSkinIdx] : defVisual;
    const chosenBg = (skinPickerState.selectedBgIdx >= 0 && aiBackgrounds[skinPickerState.selectedBgIdx])
      ? aiBackgrounds[skinPickerState.selectedBgIdx].img : null;

    previewBox.style.backgroundImage = chosenBg ? `url(${chosenBg})` : 'none';
    previewBox.style.backgroundColor = chosenBg ? 'transparent' : '#f1f5f9';
    previewBox.innerHTML = (chosenVisual.startsWith('data:image') || chosenVisual.startsWith('/'))
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
    ? spData.list[skinPickerState.selectedSkinIdx] : null;

  if (isIndiv) {
    m.customSkin = chosenImg;
    m.customBgIdx = skinPickerState.selectedBgIdx;
  } else {
    m.customSkin = null;
    m.customBgIdx = -1;
    spData.activeIdx = skinPickerState.selectedSkinIdx;
    spData.activeBgIdx = skinPickerState.selectedBgIdx;
  }

  if (!state[mode].inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  renderParty(); renderCaptured(); renderTraining();
  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  updateUI(); triggerAutoSave(true);

  closeSkinPickerModal();
  openMonModal(skinPickerState.monIdx);
  showToast(`✨ ${m.name}の見た目を変更しました！`);
}
