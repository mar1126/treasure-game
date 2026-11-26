// セーブ・ロード・クラウド同期管理 (storage.js)
let saveTimer = null, lastCloudSyncAt = 0;

function triggerAutoSave(immediate = false) {
  const cleanState = {
    stage: state.stage,
    floor: state.floor,
    wave: 1,
    maxStage: state.maxStage,
    maxFloorByStage: state.maxFloorByStage
  };
  const payload = {
    savedAt: Date.now(), playerName, gold, gem,
    landTankTier, landTankLv, landUpCost,
    stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked, waveStopMode,
    cafeLv, cafeCost, staff, gardenItems, party, trainingSlots, state: cleanState,
    captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig
  };
  const jsonStr = JSON.stringify(payload);
  localStorage.setItem('treasure_save_' + userId, jsonStr);
  const badge = document.getElementById('save-indicator');
  clearTimeout(saveTimer);
  const doSync = async () => {
    lastCloudSyncAt = Date.now();
    if (badge) badge.textContent = '同期中...';
    try {
      const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, user_name: playerName, save_json: jsonStr }) });
      if (!res.ok) throw new Error();
      if (badge) badge.textContent = '自動保存済';
    } catch (e) { if (badge) badge.textContent = '端末保存済'; }
  };
  const diff = Date.now() - lastCloudSyncAt;
  if (immediate || diff >= 15000) doSync();
  else { if (badge) badge.textContent = '端末保存済'; saveTimer = setTimeout(doSync, 15000 - diff); }
}

function applySaveData(data) {
  if (!data) return;
  playerName = data.playerName || 'ハンター';
  gold = data.gold ?? 200; gem = data.gem ?? 1000;

  landTankTier = Number(data.landTankTier) || 0;
  landTankLv = Number(data.landTankLv) || 1;
  landUpCost = Number(data.landUpCost) || 500;

  autoUnlocked = Boolean(data.autoUnlocked);
  speed2xUnlocked = Boolean(data.speed2xUnlocked);
  staminaFastUnlocked = Boolean(data.staminaFastUnlocked);
  waveStopMode = Boolean(data.waveStopMode);
  stamina = data.stamina ?? MAX_STAMINA; staminaUpdatedAt = data.staminaUpdatedAt || Date.now(); syncStamina();
  cafeLv = data.cafeLv ?? 1; cafeCost = data.cafeCost ?? 80;
  staff = Array.isArray(data.staff) ? data.staff.slice(0, 3) : new Array(3).fill(null);
  while (staff.length < 3) staff.push(null);
  gardenItems = data.gardenItems || [];

  const rawParty = Array.isArray(data.party) ? data.party : [];
  party = [rawParty.slice(0, 1).pop() ?? null, rawParty.slice(1, 2).pop() ?? null, rawParty.slice(2, 3).pop() ?? null];

  const rawTrain = Array.isArray(data.trainingSlots) ? data.trainingSlots : [];
  trainingSlots = [rawTrain.slice(0, 1).pop() ?? null, rawTrain.slice(1, 2).pop() ?? null, rawTrain.slice(2, 3).pop() ?? null];

  if (data.state) {
    const s = data.state.land ? data.state.land : data.state;
    const stg = Math.min(10, Math.max(1, Number(s.stage) || 1));
    const flr = Math.min(50, Math.max(1, Number(s.floor) || Number(s.area) || 1));
    state = {
      stage: stg,
      floor: flr,
      wave: 1,
      maxStage: Math.max(stg, Number(s.maxStage) || 1),
      maxFloorByStage: s.maxFloorByStage || { [stg]: flr },
      enemies: [],
      inBattle: false,
      shipCt: 0
    };
  }

  captured = (data.captured || []).map((m, idx) => {
    const sp = typeof getSpeciesData === 'function' ? getSpeciesData(m.name) : { name: 'スライム', elem: 'water', baseHp: 58, baseAtk: 10, baseDef: 3, ct: 1.8 };
    const validName = ALL_MONSTER_SPECIES.some(x => x.name === m.name) ? m.name : sp.name;
    const initSkills = Array.from(new Set(Array.isArray(m.skills) && m.skills.length > 0 ? m.skills : [typeof getSpeciesInnateSkillId === 'function' ? getSpeciesInnateSkillId(validName) : 'tackle']));
    const initTraits = Array.from(new Set(Array.isArray(m.traits) && m.traits.length > 0 ? m.traits : [typeof getSpeciesInnateTraitId === 'function' ? getSpeciesInnateTraitId(validName) : 'valor']));
    return {
      id: m.id || ('M' + idx),
      name: validName,
      elem: m.elem || sp.elem || 'none',
      lv: Number(m.lv) || 1,
      maxLv: Number(m.maxLv) || 10,
      exp: Number(m.exp) || 0,
      plus: Number(m.plus) || 0,
      bonusHp: Number(m.bonusHp) || 0,
      bonusAtk: Number(m.bonusAtk) || 0,
      bonusDef: Number(m.bonusDef) || 0,
      baseHp: Number(m.baseHp) || sp.baseHp,
      baseAtk: Number(m.baseAtk) || sp.baseAtk,
      baseDef: Number(m.baseDef) || sp.baseDef,
      ct: Number(m.ct) || sp.ct,
      skills: initSkills,
      traits: initTraits,
      customSkin: m.customSkin || null,
      customBgIdx: (typeof m.customBgIdx === 'number') ? m.customBgIdx : -1
    };
  });

  speciesSkins = data.speciesSkins || {}; aiBackgrounds = data.aiBackgrounds || []; aiStamps = data.aiStamps || [];
  if (data.iconConfig) iconConfig = data.iconConfig;
  if (document.getElementById('player-name')) document.getElementById('player-name').value = playerName;
  if (document.getElementById('hud-name')) document.getElementById('hud-name').textContent = playerName;
  if (document.getElementById('icon-scale')) {
    document.getElementById('icon-scale').value = iconConfig.scale; document.getElementById('icon-x').value = iconConfig.x;
    document.getElementById('icon-y').value = iconConfig.y; document.getElementById('icon-rot').value = iconConfig.rotate;
  }

  ensureWaveEnemies();
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderShop === 'function') renderShop();
  if (typeof updateSelectOptions === 'function') updateSelectOptions();
  if (document.getElementById('icon-char-sel')) { document.getElementById('icon-char-sel').value = iconConfig.species; document.getElementById('icon-bg-sel').value = iconConfig.bgIdx; }
  if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
  if (typeof renderStamps === 'function') renderStamps();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  updateUI();
}

