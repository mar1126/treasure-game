// 冒険者の酒場・看板店員・料理売上リアルタイム連動 (cafe.js)
function getCafeIncome() {
  const baseLv = Math.max(1, Number(cafeLv) || 1);
  let staffBonus = 0;
  (staff || []).forEach(val => {
    if (val !== null && val !== undefined) {
      const m = (captured || [])[val] || (captured || []).find(x => x && x.id === val);
      if (m) {
        const rarMul = m.rarity === 'UR' ? 3.5 : (m.rarity === 'SR' ? 2.2 : (m.rarity === 'R' ? 1.5 : 1.0));
        staffBonus += Math.floor((6 + (Number(m.lv) || 1) * 2.5) * rarMul);
      }
    }
  });

  const recipeBonus = typeof getTavernRecipeBonus === 'function' ? getTavernRecipeBonus().extraGps : 0;
  return Math.floor(baseLv * 8 + staffBonus + recipeBonus);
}

window.getCafeIncome = getCafeIncome;
window.calcCafeIncome = getCafeIncome;

if (!window._tavernIncomeTimer) {
  window._tavernIncomeTimer = setInterval(() => {
    const inc = getCafeIncome();
    if (inc > 0 && typeof gold !== 'undefined') {
      gold += inc;
      const goldEl = document.getElementById('gold');
      if (goldEl) goldEl.textContent = Math.floor(gold).toLocaleString();
    }
  }, 1000);
}

function upgradeCafe() {
  const cost = Number(typeof cafeUpgradeCost !== 'undefined' ? cafeUpgradeCost : (typeof cafeCost !== 'undefined' ? cafeCost : 80)) || 80;
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);
  gold -= cost;
  cafeLv = (Number(cafeLv) || 1) + 1;
  const nextCost = Math.floor(cost * 1.65);
  if (typeof cafeUpgradeCost !== 'undefined') cafeUpgradeCost = nextCost;
  if (typeof cafeCost !== 'undefined') cafeCost = nextCost;
  renderCafe();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
  showToast(`酒場ランクが Lv.${cafeLv} に上がりました！`);
}

function openStaffSelectModal(slotIdx) {
  let modal = document.getElementById('staff-modal');
  let listEl = document.getElementById('staff-select-list');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'staff-modal';
    modal.onclick = closeStaffSelectModal;
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.62);display:none;align-items:center;justify-content:center;z-index:9998;';
    modal.innerHTML = `<div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:14px;width:90%;max-width:340px;">
      <div style="font-size:14px;font-weight:bold;color:#e65100;margin-bottom:8px;">🐾 看板店員を選択</div>
      <div id="staff-select-list"></div>
      <button onclick="closeStaffSelectModal()" style="margin-top:10px;width:100%;padding:8px;border-radius:8px;border:none;background:#64748b;color:#fff;font-size:12px;font-weight:bold;cursor:pointer;">閉じる</button>
    </div>`;
    document.body.appendChild(modal);
    listEl = document.getElementById('staff-select-list');
  }

  let html = `<button onclick="assignStaffSlot(${slotIdx}, null)" style="width:100%;padding:8px;margin-bottom:8px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-size:12px;font-weight:bold;cursor:pointer;">店員を外す（空きにする）</button>`;
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:260px;overflow-y:auto;">`;

  (captured || []).forEach((m, idx) => {
    if (!m) return;
    const inParty = (party || []).some(v => v === idx || v === m.id);
    const inTrain = (trainingSlots || []).some(v => v === idx || v === m.id);
    const alreadyStaff = (staff || []).some((v, sIdx) => sIdx !== slotIdx && (v === idx || v === m.id));
    if (inParty || inTrain || alreadyStaff) return;

    const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
    html += `
      <div onclick="assignStaffSlot(${slotIdx}, ${idx})" style="border:1.5px solid #e2e8f0;border-radius:10px;padding:6px 4px;text-align:center;cursor:pointer;background:#ffffff;">
        <div style="display:flex;justify-content:center;">${renderSprite(disp, 36, '8px')}</div>
        <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
        <div style="font-size:9.5px;color:#0284c7;">Lv.${m.lv || 1}</div>
      </div>
    `;
  });
  html += `</div>`;
  listEl.innerHTML = html;
  modal.style.display = 'flex';
}

