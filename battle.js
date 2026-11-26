// 戦闘ロジック・ウェーブ進行・退却・経験値処理 (battle.js)
function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.inBattle) return;

  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  const aliveCheck = battleAllies.filter(u => u !== null && u.hp > 0);
  if (aliveCheck.length === 0) {
    autoActive = false;
    updateUI();
    return alert('バトルパーティにモンスターが編成されていません！');
  }

  syncStamina();
  if (state.wave === 1) {
    if (stamina < 1) {
      autoActive = false;
      updateUI();
      return alert('スタミナが不足しています（1回復までお待ちください）');
    }
    stamina -= 1;
    if (stamina === MAX_STAMINA - 1) staminaUpdatedAt = Date.now();
  }

  state.inBattle = true;
  state.shipCt = 0;

  ensureWaveEnemies();
  if (state.enemies.every(en => en.hp <= 0)) {
    state.enemies = getFixedWaveEnemies(state.stage, state.floor, state.wave);
  }

  const startBtn = document.getElementById('start-battle-btn');
  if (startBtn) startBtn.style.display = 'none';
  updateUI();
  triggerAutoSave();
}

function retreatBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!state.inBattle && state.wave <= 1) return;

  state.inBattle = false;
  autoActive = false;
  state.shipCt = 0;
  state.wave = 1;
  state.enemies = getFixedWaveEnemies(state.stage, state.floor, 1);

  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  for (let i = 0; i < 3; i++) {
    const eBar = document.querySelector(`#enemy-slot-${i} .e-ct-fill`);
    if (eBar) eBar.style.width = '0%';
    const aBar = document.querySelector(`#ally-slot-${i} .ally-ct-bar`);
    if (aBar) aBar.style.width = '0%';
  }

  updateUI();
  triggerAutoSave();
  showToast(`階層から退却しました（${state.floor}-1 へ戻りました）`);
}

function advanceToNextWave() {
  state.wave++;
  if (state.wave > 5) {
    state.wave = 1;
    state.floor++;
    if (state.floor > 50) {
      if (state.stage < 10) {
        state.stage++;
        state.floor = 1;
        state.maxStage = Math.max(state.maxStage || 1, state.stage);
        if (!state.maxFloorByStage) state.maxFloorByStage = {};
        state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, 1);
        const nextStg = getStageInfo(state.stage);
        showToast(`新ステージ解放！Stage${state.stage}「${nextStg.name}」へ進出！`);
      } else {
        state.floor = 50;
      }
    }
    if (!state.maxFloorByStage) state.maxFloorByStage = {};
    state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, state.floor);
    state.enemies = getFixedWaveEnemies(state.stage, state.floor, 1);

    if (typeof resetBattleAllies === 'function') resetBattleAllies();

    if (autoActive && stamina >= 1) {
      stamina -= 1;
      if (stamina === MAX_STAMINA - 1) staminaUpdatedAt = Date.now();
      state.inBattle = true;
      showToast(`次の階層 ${state.floor}-1 へ自動出撃！`);
    } else {
      if (autoActive && stamina < 1) {
        autoActive = false;
        showToast('スタミナ切れのためオート周回を停止しました');
      }
      state.inBattle = false;
    }
  } else {
    state.enemies = getFixedWaveEnemies(state.stage, state.floor, state.wave);

    if (waveStopMode) {
      state.inBattle = false;
      showToast(`WAVE ${state.wave - 1} クリア！（${state.floor}-${state.wave} で待機中）`);
    } else {
      state.inBattle = true;
    }
  }
}

