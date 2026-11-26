// 戦闘開始・退却・ウェーブ進行システム (battle.js)
function startBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.inBattle) return;
  syncStamina();
  if (stamina < 1) {
    if (autoActive) { autoActive = false; showToast('スタミナ切れのため周回を停止しました'); }
    else showToast('スタミナ不足です（ショップで回復可能）');
    updateUI(); return;
  }
  if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
  stamina -= 1;

  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, state.wave) : [];
  if (state.wave === 1 && typeof resetBattleAllies === 'function') resetBattleAllies();
  state.shipCt = 0;
  state.inBattle = true;
  triggerAutoSave();
  updateUI();
}

function retreatBattle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!state.inBattle && state.wave <= 1) return;
  state.inBattle = false;
  state.wave = 1;
  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
  if (autoActive) autoActive = false;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  showToast('バトルから退却しました');
  updateUI();
}

function handleWaveClear() {
  const enemies = state.enemies || [];
  let totalGold = 0, totalExp = 0;
  enemies.forEach(e => {
    totalGold += Number(e.goldReward) || 15;
    totalExp += Number(e.expReward) || 12;
  });

  let goldMult = 1.0;
  party.forEach(id => {
    const m = captured.find(x => x.id === id);
    if (m && typeof getMonStats === 'function') goldMult += (getMonStats(m).goldMult - 1.0);
  });
  const finalGold = Math.floor(totalGold * goldMult);
  gold += finalGold;

  let anyLevelUp = false;
  const activeMons = party.map(id => captured.find(x => x.id === id)).filter(Boolean);
  activeMons.forEach(m => {
    if (typeof grantExpToMonster === 'function' && grantExpToMonster(m, totalExp)) anyLevelUp = true;
  });

  const trainExp = Math.max(1, Math.floor(totalExp * 0.1));
  (trainingSlots || []).forEach(id => {
    const tm = captured.find(x => x.id === id);
    if (tm && typeof grantExpToMonster === 'function') grantExpToMonster(tm, trainExp);
  });

  let recruited = false;
  try {
    const targetForRecruit = enemies[Math.floor(Math.random() * enemies.length)];
    recruited = (targetForRecruit && typeof tryAutoRecruit === 'function') ? tryAutoRecruit(targetForRecruit) : false;
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderTraining === 'function') renderTraining();
    if (typeof renderCaptured === 'function') renderCaptured();
  } catch (err) { console.error(err); }

  if (state.wave < 5) {
    state.wave++;
    state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, state.wave) : [];

    if (waveStopMode) {
      state.inBattle = false;
      if (autoActive) autoActive = false;
      if (!recruited) {
        showToast(anyLevelUp ? `レベルアップ！WAVE ${state.wave}/5 の前で停止しました` : `WAVEクリア（+${finalGold}G / +${totalExp}EXP）`);
      }
      triggerAutoSave();
      updateUI();
      return;
    }

    syncStamina();
    if (stamina < 1) {
      state.inBattle = false;
      if (autoActive) autoActive = false;
      showToast(`WAVEクリア(+${finalGold}G) / スタミナ不足のため停止しました`);
      triggerAutoSave();
      updateUI();
      return;
    }
    if (stamina === MAX_STAMINA) staminaUpdatedAt = Date.now();
    stamina -= 1;
    if (!recruited) {
      showToast(anyLevelUp ? `レベルアップ！WAVE ${state.wave}/5 へ` : `WAVE ${state.wave}/5 突入（+${finalGold}G / +${totalExp}EXP）`);
    }
    updateUI();
    return;
  }

  state.inBattle = false;
  state.wave = 1;

  if (state.floor < 50) {
    state.floor++;
    state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, state.floor);
    showToast(`${state.floor - 1}階踏破！次は ${state.floor}-1（+${finalGold}G）`);
  } else if (state.stage < 10) {
    state.stage++;
    state.floor = 1;
    state.maxStage = Math.max(state.maxStage || 1, state.stage);
    state.maxFloorByStage[state.stage] = Math.max(state.maxFloorByStage[state.stage] || 1, 1);
    const stgInfo = typeof getStageInfo === 'function' ? getStageInfo(state.stage) : { name: `Stage ${state.stage}` };
    showToast(`ステージ踏破！新エリア「${stgInfo.name}」解放`);
  } else {
    showToast(`最終階層 50-5 クリア！（+${finalGold}G / +${totalExp}EXP）`);
  }

  state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  triggerAutoSave();
  updateUI();

  if (autoActive && !waveStopMode) {
    const delay = speed2xActive ? 350 : 700;
    setTimeout(() => { if (autoActive && !state.inBattle) startBattle(); }, delay);
  }
}
let lastFrameTime = performance.now();
let cafeSecTimer = 0;

