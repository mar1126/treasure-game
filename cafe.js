// リゾートカフェ経営・店員配属システム (cafe.js)
function cleanStaffSlots() {
  if (!Array.isArray(staff)) staff = [null, null, null];
  staff = staff.slice(0, 3).map(id => (id && Array.isArray(captured) && captured.some(x => x.id === id)) ? id : null);
  while (staff.length < 3) staff.push(null);
  return staff;
}

function getCafeIncome() {
  const validStaff = cleanStaffSlots();
  let staffPower = 0;
  let activeCount = 0;
  validStaff.forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m && typeof getMonStats === 'function') {
      const st = getMonStats(m);
      staffPower += (st.lv * 4) + Math.floor(st.atk * 0.4) + (st.plus * 10);
      activeCount++;
    }
  });
  if (activeCount === 0) return 0;

  const base = (cafeLv * 12) + staffPower;
  const gardenMult = 1 + ((gardenItems || []).length * 0.15);
  return Math.max(1, Math.floor(base * gardenMult));
}

function assignStaffFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (party.includes(m.id)) return alert('バトル編成中のモンスターはカフェ店員にできません。先にパーティから外してください。');
  if ((trainingSlots || []).includes(m.id)) return alert('訓練場に入っているモンスターは店員にできません。先に訓練場から外してください。');

  const validStaff = cleanStaffSlots();
  if (validStaff.includes(m.id)) return alert('すでにカフェ店員に配属されています。');

  const empty = validStaff.findIndex(x => x === null);
  if (empty === -1) return alert('カフェ店員（3枠）がいっぱいです。カフェ画面で枠をタップして外してください。');
  validStaff.splice(empty, 1, m.id);
  closeMonModal();
  renderCafe();
  if (typeof renderCaptured === 'function') renderCaptured();
  updateUI();
  triggerAutoSave(true);
  showToast(`${m.name}をカフェ店員に配属しました`);
}

function removeStaff(slotIdx) {
  const validStaff = cleanStaffSlots();
  validStaff.splice(slotIdx, 1, null);
  renderCafe();
  if (typeof renderCaptured === 'function') renderCaptured();
  updateUI();
  triggerAutoSave(true);
  showToast('店員を枠から外しました');
}

function upgradeCafe() {
  if (gold < cafeCost) return alert('ゴールドが足りません');
  gold -= cafeCost;
  cafeLv++;
  cafeCost = Math.floor(cafeCost * 1.48);
  renderCafe();
  updateUI();
  triggerAutoSave(true);
  showToast(`カフェが Lv.${cafeLv} にアップグレード！`);
}

function buyDecor(name, cost) {
  if (gold < cost) return alert('ゴールドが足りません');
  gold -= cost;
  gardenItems.push(name);
  renderCafe();
  updateUI();
  triggerAutoSave(true);
  showToast(`${name}を設置しました（売上+15%）`);
}

function renderCafe() {
  const validStaff = cleanStaffSlots();
  const staffEl = document.getElementById('staff-slots');
  if (staffEl) {
    staffEl.innerHTML = validStaff.map((monId, idx) => {
      const m = captured.find(x => x.id === monId);
      if (!m) {
        return `<div class="slot-box" onclick="alert('「編成・訓練」タブの仲間一覧からモンスターをタップし、「カフェ店員に配属する」を選んでください')"><div class="lvl">店員${idx + 1}</div><div class="icon">＋</div><div class="name">空き枠</div><div class="sub">タップで案内</div></div>`;
      }
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : '魔';
      const st = typeof getMonStats === 'function' ? getMonStats(m) : { lv: 1, atk: 10 };
      return `<div class="slot-box staff" onclick="removeStaff(${idx})"><div class="lvl"><span>Lv.${st.lv}</span><span>外す</span></div><div class="icon">${renderSprite(disp, 34)}</div><div class="name">${m.name}</div><div class="sub">接客中</div></div>`;
    }).join('');
  }

  if (document.getElementById('cafe-rate')) document.getElementById('cafe-rate').textContent = getCafeIncome().toLocaleString();
  if (document.getElementById('cafe-lv')) document.getElementById('cafe-lv').textContent = cafeLv;
  if (document.getElementById('cafe-cost')) document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  if (document.getElementById('garden-bonus')) document.getElementById('garden-bonus').textContent = (gardenItems || []).length * 15;
}
