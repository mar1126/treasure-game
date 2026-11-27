// バトル進行・ターンCT・ハイクオリティCanvasパーティクルエフェクト・報酬計算 (battle.js)
let battleLoopTimer = null;
let lastTickAt = Date.now();
let fxParticles = [];
let fxBeams = [];
let fxRings = [];
let fxAnimId = null;

(function injectBattleFxStyles() {
  if (typeof document === 'undefined' || document.getElementById('ff-battle-fx-style')) return;
  const st = document.createElement('style');
  st.id = 'ff-battle-fx-style';
  st.textContent = `
    @keyframes battleAreaShake {
      0%, 100% { transform: translate(0, 0); }
      15% { transform: translate(-5px, 4px); }
      35% { transform: translate(5px, -3px); }
      55% { transform: translate(-4px, -2px); }
      75% { transform: translate(3px, 3px); }
    }
    .battle-area.shake-fx { animation: battleAreaShake 0.3s ease-out; }
    .fx-screen-flash {
      position: absolute; inset: 0; pointer-events: none; z-index: 18;
      animation: fxFlashOut 0.36s ease-out forwards;
    }
    @keyframes fxFlashOut {
      0% { opacity: 0.52; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(st);
})();

function ensureFxCanvas() {
  const layer = document.getElementById('fx-layer');
  if (!layer) return null;
  let cvs = document.getElementById('ff-fx-canvas');
  if (!cvs) {
    cvs = document.createElement('canvas');
    cvs.id = 'ff-fx-canvas';
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:21;';
    layer.appendChild(cvs);
  }
  const rect = layer.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0 && (cvs.width !== Math.round(rect.width) || cvs.height !== Math.round(rect.height))) {
    cvs.width = Math.round(rect.width);
    cvs.height = Math.round(rect.height);
  }
  if (!fxAnimId) {
    fxAnimId = requestAnimationFrame(renderFxCanvasLoop);
  }
  return cvs;
}

function renderFxCanvasLoop() {
  const cvs = document.getElementById('ff-fx-canvas');
  if (cvs && cvs.width > 0 && cvs.height > 0) {
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = fxBeams.length - 1; i >= 0; i--) {
      const b = fxBeams[i];
      b.life -= 0.075;
      if (b.life <= 0) { fxBeams.splice(i, 1); continue; }
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.lineWidth = b.width * b.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }

    for (let i = fxRings.length - 1; i >= 0; i--) {
      const r = fxRings[i];
      r.life -= 0.055;
      r.radius += r.grow;
      if (r.life <= 0) { fxRings.splice(i, 1); continue; }
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.lineWidth = Math.max(1, r.lineWidth * r.life);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.life -= p.decay;
      if (p.life <= 0) { fxParticles.splice(i, 1); continue; }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  fxAnimId = requestAnimationFrame(renderFxCanvasLoop);
}

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

function triggerScreenFlash(color = 'rgba(255,255,255,0.65)', shake = false) {
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
    div.style.background = `radial-gradient(circle, ${color} 0%, transparent 76%)`;
    fx.appendChild(div);
    setTimeout(() => div.remove(), 380);
  }
}
function spawnHitEffect(targetId, elem = 'none', isSkill = false) {
  ensureFxCanvas();
  const pos = getTargetCenterInFxLayer(targetId);
  if (!pos) return;
  const { x, y } = pos;
  const count = isSkill ? 34 : 20;
  const scale = isSkill ? 1.35 : 1.0;

  const palettes = {
    fire:  ['#ff3d00', '#ff9100', '#ffd740', '#ffffff'],
    water: ['#00b0ff', '#40c4ff', '#b3e5fc', '#ffffff'],
    wind:  ['#00e676', '#aeea00', '#ffee58', '#ffffff'],
    sky:   ['#00e5ff', '#b2ebf2', '#ffee58', '#ffffff'],
    earth: ['#8d6e63', '#ffb300', '#ffe082', '#ffffff'],
    light: ['#ffd600', '#ffff8d', '#fff9c4', '#ffffff'],
    dark:  ['#aa00ff', '#e040fb', '#7c4dff', '#f8bbd0'],
    tank:  ['#ff3d00', '#ffab00', '#ffd740', '#ffffff'],
    none:  ['#80deea', '#e0f7fa', '#ffd54f', '#ffffff']
  };
  const colors = palettes[elem] || palettes.none;

  fxRings.push({ x, y, radius: 6, grow: 3.2 * scale, color: colors[0], lineWidth: 5 * scale, life: 1.0 });
  if (isSkill || elem === 'tank' || elem === 'light') {
    fxRings.push({ x, y, radius: 3, grow: 2.0 * scale, color: '#ffffff', lineWidth: 3.5 * scale, life: 0.9 });
  }

  if (elem === 'tank') {
    const cvs = document.getElementById('ff-fx-canvas');
    const startX = cvs ? cvs.width * 0.5 : x;
    const startY = cvs ? cvs.height : y + 120;
    fxBeams.push({ x1: startX, y1: startY, x2: x, y2: y, color: '#ffab00', width: 9, life: 1.0 });
    fxBeams.push({ x1: startX, y1: startY, x2: x, y2: y, color: '#ffffff', width: 4, life: 1.0 });
  } else if (elem === 'wind' || elem === 'sky') {
    const zig1X = x - 18 * scale, zig1Y = y - 16 * scale;
    const zig2X = x + 16 * scale, zig2Y = y + 4 * scale;
    fxBeams.push({ x1: x + 10 * scale, y1: y - 42 * scale, x2: zig1X, y2: zig1Y, color: '#ffee58', width: 6 * scale, life: 1.0 });
    fxBeams.push({ x1: zig1X, y1: zig1Y, x2: zig2X, y2: zig2Y, color: '#ffffff', width: 6 * scale, life: 1.0 });
    fxBeams.push({ x1: zig2X, y1: zig2Y, x2: x - 8 * scale, y2: y + 42 * scale, color: '#ffee58', width: 6 * scale, life: 1.0 });
  } else if (elem === 'light') {
    fxBeams.push({ x1: x, y1: y - 44 * scale, x2: x, y2: y + 44 * scale, color: '#fff59d', width: 7 * scale, life: 1.0 });
    fxBeams.push({ x1: x - 44 * scale, y1: y, x2: x + 44 * scale, y2: y, color: '#ffffff', width: 7 * scale, life: 1.0 });
  } else if (elem === 'dark') {
    for (let k = -1; k <= 1; k++) {
      fxBeams.push({
        x1: x - 28 * scale + k * 9, y1: y - 28 * scale - k * 9,
        x2: x + 28 * scale + k * 9, y2: y + 28 * scale - k * 9,
        color: '#e040fb', width: 4.5 * scale, life: 1.0
      });
    }
  } else if (elem === 'none') {
    fxBeams.push({ x1: x - 30 * scale, y1: y - 26 * scale, x2: x + 30 * scale, y2: y + 26 * scale, color: '#ffffff', width: 6 * scale, life: 1.0 });
    fxBeams.push({ x1: x + 30 * scale, y1: y - 26 * scale, x2: x - 30 * scale, y2: y + 26 * scale, color: '#80deea', width: 5 * scale, life: 1.0 });
  }

  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + (Math.random() * 0.45 - 0.22);
    const spd = (1.6 + Math.random() * 4.4) * scale;
    fxParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - (elem === 'fire' ? 1.2 : 0),
      drag: 0.91,
      gravity: elem === 'water' ? 0.14 : (elem === 'fire' ? -0.08 : 0.03),
      size: (2.4 + Math.random() * 3.4) * scale,
      color: colors[i % colors.length],
      life: 1.0,
      decay: 0.032 + Math.random() * 0.025
    });
  }
}

function spawnHealEffect(targetId) {
  ensureFxCanvas();
  const pos = getTargetCenterInFxLayer(targetId);
  if (!pos) return;
  const { x, y } = pos;
  fxRings.push({ x, y: y + 10, radius: 8, grow: 1.8, color: '#69f0ae', lineWidth: 3.5, life: 1.0 });
  const colors = ['#00e676', '#69f0ae', '#b9f6ca', '#ffffff'];
  for (let i = 0; i < 22; i++) {
    fxParticles.push({
      x: x + (Math.random() * 44 - 22),
      y: y + (Math.random() * 24 - 6),
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(1.4 + Math.random() * 2.4),
      drag: 0.96,
      gravity: -0.04,
      size: 2.5 + Math.random() * 3.0,
      color: colors[i % colors.length],
      life: 1.0,
      decay: 0.025 + Math.random() * 0.02
    });
  }
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
  const unit = battleAllies[slotIdx];
  if (!unit || unit.hp <= 0) return;

  const livingEnemies = (state.enemies || []).map((e, i) => ({ e, i })).filter(x => x.e && x.e.hp > 0);
  if (livingEnemies.length === 0) return;

  triggerUnitMotion(`ally-slot-${slotIdx}`, 'atk-motion');

  const skill = typeof getMonsterSkill === 'function' ? getMonsterSkill(unit.skillId) : null;
  const useSkill = skill && skill.type !== 'passive' && Math.random() < (skill.chance || 0.25);

  if (useSkill && skill.type === 'heal') {
    const healVal = Math.max(1, Math.floor(unit.maxHp * (skill.power || 0.2)));
    triggerScreenFlash('rgba(105, 240, 174, 0.45)', false);
    battleAllies.forEach((a, idx) => {
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
      : (atkElem === 'wind' || atkElem === 'sky' ? 'rgba(255,238,88,0.55)'
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
  const livingEnemies = (state.enemies || []).map((e, i) => ({ e, i })).filter(x => x.e && x.e.hp > 0);
  if (livingEnemies.length === 0) return;

  const tankAtk = typeof getTankSupportAtk === 'function' ? getTankSupportAtk() : 25;
  triggerScreenFlash('rgba(255, 167, 38, 0.58)', true);

  livingEnemies.forEach(({ e, i }) => {
    const dmg = Math.max(1, Math.floor(tankAtk * (0.9 + Math.random() * 0.2)));
    e.hp = Math.max(0, e.hp - dmg);
    triggerUnitMotion(`enemy-slot-${i}`, 'hit-motion');
    spawnHitEffect(`enemy-slot-${i}`, 'tank', true);
    spawnDamagePopup(`enemy-slot-${i}`, `${dmg}`, 'crit');
  });
}

function performEnemyTurn(enemyIdx) {
  const enemy = (state.enemies || [])[enemyIdx];
  if (!enemy || enemy.hp <= 0) return;

  const livingAllies = battleAllies.map((a, i) => ({ a, i })).filter(x => x.a && x.a.hp > 0);
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
  const isBoss = state.wave >= 3;
  const stageNum = Number(state.stage) || 1;
  const floorNum = Number(state.floor) || 1;
  const mult = Math.pow(1.38, stageNum - 1) * (1 + (floorNum - 1) * 0.14) * (isBoss ? 2.5 : 1);

  const tavernBonus = typeof getTavernRecipeBonus === 'function'
    ? getTavernRecipeBonus()
    : { goldPct: 0, expPct: 0 };

  const goldGain = Math.floor(24 * mult * (1 + (tavernBonus.goldPct || 0) / 100));
  const expGain = Math.floor(18 * mult * (1 + (tavernBonus.expPct || 0) / 100));
  gold += goldGain;

  const lootList = typeof grantBattleLoot === 'function' ? grantBattleLoot(stageNum, floorNum, isBoss) : [];
  const lootSuffix = lootList.length > 0 ? ` ｜ ${lootList.join('・')}` : '';

  const gemChance = isBoss ? 0.55 : 0.18;
  if (Math.random() < gemChance) {
    const gemBonus = isBoss ? 15 : 5;
    gem += gemBonus;
    showBattleBanner(`撃破！ +${goldGain}G / +${gemBonus} GEM${lootSuffix}`);
  } else {
    showBattleBanner(`撃破！ +${goldGain}G / EXP +${expGain}${lootSuffix}`);
  }

  const partyIds = new Set();
  (party || []).forEach(val => {
    if (val !== null && val !== undefined) {
      const m = (captured || [])[val] || (captured || []).find(x => x && x.id === val);
      if (m) {
        partyIds.add(m.id);
        if (typeof grantExpToMonster === 'function') grantExpToMonster(m, expGain);
      }
    }
  });

  const trainExp = Math.max(1, Math.floor(expGain * 0.1));
  (trainingSlots || []).forEach(val => {
    if (val !== null && val !== undefined) {
      const m = (captured || [])[val] || (captured || []).find(x => x && x.id === val);
      if (m && !partyIds.has(m.id) && typeof grantExpToMonster === 'function') {
        grantExpToMonster(m, trainExp);
      }
    }
  });

  (state.enemies || []).forEach(e => {
    if (e && typeof tryAutoRecruit === 'function') {
      tryAutoRecruit(e);
    }
  });

  if (isBoss) {
    if (floorNum >= 20) {
      if (stageNum < 10) {
        state.stage = stageNum + 1;
        state.floor = 1;
      } else {
        state.floor = 20;
      }
    } else {
      state.floor = floorNum + 1;
    }
    state.wave = 1;

    if (typeof recordClearedStageFloor === 'function') {
      recordClearedStageFloor(state.stage, state.floor);
    } else if (typeof state.maxStage !== 'undefined') {
      if (state.stage > state.maxStage || (state.stage === state.maxStage && state.floor > (state.maxFloor || 1))) {
        state.maxStage = state.stage;
        state.maxFloor = state.floor;
      }
    }

    state.enemies = [];
    if (waveStopMode || !autoActive) {
      state.inBattle = false;
      if (typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
      showToast('階層クリア！');
    } else {
      if (typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
    }
  } else {
    state.wave += 1;
    state.enemies = [];
    if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
  }

  if (typeof renderStageBackground === 'function') renderStageBackground();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderBag === 'function') renderBag();
  if (typeof renderTavernRecipesSection === 'function') renderTavernRecipesSection();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(false);
}
function updateBattleBarsOnly() {
  for (let i = 0; i < 3; i++) {
    const a = battleAllies[i];
    const slot = document.getElementById(`ally-slot-${i}`);
    const hpBar = document.getElementById(`ally-hp-${i}`);
    const ctBar = document.getElementById(`ally-ct-${i}`);
    if (a && a.maxHp > 0) {
      if (slot) slot.classList.toggle('dead', a.hp <= 0);
      if (hpBar) hpBar.style.width = `${Math.max(0, Math.min(100, (a.hp / a.maxHp) * 100))}%`;
      if (ctBar) ctBar.style.width = `${Math.max(0, Math.min(100, ((a.ct || 0) / (a.ctMax || 2.0)) * 100))}%`;
      const hpTxt = slot ? slot.querySelector('.hp-text') : null;
      if (hpTxt) hpTxt.textContent = `${a.name} ${a.hp}/${a.maxHp}`;
    }

    const e = (state.enemies || [])[i];
    const eSlot = document.getElementById(`enemy-slot-${i}`);
    if (e && eSlot) {
      eSlot.classList.toggle('dead', e.hp <= 0);
      const eHp = eSlot.querySelector('.e-hp-fill');
      const eCt = eSlot.querySelector('.e-ct-fill');
      const eNm = eSlot.querySelector('.e-name');
      if (eHp) eHp.style.width = `${Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100))}%`;
      if (eCt) eCt.style.width = `${Math.max(0, Math.min(100, ((e.ct || 0) / (e.ctMax || 2.5)) * 100))}%`;
      if (eNm) eNm.textContent = `${e.name} (${e.hp})`;
    }
  }
}

function tickBattleLoop() {
  const now = Date.now();
  const dt = Math.min(0.25, (now - lastTickAt) / 1000);
  lastTickAt = now;

  if (!state || !state.inBattle) return;

  if (!Array.isArray(battleAllies) || battleAllies.length === 0) {
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
  }
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) {
    if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
  }

  const speedMult = (typeof speed2xUnlocked !== 'undefined' && speed2xUnlocked && speed2xActive) ? 2.0 : 1.0;
  const step = dt * speedMult;

  battleAllies.forEach((a, idx) => {
    if (!a || a.hp <= 0) return;
    a.ct = (a.ct || 0) + step;
    if (a.ct >= (a.ctMax || 2.0)) {
      a.ct = 0;
      performAllyTurn(idx);
    }
  });

  if ((state.enemies || []).length > 0 && state.enemies.every(e => !e || e.hp <= 0)) {
    handleWaveCleared();
    return;
  }

  if (typeof landTankTier !== 'undefined' && Number(landTankTier) > 0) {
    state.tankCt = (state.tankCt || 0) + step;
    const tankIv = typeof getTankInterval === 'function' ? getTankInterval() : 3.2;
    if (state.tankCt >= tankIv) {
      state.tankCt = 0;
      performTankTurn();
      if (state.enemies.every(e => !e || e.hp <= 0)) {
        handleWaveCleared();
        return;
      }
    }
  }

  (state.enemies || []).forEach((e, idx) => {
    if (!e || e.hp <= 0) return;
    e.ct = (e.ct || 0) + step;
    if (e.ct >= (e.ctMax || 2.5)) {
      e.ct = 0;
      performEnemyTurn(idx);
    }
  });

  if (battleAllies.some(Boolean) && battleAllies.every(a => !a || a.hp <= 0)) {
    state.inBattle = false;
    state.wave = 1;
    state.enemies = [];
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
    if (typeof updateUI === 'function') updateUI();
    showToast('全滅してしまった…体制を立て直そう！');
    return;
  }

  updateBattleBarsOnly();
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
  state.enemies = [];
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
  if (typeof updateUI === 'function') updateUI();
  startBattleLoop();
}

function retreatBattle(ev) {
  if (ev && ev.cancelable) ev.preventDefault();
  if (!state.inBattle) return;
  state.inBattle = false;
  state.wave = 1;
  state.enemies = [];
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
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
    ensureFxCanvas();
    startBattleLoop();
  });
}
