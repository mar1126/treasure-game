// パーティ編成・訓練場・仲間一覧・モンスター詳細・野に還す (party.js)
let selectedMonsterIdx = null;

function getMonsterVisual(mon) {
  if (!mon) return 'EMBLEM:none:魔';
  const name = typeof mon === 'string' ? mon : mon.name;
  if (typeof getSpeciesDisplay === 'function') return getSpeciesDisplay(name);
  return 'EMBLEM:none:魔';
}
window.getMonsterVisual = getMonsterVisual;

function getMonsterPlus(mon) {
  if (!mon) return 0;
  return Math.max(Number(mon.plus) || 0, Number(mon.star) || 0);
}

function getMonsterMaxLevel(mon) {
  return (Number(mon?.maxLv) || 20) + getMonsterPlus(mon) * 10;
}

function getTrainingCap() {
  if (typeof maxTrainingSlots !== 'undefined') return Number(maxTrainingSlots) || 3;
  if (Array.isArray(trainingSlots) && trainingSlots.length > 0) return trainingSlots.length;
  return 3;
}

function getMonsterBattleStats(mon) {
  if (!mon) return { maxHp: 50, atk: 10, ctMax: 2.0 };
  const lv = Math.max(1, Number(mon.lv) || 1);
  const plus = getMonsterPlus(mon);
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(mon.name) : null;
  const stageMul = 1 + ((Number(sp?.stage) || 1) - 1) * 0.25;
  const plusMul = 1 + plus * 0.22;

  const tavernBonus = typeof getTavernRecipeBonus === 'function' ? getTavernRecipeBonus() : { atkPct: 0, hpPct: 0 };
  const hpMul = 1 + (tavernBonus.hpPct || 0) / 100;
  const atkMul = 1 + (tavernBonus.atkPct || 0) / 100;

  const baseHp = Number(mon.baseHp) || sp?.baseHp || 65;
  const baseAtk = Number(mon.baseAtk) || sp?.baseAtk || 14;
  const bonusHp = Number(mon.bonusHp) || 0;
  const bonusAtk = Number(mon.bonusAtk) || 0;

  const maxHp = Math.floor((baseHp + (lv - 1) * 18 + bonusHp) * stageMul * plusMul * hpMul);
  const atk = Math.floor((baseAtk + (lv - 1) * 4.5 + bonusAtk) * stageMul * plusMul * atkMul);
  const ctMax = Math.max(0.85, (Number(mon.ct) || sp?.ct || 2.0) - plus * 0.04);
  return { maxHp, atk, ctMax };
}

function resetBattleAllies() {
  battleAllies = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const val = (party || [])[i];
    if (val !== null && val !== undefined) {
      const m = (typeof val === 'object' && val !== null) ? val : ((captured || []).find(x => x && (x.id === val || captured.indexOf(x) === val)));
      if (m) {
        const st = getMonsterBattleStats(m);
        const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : null;
        const disp = getMonsterVisual(m);
        battleAllies[i] = {
          id: m.id,
          monRef: m,
          name: m.name,
          disp: disp,
          elem: m.elem || sp?.elem || 'none',
          skillId: (Array.isArray(m.skills) ? m.skills[0] : m.skillId) || sp?.innateSkill || null,
          hp: st.maxHp,
          maxHp: st.maxHp,
          atk: st.atk,
          ct: 0,
          ctMax: st.ctMax
        };
      }
    }
  }
  if (typeof updateUI === 'function') updateUI();
}

function grantExpToMonster(mon, amount) {
  if (!mon || amount <= 0) return;
  const maxLv = getMonsterMaxLevel(mon);
  if ((Number(mon.lv) || 1) >= maxLv) {
    mon.lv = maxLv;
    mon.exp = 0;
    return;
  }
  mon.lv = Number(mon.lv) || 1;
  mon.exp = (Number(mon.exp) || 0) + Number(amount);
  let need = Math.floor(25 * Math.pow(1.22, mon.lv - 1));
  while (mon.exp >= need && mon.lv < maxLv) {
    mon.exp -= need;
    mon.lv += 1;
    need = Math.floor(25 * Math.pow(1.22, mon.lv - 1));
  }
  if (mon.lv >= maxLv) {
    mon.lv = maxLv;
    mon.exp = 0;
  }
}

