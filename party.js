// パーティ編成・訓練場・仲間一覧・モンスター詳細・野に還す(逃がす) (party.js)
let selectedMonsterIdx = null;
let synthBaseIdx = null;
let synthMaterialIdx = null;

function getMonsterMaxLevel(mon) {
  const star = Number(mon?.star || 0);
  return 20 + star * 10;
}

function getTrainingCap() {
  if (typeof trainSlotCap !== 'undefined') return Number(trainSlotCap) || 3;
  if (typeof unlockedTrainSlots !== 'undefined') return Number(unlockedTrainSlots) || 3;
  if (Array.isArray(trainingSlots) && trainingSlots.length > 0) return trainingSlots.length;
  return 3;
}

function getMonsterBattleStats(mon) {
  if (!mon) return { maxHp: 50, atk: 10, ctMax: 2.0 };
  const lv = Math.max(1, Number(mon.lv) || 1);
  const star = Number(mon.star || 0);
  const sp = typeof getSpeciesByName === 'function' ? getSpeciesByName(mon.name) : null;
  const rar = mon.rarity || sp?.rarity || 'N';
  const rarMul = rar === 'UR' ? 2.1 : (rar === 'SR' ? 1.65 : (rar === 'R' ? 1.3 : 1.0));
  const starMul = 1 + star * 0.22;

  const tavernBonus = typeof getTavernRecipeBonus === 'function' ? getTavernRecipeBonus() : { atkPct: 0, hpPct: 0 };
  const hpMul = 1 + (tavernBonus.hpPct || 0) / 100;
  const atkMul = 1 + (tavernBonus.atkPct || 0) / 100;

  const baseHp = sp?.baseHp || 65;
  const baseAtk = sp?.baseAtk || 14;
  const maxHp = Math.floor((baseHp + (lv - 1) * 18) * rarMul * starMul * hpMul);
  const atk = Math.floor((baseAtk + (lv - 1) * 4.5) * rarMul * starMul * atkMul);
  const ctMax = Math.max(0.85, (sp?.ctMax || 2.1) - star * 0.05);
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
        const sp = typeof getSpeciesByName === 'function' ? getSpeciesByName(m.name) : null;
        const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : (m.display || sp?.display || 'EMBLEM:none:魔');
        battleAllies[i] = {
          id: m.id,
          name: m.name,
          display: disp,
          elem: m.elem || sp?.elem || 'none',
          skillId: m.skillId || sp?.skillId || null,
          hp: st.maxHp,
          maxHp: st.maxHp,
          atk: st.atk,
          ct: 0,
          ctMax: st.ctMax
        };
      }
    }
  }
  if (typeof renderBattleUnits === 'function') renderBattleUnits();
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

  const sp = typeof getSpeciesByName === 'function' ? getSpeciesByName(enemyObj.name) : null;
  if (!sp) return;
  const rarList = ['N', 'R', 'SR', 'UR'];
  const rarIdx = Math.max(0, rarList.indexOf(sp.rarity || 'N'));
  const stageNum = Number(state?.stage || 1);
  const catchRate = Math.max(0.06, 0.35 - (stageNum - 1) * 0.02 - rarIdx * 0.05);

  if (Math.random() < catchRate) {
    const lv = Math.max(1, (stageNum - 1) * 4 + Math.floor((Number(state?.floor || 1) - 1) / 3) + 1);
    const newMon = typeof createMonsterInstance === 'function'
      ? createMonsterInstance(sp, lv)
      : { id: Date.now() + Math.random(), name: sp.name, lv, exp: 0, star: 0, elem: sp.elem, rarity: sp.rarity, locked: false };
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
      const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
      const st = getMonsterBattleStats(m);
      html += `
        <div onclick="removeFromParty(${i})" style="border:1.5px solid #4fc3f7;background:#f0f9ff;border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;">
          <div style="display:flex;justify-content:center;">${renderSprite(disp, 42, '8px')}</div>
          <div style="font-size:10.5px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
          <div style="font-size:9.5px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1} ★${m.star || 0}</div>
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
      const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
      html += `
        <div onclick="removeFromTraining(${i})" style="border:1.5px solid #81c784;background:#f1f8e9;border-radius:10px;padding:6px 4px;text-align:center;cursor:pointer;">
          <div style="display:flex;justify-content:center;">${renderSprite(disp, 34, '6px')}</div>
          <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
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

  const parentCard = box.closest('.card');
  if (parentCard && !document.getElementById('bulk-release-bar')) {
    const titleEl = parentCard.querySelector('.card-title') || parentCard.firstElementChild;
    if (titleEl) {
      const bar = document.createElement('div');
      bar.id = 'bulk-release-bar';
      bar.style.cssText = 'display:flex;justify-content:flex-end;margin:4px 0 8px;';
      bar.innerHTML = `<button onclick="releaseBulkMonsters()" style="padding:5px 10px;border-radius:8px;border:1px solid #f59e0b;background:#fffbeb;color:#b45309;font-size:10.5px;font-weight:bold;cursor:pointer;">🍃 未編成をまとめて逃がす（素材獲得）</button>`;
      titleEl.insertAdjacentElement('afterend', bar);
    }
  }

  if (!Array.isArray(captured) || captured.length === 0) {
    box.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;padding:16px;">まだ仲間モンスターがいません</div>';
    return;
  }

  box.innerHTML = captured.map((m, idx) => {
    if (!m) return '';
    const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
    const inParty = (party || []).some(v => v === idx || v === m.id);
    const inTrain = (trainingSlots || []).some(v => v === idx || v === m.id);
    const inStaff = (staff || []).some(v => v === idx || v === m.id);
    const badge = inParty ? '<span style="background:#0284c7;color:#fff;padding:1px 4px;border-radius:4px;font-size:8.5px;">編成</span>'
      : (inTrain ? '<span style="background:#2e7d32;color:#fff;padding:1px 4px;border-radius:4px;font-size:8.5px;">訓練</span>'
      : (inStaff ? '<span style="background:#e65100;color:#fff;padding:1px 4px;border-radius:4px;font-size:8.5px;">酒場</span>' : ''));
    const lockMark = m.locked ? '🔒' : '';
    const rarBorder = m.rarity === 'UR' ? '#c084fc' : (m.rarity === 'SR' ? '#f59e0b' : (m.rarity === 'R' ? '#38bdf8' : '#e2e8f0'));

    return `
      <div onclick="openMonsterModal(${idx})" style="border:1.5px solid ${rarBorder};border-radius:10px;padding:6px 2px;text-align:center;background:#ffffff;cursor:pointer;position:relative;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;min-height:13px;padding:0 2px;">
          <span>${badge}</span>
          <span style="font-size:10px;">${lockMark}</span>
        </div>
        <div style="display:flex;justify-content:center;">${renderSprite(disp, 38, '8px')}</div>
        <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
        <div style="font-size:9px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1} ★${m.star || 0}</div>
      </div>
    `;
  }).join('');
}

