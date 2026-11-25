// パーティ編成・モンスター育成・スカウトシステム (party.js)
function ensureStarterMonster() {
  if (captured.length === 0) {
    const starter = {
      id: 'M_STARTER',
      icon: '🐬',
      name: 'イルカ',
      type: 'sea',
      lv: 1,
      rarity: 'R',
      maxHp: 90,
      atk: 15,
      def: 5,
      ct: 1.9,
      traitId: 'sea_lord'
    };
    captured.push(starter);
    party.splice(0, 1, starter.id);
    if (!speciesSkins['イルカ']) {
      speciesSkins['イルカ'] = { list: [], activeIdx: -1, defaultIcon: '🐬' };
    }
  }
}

function getMonStats(m) {
  let mult = (m.type === mode) ? 1.2 : 1.0;
  if (m.traitId === 'sea_lord' && mode === 'sea') mult += 0.4;
  if (m.traitId === 'land_lord' && mode === 'land') mult += 0.4;
  return {
    name: m.name,
    icon: m.icon,
    lv: m.lv,
    maxHp: m.maxHp || (55 + m.lv * 18),
    atk: Math.floor(m.atk * mult),
    def: m.def || (3 + m.lv * 2),
    ct: m.ct || 2.1
  };
}

function resetBattleAllies() {
  ensureStarterMonster();
  const validIds = party.filter(id => id && captured.some(m => m.id === id));
  if (validIds.length === 0 && captured.length > 0) {
    party = new Array(3).fill(null);
    for (let i = 0; i < Math.min(3, captured.length); i++) {
      party.splice(i, 1, captured.at(i).id);
    }
  }
  battleAllies = new Array(3).fill(null);
  for (let i = 0; i < 3; i++) {
    const monId = party.at(i);
    const m = captured.find(x => x.id === monId);
    if (m) {
      const st = getMonStats(m);
      battleAllies.splice(i, 1, { ...st, monRef: m, hp: st.maxHp, ct: 0 });
    }
  }
}

function tryAutoRecruit(baseMon, curArea) {
  if (Math.random() >= 0.35) return false;
  const rRoll = Math.random();
  const rarity = rRoll < 0.08 ? 'SSR' : (rRoll < 0.28 ? 'SR' : (rRoll < 0.6 ? 'R' : 'N'));
  const mult = { N: 1, R: 1.4, SR: 2.0, SSR: 3.0 }[rarity];
  const trait = getRandomTrait();
  const newMon = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 99),
    icon: baseMon.icon, name: baseMon.name, type: mode, lv: 1, rarity,
    maxHp: Math.floor((55 + curArea * 15) * mult),
    atk: Math.floor((7 + curArea * 3) * mult),
    def: Math.floor((3 + curArea * 1.5) * mult),
    ct: baseMon.ct || 2.1,
    traitId: trait.id
  };
  captured.push(newMon);
  if (!speciesSkins[baseMon.name]) speciesSkins[baseMon.name] = { list: [], activeIdx: -1, defaultIcon: baseMon.icon };
  const emptySlot = party.findIndex(x => x === null);
  if (emptySlot !== -1) party.splice(emptySlot, 1, newMon.id);
  resetBattleAllies();
  renderParty(); renderCaptured(); updateSelectOptions(); renderSpeciesGallery();
  showToast(`✨ [${rarity}] ${baseMon.name}が起き上がり仲間になった！`);
  return true;
}

function renderParty() {
  const el = document.getElementById('party-slots');
  if (!el) return;
  el.innerHTML = party.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) return `<div class="slot-box"><div class="lvl">枠${slotIdx + 1}</div><div class="icon">➕</div><div class="name">空き枠</div><div class="sub">図鑑から編成</div></div>`;
    const disp = getSpeciesDisplay(m.name, m.icon), idx = captured.findIndex(x => x.id === monId), st = getMonStats(m);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${idx})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span><span>CT:${st.ct}s</span></div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">HP:${st.maxHp} ATK:${st.atk}</div></div>`;
  }).join('');
}