function tryAutoRecruit(enemyObj) {
  if (!enemyObj) return;
  const cap = typeof maxCaptured !== 'undefined' ? Number(maxCaptured) : 50;
  if (!Array.isArray(captured) || captured.length >= cap) return;

  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(enemyObj.rawName || enemyObj.name) : null;
  if (!sp) return;
  const stageNum = Number(state?.stage || 1);
  const catchRate = Math.max(0.08, 0.35 - (stageNum - 1) * 0.02);

  if (Math.random() < catchRate) {
    const lv = Math.max(1, (stageNum - 1) * 4 + Math.floor((Number(state?.floor || 1) - 1) / 3) + 1);
    const newMon = {
      id: 'M' + Date.now() + Math.floor(Math.random() * 1000),
      name: sp.name,
      lv,
      maxLv: 20,
      exp: 0,
      plus: 0,
      star: 0,
      elem: sp.elem || 'none',
      baseHp: sp.baseHp || 65,
      baseAtk: sp.baseAtk || 14,
      baseDef: sp.baseDef || 4,
      ct: sp.ct || 2.0,
      skills: [sp.innateSkill || 'tackle'],
      traits: [sp.innateTrait || 'valor'],
      locked: false
    };
    captured.push(newMon);
    if (typeof renderCaptured === 'function') renderCaptured();
    if (typeof updateUI === 'function') updateUI();
    if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
    showToast(`「${newMon.name}」が仲間になった！`);
  }
}

function fixIndicesAfterSplice(removedIdxOrId) {
  if (Array.isArray(party)) {
    party = party.map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string' && typeof removedIdxOrId === 'string' && v === removedIdxOrId) return null;
      if (typeof v === 'number' && typeof removedIdxOrId === 'number') {
        if (v === removedIdxOrId) return null;
        if (v > removedIdxOrId) return v - 1;
      }
      return v;
    });
  }
  if (Array.isArray(trainingSlots)) {
    trainingSlots = trainingSlots.map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string' && typeof removedIdxOrId === 'string' && v === removedIdxOrId) return null;
      if (typeof v === 'number' && typeof removedIdxOrId === 'number') {
        if (v === removedIdxOrId) return null;
        if (v > removedIdxOrId) return v - 1;
      }
      return v;
    });
  }
  if (Array.isArray(staff)) {
    staff = staff.map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string' && typeof removedIdxOrId === 'string' && v === removedIdxOrId) return null;
      if (typeof v === 'number' && typeof removedIdxOrId === 'number') {
        if (v === removedIdxOrId) return null;
        if (v > removedIdxOrId) return v - 1;
      }
      return v;
    });
  }
}

function renderParty() {
  const box = document.getElementById('party-slots');
  if (!box) return;
  let html = '';
  for (let i = 0; i < 3; i++) {
    const val = (party || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || []).find(x => x && (x.id === val || captured.indexOf(x) === val))) : null;
    if (m) {
      const disp = getMonsterVisual(m);
      const st = getMonsterBattleStats(m);
      const plus = getMonsterPlus(m);
      const plusBadge = plus > 0 ? `<span style="color:#ff7043;font-weight:900;"> +${plus}</span>` : '';
      html += `
        <div onclick="removeFromParty(${i})" style="border:1.5px solid #4fc3f7;background:#f0f9ff;border-radius:12px;padding:7px 4px;text-align:center;cursor:pointer;">
          <div style="display:flex;justify-content:center;">${renderSprite(disp, 42, '8px')}</div>
          <div style="font-size:10.5px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}${plusBadge}</div>
          <div style="font-size:9.5px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1}</div>
          <div style="font-size:9px;color:#64748b;">HP${st.maxHp} 攻${st.atk}</div>
        </div>
      `;
    } else {
      html += `
        <div style="border:1.5px dashed #cbd5e1;background:#f8fafc;border-radius:12px;padding:18px 4px;text-align:center;color:#94a3b8;font-size:11px;font-weight:bold;">
          空き枠 ${i + 1}
        </div>
      `;
    }
  }
  box.innerHTML = html;
}