function openMonsterModal(idx) {
  const m = (captured || [])[idx];
  const modal = document.getElementById('monster-modal');
  const body = document.getElementById('monster-modal-body');
  if (!m || !modal || !body) return;
  selectedMonsterIdx = idx;

  const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
  const st = getMonsterBattleStats(m);
  const maxLv = getMonsterMaxLevel(m);
  const skill = typeof getMonsterSkill === 'function' ? getMonsterSkill(m.skillId) : null;

  body.innerHTML = `
    <div style="text-align:center;">
      <div style="display:flex;justify-content:center;margin-bottom:4px;">${renderSprite(disp, 64, '12px')}</div>
      <div style="font-size:16px;font-weight:900;color:#1e293b;">${m.name} <span style="font-size:12px;color:#ff7043;">★${m.star || 0}</span></div>
      <div style="font-size:12px;color:#0284c7;font-weight:bold;">Lv.${m.lv || 1} / ${maxLv} ｜ HP ${st.maxHp} ｜ 攻撃 ${st.atk}</div>
      ${skill ? `<div style="margin-top:4px;font-size:11px;color:#6d28d9;background:#f3e8ff;padding:3px 8px;border-radius:8px;display:inline-block;">スキル: <b>${skill.name}</b>（${skill.desc}）</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;">
      <button onclick="assignMonsterToParty(${idx})" style="padding:8px;border-radius:8px;border:none;background:#0284c7;color:#fff;font-size:11.5px;font-weight:bold;cursor:pointer;">⚔️ パーティ編成</button>
      <button onclick="assignMonsterToTraining(${idx})" style="padding:8px;border-radius:8px;border:none;background:#2e7d32;color:#fff;font-size:11.5px;font-weight:bold;cursor:pointer;">🏋️ 訓練場へ配置</button>
      <button onclick="toggleMonsterLock(${idx})" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-size:11.5px;font-weight:bold;cursor:pointer;">${m.locked ? '🔓 ロック解除' : '🔒 保護ロック'}</button>
      <button onclick="releaseSingleMonster(${idx})" style="padding:8px;border-radius:8px;border:1px solid #f59e0b;background:#fffbeb;color:#b45309;font-size:11.5px;font-weight:bold;cursor:pointer;">🍃 野に還す(素材)</button>
    </div>
    <button onclick="closeMonsterModal()" style="margin-top:10px;width:100%;padding:8px;border-radius:8px;border:none;background:#64748b;color:#fff;font-size:12px;font-weight:bold;cursor:pointer;">閉じる</button>
  `;
  modal.style.display = 'flex';
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
