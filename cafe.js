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

function renderCafeStageView(validStaff) {
  const stage = document.getElementById('cafe-live-stage');
  if (!stage) return;

  const activeList = validStaff
    .map((id, idx) => ({ m: captured.find(x => x.id === id), idx }))
    .filter(x => x.m);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;font-size:10px;font-weight:bold;color:#0277bd;background:rgba(255,255,255,0.75);border-bottom:1px solid rgba(0,0,0,0.06);">
      <span>テラスフロア（Lv.${cafeLv}）</span>
      <span>店員 ${activeList.length}/3人 稼働中</span>
    </div>
  `;

  // 設置したインテリア家具を表示
  const decors = (gardenItems || []).slice(0, 10);
  if (decors.length > 0) {
    html += `<div style="position:absolute;top:28px;left:8px;right:8px;display:flex;gap:5px;flex-wrap:wrap;pointer-events:none;">`;
    decors.forEach(d => {
      const label = d === 'ヤシの木' ? '木' : (d === '花壇' ? '花' : '泉');
      html += `<span style="background:rgba(255,255,255,0.88);border:1px solid #a5d6a7;color:#2e7d32;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:6px;">${label}</span>`;
    });
    html += `</div>`;
  }

  // 配属中の店員モンスターをフロアに並べる
  if (activeList.length === 0) {
    html += `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#546e7a;padding-top:16px;">店員を配属するとフロアに表示されます</div>`;
  } else {
    const positions =;
    activeList.forEach(({ m, idx }) => {
      const leftPct = positions.slice(idx, idx + 1).pop() || 50;
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : '魔';
      html += `
        <div style="position:absolute;left:${leftPct}%;top:68%;transform:translate(-50%,-50%);text-align:center;">
          ${renderSprite(disp, 36, '50%')}
          <div style="font-size:9px;font-weight:bold;color:#263238;background:rgba(255,255,255,0.88);padding:1px 6px;border-radius:6px;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.12);">${m.name}</div>
        </div>
      `;
    });
  }

  stage.innerHTML = html;
}

function renderCafe() {
  const validStaff = cleanStaffSlots();
  renderCafeStageView(validStaff);

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
