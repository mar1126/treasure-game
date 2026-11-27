// バトル進行・ターンCT・スキル・バトルエフェクト・報酬計算 (battle.js)
let battleLoopTimer = null;
let lastTickAt = Date.now();

(function injectBattleFxStyles() {
  if (typeof document === 'undefined' || document.getElementById('ff-battle-fx-style')) return;
  const st = document.createElement('style');
  st.id = 'ff-battle-fx-style';
  st.textContent = `
    @keyframes battleAreaShake {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-4px, 3px); }
      40% { transform: translate(4px, -3px); }
      60% { transform: translate(-3px, -2px); }
      80% { transform: translate(3px, 2px); }
    }
    .battle-area.shake-fx { animation: battleAreaShake 0.28s ease-out; }
    .fx-screen-flash {
      position: absolute; inset: 0; pointer-events: none; z-index: 18;
      animation: fxFlashOut 0.35s ease-out forwards;
    }
    @keyframes fxFlashOut {
      0% { opacity: 0.45; }
      100% { opacity: 0; }
    }
    .fx-hit-burst {
      position: absolute; width: 76px; height: 76px;
      transform: translate(-50%, -50%) scale(0.4);
      pointer-events: none; z-index: 22;
      animation: fxBurstPop 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fxBurstPop {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.35) rotate(-12deg); }
      55% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(6deg); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.35) rotate(12deg); }
    }
    .fx-heal-spark {
      position: absolute; width: 64px; height: 64px;
      transform: translate(-50%, -50%);
      pointer-events: none; z-index: 22;
      animation: fxHealFloat 0.65s ease-out forwards;
    }
    @keyframes fxHealFloat {
      0% { opacity: 0.95; transform: translate(-50%, -30%) scale(0.7); }
      100% { opacity: 0; transform: translate(-50%, -95%) scale(1.25); }
    }
  `;
  document.head.appendChild(st);
})();

function getTargetCenterInFxLayer(targetId) {
  const fx = document.getElementById('fx-layer');
  const el = document.getElementById(targetId);
  if (!fx || !el) return null;
  const fRect = fx.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  return {
    fx,
    x: (eRect.left - fRect.left) + (eRect.width * 0.5),
    y: (eRect.top - fRect.top) + (eRect.height * 0.52)
  };
}

function triggerScreenFlash(color = 'rgba(255,255,255,0.6)', shake = false) {
  const bg = document.getElementById('battle-bg');
  const fx = document.getElementById('fx-layer');
  if (shake && bg) {
    bg.classList.remove('shake-fx');
    void bg.offsetWidth;
    bg.classList.add('shake-fx');
  }
  if (fx) {
    const div = document.createElement('div');
    div.className = 'fx-screen-flash';
    div.style.background = `radial-gradient(circle, ${color} 0%, transparent 75%)`;
    fx.appendChild(div);
    setTimeout(() => div.remove(), 380);
  }
}

