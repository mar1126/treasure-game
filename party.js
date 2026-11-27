// パーティ編成・訓練場・仲間一覧・配合・野に還す (party.js)
let selectedMonsterIdx = null;
let breedParent1Idx = null;
let breedParent2Idx = null;

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
  return 20 + getMonsterPlus(mon) * 10;
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

  const baseHp = sp?.baseHp || 65;
  const baseAtk = sp?.baseAtk || 14;
  const maxHp = Math.floor((baseHp + (lv - 1) * 18) * stageMul * plusMul * hpMul);
  const atk = Math.floor((baseAtk + (lv - 1) * 4.5) * stageMul * plusMul * atkMul);
  const ctMax = Math.max(0.85, (sp?.ct || 2.0) - plus * 0.04);
  return { maxHp, atk, ctMax };
}

function resetBattleAllies() {
  battleAllies = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const val = (party || [])[i];
    if (val !== null && val !== undefined) {
      const m = (captured || [])[val] || (captured || []).find(x => x && x.id === val);
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
          skillId: m.skillId || sp?.innateSkill || null,
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
      id: Date.now() + Math.random(),
      name: sp.name,
      lv,
      exp: 0,
      plus: 0,
      star: 0,
      elem: sp.elem || 'none',
      skillId: sp.innateSkill || null,
      locked: false
    };
    captured.push(newMon);
    showToast(`「${newMon.name}」が仲間になった！`);
  }
}
function fixIndicesAfterSplice(removedIdx) {
  if (Array.isArray(party)) {
    party = party.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
  if (Array.isArray(trainingSlots)) {
    trainingSlots = trainingSlots.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
  if (Array.isArray(staff)) {
    staff = staff.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
}

function renderParty() {
  const box = document.getElementById('party-slots');
  if (!box) return;
  let html = '';
  for (let i = 0; i < 3; i++) {
    const val = (party || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || [])[val] || (captured || []).find(x => x && x.id === val)) : null;
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
  const countEl = document.getElementById('training-count');
  if (countEl) {
    const activeCnt = (trainingSlots || []).slice(0, maxSlots).filter(v => v !== null && v !== undefined).length;
    countEl.textContent = `${activeCnt}/${maxSlots}`;
  }

  let html = '';
  for (let i = 0; i < maxSlots; i++) {
    const val = (trainingSlots || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || [])[val] || (captured || []).find(x => x && x.id === val)) : null;
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
  box.style.gridTemplateColumns = 'repeat(4, 1fr)';
  box.style.gap = '6px';

  const cap = typeof maxCaptured !== 'undefined' ? Number(maxCaptured) : 50;
  const countEl = document.getElementById('captured-count');
  if (countEl) countEl.textContent = `${(captured || []).length}/${cap}`;

  if (!document.getElementById('bulk-release-bar')) {
    const bar = document.createElement('div');
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
      <div onclick="openMonsterModal(${idx})" style="aspect-ratio:1/1;border:1.5px solid ${rarBorder};border-radius:10px;padding:3px 2px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;background:#ffffff;cursor:pointer;overflow:hidden;min-width:0;">
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;min-height:12px;padding:0 2px;">
          <span>${badge}</span>
          <span style="font-size:9px;">${lockMark}</span>
        </div>
        <div style="display:flex;justify-content:center;align-items:center;flex:1;">${renderSprite(disp, 34, '6px')}</div>
        <div style="width:100%;text-align:center;line-height:1.15;">
          <div style="font-size:9px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
          <div style="font-size:8.5px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1}${plus > 0 ? `<span style="color:#ff7043;"> +${plus}</span>` : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}
function fixIndicesAfterSplice(removedIdx) {
  if (Array.isArray(party)) {
    party = party.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
  if (Array.isArray(trainingSlots)) {
    trainingSlots = trainingSlots.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
  if (Array.isArray(staff)) {
    staff = staff.map(v => (typeof v === 'number' && v >= 0 && v < 1000) ? (v === removedIdx ? null : (v > removedIdx ? v - 1 : v)) : v);
  }
}

function renderParty() {
  const box = document.getElementById('party-slots');
  if (!box) return;
  let html = '';
  for (let i = 0; i < 3; i++) {
    const val = (party || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || [])[val] || (captured || []).find(x => x && x.id === val)) : null;
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
  const countEl = document.getElementById('training-count');
  if (countEl) {
    const activeCnt = (trainingSlots || []).slice(0, maxSlots).filter(v => v !== null && v !== undefined).length;
    countEl.textContent = `${activeCnt}/${maxSlots}`;
  }

  let html = '';
  for (let i = 0; i < maxSlots; i++) {
    const val = (trainingSlots || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || [])[val] || (captured || []).find(x => x && x.id === val)) : null;
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
  box.style.gridTemplateColumns = 'repeat(4, 1fr)';
  box.style.gap = '6px';

  const cap = typeof maxCaptured !== 'undefined' ? Number(maxCaptured) : 50;
  const countEl = document.getElementById('captured-count');
  if (countEl) countEl.textContent = `${(captured || []).length}/${cap}`;

  if (!document.getElementById('bulk-release-bar')) {
    const bar = document.createElement('div');
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
      <div onclick="openMonsterModal(${idx})" style="aspect-ratio:1/1;border:1.5px solid ${rarBorder};border-radius:10px;padding:3px 2px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;background:#ffffff;cursor:pointer;overflow:hidden;min-width:0;">
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;min-height:12px;padding:0 2px;">
          <span>${badge}</span>
          <span style="font-size:9px;">${lockMark}</span>
        </div>
        <div style="display:flex;justify-content:center;align-items:center;flex:1;">${renderSprite(disp, 34, '6px')}</div>
        <div style="width:100%;text-align:center;line-height:1.15;">
          <div style="font-size:9px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
          <div style="font-size:8.5px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1}${plus > 0 ? `<span style="color:#ff7043;"> +${plus}</span>` : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}
function closeMonsterModal() {
  const modal = document.getElementById('monster-modal');
  if (modal) modal.style.display = 'none';
}

function assignMonsterToParty(idx) {
  if (!Array.isArray(party)) party = [null, null, null];
  const m = captured[idx];
  if (!m) return;
  if (party.some(v => v === idx || v === m.id)) return alert('すでにパーティに編成されています');
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

function toggleMonsterLock(idx) {
  const m = (captured || [])[idx];
  if (!m) return;
  m.locked = !m.locked;
  openMonsterModal(idx);
  renderCaptured();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function renderBreedTab() {
  const p1Box = document.getElementById('breed-p1-slot');
  const p2Box = document.getElementById('breed-p2-slot');
  const childBox = document.getElementById('breed-child-slot');
  const listBox = document.getElementById('breed-candidate-list');
  const btn = document.getElementById('do-breed-btn');

  const p1 = (breedParent1Idx !== null && captured[breedParent1Idx]) ? captured[breedParent1Idx] : null;
  const p2 = (breedParent2Idx !== null && captured[breedParent2Idx]) ? captured[breedParent2Idx] : null;
  if (!p1) breedParent1Idx = null;
  if (!p2) breedParent2Idx = null;

  if (p1Box) {
    if (p1) {
      const d1 = getMonsterVisual(p1);
      p1Box.innerHTML = `<div onclick="breedParent1Idx=null;renderBreedTab();" style="cursor:pointer;">${renderSprite(d1, 36, '6px')}<div style="font-size:10px;font-weight:bold;">${p1.name}+${getMonsterPlus(p1)}</div><div style="font-size:9px;color:#0284c7;">Lv.${p1.lv}</div></div>`;
    } else {
      p1Box.innerHTML = `<div style="font-size:10px;color:#ff7043;font-weight:bold;">親1</div><div style="font-size:18px;color:#94a3b8;">＋</div><div style="font-size:9.5px;color:#64748b;">未選択</div>`;
    }
  }
  if (p2Box) {
    if (p2) {
      const d2 = getMonsterVisual(p2);
      p2Box.innerHTML = `<div onclick="breedParent2Idx=null;renderBreedTab();" style="cursor:pointer;">${renderSprite(d2, 36, '6px')}<div style="font-size:10px;font-weight:bold;">${p2.name}+${getMonsterPlus(p2)}</div><div style="font-size:9px;color:#0284c7;">Lv.${p2.lv}</div></div>`;
    } else {
      p2Box.innerHTML = `<div style="font-size:10px;color:#ff7043;font-weight:bold;">親2</div><div style="font-size:18px;color:#94a3b8;">＋</div><div style="font-size:9.5px;color:#64748b;">未選択</div>`;
    }
  }
  if (childBox) {
    if (p1 && p2) {
      const nextPlus = getMonsterPlus(p1) + getMonsterPlus(p2) + 1;
      const d1 = getMonsterVisual(p1);
      childBox.innerHTML = `${renderSprite(d1, 36, '6px')}<div style="font-size:10px;font-weight:bold;color:#6d28d9;">${p1.name} +${nextPlus}</div><div style="font-size:9px;color:#16a34a;font-weight:bold;">Lv.1 誕生</div>`;
    } else {
      childBox.innerHTML = `<div style="font-size:10px;color:#6d28d9;font-weight:bold;">子</div><div style="font-size:18px;color:#94a3b8;">?</div><div style="font-size:9.5px;color:#64748b;">2体選択</div>`;
    }
  }
  if (btn) {
    btn.disabled = !(p1 && p2);
    btn.style.opacity = (p1 && p2) ? '1' : '0.5';
  }
  if (!listBox) return;

  listBox.style.display = 'grid';
  listBox.style.gridTemplateColumns = 'repeat(4, 1fr)';
  listBox.style.gap = '6px';

  const candidates = (captured || []).map((m, idx) => ({ m, idx })).filter(({ m }) => m && (Number(m.lv) || 1) >= 10);
  if (candidates.length === 0) {
    listBox.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:11px;padding:12px;">Lv.10以上の仲間がいません</div>';
    return;
  }

  listBox.innerHTML = candidates.map(({ m, idx }) => {
    const sel1 = breedParent1Idx === idx;
    const sel2 = breedParent2Idx === idx;
    const disp = getMonsterVisual(m);
    const plus = getMonsterPlus(m);
    return `
      <div onclick="selectBreedCandidate(${idx})" style="aspect-ratio:1/1;border:2px solid ${sel1 ? '#0284c7' : (sel2 ? '#ff7043' : '#e2e8f0')};background:${sel1 ? '#e0f2fe' : (sel2 ? '#fff3e0' : '#fff')};border-radius:10px;padding:3px 2px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;cursor:pointer;">
        <div style="font-size:8.5px;font-weight:bold;color:${sel1 ? '#0284c7' : '#ff7043'};min-height:11px;">${sel1 ? '親1' : (sel2 ? '親2' : '')}</div>
        ${renderSprite(disp, 32, '6px')}
        <div style="font-size:9px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;">${m.name}${plus > 0 ? `+${plus}` : ''}</div>
        <div style="font-size:8.5px;color:#0284c7;">Lv.${m.lv}</div>
      </div>
    `;
  }).join('');
}

function selectBreedCandidate(idx) {
  if (breedParent1Idx === idx) { breedParent1Idx = null; renderBreedTab(); return; }
  if (breedParent2Idx === idx) { breedParent2Idx = null; renderBreedTab(); return; }
  const m = captured[idx];
  if (!m || (Number(m.lv) || 1) < 10) return alert('配合にはLv.10以上のモンスターが必要です');
  if (m.locked) return alert('ロック中のモンスターは配合できません');

  const inParty = (party || []).some(v => v === idx || v === m.id);
  const inTrain = (trainingSlots || []).some(v => v === idx || v === m.id);
  const inStaff = (staff || []).some(v => v === idx || v === m.id);
  if (inParty || inTrain || inStaff) return alert('編成・訓練場・酒場に配置中のモンスターは配合できません');

  if (breedParent1Idx === null) {
    breedParent1Idx = idx;
  } else {
    const p1 = captured[breedParent1Idx];
    if (p1 && p1.name !== m.name) return alert('同じ種類のモンスター同士を選択してください！');
    breedParent2Idx = idx;
  }
  renderBreedTab();
}

function doBreedMonsters() {
  if (breedParent1Idx === null || breedParent2Idx === null) return;
  const p1 = captured[breedParent1Idx];
  const p2 = captured[breedParent2Idx];
  if (!p1 || !p2 || p1.name !== p2.name) return;

  const nextPlus = getMonsterPlus(p1) + getMonsterPlus(p2) + 1;
  const child = {
    id: Date.now() + Math.random(),
    name: p1.name,
    lv: 1,
    exp: 0,
    plus: nextPlus,
    star: nextPlus,
    elem: p1.elem,
    skillId: p1.skillId,
    locked: false
  };

  const highIdx = Math.max(breedParent1Idx, breedParent2Idx);
  const lowIdx = Math.min(breedParent1Idx, breedParent2Idx);
  captured.splice(highIdx, 1);
  fixIndicesAfterSplice(highIdx);
  captured.splice(lowIdx, 1);
  fixIndicesAfterSplice(lowIdx);

  captured.push(child);
  breedParent1Idx = null;
  breedParent2Idx = null;

  renderBreedTab();
  renderCaptured();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
  showToast(`配合成功！「${child.name} +${nextPlus}」が誕生しました！`);
}

window.renderBreedTab = renderBreedTab;
window.doBreedMonsters = doBreedMonsters;
