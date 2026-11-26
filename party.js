// パーティ編成・経験値成長・属性耐性・見た目選択システム (party.js)
function ensureStarterMonster() {
  if (!Array.isArray(captured)) captured = [];
  if (captured.length === 0) {
    const sp = getSpeciesData('スライム');
    const starter = {
      id: 'M_STARTER',
      name: sp.name,
      elem: sp.elem,
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
      speciesSkins[sp.name] = { list: [], activeIdx: -1 };
    }
  }
}

function getNextLevelExp(lv) {
  return Math.floor(25 * Math.pow(1.22, lv - 1));
}

function getMonsterVisual(m) {
  if (!m) return 'EMBLEM:none:?';
  if (m.customSkin) return m.customSkin;
  return getSpeciesDisplay(m.name);
}

function renderElementBadge(elemId) {
  const el = typeof getElementInfo === 'function' ? getElementInfo(elemId) : { name: '無', color: '#546e7a', bg: '#eceff1' };
  return `<span style="display:inline-block;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:bold;color:${el.color};background:${el.bg};border:1px solid ${el.color}44;">${el.name}</span>`;
}

function getMonStats(m) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : { elem: 'none', baseHp: 60, baseAtk: 10, baseDef: 3, ct: 1.8 };
  const lv = Number(m.lv) || 1;
  const bHp = Number(m.baseHp) || sp.baseHp || 60;
  const bAtk = Number(m.baseAtk) || sp.baseAtk || 10;
  const bDef = Number(m.baseDef) || sp.baseDef || 3;
  const inhHp = Number(m.bonusHp) || 0;
  const inhAtk = Number(m.bonusAtk) || 0;
  const inhDef = Number(m.bonusDef) || 0;

  let maxHp = Math.floor((bHp + inhHp) * (1 + (lv - 1) * 0.16));
  let atk = Math.floor((bAtk + inhAtk) * (1 + (lv - 1) * 0.15));
  let def = Math.floor((bDef + inhDef) * (1 + (lv - 1) * 0.14));
  let ct = Number(m.ct) || sp.ct || 1.8;

  const traitIds = Array.from(new Set(Array.isArray(m.traits) ? m.traits : (m.traitId ? [m.traitId] : [])));
  let hpMult = 1.0, atkMult = 1.0, defMult = 1.0, ctReduce = 0;
  let bonusSkillRate = 0, bonusSkillDmg = 0, lifesteal = 0, initCt = 0, lowHpAtk = 0, expMult = 1.0, goldMult = 1.0;
  const elemBoosts = { fire: 0, water: 0, earth: 0, sky: 0, dark: 0, light: 0 };

  traitIds.forEach(tid => {
    const tr = getMonsterTrait(tid);
    if (!tr) return;
    if (tr.stat === 'hp') hpMult += tr.val;
    if (tr.stat === 'atk') atkMult += tr.val;
    if (tr.stat === 'def') defMult += tr.val;
    if (tr.stat === 'ct') ctReduce += tr.val;
    if (tr.stat === 'rate') bonusSkillRate += tr.val;
    if (tr.stat === 'skillMult') bonusSkillDmg += tr.val;
    if (tr.stat === 'heal') lifesteal += tr.val;
    if (tr.stat === 'initCt') initCt += tr.val;
    if (tr.stat === 'lowHpAtk') lowHpAtk += tr.val;
    if (tr.stat === 'exp') expMult += tr.val;
    if (tr.stat === 'gold') goldMult += tr.val;
    if (tr.stat.startsWith('elem_')) {
      const k = tr.stat.replace('elem_', '');
      if (elemBoosts[k] !== undefined) elemBoosts[k] += tr.val;
    }
  });

  hpMult = Math.min(2.2, hpMult);
  atkMult = Math.min(2.2, atkMult);
  defMult = Math.min(2.2, defMult);
  ctReduce = Math.min(0.40, ctReduce);
  bonusSkillRate = Math.min(0.35, bonusSkillRate);
  bonusSkillDmg = Math.min(0.80, bonusSkillDmg);
  lifesteal = Math.min(0.35, lifesteal);
  initCt = Math.min(0.80, initCt);

  maxHp = Math.floor(maxHp * hpMult);
  atk = Math.floor(atk * atkMult);
  def = Math.floor(def * defMult);
  ct = Math.max(0.65, Number((ct * (1.0 - ctReduce)).toFixed(2)));

  return {
    name: m.name, elem: m.elem || sp.elem || 'none', lv, maxLv: Number(m.maxLv) || 10, plus: Number(m.plus) || 0,
    maxHp, atk, def, ct, bonusSkillRate, bonusSkillDmg, lifesteal, initCt, lowHpAtk, expMult, goldMult, elemBoosts
  };
}

