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
function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.inBattle) return;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  const aliveCheck = battleAllies.filter(u => u !== null && u.hp > 0);
  if (aliveCheck.length === 0) {
    autoActive = false;
    updateUI();
    return alert('バトルパーティにモンスターが編成されていません！');
  }