async function initCloudLoad() {
  const idEl = document.getElementById('my-user-id');
  if (idEl) idEl.textContent = userId;
  let localData = null;
  const localStr = localStorage.getItem('treasure_save_' + userId);
  if (localStr) {
    try { localData = JSON.parse(localStr); applySaveData(localData); } catch (e) {}
  } else {
    ensureWaveEnemies();
    if (typeof resetBattleAllies === 'function') resetBattleAllies();
    if (typeof renderParty === 'function') renderParty();
    if (typeof renderTraining === 'function') renderTraining();
    if (typeof renderCaptured === 'function') renderCaptured();
    if (typeof renderCafe === 'function') renderCafe();
    if (typeof renderShop === 'function') renderShop();
    if (typeof updateSelectOptions === 'function') updateSelectOptions();
    if (typeof renderSpeciesGallery === 'function') renderSpeciesGallery();
    if (typeof renderStamps === 'function') renderStamps();
    if (typeof updateIconPreview === 'function') updateIconPreview(false);
    updateUI();
  }
  try {
    const res = await fetch(`/api/save?user_id=${encodeURIComponent(userId)}`);
    const row = await res.json();
    if (row && row.save_json) {
      const cloudData = JSON.parse(row.save_json);
      if (!localData || (cloudData.savedAt || 0) > (localData.savedAt || 0)) applySaveData(cloudData);
    }
  } catch (e) {}
}

window.addEventListener('beforeunload', () => {
  const cleanState = { stage: state.stage, floor: state.floor, wave: 1, maxStage: state.maxStage, maxFloorByStage: state.maxFloorByStage };
  const payload = { savedAt: Date.now(), playerName, gold, gem, landTankTier, landTankLv, landUpCost, stamina, staminaUpdatedAt, autoUnlocked, speed2xUnlocked, staminaFastUnlocked, waveStopMode, cafeLv, cafeCost, staff, gardenItems, party, trainingSlots, state: cleanState, captured, speciesSkins, aiBackgrounds, aiStamps, iconConfig };
  localStorage.setItem('treasure_save_' + userId, JSON.stringify(payload));
});