function battleFrameLoop(now) {
  try {
    const rawDt = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    cafeSecTimer += rawDt;
    if (cafeSecTimer >= 1.0) {
      cafeSecTimer -= 1.0;
      if (typeof getCafeIncome === 'function') gold += getCafeIncome();
      if (!state.inBattle) updateUI();
    }

    if (state.inBattle) {
      const dt = (speed2xUnlocked && speed2xActive) ? rawDt * 2.0 : rawDt;
      if ((!battleAllies || battleAllies.every(u => !u)) && typeof resetBattleAllies === 'function') resetBattleAllies();
      const enemies = ensureWaveEnemies();
      let needsUiSync = false;

      for (let i = 0; i < 3; i++) {
        const u = battleAllies.slice(i, i + 1).pop();
        const ctBar = document.querySelector(`#ally-slot-${i} .ally-ct-bar`);
        if (!u || u.hp <= 0) { if (ctBar) ctBar.style.width = '0%'; continue; }
        u.ct = (Number(u.ct) || 0) + dt;
        const limitCt = Number(u.maxCt) || 2.0;

        if (u.ct >= limitCt) {
          u.ct = 0;
          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            const st = u.monRef && typeof getMonStats === 'function' ? getMonStats(u.monRef) : { bonusSkillRate: 0, bonusSkillDmg: 0, lifesteal: 0, lowHpAtk: 0, elemBoosts: {} };
            const skillIds = u.monRef?.skills || ['tackle'];
            const firedSkill = typeof rollOneBattleSkill === 'function' ? rollOneBattleSkill(skillIds, st.bonusSkillRate) : null;

            const atkElem = firedSkill ? (firedSkill.elem || 'none') : 'none';
            const elemBonus = (atkElem !== 'none' && st.elemBoosts?.[atkElem]) ? st.elemBoosts[atkElem] : 0;
            const lowHpBonus = (u.hp <= u.maxHp * 0.5) ? (st.lowHpAtk || 0) : 0;
            const skillMult = firedSkill ? (firedSkill.mult + st.bonusSkillDmg + elemBonus) : 1.0;
            const targets = (firedSkill && firedSkill.aoe) ? aliveEnemies : [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]];

            let totalDealt = 0;
            targets.forEach(tgt => {
              const elemMult = typeof getElementMultiplier === 'function' ? getElementMultiplier(atkElem, tgt.elem) : 1.0;
              const rawDmg = Math.floor((Number(u.atk) || 10) * (1 + lowHpBonus) * skillMult * elemMult);
              const dmg = Math.max(1, rawDmg - Math.floor((tgt.def || 0) / 2));
              tgt.hp -= dmg;
              totalDealt += dmg;
              triggerMotion(`enemy-slot-${tgt.slot}`, 'hit-motion');
              const label = elemMult > 1 ? `弱点 -${dmg}` : (elemMult < 1 ? `耐性 -${dmg}` : (firedSkill ? `${firedSkill.name} -${dmg}` : `-${dmg}`));
              showDamagePopup(`enemy-slot-${tgt.slot}`, label, (firedSkill || elemMult > 1) ? 'crit' : '');
            });

            const healRate = (st.lifesteal || 0) + (firedSkill?.drain || 0);
            if (healRate > 0 && totalDealt > 0) u.hp = Math.min(u.maxHp, u.hp + Math.max(1, Math.floor(totalDealt * healRate)));

            triggerMotion(`ally-slot-${i}`, 'atk-motion');
            needsUiSync = true;
            if (enemies.every(e => e.hp <= 0)) { handleWaveClear(); requestAnimationFrame(battleFrameLoop); return; }
          }
        }
        if (ctBar) ctBar.style.width = `${Math.min(100, (u.ct / limitCt) * 100)}%`;
      }

      if (typeof getTankSupportAtk === 'function' && typeof getEquippedTank === 'function' && getEquippedTank()) {
        state.shipCt = (Number(state.shipCt) || 0) + dt;
        const vInterval = typeof getTankInterval === 'function' ? getTankInterval() : 3.2;
        if (state.shipCt >= vInterval) {
          state.shipCt = 0;
          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            const tgt = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const vDmg = Math.max(1, getTankSupportAtk() - Math.floor((tgt.def || 0) / 3));
            tgt.hp -= vDmg;
            triggerMotion(`enemy-slot-${tgt.slot}`, 'hit-motion');
            showDamagePopup(`enemy-slot-${tgt.slot}`, `砲撃 -${vDmg}`, 'ship-dmg');
            needsUiSync = true;
            if (enemies.every(e => e.hp <= 0)) { handleWaveClear(); requestAnimationFrame(battleFrameLoop); return; }
          }
        }
      }

      for (let ei = 0; ei < enemies.length; ei++) {
        const e = enemies[ei];
        if (!e || e.hp <= 0) continue;
        e.curCt = (Number(e.curCt) || 0) + dt;
        const eCtBar = document.querySelector(`#enemy-slot-${e.slot} .e-ct-fill`);
        if (e.curCt >= (Number(e.ct) || 2.0)) {
          e.curCt = 0;
          const aliveAllies = Array.of(0, 1, 2).filter(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; });
          if (aliveAllies.length > 0) {
            const tIdx = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
            const tUnit = battleAllies.slice(tIdx, tIdx + 1).pop();
            const dmg = Math.max(1, (Number(e.atk) || 8) - Math.floor((Number(tUnit.def) || 0) / 2));
            tUnit.hp -= dmg;
            triggerMotion(`enemy-slot-${e.slot}`, 'atk-motion');
            triggerMotion(`ally-slot-${tIdx}`, 'hit-motion');
            showDamagePopup(`ally-slot-${tIdx}`, `-${dmg}`, 'ally-dmg');
            needsUiSync = true;

            if (!Array.of(0, 1, 2).some(idx => { const u = battleAllies.slice(idx, idx + 1).pop(); return u && u.hp > 0; })) {
              state.inBattle = false; state.wave = 1;
              state.enemies = typeof getFixedWaveEnemies === 'function' ? getFixedWaveEnemies(state.stage, state.floor, 1) : [];
              if (autoActive) autoActive = false;
              if (typeof resetBattleAllies === 'function') resetBattleAllies();
              showToast('全滅しました…訓練や配合で仲間を強化しよう');
              triggerAutoSave();
              needsUiSync = true;
              break;
            }
          }
        }
        if (eCtBar) eCtBar.style.width = `${Math.min(100, (e.curCt / (Number(e.ct) || 2.0)) * 100)}%`;
      }

      if (needsUiSync) updateUI();
    }
  } catch (err) { console.error(err); }
  requestAnimationFrame(battleFrameLoop);
}
requestAnimationFrame(battleFrameLoop);
