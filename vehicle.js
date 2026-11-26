// ファンタジー戦車の改造・強化システム (vehicle.js) - Rank 1〜6 (最高80,000,000G)
const TANK_MASTER = [
  { tier: 1, name: '軽装バリスタ車', cost: 5000,     baseAtk: 25,   interval: 3.4, desc: '大型の連射弩弓を積んだ軽快な移動砲台' },
  { tier: 2, name: '鉄輪キャノン車', cost: 45000,    baseAtk: 80,   interval: 3.2, desc: '大砲を1門搭載した鉄輪補強の砲撃車' },
  { tier: 3, name: '蒸気装甲車',     cost: 350000,   baseAtk: 250,  interval: 3.0, desc: '魔導蒸気機関で走る装甲板付きの砲撃車両' },
  { tier: 4, name: '魔導軽戦車',     cost: 2500000,  baseAtk: 780,  interval: 2.9, desc: '魔力弾を放つ旋回砲塔を備えた軽戦車' },
  { tier: 5, name: '鋼鉄中戦車',     cost: 15000000, baseAtk: 2400, interval: 2.8, desc: '厚い鋼鉄装甲と連装砲を備えた主力戦車' },
  { tier: 6, name: '重装攻城戦車',   cost: 80000000, baseAtk: 7500, interval: 2.7, desc: '城壁をも砕く大口径砲を積んだ重戦車' }
];
const VEHICLE_MASTER = { land: TANK_MASTER };

function getTankTier() { return Number(landTankTier) || 0; }
function getTankLevel() { return Number(landTankLv) || 1; }
function getTankUpCost() { return Number(landUpCost) || 500; }

function getEquippedTank() {
  const tier = getTankTier();
  if (tier <= 0) return null;
  const idx = Math.min(tier, TANK_MASTER.length) - 1;
  return TANK_MASTER.slice(idx, idx + 1).pop() || null;
}

function getTankSupportAtk() {
  const eq = getEquippedTank();
  if (!eq) return 0;
  return Math.floor(eq.baseAtk * (1 + (getTankLevel() - 1) * 0.18));
}

function getTankInterval() {
  const eq = getEquippedTank();
  return eq ? eq.interval : 3.2;
}

function getEquippedVehicle() { return getEquippedTank(); }
function getVehicleSupportAtk() { return getTankSupportAtk(); }
function getVehicleInterval() { return getTankInterval(); }
function getVehicleLevel() { return getTankLevel(); }
function getVehicleUpCost() { return getTankUpCost(); }

function upgradeUnit() {
  const eq = getEquippedTank();
  if (!eq) {
    return alert('先にショップの「兵器工房」タブで戦車を建造してください');
  }
  const cost = getTankUpCost();
  if (gold < cost) return alert('ゴールドが足りません');
  gold -= cost;
  landTankLv++;
  landUpCost = Math.floor(landUpCost * 1.50);
  updateUI();
  triggerAutoSave();
}
