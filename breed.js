// ビジュアルモンスター配合システム（両親＋子の固有のみ自動継承・重複統合）(breed.js)
let breedState = {
  parentAId: '',
  parentBId: ''
};

function getMonStats(mon) {
  if (!mon) return { lv: 1, plus: 0, maxHp: 50, atk: 10, def: 2, ctMax: 2.0 };
  const lv = Math.max(1, Number(mon.lv) || 1);
  const plus = typeof getMonsterPlus === 'function' ? getMonsterPlus(mon) : Math.max(Number(mon.plus) || 0, Number(mon.star) || 0);
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(mon.name) : null;

  if (typeof getMonsterBattleStats === 'function') {
    const bSt = getMonsterBattleStats(mon);
    const stageMul = 1 + ((Number(sp?.stage) || 1) - 1) * 0.25;
    const plusMul = 1 + plus * 0.22;
    const baseDef = Number(mon.baseDef) || sp?.baseDef || 4;
    const bonusDef = Number(mon.bonusDef) || 0;
    const def = Math.floor((baseDef + (lv - 1) * 1.5 + bonusDef) * stageMul * plusMul);
    return {
      lv,
      plus,
      maxHp: bSt.maxHp,
      atk: bSt.atk,
      def,
      ctMax: bSt.ctMax
    };
  }

  const baseHp = Number(mon.baseHp) || sp?.baseHp || 65;
  const baseAtk = Number(mon.baseAtk) || sp?.baseAtk || 14;
  const baseDef = Number(mon.baseDef) || sp?.baseDef || 4;
  const bonusHp = Number(mon.bonusHp) || 0;
  const bonusAtk = Number(mon.bonusAtk) || 0;
  const bonusDef = Number(mon.bonusDef) || 0;

  return {
    lv,
    plus,
    maxHp: Math.floor(baseHp + (lv - 1) * 18 + bonusHp),
    atk: Math.floor(baseAtk + (lv - 1) * 4.5 + bonusAtk),
    def: Math.floor(baseDef + (lv - 1) * 1.5 + bonusDef)
  };
}

function getBreedChildSpeciesName(monA, monB) {
  if (!monA || !monB) return 'スライム';
  if (monA.name === monB.name) return monA.name;
  const spA = typeof getSpeciesData === 'function' ? getSpeciesData(monA.name) : { elem: 'none' };
  const spB = typeof getSpeciesData === 'function' ? getSpeciesData(monB.name) : { elem: 'none' };
  if (typeof ALL_MONSTER_SPECIES !== 'undefined' && Array.isArray(ALL_MONSTER_SPECIES)) {
    const hybrid = ALL_MONSTER_SPECIES.find(s => s.name !== monA.name && s.name !== monB.name && (s.elem === spA.elem || s.elem === spB.elem));
    if (hybrid) return hybrid.name;
  }
  return monA.name;
}

function getBreedCost(monA, monB) {
  const plusSum = (Number(monA?.plus) || 0) + (Number(monB?.plus) || 0);
  return 1000 + plusSum * 800;
}

function getInheritedBreedTraitsAndSkills(monA, monB) {
  const childName = getBreedChildSpeciesName(monA, monB);
  const innateA_T = typeof getSpeciesInnateTraitId === 'function' ? getSpeciesInnateTraitId(monA.name) : 'valor';
  const innateB_T = typeof getSpeciesInnateTraitId === 'function' ? getSpeciesInnateTraitId(monB.name) : 'valor';
  const innateC_T = typeof getSpeciesInnateTraitId === 'function' ? getSpeciesInnateTraitId(childName) : 'valor';

  const innateA_S = typeof getSpeciesInnateSkillId === 'function' ? getSpeciesInnateSkillId(monA.name) : 'tackle';
  const innateB_S = typeof getSpeciesInnateSkillId === 'function' ? getSpeciesInnateSkillId(monB.name) : 'tackle';
  const innateC_S = typeof getSpeciesInnateSkillId === 'function' ? getSpeciesInnateSkillId(childName) : 'tackle';

  const traits = Array.from(new Set([innateC_T, innateA_T, innateB_T].filter(Boolean)));
  const skills = Array.from(new Set([innateC_S, innateA_S, innateB_S].filter(Boolean)));
  return { childName, traits, skills, innateC_T, innateA_T, innateB_T, innateC_S, innateA_S, innateB_S };
}