function grantExpToMonster(m, amount) {
  if (!m || amount <= 0) return false;
  const maxLv = Number(m.maxLv) || 10;
  if ((m.lv || 1) >= maxLv) { m.lv = maxLv; m.exp = 0; return false; }
  const st = getMonStats(m);
  m.exp = (Number(m.exp) || 0) + Math.floor(amount * st.expMult);
  let leveledUp = false;
  while ((m.lv || 1) < maxLv) {
    const need = getNextLevelExp(m.lv || 1);
    if (m.exp >= need) { m.exp -= need; m.lv = (m.lv || 1) + 1; leveledUp = true; }
    else break;
  }
  if ((m.lv || 1) >= maxLv) m.exp = 0;
  return leveledUp;
}

function resetBattleAllies() {
  ensureStarterMonster();
  if (!Array.isArray(party)) party = new Array(3).fill(null);
  while (party.length < 3) party.push(null);
  const limit = Math.min(20, Math.max(3, Number(maxTrainingSlots) || 3));
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < limit) trainingSlots.push(null);

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
      name: st.name, elem: st.elem, lv: st.lv, plus: st.plus,
      maxHp: st.maxHp, hp: st.maxHp, atk: st.atk, def: st.def,
      maxCt: st.ct, ct: Number((st.ct * st.initCt).toFixed(2)), monRef: m
    };
  });
}

function tryAutoRecruit(enemyObj) {
  if (Math.random() >= 0.30) return false;
  const limit = Number(maxCaptured) || 50;
  if (captured.length >= limit) {
    showToast(`仲間枠が上限(${limit}体)のため仲間にできませんでした`);
    return false;
  }
  const rawName = (enemyObj.rawName || enemyObj.name).replace(/^\[強敵\]\s*/, '');
  const sp = getSpeciesData(rawName);
  const newMon = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 999),
    name: sp.name, elem: sp.elem, lv: 1, maxLv: 10, exp: 0, plus: 0,
    bonusHp: 0, bonusAtk: 0, bonusDef: 0, baseHp: sp.baseHp, baseAtk: sp.baseAtk, baseDef: sp.baseDef, ct: sp.ct,
    skills: [getSpeciesInnateSkillId(sp.name)], traits: [getSpeciesInnateTraitId(sp.name)],
    customSkin: null, customBgIdx: -1
  };
  captured.push(newMon);
  if (!speciesSkins[sp.name]) speciesSkins[sp.name] = { list: [], activeIdx: -1 };
  const emptySlot = party.findIndex(x => x === null);
  if (emptySlot !== -1 && !trainingSlots.includes(newMon.id)) {
    party.splice(emptySlot, 1, newMon.id);
  }
  resetBattleAllies();
  renderParty(); renderCaptured(); renderTraining(); updateSelectOptions(); renderSpeciesGallery();
  showToast(`${sp.name}が仲間になりました (${captured.length}/${limit})`);
  return true;
}
function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  el.innerHTML = party.slice(0, 3).map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">＋</div><div class="name">空き枠</div><div class="sub">一覧から編成</div></div>`;
    const disp = getMonsterVisual(m), idx = captured.findIndex(x => x.id === monId), st = getMonStats(m);
    const plusTag = st.plus > 0 ? `+${st.plus}` : '';
    return `<div class="slot-box" onclick="openMonModal(${idx})"><div class="lvl"><span>Lv.${st.lv}/${st.maxLv}</span>${renderElementBadge(st.elem)}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}${plusTag}</div><div class="sub">HP:${st.maxHp} ATK:${st.atk}</div></div>`;
  }).join('');
}

