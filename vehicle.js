// ファンタジー戦車・船の装備・強化システム (vehicle.js) - Tier 1〜6 (最高80,000,000G)
const VEHICLE_MASTER = {
  land: [
    { tier: 1, name: '軽装バリスタ車', cost: 5000,     baseAtk: 25,   interval: 3.4, desc: '大型の連射弩弓を積んだ軽快な移動砲台' },
    { tier: 2, name: '鉄輪キャノン車', cost: 45000,    baseAtk: 80,   interval: 3.2, desc: '大砲を1門搭載した鉄輪補強の砲撃車' },
    { tier: 3, name: '蒸気装甲車',     cost: 350000,   baseAtk: 250,  interval: 3.0, desc: '魔導蒸気機関で走る装甲板付きの砲撃車両' },
    { tier: 4, name: '魔導軽戦車',     cost: 2500000,  baseAtk: 780,  interval: 2.9, desc: '魔力弾を放つ旋回砲塔を備えた軽戦車' },
    { tier: 5, name: '鋼鉄中戦車',     cost: 15000000, baseAtk: 2400, interval: 2.8, desc: '厚い鋼鉄装甲と連装砲を備えた主力戦車' },
    { tier: 6, name: '重装攻城戦車',   cost: 80000000, baseAtk: 7500, interval: 2.7, desc: '城壁をも砕く大口径砲を積んだ重戦車' }
  ],
  sea: [
    { tier: 1, name: '小型砲艇',           cost: 5000,     baseAtk: 25,   interval: 3.4, desc: '船首に小型砲を積んだ軽快な木造砲艇' },
    { tier: 2, name: '武装スクーナー船',   cost: 45000,    baseAtk: 80,   interval: 3.2, desc: '軽砲を備えた機動力に優れる二本マスト帆船' },
    { tier: 3, name: 'ブリガンティン砲艦', cost: 350000,   baseAtk: 250,  interval: 3.0, desc: '船側に大砲を並べた中型戦闘帆船' },
    { tier: 4, name: '武装ガレオン船',     cost: 2500000,  baseAtk: 780,  interval: 2.9, desc: '重砲を多数搭載した大型の遠洋戦闘船' },
    { tier: 5, name: '装甲フリゲート艦',   cost: 15000000, baseAtk: 2400, interval: 2.8, desc: '船体を鋼鉄で補強した高速砲撃艦' },
    { tier: 6, name: '魔導巡洋艦',         cost: 80000000, baseAtk: 7500, interval: 2.7, desc: '魔力砲塔を備えた長距離砲撃艦' }
  ]
};

function getVehicleTier(vType) {
  return vType === 'land' ? (Number(landTankTier) || 0) : (Number(seaShipTier) || 0);
}
function getVehicleLevel(vType) {
  return vType === 'land' ? (Number(landTankLv) || 1) : (Number(seaShipLv) || 1);
}
function getVehicleUpCost(vType) {
  return vType === 'land' ? (Number(landUpCost) || 500) : (Number(seaUpCost) || 500);
}

function getEquippedVehicle(vType) {
  const tier = getVehicleTier(vType);
  if (tier <= 0) return null;
  const list = VEHICLE_MASTER[vType] || [];
  return list[Math.min(tier, list.length) - 1] || null;
}

function getVehicleSupportAtk(vType) {
  const eq = getEquippedVehicle(vType);
  if (!eq) return 0;
  const lv = getVehicleLevel(vType);
  return Math.floor(eq.baseAtk * (1 + (lv - 1) * 0.18));
}

function getVehicleInterval(vType) {
  const eq = getEquippedVehicle(vType);
  return eq ? eq.interval : 3.2;
}

function buyVehicle(vType, targetTier) {
  const list = VEHICLE_MASTER[vType] || [];
  const item = list.find(x => x.tier === targetTier);
  if (!item) return;
  const curTier = getVehicleTier(vType);
  if (targetTier <= curTier) return alert('すでに購入済みです');
  if (targetTier > curTier + 1) return alert('ひとつ前のランクから順番に購入してください');
  if (gold < item.cost) return alert(`ゴールドが足りません（${item.cost.toLocaleString()} G 必要）`);

  gold -= item.cost;
  if (vType === 'land') {
    landTankTier = targetTier;
    if (landTankTier === 1) { landTankLv = 1; landUpCost = 500; }
  } else {
    seaShipTier = targetTier;
    if (seaShipTier === 1) { seaShipLv = 1; seaUpCost = 500; }
  }
  updateUI();
  if (typeof renderShop === 'function') renderShop();
  triggerAutoSave(true);
  showToast(`${item.name}を購入しました`);
}

function upgradeUnit() {
  const eq = getEquippedVehicle(mode);
  if (!eq) {
    return alert(mode === 'land' ? '先にショップの「戦車・船」タブから軽装バリスタ車を購入してください' : '先にショップの「戦車・船」タブから小型砲艇を購入してください');
  }
  const cost = getVehicleUpCost(mode);
  if (gold < cost) return alert('ゴールドが足りません');
  gold -= cost;
  if (mode === 'land') {
    landTankLv++;
    landUpCost = Math.floor(landUpCost * 1.50);
  } else {
    seaShipLv++;
    seaUpCost = Math.floor(seaUpCost * 1.50);
  }
  updateUI();
  triggerAutoSave();
}
