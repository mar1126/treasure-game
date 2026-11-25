// 乗り物（戦車・探索船）援護砲撃＆パーツ拡張システム (vehicle.js)
const BASE_VEHICLE_SUPPORT_CT = 3.0; // 基本援護砲撃間隔（3.0秒）

const VEHICLES = {
  land: [
    { id: 'land_1', name: '装甲バギー', icon: '🚙', power: 35, cost: 1000, desc: '機銃で3秒ごとに陸戦援護射撃を行う' },
    { id: 'land_2', name: '突撃戦車レオパルト', icon: '🚜', power: 180, cost: 15000, desc: '主砲による本格陸戦援護砲撃' },
    { id: 'land_3', name: '重戦車ベヒーモス', icon: '🚛', power: 950, cost: 250000, desc: '重装甲と大口径砲で敵を粉砕する' },
    { id: 'land_4', name: 'レールガン自走砲', icon: '🛰️', power: 5200, cost: 4000000, desc: '超高速電磁砲で陸の敵を撃ち抜く' },
    { id: 'land_5', name: '移動要塞ガイア', icon: '🏰', power: 28000, cost: 65000000, desc: '圧倒的火力を誇る陸上最強クラスの要塞' },
    { id: 'land_6', name: '次元殲滅戦車ラグナロク', icon: '🌋', power: 160000, cost: 1000000000, desc: '大陸ごと敵を吹き飛ばす伝説の最終兵器' }
  ],
  sea: [
    { id: 'sea_1', name: '木造の探索船', icon: '⛵', power: 40, cost: 1200, desc: '小型大砲で3秒ごとに海戦援護を行う' },
    { id: 'sea_2', name: '鋼鉄の砲撃艦', icon: '🚤', power: 220, cost: 20000, desc: '連装砲を搭載した本格戦闘艦' },
    { id: 'sea_3', name: '駆逐艦トライデント', icon: '🛳️', power: 1200, cost: 350000, desc: '魚雷と主砲で海域の敵を圧倒する' },
    { id: 'sea_4', name: '戦艦ポセイドン', icon: '🚢', power: 6800, cost: 5500000, desc: '海神の名を冠する巨大戦艦の主砲撃' },
    { id: 'sea_5', name: '超弩級空母リヴァイアサン', icon: '⚓', power: 36000, cost: 90000000, desc: '艦載機と主砲の総攻撃を浴びせる巨艦' },
    { id: 'sea_6', name: '海神要塞オケアノス', icon: '🔱', power: 220000, cost: 1500000000, desc: '七つの海を支配する究極の海上機動要塞' }
  ]
};

function getVehiclePartsBonus(targetMode = mode) {
  const parts = (typeof vehicleParts !== 'undefined' && vehicleParts[targetMode]) ? vehicleParts[targetMode] : {};
  let flatAtk = 0, multAtk = 1.0, ctReduce = 0;
  if (parts.cannon) {
    flatAtk += Number(parts.cannon.flatAtk) || 0;
    multAtk += Number(parts.cannon.multAtk) || 0;
  }
  if (parts.engine) {
    ctReduce += Number(parts.engine.ctReduce) || 0;
  }
  return { flatAtk, multAtk, ctReduce };
}

function getVehicleSupportInterval(targetMode = mode) {
  const bonus = getVehiclePartsBonus(targetMode);
  return Math.max(0.8, BASE_VEHICLE_SUPPORT_CT - bonus.ctReduce);
}

function getEquippedVehicle(targetMode = mode) {
  const tier = targetMode === 'sea' ? (seaShipTier || 0) : (landTankTier || 0);
  if (tier <= 0) return null;
  const list = VEHICLES[targetMode] || [];
  return list.slice(tier - 1, tier).pop() || null;
}

function getVehicleLevel(targetMode = mode) {
  return targetMode === 'sea' ? (seaShipLv || 1) : (landTankLv || 1);
}

function getVehicleUpCost(targetMode = mode) {
  return targetMode === 'sea' ? (seaUpCost || 50) : (landUpCost || 50);
}

function getVehicleSupportAtk(targetMode = mode) {
  const veh = getEquippedVehicle(targetMode);
  if (!veh) return 0;
  const vLv = getVehicleLevel(targetMode);
  const bonus = getVehiclePartsBonus(targetMode);
  const baseVal = veh.power + (vLv - 1) * Math.max(8, Math.floor(veh.power * 0.08)) + bonus.flatAtk;
  return Math.floor(baseVal * bonus.multAtk);
}

function fireVehicleCannon(veh) {
  const fxLayer = document.getElementById('fx-layer') || document.getElementById('battle-bg');
  if (!fxLayer || !veh) return;
  const shot = document.createElement('div');
  shot.className = 'ship-shot';
  shot.textContent = `${veh.icon}💥`;
  fxLayer.appendChild(shot);
  setTimeout(() => shot.remove(), 420);
}

function processShipSupport(cur, eStats, dt) {
  const veh = getEquippedVehicle(mode);
  if (!veh) return false;

  const interval = getVehicleSupportInterval(mode);
  cur.shipCt = (cur.shipCt || 0) + dt;
  if (cur.shipCt >= interval) {
    cur.shipCt = 0;
    const rawAtk = getVehicleSupportAtk(mode);
    const dmg = Math.max(1, rawAtk - Math.floor(eStats.def / 2));
    cur.hp -= dmg;

    fireVehicleCannon(veh);
    setTimeout(() => {
      triggerMotion('enemy-unit-box', 'hit-motion');
      showDamagePopup('enemy-unit-box', `${veh.icon}-${dmg.toLocaleString()}`, 'ship-dmg');
    }, 250);

    if (cur.hp <= 0) {
      handleEnemyDefeat(cur, eStats);
      return true;
    }
  }
  return false;
}

function upgradeUnit() {
  const veh = getEquippedVehicle(mode);
  if (!veh) {
    const label = mode === 'land' ? '陸地用の戦車' : '海域用の船';
    return alert(`まずは「🏪 ショップ」の戦車・船タブから${label}を購入してください！`);
  }
  const cost = getVehicleUpCost(mode);
  if (gold >= cost) {
    gold -= cost;
    if (mode === 'sea') {
      seaShipLv++;
      seaUpCost = Math.floor(seaUpCost * 1.45);
    } else {
      landTankLv++;
      landUpCost = Math.floor(landUpCost * 1.45);
    }
    updateUI();
    triggerAutoSave();
  } else {
    alert('ゴールド不足');
  }
}