function removeFromParty(slotIdx) {
  if (!Array.isArray(party)) return;
  party[slotIdx] = null;
  if (!state?.inBattle) resetBattleAllies();
  renderParty();
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function renderTraining() {
  const box = document.getElementById('training-slots');
  if (!box) return;
  const maxSlots = getTrainingCap();
  const countEl = document.getElementById('train-count-disp') || document.getElementById('training-count-disp') || document.getElementById('training-count');
  if (countEl) {
    const activeCnt = (trainingSlots || []).slice(0, maxSlots).filter(v => v !== null && v !== undefined).length;
    countEl.textContent = `${activeCnt}/${maxSlots}`;
  }

  let html = '';
  for (let i = 0; i < maxSlots; i++) {
    const val = (trainingSlots || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || []).find(x => x && (x.id === val || captured.indexOf(x) === val))) : null;
    if (m) {
      const disp = getMonsterVisual(m);
      const plus = getMonsterPlus(m);
      const plusBadge = plus > 0 ? `<span style="color:#ff7043;font-weight:900;">+${plus}</span>` : '';
      html += `
        <div onclick="removeFromTraining(${i})" style="border:1.5px solid #81c784;background:#f1f8e9;border-radius:10px;padding:6px 4px;text-align:center;cursor:pointer;">
          <div style="display:flex;justify-content:center;">${renderSprite(disp, 34, '6px')}</div>
          <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}${plusBadge}</div>
          <div style="font-size:9px;color:#2e7d32;font-weight:bold;">Lv.${m.lv || 1}/${getMonsterMaxLevel(m)}</div>
        </div>
      `;
    } else {
      html += `
        <div style="border:1.5px dashed #cbd5e1;background:#f8fafc;border-radius:10px;padding:14px 4px;text-align:center;color:#94a3b8;font-size:10px;">
          訓練枠 ${i + 1}
        </div>
      `;
    }
  }
  box.innerHTML = html;
}