function renderTraining() {
  const el = document.getElementById('training-slots');
  const cntEl = document.getElementById('train-count-disp');
  const limit = Math.min(20, Math.max(3, Number(maxTrainingSlots) || 3));
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < limit) trainingSlots.push(null);
  trainingSlots = trainingSlots.slice(0, limit);

  const activeCount = trainingSlots.filter(id => id && captured.some(x => x.id === id)).length;
  if (cntEl) cntEl.textContent = `${activeCount}/${limit}`;

  if (!el) return;
  el.innerHTML = trainingSlots.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) {
      return `<div class="mini-mon-card empty" onclick="alert('「仲間一覧」タブからモンスターをタップし、「訓練場に配置する」を選んでください（戦闘EXPの10%を獲得）')">
        <div class="m-top">訓練${slotIdx + 1}</div>
        <div class="m-icon" style="opacity:0.4;font-size:18px;">＋</div>
        <div class="m-bot">空き</div>
      </div>`;
    }
    const disp = getMonsterVisual(m), st = getMonStats(m);
    const plusText = st.plus > 0 ? `+${st.plus}` : '';
    return `<div class="mini-mon-card train" onclick="removeFromTraining(${slotIdx})">
      <div class="m-top"><span class="m-lv">Lv.${st.lv}</span><span class="m-tag train">解除</span></div>
      <div class="m-icon">${renderSprite(disp, 30, '6px')}</div>
      <div class="m-bot">${plusText ? `<span class="m-plus">${plusText}</span>` : `<span class="m-nm">${m.name}</span>`}</div>
    </div>`;
  }).join('');
}

function assignTrainingFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (party.includes(m.id)) return alert('バトル編成中のモンスターは訓練場に入れられません。先にパーティから外してください。');
  const limit = Math.min(20, Math.max(3, Number(maxTrainingSlots) || 3));
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < limit) trainingSlots.push(null);

  if (trainingSlots.includes(m.id)) return alert('すでに訓練場に入っています。');
  const empty = trainingSlots.findIndex(x => x === null);
  if (empty === -1) return alert(`訓練場（${limit}枠）がいっぱいです。「訓練場」タブの［＋］ボタンで枠を拡張するか、配置中の仲間を外してください。`);
  trainingSlots.splice(empty, 1, m.id);
  closeMonModal();
  renderTraining(); renderCaptured(); triggerAutoSave();
  showToast(`${m.name}を訓練場に配置しました`);
}

function removeFromTraining(slotIdx) {
  trainingSlots.splice(slotIdx, 1, null);
  renderTraining(); renderCaptured(); triggerAutoSave();
  showToast('訓練場から外しました');
}

function renderCaptured() {
  const el = document.getElementById('captured-list');
  const cntEl = document.getElementById('mon-count-disp');
  const limit = Number(maxCaptured) || 50;
  if (cntEl) cntEl.textContent = `${captured.length}/${limit}`;

  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getMonsterVisual(m);
    const inParty = party.includes(m.id);
    const inTrain = (trainingSlots || []).includes(m.id);
    const inStaff = (staff || []).includes(m.id);
    const st = getMonStats(m);
    const plusText = st.plus > 0 ? `+${st.plus}` : '';

    let statusBadge = '';
    if (inParty) statusBadge = '<span class="m-tag party">編成</span>';
    else if (inTrain) statusBadge = '<span class="m-tag train">訓練</span>';
    else if (inStaff) statusBadge = '<span class="m-tag staff">店員</span>';

    return `<div class="mini-mon-card ${inParty ? 'in-party' : ''}" onclick="openMonModal(${i})">
      <div class="m-top"><span class="m-lv">Lv.${st.lv}</span>${statusBadge}</div>
      <div class="m-icon">${renderSprite(disp, 30, '6px')}</div>
      <div class="m-bot">${plusText ? `<span class="m-plus">${plusText}</span>` : `<span class="m-nm">${m.name}</span>`}</div>
    </div>`;
  }).join('');
}

