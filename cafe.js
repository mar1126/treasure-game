// 冒険者の酒場・看板店員・内装拡張・料理売上連動 (cafe.js)
const TAVERN_FURNITURE = [
  { id: 'barrel',     name: '特選エール樽',     cost: 1200,  bonus: 15, desc: '芳醇なエールの香りで冒険者が集まりやすくなる' },
  { id: 'hearth',     name: 'レンガの暖炉',     cost: 4500,  bonus: 45, desc: '冷えた体を温める火の灯りで滞在時間と注文がUP' },
  { id: 'questboard', name: 'ギルド依頼掲示板', cost: 15000, bonus: 130, desc: '討伐帰りのパーティが連日打ち上げを開くようになる' },
  { id: 'chandelier', name: '魔導シャンデリア', cost: 50000, bonus: 420, desc: '王都の貴族や高ランク冒険者も訪れる名門酒場に！' }
];

function getCafeIncomePerSec() {
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

  let decorBonus = 0;
  (gardenItems || []).forEach(id => {
    const f = TAVERN_FURNITURE.find(x => x.id === id);
    if (f) decorBonus += f.bonus;
  });

  const recipeBonus = typeof getTavernRecipeBonus === 'function' ? getTavernRecipeBonus().extraGps : 0;
  return Math.floor((baseLv * 8 + staffBonus + decorBonus + recipeBonus));
}

function upgradeCafe() {
  const cost = Number(cafeCost) || 200;
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);
  gold -= cost;
  cafeLv = (Number(cafeLv) || 1) + 1;
  cafeCost = Math.floor(cost * 1.65);
  renderCafe();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
  showToast(`酒場ランクが Lv.${cafeLv} に上がりました！`);
}

function buyTavernFurniture(id) {
  const item = TAVERN_FURNITURE.find(x => x.id === id);
  if (!item) return;
  if (!Array.isArray(gardenItems)) gardenItems = [];
  if (gardenItems.includes(id)) return;
  if (gold < item.cost) return alert(`ゴールドが足りません（${item.cost.toLocaleString()} G 必要）`);
  gold -= item.cost;
  gardenItems.push(id);
  renderCafe();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
  showToast(`内装「${item.name}」を設置しました！`);
}

function openStaffSelectModal(slotIdx) {
  const modal = document.getElementById('staff-modal');
  const listEl = document.getElementById('staff-select-list');
  if (!modal || !listEl) return;

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

  const firstCard = pane.querySelector('.card');
  const income = getCafeIncomePerSec();
  const lv = Number(cafeLv) || 1;
  const cost = Number(cafeCost) || 200;

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

  let decorHtml = `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;">`;
  TAVERN_FURNITURE.forEach(item => {
    const owned = Array.isArray(gardenItems) && gardenItems.includes(item.id);
    decorHtml += `
      <div style="border:1px solid ${owned ? '#a5d6a7' : '#e2e8f0'};background:${owned ? '#f1f8e9' : '#ffffff'};border-radius:10px;padding:8px;">
        <div style="font-size:11.5px;font-weight:bold;color:#1e293b;">${item.name}</div>
        <div style="font-size:10px;color:#64748b;margin:2px 0;">売上 +${item.bonus} G/秒</div>
        ${owned
          ? `<div style="font-size:10.5px;font-weight:bold;color:#2e7d32;">✔ 設置済み</div>`
          : `<button onclick="buyTavernFurniture('${item.id}')" style="margin-top:3px;width:100%;padding:5px;border-radius:7px;border:none;background:#ff7043;color:#ffffff;font-size:10.5px;font-weight:bold;cursor:pointer;">${item.cost.toLocaleString()} G</button>`
        }
      </div>
    `;
  });
  decorHtml += `</div>`;

  if (firstCard) {
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
      <div style="font-size:11.5px;font-weight:bold;color:#5d4037;margin-top:12px;">🪵 酒場の内装・設備</div>
      ${decorHtml}
    `;
  }

  if (typeof renderTavernRecipesSection === 'function') {
    renderTavernRecipesSection();
  }
}
