// バトル進行・ターンCT・スキル・報酬計算 (battle.js)
let battleLoopTimer = null;
let lastTickAt = Date.now();

function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.inBattle) return;

  syncStamina();
  if (stamina <= 0) {
    return alert('スタミナが足りません（時間経過またはショップで回復できます）');
  }

  const hasAliveAlly = Array.isArray(battleAllies) && battleAllies.some(u => u && u.maxHp > 0);
  if (!hasAliveAlly) resetBattleAllies();

  stamina = Math.max(0, stamina - 1);
  staminaUpdatedAt = Date.now();

  battleAllies.forEach(u => {
    if (u) {
      u.hp = u.maxHp;
      const st = u.monRef ? getMonStats(u.monRef) : { initCt: 0 };
      u.ct = Number((u.maxCt * (st.initCt || 0)).toFixed(2));
    }
  });

  state.enemies = [];
  ensureWaveEnemies();
  state.shipCt = 0;
  state.inBattle = true;
  lastTickAt = Date.now();
  updateUI();
}

function retreatBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  state.inBattle = false;
  autoActive = false;
  resetBattleAllies();
  state.enemies = [];
  ensureWaveEnemies();
  updateUI();
  showToast('バトルから退却しました');
}

function calcElementMultiplier(atkElem, defElem) {
  if (!atkElem || atkElem === 'none' || !defElem || defElem === 'none') return 1.0;
  const info = typeof getElementInfo === 'function' ? getElementInfo(defElem) : null;
  if (!info) return 1.0;
  if (info.weakTo === atkElem) return 1.5;
  if (info.resistTo === atkElem) return 0.5;
  return 1.0;
}

function performAllyTurn(slotIdx) {
  const u = battleAllies.slice(slotIdx, slotIdx + 1).pop();
  if (!u || u.hp <= 0) return;

  const aliveEnemies = (state.enemies || []).map((en, idx) => ({ en, idx })).filter(x => x.en && x.en.hp > 0);
  if (aliveEnemies.length === 0) return;

  triggerMotion(`ally-slot-${slotIdx}`, 'atk-motion');

  const st = u.monRef ? getMonStats(u.monRef) : { elem: u.elem || 'none', bonusSkillRate: 0, bonusSkillDmg: 0, lifesteal: 0, lowHpAtk: 0, elemBoosts: {} };
  let baseAtk = u.atk || 10;
  if (st.lowHpAtk > 0 && (u.hp / (u.maxHp || 1)) <= 0.4) {
    baseAtk = Math.floor(baseAtk * (1 + st.lowHpAtk));
  }

  const skillIds = (u.monRef && Array.isArray(u.monRef.skills)) ? u.monRef.skills : [];
  let chosenSkill = null;
  for (const sid of skillIds) {
    const sk = typeof getSkillById === 'function' ? getSkillById(sid) : null;
    if (sk && Math.random() < (sk.rate + (st.bonusSkillRate || 0))) {
      chosenSkill = sk;
      break;
    }
  }

  const atkElem = chosenSkill ? chosenSkill.elem : (st.elem || 'none');
  const elemBoost = 1 + ((st.elemBoosts && st.elemBoosts[atkElem]) ? st.elemBoosts[atkElem] : 0);
  const mult = chosenSkill ? (chosenSkill.mult * (1 + (st.bonusSkillDmg || 0))) : 1.0;

  if (chosenSkill && chosenSkill.type === 'heal') {
    const healAmt = Math.max(5, Math.floor(baseAtk * mult));
    battleAllies.forEach((ally, aIdx) => {
      if (ally && ally.hp > 0) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
        showDamagePopup(`ally-slot-${aIdx}`, `+${healAmt}`, 'ship-dmg');
      }
    });
    return;
  }

  const targets = (chosenSkill && chosenSkill.aoe) ? aliveEnemies : [aliveEnemies.slice(0, 1).pop()];
  let totalDealt = 0;

  targets.forEach(({ en, idx }) => {
    const eMult = calcElementMultiplier(atkElem, en.elem);
    const raw = (baseAtk * mult * elemBoost * eMult) - ((en.def || 0) * 0.4);
    const dmg = Math.max(1, Math.floor(raw * (0.92 + Math.random() * 0.16)));
    en.hp = Math.max(0, en.hp - dmg);
    totalDealt += dmg;
    triggerMotion(`enemy-slot-${idx}`, 'hit-motion');
    showDamagePopup(`enemy-slot-${idx}`, chosenSkill ? `${chosenSkill.name} ${dmg}` : `${dmg}`, chosenSkill ? 'crit' : '');
  });

  if (st.lifesteal > 0 && totalDealt > 0) {
    const drain = Math.max(1, Math.floor(totalDealt * st.lifesteal));
    u.hp = Math.min(u.maxHp, u.hp + drain);
  }
}
function performTankTurn() {
  const atk = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 0;
  if (atk <= 0) return;
  const aliveEnemies = (state.enemies || []).map((en, idx) => ({ en, idx })).filter(x => x.en && x.en.hp > 0);
  if (aliveEnemies.length === 0) return;

  aliveEnemies.forEach(({ en, idx }) => {
    const dmg = Math.max(1, Math.floor(atk * (0.9 + Math.random() * 0.2)));
    en.hp = Math.max(0, en.hp - dmg);
    triggerMotion(`enemy-slot-${idx}`, 'hit-motion');
    showDamagePopup(`enemy-slot-${idx}`, `砲撃 ${dmg}`, 'ship-dmg');
  });
}

