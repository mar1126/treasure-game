// リゾートカフェ箱庭システム (cafe.js)
function getCafeIncome() {
  const active = staff.filter(s => s !== null);
  if (active.length === 0) return 0;
  const cafeTraitBonus = active.filter(s => s.traitId === 'cafe_star').length * 0.35;
  return Math.floor(active.length * 6 * cafeLv * (1 + gardenItems.length * 0.15 + cafeTraitBonus));
}

function assignStaffFromModal() {
  assignStaff(selectedMonIdx);
  closeMonModal();
}

function assignStaff(idx) {
  const mon = captured.at(idx), emptyIdx = staff.findIndex(s => s === null);
  if (emptyIdx !== -1) {
    staff.splice(emptyIdx, 1, mon);
    showToast(`🍰 ${mon.name}を店員に配属！`);
    renderCafe(); updateUI(); triggerAutoSave();
  } else {
    showToast('店員枠がいっぱいです');
  }
}

function removeStaff(slotIdx) {
  if (staff.at(slotIdx)) {
    staff.splice(slotIdx, 1, null);
    renderCafe(); updateUI(); triggerAutoSave();
  }
}

function renderCafe() {
  const roles = ['店長', 'ホール', 'キッチン'];
  const staffEl = document.getElementById('staff-slots');
  if (staffEl) {
    staffEl.innerHTML = staff.map((s, i) => !s
      ? `<div class="slot-box staff"><div class="lvl">${roles.at(i)}</div><div class="icon">➕</div><div class="name">空き枠</div></div>`
      : `<div class="slot-box staff" onclick="removeStaff(${i})"><div class="lvl">${roles.at(i)}</div><div class="icon">${renderSprite(getSpeciesDisplay(s.name, s.icon), 36)}</div><div class="name">${s.name}</div></div>`).join('');
  }
  const gardenEl = document.getElementById('garden-grid');
  if (gardenEl) {
    gardenEl.innerHTML = Array(8).fill('').map((_, i) => `<div class="garden-cell">${gardenItems.at(i) || (staff.at(i) ? renderSprite(getSpeciesDisplay(staff.at(i).name, staff.at(i).icon), 28) : '')}</div>`).join('');
  }
}

function upgradeCafe() {
  if (gold >= cafeCost) {
    gold -= cafeCost; cafeLv++; cafeCost = Math.floor(cafeCost * 1.6);
    updateUI(); triggerAutoSave();
  } else alert('ゴールド不足');
}

function buyDecor(icon, cost) {
  if (gardenItems.length >= 8) return alert('満杯です');
  if (gold >= cost) {
    gold -= cost; gardenItems.push(icon);
    renderCafe(); updateUI(); triggerAutoSave();
  } else alert('ゴールド不足');
}