function removeFromTraining(slotIdx) {
  if (!Array.isArray(trainingSlots)) return;
  trainingSlots[slotIdx] = null;
  renderTraining();
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function renderCaptured() {
  const box = document.getElementById('captured-list');
  if (!box) return;

  box.style.display = 'grid';
  box.style.gridTemplateColumns = 'repeat(5, 1fr)';
  box.style.gap = '4px';

  const cap = typeof maxCaptured !== 'undefined' ? Number(maxCaptured) : 50;
  const countEl = document.getElementById('mon-count-disp') || document.getElementById('captured-count');
  if (countEl) countEl.textContent = `${(captured || []).length}/${cap}`;

  let bar = document.getElementById('bulk-release-bar');
  if (!bar && box.parentNode) {
    bar = document.createElement('div');
    bar.id = 'bulk-release-bar';
    bar.style.cssText = 'display:flex;justify-content:flex-end;margin:6px 0 8px;';
    bar.innerHTML = `<button onclick="releaseBulkMonsters()" style="padding:5px 10px;border-radius:8px;border:1px solid #f59e0b;background:#fffbeb;color:#b45309;font-size:10.5px;font-weight:bold;cursor:pointer;">🍃 未編成をまとめて逃がす（素材獲得）</button>`;
    box.parentNode.insertBefore(bar, box);
  }

  if (!Array.isArray(captured) || captured.length === 0) {
    box.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;padding:16px;">まだ仲間モンスターがいません</div>';
    return;
  }

  box.innerHTML = captured.map((m, idx) => {
    if (!m) return '';
    const disp = getMonsterVisual(m);
    const plus = getMonsterPlus(m);
    const inParty = (party || []).some(v => v === idx || v === m.id);
    const inTrain = (trainingSlots || []).some(v => v === idx || v === m.id);
    const inStaff = (staff || []).some(v => v === idx || v === m.id);
    const badge = inParty ? '<span style="background:#0284c7;color:#fff;padding:0 3px;border-radius:4px;font-size:8px;font-weight:bold;">編成</span>'
      : (inTrain ? '<span style="background:#2e7d32;color:#fff;padding:0 3px;border-radius:4px;font-size:8px;font-weight:bold;">訓練</span>'
      : (inStaff ? '<span style="background:#e65100;color:#fff;padding:0 3px;border-radius:4px;font-size:8px;font-weight:bold;">酒場</span>' : ''));
    const lockMark = m.locked ? '🔒' : '';
    const rarBorder = m.rarity === 'UR' ? '#c084fc' : (m.rarity === 'SR' ? '#f59e0b' : (m.rarity === 'R' ? '#38bdf8' : '#cbd5e1'));

    return `
      <div onclick="openMonsterModal(${idx})" class="mini-mon-card ${inParty ? 'in-party' : (inTrain ? 'train' : '')}" style="border-color:${rarBorder};">
        <div class="m-top"><span class="m-lv">Lv.${m.lv || 1}</span>${badge}${lockMark ? `<span style="font-size:8px;">${lockMark}</span>` : ''}</div>
        <div class="m-icon">${renderSprite(disp, 32, '8px')}</div>
        <div class="m-bot">${plus > 0 ? `<span class="m-plus">+${plus}</span>` : `<span class="m-nm">${m.name}</span>`}</div>
      </div>
    `;
  }).join('');
}

function openMonsterModal(idx) {
  const m = (captured || [])[idx];
  if (!m) return;
  selectedMonsterIdx = idx;

  const modal = document.getElementById('mon-modal') || document.getElementById('monster-modal');
  if (!modal) return;

  const disp = getMonsterVisual(m);
  const st = getMonsterBattleStats(m);
  const maxLv = getMonsterMaxLevel(m);
  const plus = getMonsterPlus(m);
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : null;
  const skillId = (Array.isArray(m.skills) ? m.skills[0] : m.skillId) || sp?.innateSkill || null;
  const skill = (typeof SKILL_MASTER === 'object' && SKILL_MASTER[skillId]) ? SKILL_MASTER[skillId] : (typeof getSkillById === 'function' ? getSkillById(skillId) : null);
  const elemMap = { fire: '🔥 火属性', water: '💧 水属性', wind: '🍃 風属性', sky: '⚡ 空属性', earth: '🪨 地属性', light: '✨ 光属性', dark: '🌙 闇属性', none: '⚪ 無属性' };
  const elemLabel = elemMap[m.elem || sp?.elem || 'none'] || '無属性';
  const needExp = Math.floor(25 * Math.pow(1.22, (Number(m.lv) || 1) - 1));
  const curExp = Number(m.exp) || 0;

  const inParty = (party || []).some(v => v === idx || v === m.id);

  const spriteEl = document.getElementById('modal-mon-sprite');
  const nameEl = document.getElementById('modal-mon-name');
  const rarityEl = document.getElementById('modal-mon-rarity');
  const lvEl = document.getElementById('modal-mon-lv');
  const atkEl = document.getElementById('modal-mon-atk');
  const terrainEl = document.getElementById('modal-mon-terrain');
  const skillEl = document.getElementById('modal-mon-skill');
  const traitEl = document.getElementById('modal-mon-trait');
  const partyBtn = document.getElementById('modal-party-btn');

  if (spriteEl) spriteEl.innerHTML = renderSprite(disp, 58, '12px');
  if (nameEl) nameEl.textContent = `${m.name} ${plus > 0 ? `+${plus}` : ''}`;
  if (rarityEl) rarityEl.textContent = m.rarity || sp?.rarity || 'N';
  if (lvEl) lvEl.textContent = `Lv.${m.lv || 1} / ${maxLv} (EXP: ${curExp}/${needExp})`;
  if (atkEl) atkEl.textContent = `HP: ${st.maxHp} ｜ 攻撃力: ${st.atk} ｜ CT: ${st.ctMax.toFixed(2)}s`;
  if (terrainEl) terrainEl.textContent = elemLabel;
  if (skillEl) skillEl.textContent = skill ? `${skill.name}（威力${Math.round((skill.mult||1)*100)}%）` : (skillId || '通常攻撃');
  if (traitEl) {
    const traitId = Array.isArray(m.traits) ? m.traits[0] : (m.trait || sp?.innateTrait || 'valor');
    const tr = typeof getMonsterTrait === 'function' ? getMonsterTrait(traitId) : { name: traitId, desc: '' };
    traitEl.textContent = `${tr.name}: ${tr.desc}`;
  }
  if (partyBtn) {
    partyBtn.textContent = inParty ? '⚔️ パーティから外す' : '⚔️ パーティに編成する';
    partyBtn.onclick = () => {
      if (inParty) {
        const pIdx = party.findIndex(v => v === idx || v === m.id);
        if (pIdx !== -1) removeFromParty(pIdx);
      } else {
        assignMonsterToParty(idx);
      }
      closeMonsterModal();
    };
  }

  modal.style.display = 'flex';
}
window.openMonsterModal = openMonsterModal;

function closeMonsterModal() {
  const modal = document.getElementById('mon-modal') || document.getElementById('monster-modal');
  if (modal) modal.style.display = 'none';
}
window.closeMonsterModal = closeMonsterModal;

function closeMonModal() {
  closeMonsterModal();
}
window.closeMonModal = closeMonModal;

function assignMonsterToParty(idx) {
  if (!Array.isArray(party)) party = [null, null, null];
  const m = captured[idx];
  if (!m) return;
  if (party.some(v => v === idx || v === m.id)) return alert('すでにパーティに編成されています');
  if (Array.isArray(trainingSlots) && trainingSlots.some(v => v === idx || v === m.id)) {
    return alert('訓練場に配置されているモンスターはパーティに編成できません');
  }
  const emptySlot = party.findIndex(v => v === null || v === undefined);

  if (emptySlot === -1) return alert('パーティ枠（3体）がいっぱいです');
  party[emptySlot] = idx;
  if (!state?.inBattle) resetBattleAllies();
  closeMonsterModal();
  renderParty();
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function assignMonsterToTraining(idx) {
  const maxSlots = getTrainingCap();
  if (!Array.isArray(trainingSlots)) trainingSlots = new Array(maxSlots).fill(null);
  const m = captured[idx];
  if (!m) return;
  if (trainingSlots.some(v => v === idx || v === m.id)) return alert('すでに訓練場に配置されています');
  if (Array.isArray(party) && party.some(v => v === idx || v === m.id)) {
    return alert('パーティに編成されているモンスターは訓練場に配置できません');
  }
  let emptySlot = -1;

  for (let i = 0; i < maxSlots; i++) {
    if (trainingSlots[i] === null || trainingSlots[i] === undefined) { emptySlot = i; break; }
  }
  if (emptySlot === -1) return alert('訓練枠がいっぱいです');
  trainingSlots[emptySlot] = idx;
  closeMonsterModal();
  renderTraining();
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function assignTrainingFromModal() {
  if (selectedMonsterIdx !== null && selectedMonsterIdx >= 0) {
    assignMonsterToTraining(selectedMonsterIdx);
  }
}

function assignStaffFromModal() {
  if (selectedMonsterIdx !== null && selectedMonsterIdx >= 0) {
    if (typeof openStaffSelectModal === 'function') {
      closeMonsterModal();
      openStaffSelectModal(0);
    }
  }
}

function togglePartyFromModal() {
  if (selectedMonsterIdx !== null && selectedMonsterIdx >= 0) {
    assignMonsterToParty(selectedMonsterIdx);
  }
}

function toggleMonsterLock(idx) {
  const m = (captured || [])[idx];
  if (!m) return;
  m.locked = !m.locked;
  openMonsterModal(idx);
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}