function performEnemyTurn(enemyIdx) {
  const en = (state.enemies || []).slice(enemyIdx, enemyIdx + 1).pop();
  if (!en || en.hp <= 0) return;

  const aliveAllies = (battleAllies || []).map((al, idx) => ({ al, idx })).filter(x => x.al && x.al.hp > 0);
  if (aliveAllies.length === 0) return;

  triggerMotion(`enemy-slot-${enemyIdx}`, 'atk-motion');
  const pick = aliveAllies.slice(Math.floor(Math.random() * aliveAllies.length), Math.floor(Math.random() * aliveAllies.length) + 1).pop() || aliveAllies.slice(0, 1).pop();
  const { al, idx } = pick;

  const eMult = calcElementMultiplier(en.elem, al.elem);
  const raw = ((en.atk || 10) * eMult) - ((al.def || 0) * 0.45);
  const dmg = Math.max(1, Math.floor(raw * (0.92 + Math.random() * 0.16)));
  al.hp = Math.max(0, al.hp - dmg);
  triggerMotion(`ally-slot-${idx}`, 'hit-motion');
  showDamagePopup(`ally-slot-${idx}`, `-${dmg}`, 'ally-dmg');
}

function handleWaveCleared() {
  const floorNum = ((Number(state.stage) || 1) - 1) * 20 + (Number(state.floor) || 1);
  const waveNum = Number(state.wave) || 1;
  const isBoss = waveNum === 5;

  let goldBonusMult = 1.0;
  (battleAllies || []).forEach(u => {
    if (u && u.monRef) {
      const st = getMonStats(u.monRef);
      if (st.goldMult > 1) goldBonusMult += (st.goldMult - 1);
    }
  });

  const gainGold = Math.floor((18 + floorNum * 14) * (isBoss ? 2.5 : 1.0) * goldBonusMult);
  const gainExp = Math.floor((14 + floorNum * 9) * (isBoss ? 2.2 : 1.0));
  gold += gainGold;

  if (isBoss && Math.random() < 0.35) {
    gem += 5;
    showToast(`強敵撃破ボーナス！ +${gainGold}G / +5 GEM`);
  }

  let anyLeveled = false;
  (party || []).forEach(monId => {
    if (!monId) return;
    const m = captured.find(x => x.id === monId);
    if (m && grantExpToMonster(m, gainExp)) anyLeveled = true;
  });

  const trainExp = Math.max(1, Math.floor(gainExp * 0.10));
  (trainingSlots || []).forEach(monId => {
    if (!monId) return;
    const m = captured.find(x => x.id === monId);
    if (m && grantExpToMonster(m, trainExp)) anyLeveled = true;
  });

  (state.enemies || []).forEach(en => {
    if (en && typeof tryAutoRecruit === 'function') tryAutoRecruit(en);
  });

  if (anyLeveled) {
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderCaptured === 'function') renderCaptured();
    if (typeof renderTraining === 'function') renderTraining();
  }

  if (waveNum < 5) {
    state.wave = waveNum + 1;
    state.enemies = [];
    ensureWaveEnemies();
    if (waveStopMode) {
      state.inBattle = false;
      resetBattleAllies();
    }
  } else {
    const curStage = Number(state.stage) || 1;
    const curFloor = Number(state.floor) || 1;
    if (!state.maxFloorByStage) state.maxFloorByStage = { 1: 1 };

    let nextStage = curStage;
    let nextFloor = curFloor + 1;
    if (nextFloor > 20) {
      nextStage = Math.min(10, curStage + 1);
      nextFloor = 1;
    }

    state.maxStage = Math.max(Number(state.maxStage) || 1, nextStage);
    state.maxFloorByStage[nextStage] = Math.max(Number(state.maxFloorByStage[nextStage]) || 1, nextFloor);

    state.stage = nextStage;
    state.floor = nextFloor;
    state.wave = 1;
    state.enemies = [];
    ensureWaveEnemies();
    resetBattleAllies();

    if (autoUnlocked && autoActive && stamina > 0) {
      stamina -= 1;
      staminaUpdatedAt = Date.now();
      state.inBattle = true;
    } else {
      state.inBattle = false;
      if (autoActive && stamina <= 0) {
        autoActive = false;
        showToast('スタミナ切れのためオート周回を停止しました');
      }
    }
  }

  updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function tickBattleLoop() {
  const now = Date.now();
  const rawDt = Math.min(0.25, (now - lastTickAt) / 1000);
  lastTickAt = now;

  if (!state.inBattle) {
    updateUI();
    return;
  }

  const spd = speed2xActive ? 2.0 : 1.0;
  const dt = rawDt * spd;

  const tankIv = typeof getTankInterval === 'function' ? getTankInterval() : 3.4;
  if ((Number(landTankTier) || 0) > 0) {
    state.shipCt = (Number(state.shipCt) || 0) + dt;
    if (state.shipCt >= tankIv) {
      state.shipCt = 0;
      performTankTurn();
    }
  }

  for (let i = 0; i < 3; i++) {
    const u = (battleAllies || []).slice(i, i + 1).pop();
    const bar = document.getElementById(`ally-ct-${i}`);
    if (!u || u.hp <= 0) {
      if (bar) bar.style.width = '0%';
      continue;
    }
    u.ct = (Number(u.ct) || 0) + dt;
    if (u.ct >= (u.maxCt || 1.8)) {
      u.ct = 0;
      performAllyTurn(i);
    }
    if (bar) bar.style.width = `${Math.min(100, (u.ct / (u.maxCt || 1.8)) * 100)}%`;
  }

  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  for (let i = 0; i < enemies.length; i++) {
    const en = enemies.slice(i, i + 1).pop();
    const slot = document.getElementById(`enemy-slot-${i}`);
    const bar = slot ? slot.querySelector('.e-ct-fill') : null;
    if (!en || en.hp <= 0) {
      if (bar) bar.style.width = '0%';
      continue;
    }
    en.ct = (Number(en.ct) || 0) + dt;
    if (en.ct >= (en.maxCt || 2.0)) {
      en.ct = 0;
      performEnemyTurn(i);
    }
    if (bar) bar.style.width = `${Math.min(100, (en.ct / (en.maxCt || 2.0)) * 100)}%`;
  }

  const anyEnemyAlive = enemies.some(e => e && e.hp > 0);
  if (!anyEnemyAlive) {
    handleWaveCleared();
    return;
  }

  const anyAllyAlive = (battleAllies || []).some(u => u && u.hp > 0);
  if (!anyAllyAlive) {
    state.inBattle = false;
    autoActive = false;
    resetBattleAllies();
    state.enemies = [];
    ensureWaveEnemies();
    updateUI();
    showToast('パーティが全滅しました…強化や配合で再挑戦しよう！');
    return;
  }

  updateUI();
}

if (battleLoopTimer) clearInterval(battleLoopTimer);
battleLoopTimer = setInterval(tickBattleLoop, 80);
