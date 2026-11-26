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