function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured.slice(idx, idx + 1).pop(); if (!m) return;
  const disp = getMonsterVisual(m), st = getMonStats(m);
  const elInfo = getElementInfo(st.elem);
  const resInfo = getElementInfo(elInfo.resistTo);
  const weakInfo = getElementInfo(elInfo.weakTo);
  const plusTag = st.plus > 0 ? ` +${st.plus}` : '';
  const needExp = getNextLevelExp(st.lv);
  const expText = st.lv >= st.maxLv ? 'MAX（上限到達）' : `${m.exp || 0} / ${needExp}`;

  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = `${m.name}${plusTag}`;
  document.getElementById('modal-mon-rarity').textContent = `配合値: +${st.plus}`;
  document.getElementById('modal-mon-lv').innerHTML = `Lv.${st.lv} / ${st.maxLv}<br><span style="font-size:10px;color:#546e7a;font-weight:normal;">EXP: ${expText}</span>`;
  document.getElementById('modal-mon-atk').innerHTML = `HP:${st.maxHp} / ATK:${st.atk}<br>DEF:${st.def} / CT:${st.ct}秒`;
  document.getElementById('modal-mon-terrain').innerHTML = `${renderElementBadge(st.elem)} <b>${elInfo.name}属性</b><br><span style="font-size:11px;color:#455a64;font-weight:normal;">耐性: ${resInfo.name}（半減） / 弱点: ${weakInfo.name}（1.5倍）</span>`;

  const skillIds = Array.from(new Set(Array.isArray(m.skills) && m.skills.length > 0 ? m.skills : [getSpeciesInnateSkillId(m.name)]));
  document.getElementById('modal-mon-skill').innerHTML = skillIds.map((sid) => {
    const sk = getSkillById(sid);
    return `<div style="margin-bottom:4px;">${renderElementBadge(sk.elem)} <b>${sk.name}</b><br><span style="font-size:10px;color:#546e7a;font-weight:normal;">${sk.desc}（発動率${Math.round(sk.rate * 100)}%）</span></div>`;
  }).join('');

  const traitIds = Array.from(new Set(Array.isArray(m.traits) && m.traits.length > 0 ? m.traits : [getSpeciesInnateTraitId(m.name)]));
  document.getElementById('modal-mon-trait').innerHTML = traitIds.map((tid) => {
    const tr = getMonsterTrait(tid);
    return `<div style="margin-bottom:3px;"><b>・${tr.name}</b> <span style="font-size:10px;color:#546e7a;font-weight:normal;">(${tr.desc})</span></div>`;
  }).join('');

  document.getElementById('modal-party-btn').textContent = party.includes(m.id) ? 'パーティから外す' : 'バトルパーティに編成する';
  document.getElementById('mon-modal').style.display = 'flex';
}
function closeMonModal() { document.getElementById('mon-modal').style.display = 'none'; }

function togglePartyFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop(); if (!m) return;
  const pIdx = party.indexOf(m.id);
  if (pIdx !== -1) {
    if (party.filter(x => x !== null).length <= 1) return alert('パーティには最低1体必要です');
    party.splice(pIdx, 1, null); showToast(`${m.name}をパーティから外しました`);
  } else {
    if ((trainingSlots || []).includes(m.id)) {
      return alert('訓練場に入っているモンスターはバトル編成に入れられません。先に訓練場から外してください。');
    }
    const empty = party.findIndex(x => x === null);
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです');
    party.splice(empty, 1, m.id); showToast(`${m.name}をパーティに編成しました`);
  }
  if (!state.inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