function renderCaptured() {
  const el = document.getElementById('captured-list');
  if (!el || captured.length === 0) return;
  el.innerHTML = captured.map((m, i) => {
    const disp = getSpeciesDisplay(m.name, m.icon), inParty = party.includes(m.id);
    return `<div class="slot-box ${m.type}" onclick="openMonModal(${i})"><div class="lvl"><span>[${m.rarity}] Lv.${m.lv}</span>${inParty ? '<span class="badge-tag">編成中</span>' : ''}</div><div class="icon">${renderSprite(disp, 36)}</div><div class="name">${m.name}</div><div class="sub">ATK:${m.atk} DEF:${m.def || 4}</div></div>`;
  }).join('');
}

function openMonModal(idx) {
  selectedMonIdx = idx;
  const m = captured.at(idx); if (!m) return;
  const disp = getSpeciesDisplay(m.name, m.icon), sk = getMonsterSkill(m.name), tr = getMonsterTrait(m.traitId), st = getMonStats(m);
  document.getElementById('modal-mon-sprite').innerHTML = renderSprite(disp, 64, '12px');
  document.getElementById('modal-mon-name').textContent = m.name;
  document.getElementById('modal-mon-rarity').textContent = `レア度: ${m.rarity} / ${m.type === 'sea' ? '🌊 海洋族' : '🌲 陸上族'}`;
  document.getElementById('modal-mon-lv').textContent = `Lv.${m.lv}`;
  document.getElementById('modal-mon-atk').innerHTML = `HP:${st.maxHp} / ATK:${st.atk}<br>DEF:${st.def} / CT:${st.ct}秒`;
  document.getElementById('modal-mon-terrain').textContent = m.type === 'sea' ? '🌊 海（海戦で攻撃+20%）' : '🌲 陸（陸戦で攻撃+20%）';
  document.getElementById('modal-mon-skill').innerHTML = `<b>${sk.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${sk.desc}</span>`;
  document.getElementById('modal-mon-trait').innerHTML = `<b>${tr.name}</b><br><span style="font-size:11px;color:#546e7a;font-weight:normal;">${tr.desc}</span>`;
  document.getElementById('modal-party-btn').textContent = party.includes(m.id) ? '❌ パーティから外す' : '⚔️ バトルパーティに編成する';
  document.getElementById('modal-lvup-btn').textContent = `⬆️ 個別強化する（費用: ${m.lv * 30} G）`;
  document.getElementById('mon-modal').style.display = 'flex';
}
function closeMonModal() { document.getElementById('mon-modal').style.display = 'none'; }

function togglePartyFromModal() {
  const m = captured.at(selectedMonIdx); if (!m) return;
  const pIdx = party.indexOf(m.id);
  if (pIdx !== -1) {
    if (party.filter(x => x !== null).length <= 1) return alert('パーティには最低1体必要です！');
    party.splice(pIdx, 1, null); showToast(`${m.name}をパーティから外しました`);
  } else {
    const empty = party.findIndex(x => x === null);
    if (empty === -1) return alert('パーティ（3枠）がいっぱいです！');
    party.splice(empty, 1, m.id); showToast(`⚔️ ${m.name}をパーティに編成！`);
  }
  if (!state[mode].inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}

function levelUpMonFromModal() {
  const m = captured.at(selectedMonIdx); if (!m) return;
  const cost = m.lv * 30;
  if (gold < cost) return alert('ゴールド不足！');
  gold -= cost;
  m.lv++;
  m.maxHp = (m.maxHp || 68) + Math.floor(14 + m.lv * 3);
  m.atk += Math.floor(4 + m.lv * 1.5);
  m.def = (m.def || 4) + Math.floor(2 + m.lv * 0.8);
  if (!state[mode].inBattle) resetBattleAllies();
  renderParty(); renderCaptured(); updateUI(); triggerAutoSave(); openMonModal(selectedMonIdx);
}