function closeStaffSelectModal() {
  const modal = document.getElementById('staff-modal');
  if (modal) modal.style.display = 'none';
}

function assignStaffSlot(slotIdx, capturedIdx) {
  if (!Array.isArray(staff)) staff = [null, null, null];
  staff[slotIdx] = capturedIdx;
  closeStaffSelectModal();
  renderCafe();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
}

function renderCafe() {
  const pane = document.getElementById('tab-cafe');
  if (!pane) return;

  // 旧ガーデン装飾ショップのカードを確実に削除
  pane.querySelectorAll('.card').forEach(c => {
    if (c.id !== 'tavern-recipe-card' && c.textContent.includes('ガーデン装飾')) {
      c.remove();
    }
  });

  const firstCard = pane.querySelector('.card');
  const income = getCafeIncome();
  const lv = Number(cafeLv) || 1;
  const cost = Number(typeof cafeUpgradeCost !== 'undefined' ? cafeUpgradeCost : (typeof cafeCost !== 'undefined' ? cafeCost : 80)) || 80;

  let staffHtml = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">`;
  for (let i = 0; i < 3; i++) {
    const val = (staff || [])[i];
    const m = (val !== null && val !== undefined) ? ((captured || [])[val] || (captured || []).find(x => x && x.id === val)) : null;
    if (m) {
      const disp = typeof getSpeciesDisplay === 'function' ? getSpeciesDisplay(m.name) : 'EMBLEM:none:魔';
      staffHtml += `
        <div onclick="openStaffSelectModal(${i})" style="border:1.5px solid #ffb74d;background:#fff8e1;border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;">
          <div style="font-size:9.5px;color:#e65100;font-weight:bold;">看板店員 ${i + 1}</div>
          <div style="display:flex;justify-content:center;margin:3px 0;">${renderSprite(disp, 40, '8px')}</div>
          <div style="font-size:10.5px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
          <div style="font-size:9.5px;color:#0284c7;">Lv.${m.lv || 1}</div>
        </div>
      `;
    } else {
      staffHtml += `
        <div onclick="openStaffSelectModal(${i})" style="border:1.5px dashed #cbd5e1;background:#f8fafc;border-radius:12px;padding:14px 4px;text-align:center;cursor:pointer;color:#94a3b8;font-size:11px;font-weight:bold;">
          ＋<br>店員配置
        </div>
      `;
    }
  }
  staffHtml += `</div>`;

  if (firstCard && firstCard.id !== 'tavern-recipe-card') {
    firstCard.innerHTML = `
      <div class="card-title">🍺 冒険者の酒場（放置収益）</div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;padding:8px 10px;">
        <div>
          <div style="font-size:12px;font-weight:bold;color:#e65100;">酒場ランク Lv.${lv}</div>
          <div style="font-size:13px;font-weight:900;color:#d84315;">現在売上: +${income.toLocaleString()} G / 秒</div>
        </div>
        <button onclick="upgradeCafe()" style="padding:8px 12px;border-radius:10px;border:none;background:#ff7043;color:#ffffff;font-size:11px;font-weight:bold;cursor:pointer;">拡張 (${cost.toLocaleString()}G)</button>
      </div>
      <div style="font-size:11.5px;font-weight:bold;color:#5d4037;margin-top:10px;">🐾 看板モンスター店員（最大3体）</div>
      ${staffHtml}
    `;
  }

  if (typeof renderTavernRecipesSection === 'function') {
    renderTavernRecipesSection();
  }
}
