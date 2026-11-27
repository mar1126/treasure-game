// セーブデータ構築・ローカル＆クラウド自動保存・ロード復元 (storage.js)
let autoSaveTimer = null;
let lastCloudSaveAt = 0;

function getLocalSaveKey() {
  return 'ff_save_' + (userId || 'default');
}

function buildSavePayload() {
  return {
    v: 67,
    savedAt: Date.now(),
    userName: playerName || 'ハンター',
    gold: Number(gold) || 0,
    gem: Number(gem) || 0,
    stamina: Number(stamina) || 0,
    maxStamina: Number(maxStamina) || 50,
    staminaUpdatedAt: Number(staminaUpdatedAt) || Date.now(),
    stage: Number(state?.stage) || 1,
    floor: Number(state?.floor) || 1,
    maxStage: Number(state?.maxStage) || 1,
    maxFloor: Number(state?.maxFloor) || 1,
    maxFloorByStage: state?.maxFloorByStage || { 1: 1 },
    captured: Array.isArray(captured) ? captured : [],
    maxCaptured: Number(maxCaptured) || 50,
    party: Array.isArray(party) ? party : [null, null, null],
    trainingSlots: Array.isArray(trainingSlots) ? trainingSlots : [null, null, null, null],
    trainSlotCap: Number(typeof trainSlotCap !== 'undefined' ? trainSlotCap : 3),
    cafeLv: Number(cafeLv) || 1,
    cafeUpgradeCost: Number(typeof cafeUpgradeCost !== 'undefined' ? cafeUpgradeCost : 80),
    staff: Array.isArray(staff) ? staff : [null, null, null],
    gardenItems: Array.isArray(gardenItems) ? gardenItems : [],
    materials: (typeof materials === 'object' && materials) ? materials : {},
    unlockedRecipes: Array.isArray(unlockedRecipes) ? unlockedRecipes : [],
    recipeLevels: (typeof recipeLevels === 'object' && recipeLevels) ? recipeLevels : {},
    landTankTier: Number(landTankTier) || 0,
    landTankLv: Number(landTankLv) || 1,
    landUpCost: Number(landUpCost) || 500,
    autoUnlocked: Boolean(autoUnlocked),
    autoActive: Boolean(autoActive),
    speed2xUnlocked: Boolean(speed2xUnlocked),
    speed2xActive: Boolean(speed2xActive),
    waveStopMode: Boolean(waveStopMode),
    aiSpecies: Array.isArray(aiSpecies) ? aiSpecies : [],
    speciesSkins: (typeof speciesSkins === 'object' && speciesSkins) ? speciesSkins : {},
    aiBackgrounds: Array.isArray(aiBackgrounds) ? aiBackgrounds : [],
    aiStamps: Array.isArray(aiStamps) ? aiStamps : [],
    iconConfig: iconConfig || { species: 'デフォルト', bgIdx: -1, scale: 1.0, x: 0, y: 0, rotate: 0 }
  };
}
function saveToLocalOnly(payload) {
  try {
    const data = payload || buildSavePayload();
    localStorage.setItem(getLocalSaveKey(), JSON.stringify(data));
  } catch (e) {}
}

function setSaveBadgeStatus(text, isOk = true) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = text;
  el.style.background = isOk ? '#e0f2f1' : '#fff3e0';
  el.style.color = isOk ? '#00897b' : '#e65100';
}

async function syncSaveToCloud(force = false) {
  if (!userId) return;
  const now = Date.now();
  if (!force && now - lastCloudSaveAt < 8000) return;
  lastCloudSaveAt = now;

  const payload = buildSavePayload();
  saveToLocalOnly(payload);
  setSaveBadgeStatus('保存中...', false);

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_name: payload.userName,
        max_stage: payload.maxStage,
        max_floor: payload.maxFloor,
        save_json: JSON.stringify(payload)
      })
    });
    if (!res.ok) throw new Error();
    setSaveBadgeStatus('☁️保存済', true);
  } catch (e) {
    setSaveBadgeStatus('端末保存', false);
  }
}

function triggerAutoSave(immediateCloud = false) {
  saveToLocalOnly();
  if (immediateCloud) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    syncSaveToCloud(true);
    return;
  }
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => syncSaveToCloud(false), 2500);
}