function spawnHitEffect(targetId, elem = 'none', isSkill = false) {
  const pos = getTargetCenterInFxLayer(targetId);
  if (!pos) return;
  const el = document.createElement('div');
  el.className = 'fx-hit-burst';
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;
  if (isSkill) {
    el.style.width = '94px';
    el.style.height = '94px';
  }

  let svg = '';
  if (elem === 'fire') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="36" fill="none" stroke="#ff5722" stroke-width="6" stroke-dasharray="18 10"/>
      <polygon points="50,8 62,36 92,38 68,58 76,88 50,70 24,88 32,58 8,38 38,36" fill="#ff9800" opacity="0.88"/>
      <circle cx="50" cy="50" r="18" fill="#fff59d"/>
    </svg>`;
  } else if (elem === 'water') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#29b6f6" stroke-width="5"/>
      <circle cx="50" cy="50" r="24" fill="none" stroke="#b3e5fc" stroke-width="4" stroke-dasharray="12 8"/>
      <polygon points="50,10 58,42 90,50 58,58 50,90 42,58 10,50 42,42" fill="#4fc3f7" opacity="0.9"/>
    </svg>`;
  } else if (elem === 'wind') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <polyline points="58,6 34,46 54,48 36,94" fill="none" stroke="#ffee58" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="58,6 34,46 54,48 36,94" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="#66bb6a" stroke-width="4" stroke-dasharray="20 12"/>
    </svg>`;
  } else if (elem === 'light') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <polygon points="50,4 58,42 96,50 58,58 50,96 42,58 4,50 42,42" fill="#fff176"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#ffd54f" stroke-width="5"/>
    </svg>`;
  } else if (elem === 'dark') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="35" fill="#4a148c" opacity="0.55"/>
      <path d="M18,22 L82,78 M82,22 L18,78 M50,12 L50,88" stroke="#e040fb" stroke-width="7" stroke-linecap="round"/>
    </svg>`;
  } else if (elem === 'tank') {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="42" fill="#ff7043" opacity="0.7"/>
      <polygon points="50,6 64,34 94,32 72,54 84,84 50,68 16,84 28,54 6,32 36,34" fill="#ffca28"/>
      <circle cx="50" cy="50" r="20" fill="#ffffff"/>
    </svg>`;
  } else {
    svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">
      <path d="M16,18 L84,82" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
      <path d="M84,18 L16,82" stroke="#80deea" stroke-width="6" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="14" fill="#ffffff" opacity="0.9"/>
    </svg>`;
  }

  el.innerHTML = svg;
  pos.fx.appendChild(el);
  setTimeout(() => el.remove(), 440);
}

function spawnHealEffect(targetId) {
  const pos = getTargetCenterInFxLayer(targetId);
  if (!pos) return;
  const el = document.createElement('div');
  el.className = 'fx-heal-spark';
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;
  el.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <path d="M50,18 V42 M38,30 H62" stroke="#69f0ae" stroke-width="7" stroke-linecap="round"/>
    <path d="M24,48 V64 M16,56 H32" stroke="#b9f6ca" stroke-width="5" stroke-linecap="round"/>
    <path d="M76,44 V60 M68,52 H84" stroke="#b9f6ca" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
  pos.fx.appendChild(el);
  setTimeout(() => el.remove(), 660);
}
function spawnDamagePopup(targetId, text, typeClass = '') {
  const pos = getTargetCenterInFxLayer(targetId);
  if (!pos) return;
  const div = document.createElement('div');
  div.className = `dmg-popup ${typeClass}`;
  div.textContent = text;
  div.style.left = `${pos.x + (Math.random() * 16 - 8)}px`;
  div.style.top = `${pos.y - 6}px`;
  pos.fx.appendChild(div);
  setTimeout(() => div.remove(), 820);
}

function triggerUnitMotion(elementId, motionClass) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(motionClass);
  void el.offsetWidth;
  el.classList.add(motionClass);
  setTimeout(() => el.classList.remove(motionClass), 380);
}

function showBattleBanner(msg, duration = 1800) {
  const el = document.getElementById('capture-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, duration);
}

function performAllyTurn(slotIdx) {
  const allies = Array.isArray(state.allies) ? state.allies : [];
  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  const unit = allies[slotIdx];
  if (!unit || unit.hp <= 0) return;

  const livingEnemies = enemies.map((e, i) => ({ e, i })).filter(x => x.e && x.e.hp > 0);
  if (livingEnemies.length === 0) return;

  triggerUnitMotion(`ally-slot-${slotIdx}`, 'atk-motion');

  const skill = typeof getMonsterSkill === 'function' ? getMonsterSkill(unit.skillId) : null;
  const useSkill = skill && skill.type !== 'passive' && Math.random() < (skill.chance || 0.25);

  if (useSkill && skill.type === 'heal') {
    const healVal = Math.max(1, Math.floor(unit.maxHp * (skill.power || 0.2)));
    triggerScreenFlash('rgba(105, 240, 174, 0.45)', false);
    allies.forEach((a, idx) => {
      if (a && a.hp > 0) {
        a.hp = Math.min(a.maxHp, a.hp + healVal);
        spawnHealEffect(`ally-slot-${idx}`);
        spawnDamagePopup(`ally-slot-${idx}`, `+${healVal} (${skill.name})`, 'crit');
      }
    });
    return;
  }

  let baseAtk = unit.atk;
  if (skill && skill.type === 'passive') {
    baseAtk = Math.floor(baseAtk * (skill.atkMul || 1.15));
  }

  const targets = (useSkill && skill.type === 'aoe')
    ? livingEnemies
    : [livingEnemies[Math.floor(Math.random() * livingEnemies.length)]];

  const atkElem = unit.elem || 'none';
  if (useSkill && skill.type === 'aoe') {
    const flashColor = atkElem === 'fire' ? 'rgba(255,87,34,0.55)'
      : (atkElem === 'water' ? 'rgba(41,182,246,0.55)'
      : (atkElem === 'wind' ? 'rgba(255,238,88,0.55)'
      : (atkElem === 'dark' ? 'rgba(171,71,188,0.55)' : 'rgba(255,241,118,0.6)')));
    triggerScreenFlash(flashColor, true);
  }

  targets.forEach(({ e, i }) => {
    let dmg = Math.floor(baseAtk * (0.9 + Math.random() * 0.25));
    const elemMult = typeof getElemMultiplier === 'function' ? getElemMultiplier(atkElem, e.elem) : 1.0;
    dmg = Math.floor(dmg * elemMult);
    if (useSkill) dmg = Math.floor(dmg * (skill.power || 1.45));
    dmg = Math.max(1, dmg);

    e.hp = Math.max(0, e.hp - dmg);
    triggerUnitMotion(`enemy-slot-${i}`, 'hit-motion');
    spawnHitEffect(`enemy-slot-${i}`, atkElem, useSkill);

    const isCrit = useSkill || elemMult > 1;
    const label = useSkill ? `${dmg} ★${skill.name}!` : (elemMult > 1 ? `${dmg} WEAK!` : `${dmg}`);
    spawnDamagePopup(`enemy-slot-${i}`, label, isCrit ? 'crit' : '');
  });
}

function performTankTurn() {
  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  const livingEnemies = enemies.map((e, i) => ({ e, i })).filter(x => x.e && x.e.hp > 0);
  if (livingEnemies.length === 0) return;

  const tankAtk = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 25;
  triggerScreenFlash('rgba(255, 167, 38, 0.55)', true);

  livingEnemies.forEach(({ e, i }) => {
    const dmg = Math.max(1, Math.floor(tankAtk * (0.9 + Math.random() * 0.2)));
    e.hp = Math.max(0, e.hp - dmg);
    triggerUnitMotion(`enemy-slot-${i}`, 'hit-motion');
    spawnHitEffect(`enemy-slot-${i}`, 'tank', true);
    spawnDamagePopup(`enemy-slot-${i}`, `砲撃 ${dmg}!`, 'ship-dmg');
  });
}

function performEnemyTurn(enemyIdx) {
  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  const allies = Array.isArray(state.allies) ? state.allies : [];
  const enemy = enemies[enemyIdx];
  if (!enemy || enemy.hp <= 0) return;

  const livingAllies = allies.map((a, i) => ({ a, i })).filter(x => x.a && x.a.hp > 0);
  if (livingAllies.length === 0) return;

  triggerUnitMotion(`enemy-slot-${enemyIdx}`, 'atk-motion');
  const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
  const elemMult = typeof getElemMultiplier === 'function' ? getElemMultiplier(enemy.elem, target.a.elem) : 1.0;
  const dmg = Math.max(1, Math.floor(enemy.atk * (0.85 + Math.random() * 0.25) * elemMult));

  target.a.hp = Math.max(0, target.a.hp - dmg);
  triggerUnitMotion(`ally-slot-${target.i}`, 'hit-motion');
  spawnHitEffect(`ally-slot-${target.i}`, enemy.elem || 'none', false);
  spawnDamagePopup(`ally-slot-${target.i}`, `-${dmg}`, 'ally-dmg');
}
function handleWaveCleared() {
  const stg = (typeof STAGES !== 'undefined' && STAGES[state.stageIdx]) ? STAGES[state.stageIdx] : { floors: 10 };
  const isBoss = state.wave >= state.maxWaves;
  const mult = Math.pow(1.38, state.stageIdx) * (1 + (state.floor - 1) * 0.14) * (isBoss ? 2.5 : 1);

  const goldGain = Math.floor(24 * mult);
  const expGain = Math.floor(18 * mult);
  gold += goldGain;

  const gemChance = isBoss ? 0.55 : 0.18;
  if (Math.random() < gemChance) {
    const gemBonus = isBoss ? 15 : 5;
    gem += gemBonus;
    showBattleBanner(`撃破！ +${goldGain}G / +${gemBonus} GEM！`);
  } else {
    showBattleBanner(`撃破！ +${goldGain}G / EXP +${expGain}`);
  }

  const partyIds = new Set();
  (party || []).forEach(val => {
    if (val !== null && val !== undefined) {
      const m = (captured || [])[val] || (captured || []).find(x => x && x.id === val);
      if (m) {
        partyIds.add(m.id);
        if (typeof grantMonsterExp === 'function') grantMonsterExp(m, expGain);
      }
    }
  });

  const trainExp = Math.max(1, Math.floor(expGain * 0.1));
  (trainingSlots || []).forEach(id => {
    if (id !== null && id !== undefined && !partyIds.has(id)) {
      const m = (captured || []).find(x => x && x.id === id);
      if (m && typeof grantMonsterExp === 'function') grantMonsterExp(m, trainExp);
    }
  });

  (state.enemies || []).forEach(e => {
    if (e && (captured || []).length < maxMonsterBox && Math.random() < (e.catchRate || 0.22)) {
      const sp = typeof getSpeciesByName === 'function' ? getSpeciesByName(e.name) : null;
      if (sp && typeof createMonsterInstance === 'function') {
        const newMon = createMonsterInstance(sp, Math.max(1, state.stageIdx * 3 + state.floor));
        captured.push(newMon);
        showToast(`「${newMon.name}」が仲間になった！`);
      }
    }
  });

  if (isBoss) {
    const nextFloor = state.floor + 1;
    if (nextFloor > stg.floors) {
      if (typeof STAGES !== 'undefined' && state.stageIdx + 1 < STAGES.length) {
        state.stageIdx += 1;
        state.floor = 1;
      } else {
        state.floor = stg.floors;
      }
    } else {
      state.floor = nextFloor;
    }
    state.wave = 1;
    if (typeof updateMaxProgress === 'function') updateMaxProgress();

    if (waveStopMode || !autoActive) {
      state.inBattle = false;
      if (typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof spawnEnemies === 'function') spawnEnemies();
      showToast('階層クリア！');
    } else {
      if (typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof spawnEnemies === 'function') spawnEnemies();
    }
  } else {
    state.wave += 1;
    if (typeof spawnEnemies === 'function') spawnEnemies();
  }

  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}

function tickBattleLoop() {
  const now = Date.now();
  const dt = Math.min(0.25, (now - lastTickAt) / 1000);
  lastTickAt = now;

  if (!state || !state.inBattle) return;

  const allies = Array.isArray(state.allies) ? state.allies : [];
  const enemies = Array.isArray(state.enemies) ? state.enemies : [];
  if (allies.length === 0 || enemies.length === 0) return;

  const speedMult = (typeof speed2xUnlocked !== 'undefined' && speed2xUnlocked && speed2xActive) ? 2.0 : 1.0;
  const step = dt * speedMult;

  allies.forEach((a, idx) => {
    if (!a || a.hp <= 0) return;
    a.ct = (a.ct || 0) + step;
    if (a.ct >= (a.ctMax || 2.0)) {
      a.ct = 0;
      performAllyTurn(idx);
    }
  });

  if (enemies.every(e => !e || e.hp <= 0)) {
    handleWaveCleared();
    return;
  }

  if (typeof landTankTier !== 'undefined' && Number(landTankTier) > 0) {
    state.tankCt = (state.tankCt || 0) + step;
    const tankIv = typeof getTankInterval === 'function' ? getTankInterval() : 3.2;
    if (state.tankCt >= tankIv) {
      state.tankCt = 0;
      performTankTurn();
      if (enemies.every(e => !e || e.hp <= 0)) {
        handleWaveCleared();
        return;
      }
    }
  }

  enemies.forEach((e, idx) => {
    if (!e || e.hp <= 0) return;
    e.ct = (e.ct || 0) + step;
    if (e.ct >= (e.ctMax || 2.5)) {
      e.ct = 0;
      performEnemyTurn(idx);
    }
  });

  if (allies.every(a => !a || a.hp <= 0)) {
    state.inBattle = false;
    state.wave = 1;
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof spawnEnemies === 'function') spawnEnemies();
    if (typeof updateUI === 'function') updateUI();
    showToast('全滅してしまった…体制を立て直そう！');
    return;
  }

  if (typeof updateBattleBarsOnly === 'function') updateBattleBarsOnly();
}

function startBattleLoop() {
  if (battleLoopTimer) clearInterval(battleLoopTimer);
  lastTickAt = Date.now();
  battleLoopTimer = setInterval(tickBattleLoop, 60);
}
function startBattle(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  if (state.inBattle) return;

  const hasMember = Array.isArray(party) && party.some(val =>
    val !== null && val !== undefined && ((captured || [])[val] || (captured || []).some(m => m && m.id === val))
  );
  if (!hasMember) {
    alert('パーティにモンスターを1体以上編成してください！');
    return;
  }

  if (stamina < 1) {
    alert('スタミナが足りません（1回復するまでお待ちください）');
    return;
  }

  stamina -= 1;
  staminaUpdatedAt = Date.now();
  state.inBattle = true;
  state.wave = 1;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof spawnEnemies === 'function') spawnEnemies();
  if (typeof updateUI === 'function') updateUI();
  startBattleLoop();
}

function retreatBattle(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  if (!state.inBattle) return;
  state.inBattle = false;
  state.wave = 1;
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof spawnEnemies === 'function') spawnEnemies();
  if (typeof updateUI === 'function') updateUI();
  showToast('バトルから退却しました');
}

function toggleWaveStopMode(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  waveStopMode = !waveStopMode;
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
  showToast(waveStopMode ? '1階層ごとに停止するモードにしました' : '階層連戦モードにしました');
}

function toggleAutoMode(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  if (!autoUnlocked) return;
  autoActive = !autoActive;
  if (autoActive) waveStopMode = false;
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
  showToast(autoActive ? '自動周回 ON' : '自動周回 OFF');
}

function toggleSpeedMode(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  if (!speed2xUnlocked) return;
  speed2xActive = !speed2xActive;
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
  showToast(speed2xActive ? '戦闘速度 2倍速' : '戦闘速度 通常(1x)');
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    startBattleLoop();
  });
}