function checkBattleTurnEnd(enemies) {
  if (enemies.every(en => en.hp <= 0)) {
    let totalGoldGain = 0;
    let totalExpGain = 0;
    enemies.forEach(en => {
      totalGoldGain += Number(en.gold) || 10;
      totalExpGain += Number(en.exp) || 8;
    });

    let goldBonusMult = 1.0;
    battleAllies.forEach(u => {
      if (u && u.hp > 0 && u.monRef) {
        const st = getMonStats(u.monRef);
        goldBonusMult += (st.goldMult - 1.0);
      }
    });
    const finalGold = Math.floor(totalGoldGain * goldBonusMult);
    gold += finalGold;

    let anyLvUp = false;
    battleAllies.forEach(u => {
      if (u && u.hp > 0 && u.monRef) {
        if (grantExpToMonster(u.monRef, totalExpGain)) anyLvUp = true;
      }
    });

    const trainExp = Math.max(1, Math.floor(totalExpGain * 0.10));
    (trainingSlots || []).forEach(monId => {
      if (!monId) return;
      const tm = captured.find(x => x.id === monId);
      if (tm && grantExpToMonster(tm, trainExp)) anyLvUp = true;
    });

    if (anyLvUp) {
      if (typeof renderParty === 'function') renderParty();
      if (typeof renderCaptured === 'function') renderCaptured();
      if (typeof renderTraining === 'function') renderTraining();
      if (typeof updateSelectOptions === 'function') updateSelectOptions();
    }

    enemies.forEach(en => {
      if (typeof tryAutoRecruit === 'function') tryAutoRecruit(en);
    });

    if (state.wave < 5 && waveStopMode) {
      showToast(`WAVE ${state.wave} 突破 (+${finalGold}G / +${totalExpGain}EXP)`);
    } else {
      showToast(`WAVEクリア (+${finalGold}G / +${totalExpGain}EXP)`);
    }

    advanceToNextWave();
    updateUI();
    triggerAutoSave();
    return true;
  }

  const aliveAllies = battleAllies.filter(u => u !== null && u.hp > 0);
  if (aliveAllies.length === 0) {
    state.inBattle = false;
    autoActive = false;
    state.wave = 1;
    state.enemies = getFixedWaveEnemies(state.stage, state.floor, 1);
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    updateUI();
    triggerAutoSave();
    showToast(`全滅！${state.floor}-1 へ戻りました`);
    return true;
  }
  return false;
}
setInterval(() => {
  const enemies = ensureWaveEnemies();
  const dt = speed2xActive ? 0.2 : 0.1;

  if (!state.inBattle) {
    updateUI();
    return;
  }

  const aliveStart = battleAllies.filter(u => u !== null && u.hp > 0);
  if (aliveStart.length === 0) {
    state.inBattle = false;
    autoActive = false;
    updateUI();
    return;
  }

  const tankAtk = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 0;
  if (tankAtk > 0) {
    const tankIv = typeof getTankInterval === 'function' ? getTankInterval() : 3.2;
    state.shipCt += dt;
    if (state.shipCt >= tankIv) {
      state.shipCt = 0;
      const aliveIdx = enemies.map((e, idx) => e.hp > 0 ? idx : -1).filter(idx => idx !== -1);
      if (aliveIdx.length > 0) {
        const tIdx = aliveIdx[Math.floor(Math.random() * aliveIdx.length)];
        const targetEnemy = enemies.slice(tIdx, tIdx + 1).pop();
        if (targetEnemy) {
          targetEnemy.hp -= tankAtk;
          triggerMotion(`enemy-slot-${tIdx}`, 'hit-motion');
          showDamagePopup(`enemy-slot-${tIdx}`, `砲撃 -${tankAtk}`, 'ship-dmg');
          if (checkBattleTurnEnd(enemies)) return;
        }
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const unit = battleAllies.slice(i, i + 1).pop();
    const ctBar = document.querySelector(`#ally-slot-${i} .ally-ct-bar`);
    if (!unit || unit.hp <= 0) {
      if (ctBar) ctBar.style.width = '0%';
      continue;
    }

    unit.ct += dt;
    if (ctBar) ctBar.style.width = `${Math.min(100, (unit.ct / unit.maxCt) * 100)}%`;

    if (unit.ct >= unit.maxCt) {
      unit.ct = 0;
      if (ctBar) ctBar.style.width = '0%';

      const aliveIdx = enemies.map((e, idx) => e.hp > 0 ? idx : -1).filter(idx => idx !== -1);
      if (aliveIdx.length === 0) break;

      const tIdx = aliveIdx[Math.floor(Math.random() * aliveIdx.length)];
      const targetEnemy = enemies.slice(tIdx, tIdx + 1).pop();
      if (!targetEnemy) continue;

      triggerMotion(`ally-slot-${i}`, 'atk-motion');

      let dmg = Math.max(1, unit.atk - Math.floor((targetEnemy.def || 0) / 2));
      let label = `-${dmg}`;
      let popType = '';

      if (unit.monRef && typeof getMonStats === 'function' && typeof getSkillById === 'function') {
        const st = getMonStats(unit.monRef);
        let activeAtk = st.atk;
        if (st.lowHpAtk > 0 && unit.hp <= unit.maxHp * 0.5) {
          activeAtk = Math.floor(activeAtk * (1 + st.lowHpAtk));
        }
        dmg = Math.max(1, activeAtk - Math.floor((targetEnemy.def || 0) / 2));

        const skills = Array.isArray(unit.monRef.skills) ? unit.monRef.skills : [];
        let triggeredSkill = null;
        for (const sid of skills) {
          const sk = getSkillById(sid);
          if (sk && Math.random() < ((sk.rate || 0.25) + st.bonusSkillRate)) {
            triggeredSkill = sk;
            break;
          }
        }

        if (triggeredSkill) {
          const mult = (triggeredSkill.mult || 1.2) + st.bonusSkillDmg;
          const elemBonus = (triggeredSkill.elem && st.elemBoosts && st.elemBoosts[triggeredSkill.elem]) ? (1 + st.elemBoosts[triggeredSkill.elem]) : 1.0;
          const elemMod = typeof calcElementMultiplier === 'function' ? calcElementMultiplier(triggeredSkill.elem, targetEnemy.elem) : 1.0;
          dmg = Math.max(1, Math.floor(activeAtk * mult * elemBonus * elemMod) - Math.floor((targetEnemy.def || 0) / 2));
          label = `${triggeredSkill.name} -${dmg}`;
          popType = 'crit';
        } else {
          const elemMod = typeof calcElementMultiplier === 'function' ? calcElementMultiplier(unit.elem, targetEnemy.elem) : 1.0;
          dmg = Math.max(1, Math.floor(activeAtk * elemMod) - Math.floor((targetEnemy.def || 0) / 2));
          label = elemMod > 1.0 ? `弱点 -${dmg}` : `-${dmg}`;
          if (elemMod > 1.0) popType = 'crit';
        }

        if (st.lifesteal > 0) {
          const heal = Math.max(1, Math.floor(dmg * st.lifesteal));
          unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        }
      }

      targetEnemy.hp -= dmg;
      triggerMotion(`enemy-slot-${tIdx}`, 'hit-motion');
      showDamagePopup(`enemy-slot-${tIdx}`, label, popType);

      if (checkBattleTurnEnd(enemies)) return;
    }
  }

  for (let i = 0; i < 3; i++) {
    const e = enemies.slice(i, i + 1).pop();
    const eCtBar = document.querySelector(`#enemy-slot-${i} .e-ct-fill`);
    if (!e || e.hp <= 0) {
      if (eCtBar) eCtBar.style.width = '0%';
      continue;
    }

    e.ct = (e.ct || 0) + dt;
    const maxECt = e.maxCt || 2.2;
    if (eCtBar) eCtBar.style.width = `${Math.min(100, (e.ct / maxECt) * 100)}%`;

    if (e.ct >= maxECt) {
      e.ct = 0;
      if (eCtBar) eCtBar.style.width = '0%';

      const aliveAllies = battleAllies.map((u, idx) => (u && u.hp > 0) ? idx : -1).filter(idx => idx !== -1);
      if (aliveAllies.length === 0) break;

      const aIdx = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
      const targetAlly = battleAllies.slice(aIdx, aIdx + 1).pop();
      if (!targetAlly) continue;

      triggerMotion(`enemy-slot-${i}`, 'atk-motion');

      const elemMod = typeof calcElementMultiplier === 'function' ? calcElementMultiplier(e.elem, targetAlly.elem) : 1.0;
      const dmg = Math.max(1, Math.floor((e.atk || 5) * elemMod) - Math.floor((targetAlly.def || 0) / 2));
      targetAlly.hp = Math.max(0, targetAlly.hp - dmg);

      triggerMotion(`ally-slot-${aIdx}`, 'hit-motion');
      showDamagePopup(`ally-slot-${aIdx}`, `-${dmg}`, 'ally-dmg');

      if (checkBattleTurnEnd(enemies)) return;
    }
  }

  updateUI();
}, 100);

setInterval(() => {
  const inc = typeof getCafeIncome === 'function' ? getCafeIncome() : 0;
  if (inc > 0) {
    gold += inc;
    const gEl = document.getElementById('gold');
    if (gEl) gEl.textContent = gold.toLocaleString();
  }
}, 1000);
