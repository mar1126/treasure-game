// リゾートカフェ＆ガーデン箱庭経営システム (cafe.js)
function getCafeIncome() {
  let staffBonus = 0;
  staff.forEach(id => {
    const m = captured.find(x => x.id === id);
    if (m) staffBonus += m.lv * (m.traitId === 'cafe_star' ? 5 : 3);
  });
  const gardenMult = 1 + (gardenItems.length * 0.15);
  return Math.floor(((cafeLv - 1) * 4 + staffBonus) * gardenMult);
}

function renderCafe() {
  const gGrid = document.getElementById('garden-grid');
  if (gGrid) {
    let cells = gardenItems.map(ic => `<div class="garden-cell">${ic}</div>`);
    staff.forEach(id => {
      const m = captured.find(x => x.id === id);
      if (m) {
        const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : getSpeciesDisplay(m.name, m.icon);
        cells.push(`<div class="garden-cell">${renderSprite(disp, 32)}</div>`);
      }
    });
    while (cells.length < 8) cells.push('<div class="garden-cell" style="opacity:0.25;">🌱</div>');
    gGrid.innerHTML = cells.slice(0, 8).join('');
  }

  const sSlots = document.getElementById('staff-slots');
  if (sSlots) {
    sSlots.innerHTML = staff.map((id, idx) => {
      const m = captured.find(x => x.id === id);
      if (!m) {
        return `<div class="slot-box" onclick="alert('仲間一覧からモンスターをタップして店員に配属しよう！')"><div class="lvl">店員${idx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">売上UP</div></div>`;
      }
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : getSpeciesDisplay(m.name, m.icon);
      const isStar = m.traitId === 'cafe_star';
      return `<div class="slot-box staff" onclick="removeStaff(${idx})"><div class="lvl"><span>Lv.${m.lv}</span><span>${isStar ? '🍰看板' : '店員'}</span></div><div class="icon">${renderSprite(disp, 34)}</div><div class="name">${m.name}</div><div class="sub">+${m.lv * (isStar ? 5 : 3)}G/s</div></div>`;
    }).join('');
  }
}

function assignStaffFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (staff.includes(m.id)) return alert('すでにカフェの店員として働いています！');
  const empty = staff.findIndex(x => x === null);
  if (empty === -1) return alert('店員枠（3枠）がいっぱいです！カフェ画面から外してください。');
  staff.splice(empty, 1, m.id);
  closeMonModal();
  renderCafe();
  updateUI();
  triggerAutoSave();
  showToast(`🍰 ${m.name}がカフェ店員になりました！`);
}

function removeStaff(idx) {
  staff.splice(idx, 1, null);
  renderCafe();
  updateUI();
  triggerAutoSave();
}

function upgradeCafe() {
  if (gold >= cafeCost) {
    gold -= cafeCost;
    cafeLv++;
    cafeCost = Math.floor(cafeCost * 1.6);
    updateUI();
    triggerAutoSave();
  } else {
    alert('ゴールド不足！');
  }
}

function buyDecor(icon, cost) {
  if (gardenItems.length >= 5) return alert('ガーデン家具は最大5個まで配置できます！');
  if (gold < cost) return alert('ゴールド不足！');
  gold -= cost;
  gardenItems.push(icon);
  renderCafe();
  updateUI();
  triggerAutoSave();
  showToast(`🌴 ${icon}をカフェに飾りました！`);
}