function applySaveData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.userName) playerName = String(d.userName);
  if (typeof d.gold === 'number') gold = d.gold;
  if (typeof d.gem === 'number') gem = d.gem;
  if (typeof d.stamina === 'number') stamina = d.stamina;
  if (typeof d.maxStamina === 'number') maxStamina = d.maxStamina;
  if (typeof d.staminaUpdatedAt === 'number') staminaUpdatedAt = d.staminaUpdatedAt;

  if (typeof state === 'object' && state) {
    if (d.stage) state.stage = Number(d.stage) || 1;
    if (d.floor) state.floor = Number(d.floor) || 1;
    if (d.maxStage) state.maxStage = Number(d.maxStage) || 1;
    if (d.maxFloor) state.maxFloor = Number(d.maxFloor) || 1;
    if (d.maxFloorByStage && typeof d.maxFloorByStage === 'object') {
      state.maxFloorByStage = d.maxFloorByStage;
    }
  }

  if (Array.isArray(d.captured)) captured = d.captured;
  if (typeof d.maxCaptured === 'number') maxCaptured = d.maxCaptured;
  if (Array.isArray(d.party)) party = d.party;
  if (Array.isArray(d.trainingSlots)) trainingSlots = d.trainingSlots;
  if (typeof d.trainSlotCap === 'number' && typeof trainSlotCap !== 'undefined') trainSlotCap = d.trainSlotCap;

  if (typeof d.cafeLv === 'number') cafeLv = d.cafeLv;
  if (typeof d.cafeUpgradeCost === 'number' && typeof cafeUpgradeCost !== 'undefined') cafeUpgradeCost = d.cafeUpgradeCost;
  if (Array.isArray(d.staff)) staff = d.staff;
  if (Array.isArray(d.gardenItems)) gardenItems = d.gardenItems;

  materials = (d.materials && typeof d.materials === 'object') ? d.materials : {};
  unlockedRecipes = Array.isArray(d.unlockedRecipes) ? d.unlockedRecipes : [];
  recipeLevels = (d.recipeLevels && typeof d.recipeLevels === 'object') ? d.recipeLevels : {};

  if (typeof d.landTankTier === 'number') landTankTier = d.landTankTier;
  if (typeof d.landTankLv === 'number') landTankLv = d.landTankLv;
  if (typeof d.landUpCost === 'number') landUpCost = d.landUpCost;

  if (typeof d.autoUnlocked === 'boolean') autoUnlocked = d.autoUnlocked;
  if (typeof d.autoActive === 'boolean') autoActive = d.autoActive;
  if (typeof d.speed2xUnlocked === 'boolean') speed2xUnlocked = d.speed2xUnlocked;
  if (typeof d.speed2xActive === 'boolean') speed2xActive = d.speed2xActive;
  if (typeof d.waveStopMode === 'boolean') waveStopMode = d.waveStopMode;

  if (Array.isArray(d.aiSpecies)) aiSpecies = d.aiSpecies;
  if (d.speciesSkins && typeof d.speciesSkins === 'object') speciesSkins = d.speciesSkins;
  if (Array.isArray(d.aiBackgrounds)) aiBackgrounds = d.aiBackgrounds;
  if (Array.isArray(d.aiStamps)) aiStamps = d.aiStamps;
  if (d.iconConfig && typeof d.iconConfig === 'object') iconConfig = d.iconConfig;

  const nameInp = document.getElementById('player-name');
  if (nameInp) nameInp.value = playerName;
  const hudName = document.getElementById('hud-name');
  if (hudName) hudName.textContent = playerName;

  if (typeof renderStageBackground === 'function') renderStageBackground();
  if (typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof ensureWaveEnemies === 'function') ensureWaveEnemies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderBag === 'function') renderBag();
  if (typeof renderTavernRecipesSection === 'function') renderTavernRecipesSection();
  if (typeof updateIconPreview === 'function') updateIconPreview(false);
  if (typeof updateUI === 'function') updateUI();
}

async function initCloudLoad() {
  let localData = null;
  try {
    const raw = localStorage.getItem(getLocalSaveKey());
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (localData) applySaveData(localData);

  if (!userId) return;
  try {
    const res = await fetch('/api/save?user_id=' + encodeURIComponent(userId));
    if (!res.ok) throw new Error();
    const row = await res.json();
    if (row && row.save_json) {
      const cloudData = typeof row.save_json === 'string' ? JSON.parse(row.save_json) : row.save_json;
      if (!localData || (Number(cloudData.savedAt) || 0) >= (Number(localData.savedAt) || 0)) {
        applySaveData(cloudData);
      }
    }
    setSaveBadgeStatus('☁️同期済', true);
  } catch (e) {
    setSaveBadgeStatus('端末保存', false);
  }
}

window.addEventListener('beforeunload', () => {
  saveToLocalOnly();
});