function renderBreedTab() {
  const headerEl = document.getElementById('breed-top-slots');
  const gridEl = document.getElementById('breed-mon-grid');
  if (!headerEl || !gridEl) return;

  const monA = captured.find(x => x.id === breedState.parentAId) || null;
  const monB = captured.find(x => x.id === breedState.parentBId) || null;
  if (!monA) breedState.parentAId = '';
  if (!monB) breedState.parentBId = '';

  const childName = (monA && monB) ? getBreedChildSpeciesName(monA, monB) : null;
  const childDisp = childName && typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(childName) : null;
  const newPlus = (monA && monB) ? ((Number(monA.plus) || 0) + (Number(monB.plus) || 0) + 1) : 0;

  headerEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 24px 1fr 24px 1fr;align-items:center;gap:4px;margin-bottom:10px;background:#f8fdff;padding:8px;border-radius:10px;border:1px solid #d0e8f2;">
      <div class="slot-box" onclick="clearBreedSlot('A')" style="padding:5px;${monA ? 'border-color:#0288d1;background:#e1f5fe;' : ''}">
        <div class="lvl" style="justify-content:center;">親1 ${monA ? '×' : ''}</div>
        <div class="icon" style="height:32px;">${monA ? renderSprite(getMonsterVisual(monA), 30, '6px') : '＋'}</div>
        <div class="name" style="font-size:10px;">${monA ? monA.name : '未選択'}</div>
      </div>
      <div style="text-align:center;font-weight:bold;color:#0288d1;">＋</div>
      <div class="slot-box" onclick="clearBreedSlot('B')" style="padding:5px;${monB ? 'border-color:#ff7043;background:#fff3e0;' : ''}">
        <div class="lvl" style="justify-content:center;">親2 ${monB ? '×' : ''}</div>
        <div class="icon" style="height:32px;">${monB ? renderSprite(getMonsterVisual(monB), 30, '6px') : '＋'}</div>
        <div class="name" style="font-size:10px;">${monB ? monB.name : '未選択'}</div>
      </div>
      <div style="text-align:center;font-weight:bold;color:#546e7a;">→</div>
      <div class="slot-box" onclick="openBreedConfirmModal()" style="padding:5px;${(monA && monB) ? 'border:2px solid #ff7043;background:#fff8f6;' : ''}">
        <div class="lvl" style="justify-content:center;">子 ${(monA && monB) ? `+${newPlus}` : ''}</div>
        <div class="icon" style="height:32px;">${childDisp ? renderSprite(childDisp, 30, '6px') : '？'}</div>
        <div class="name" style="font-size:10px;">${childName || '2体選択'}</div>
      </div>
    </div>
    ${(monA && monB) ? `<button class="btn-coral" style="margin-bottom:10px;" onclick="openBreedConfirmModal()">配合確認へ</button>` : `<div style="font-size:11px;color:#546e7a;margin-bottom:8px;">下のリストから <b>Lv.10以上</b> の仲間を2体タップして選んでください</div>`}
  `;

  gridEl.innerHTML = (captured || []).map(m => {
    const st = getMonStats(m);
    const isEligible = st.lv >= 10;
    const isA = m.id === breedState.parentAId;
    const isB = m.id === breedState.parentBId;
    const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : '魔';
    const plusText = st.plus > 0 ? `+${st.plus}` : '';

    let badge = '';
    if (isA) badge = '<span class="m-tag party">親1</span>';
    else if (isB) badge = '<span class="m-tag train">親2</span>';

    return `<div class="mini-mon-card ${isA || isB ? 'in-party' : ''}" onclick="selectBreedMonster('${m.id}')" style="${!isEligible ? 'opacity:0.35;filter:grayscale(80%);' : ''}">
      <div class="m-top"><span class="m-lv">Lv.${st.lv}</span>${badge}</div>
      <div class="m-icon">${renderSprite(disp, 30, '6px')}</div>
      <div class="m-bot">${plusText ? `<span class="m-plus">${plusText}</span>` : `<span class="m-nm">${m.name}</span>`}</div>
    </div>`;
  }).join('');
}

function clearBreedSlot(slot) {
  if (slot === 'A') breedState.parentAId = '';
  if (slot === 'B') breedState.parentBId = '';
  renderBreedTab();
}

function selectBreedMonster(monId) {
  const m = captured.find(x => x.id === monId);
  if (!m) return;
  const st = getMonStats(m);
  if (st.lv < 10) {
    return showToast('配合できるのは Lv.10以上 の仲間だけです');
  }
  if (breedState.parentAId === monId) { breedState.parentAId = ''; renderBreedTab(); return; }
  if (breedState.parentBId === monId) { breedState.parentBId = ''; renderBreedTab(); return; }
  if (!breedState.parentAId) breedState.parentAId = monId;
  else breedState.parentBId = monId;
  renderBreedTab();
  if (breedState.parentAId && breedState.parentBId) openBreedConfirmModal();
}

function openBreedConfirmModal() {
  const monA = captured.find(x => x.id === breedState.parentAId);
  const monB = captured.find(x => x.id === breedState.parentBId);
  if (!monA || !monB) return;
  renderBreedConfirmModal();
  const modal = document.getElementById('breed-confirm-modal');
  if (modal) modal.style.display = 'flex';
}

function closeBreedConfirmModal() {
  const modal = document.getElementById('breed-confirm-modal');
  if (modal) modal.style.display = 'none';
}

function swapBreedParents() {
  const tmp = breedState.parentAId;
  breedState.parentAId = breedState.parentBId;
  breedState.parentBId = tmp;
  renderBreedTab();
  openBreedConfirmModal();
}

function renderBreedConfirmModal() {
  const body = document.getElementById('breed-confirm-body');
  if (!body) return;

  const monA = captured.find(x => x.id === breedState.parentAId);
  const monB = captured.find(x => x.id === breedState.parentBId);
  if (!monA || !monB) return;

  const stA = getMonStats(monA);
  const stB = getMonStats(monB);
  const inh = getInheritedBreedTraitsAndSkills(monA, monB);
  const childDisp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(inh.childName) : '魔';
  const newPlus = (Number(monA.plus) || 0) + (Number(monB.plus) || 0) + 1;
  const newMaxLv = Math.max(Number(monA.maxLv) || 10, Number(monB.maxLv) || 10) + 5;
  const cost = getBreedCost(monA, monB);

  const bonusHp = Math.floor((stA.maxHp + stB.maxHp) * 0.12);
  const bonusAtk = Math.floor((stA.atk + stB.atk) * 0.12);
  const bonusDef = Math.floor((stA.def + stB.def) * 0.12);

  const traitsHtml = inh.traits.map(tid => {
    const tr = typeof getMonsterTrait === 'function' ? getMonsterTrait(tid) : { name: tid, desc: '' };
    const tags = [];
    if (tid === inh.innateC_T) tags.push('子固有');
    if (tid === inh.innateA_T) tags.push('親1固有');
    if (tid === inh.innateB_T) tags.push('親2固有');
    return `
      <div style="border:1.5px solid #ffb74d;background:#fffdf7;border-radius:8px;padding:7px 9px;margin-bottom:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:bold;color:#263238;">
          <span>${tr.name}</span>
          <span style="font-size:9px;background:#ff7043;color:#fff;padding:1px 5px;border-radius:4px;">${tags.join('・')}</span>
        </div>
        <div style="font-size:10px;color:#546e7a;margin-top:2px;">${tr.desc}</div>
      </div>
    `;
  }).join('');

  const skillsHtml = inh.skills.map(sid => {
    const sk = typeof getSkillById === 'function' ? getSkillById(sid) : { name: sid, elem: 'none', mult: 1.0, rate: 0.3, desc: '' };
    const tags = [];
    if (sid === inh.innateC_S) tags.push('子固有');
    if (sid === inh.innateA_S) tags.push('親1固有');
    if (sid === inh.innateB_S) tags.push('親2固有');
    return `
      <div style="border:1.5px solid #81d4fa;background:#f8fdff;border-radius:8px;padding:7px 9px;margin-bottom:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:bold;color:#263238;">
          <span>${sk.name} ${typeof renderElementBadge === 'function' ? renderElementBadge(sk.elem) : ''}</span>
          <span style="font-size:9px;background:#0288d1;color:#fff;padding:1px 5px;border-radius:4px;">${tags.join('・')}</span>
        </div>
        <div style="font-size:10px;color:#546e7a;margin-top:2px;">${sk.desc}（威力${Math.round((sk.mult || 1) * 100)}% / 発動${Math.round((sk.rate || 0.3) * 100)}%）</div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 30px 1fr 24px 1fr;align-items:center;text-align:center;gap:4px;margin-bottom:10px;">
      <div style="border:1px solid #cfd8dc;border-radius:10px;padding:6px;background:#f8fdff;">
        <div style="font-size:10px;color:#0288d1;font-weight:bold;">親1</div>
        <div style="margin:4px 0;">${renderSprite(getMonsterVisual(monA), 42, '8px')}</div>
        <div style="font-size:10px;font-weight:bold;">Lv.${stA.lv}</div>
      </div>
      <button onclick="swapBreedParents()" style="width:28px;height:28px;border-radius:50%;border:1px solid #ffb74d;background:#fff8e1;color:#e65100;font-weight:bold;cursor:pointer;">⇄</button>
      <div style="border:1px solid #cfd8dc;border-radius:10px;padding:6px;background:#f8fdff;">
        <div style="font-size:10px;color:#ff7043;font-weight:bold;">親2</div>
        <div style="margin:4px 0;">${renderSprite(getMonsterVisual(monB), 42, '8px')}</div>
        <div style="font-size:10px;font-weight:bold;">Lv.${stB.lv}</div>
      </div>
      <div style="font-weight:bold;color:#546e7a;">→</div>
      <div style="border:2px solid #ff7043;border-radius:10px;padding:6px;background:#fff8f6;">
        <div style="font-size:10px;color:#e65100;font-weight:bold;">${inh.childName} +${newPlus}</div>
        <div style="margin:4px 0;">${renderSprite(childDisp, 42, '8px')}</div>
        <div style="font-size:10px;font-weight:bold;">上限Lv.${newMaxLv}</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:bold;color:#546e7a;margin-bottom:4px;">継承ボーナス値</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border:1.5px solid #ffb74d;background:#fffdf7;border-radius:8px;padding:6px;text-align:center;margin-bottom:10px;">
      <div><div style="font-size:10px;color:#e53935;">HP</div><div style="font-size:13px;font-weight:bold;color:#e65100;">+${bonusHp}</div></div>
      <div><div style="font-size:10px;color:#fb8c00;">攻撃</div><div style="font-size:13px;font-weight:bold;color:#e65100;">+${bonusAtk}</div></div>
      <div><div style="font-size:10px;color:#1e88e5;">防御</div><div style="font-size:13px;font-weight:bold;color:#e65100;">+${bonusDef}</div></div>
    </div>

    <div style="font-size:11px;font-weight:bold;color:#37474f;margin-bottom:4px;">継承される固有特性（${inh.traits.length}つ・重複統合）</div>
    <div style="margin-bottom:10px;">${traitsHtml}</div>

    <div style="font-size:11px;font-weight:bold;color:#37474f;margin-bottom:4px;">継承される固有スキル（${inh.skills.length}つ・重複統合）</div>
    <div style="margin-bottom:12px;">${skillsHtml}</div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
      <button class="btn-coral" onclick="executeVisualBreed()">配合する（${cost.toLocaleString()} G）</button>
      <button class="btn-gray" style="background:#eceff1;color:#37474f;" onclick="closeBreedConfirmModal()">閉じる</button>
    </div>
  `;
}

function executeVisualBreed() {
  const monA = captured.find(x => x.id === breedState.parentAId);
  const monB = captured.find(x => x.id === breedState.parentBId);
  if (!monA || !monB) return;

  const cost = getBreedCost(monA, monB);
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);

  const stA = getMonStats(monA);
  const stB = getMonStats(monB);
  const inh = getInheritedBreedTraitsAndSkills(monA, monB);
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(inh.childName) : { name: inh.childName, elem: 'none', baseHp: 65, baseAtk: 12, baseDef: 4, ct: 1.7 };

  const newPlus = (Number(monA.plus) || 0) + (Number(monB.plus) || 0) + 1;
  const newMaxLv = Math.max(Number(monA.maxLv) || 10, Number(monB.maxLv) || 10) + 5;
  const bonusHp = Math.floor((stA.maxHp + stB.maxHp) * 0.12);
  const bonusAtk = Math.floor((stA.atk + stB.atk) * 0.12);
  const bonusDef = Math.floor((stA.def + stB.def) * 0.12);

  gold -= cost;

  const usedIds = [monA.id, monB.id];
  party = party.map(id => usedIds.includes(id) ? null : id);
  trainingSlots = (trainingSlots || []).map(id => usedIds.includes(id) ? null : id);
  staff = (staff || []).map(id => usedIds.includes(id) ? null : id);
  captured = captured.filter(m => !usedIds.includes(m.id));

  const childMon = {
    id: 'M' + Date.now(),
    name: sp.name,
    elem: sp.elem,
    lv: 1,
    maxLv: newMaxLv,
    exp: 0,
    plus: newPlus,
    bonusHp,
    bonusAtk,
    bonusDef,
    baseHp: sp.baseHp,
    baseAtk: sp.baseAtk,
    baseDef: sp.baseDef,
    ct: sp.ct,
    skills: inh.skills,
    traits: inh.traits,
    customSkin: null,
    customBgIdx: -1
  };
  captured.push(childMon);
  if (!speciesSkins[sp.name]) speciesSkins[sp.name] = { list: [], activeIdx: -1 };

  const emptyParty = party.findIndex(x => x === null);
  if (emptyParty !== -1) party.splice(emptyParty, 1, childMon.id);

  breedState.parentAId = '';
  breedState.parentBId = '';

  closeBreedConfirmModal();
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderCafe === 'function') renderCafe();
  renderBreedTab();
  updateUI();
  triggerAutoSave(true);
  showToast(`配合成功！${sp.name}+${newPlus}（上限Lv.${newMaxLv}）が誕生しました！`);
}

function updateSelectOptions() { renderBreedTab(); }