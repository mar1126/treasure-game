// 探索船・戦車 援護砲撃システム (ship.js)
const VEHICLE_SUPPORT_CT = 3.0; // 援護砲撃間隔（3.0秒）

const VEHICLES = {
  land: [
    { id: 'land_1', name: '装甲バギー', icon: '🚙', power: 20, cost: 600, desc: '機銃で3秒ごとに援護射撃を行う' },
    { id: 'land_2', name: '突撃戦車レオパルト', icon: '🚜', power: 75, cost: 3000, desc: '主砲による強力な陸戦援護砲撃' },
    { id: 'land_3', name: '重戦車ベヒーモス', icon: '🚛', power: 200, cost: 14000, desc: '重装甲と大口径砲で敵を粉砕する' },
    { id: 'land_4', name: 'レールガン自走砲', icon: '🛰️', power: 550, cost: 55000, desc: '超高速電磁砲で陸の敵を撃ち抜く' },
    { id: 'land_5', name: '移動要塞ガイア', icon: '🏰', power: 1400, cost: 200000, desc: '圧倒的火力を誇る陸上最強の移動要塞' }
  ],
  sea: [
    { id: 'sea_1', name: '木造の探索船', icon: '⛵', power: 20, cost: 600, desc: '小型大砲で3秒ごとに海戦援護を行う' },
    { id: 'sea_2', name: '鋼鉄の砲撃艦', icon: '🚤', power: 80, cost: 3500, desc: '連装砲を搭載した本格戦闘艦' },
    { id: 'sea_3', name: '駆逐艦トライデント', icon: '🛳️', power: 220, cost: 15000, desc: '魚雷と主砲で海域の敵を圧倒する' },
    { id: 'sea_4', name: '戦艦ポセイドン', icon: '🚢', power: 600, cost: 60000, desc: '海神の名を冠する巨大戦艦の主砲撃' },
    { id: 'sea_5', name: '超弩級空母リヴァイアサン', icon: '⚓', power: 1500, cost: 220000, desc: '艦載機と主砲の総攻撃を浴びせる最強艦' }
  ]
};

function getEquippedVehicle(targetMode = mode) {
  const tier = targetMode === 'sea' ? (seaShipTier || 0) : (landTankTier || 0);
  if (tier <= 0) return null;
  const list = VEHICLES[targetMode] || [];
  return list.slice(tier - 1, tier).pop() || null;
}

function getVehicleSupportAtk(targetMode = mode) {
  const veh = getEquippedVehicle(targetMode);
  if (!veh) return 0;
  return veh.power + (level - 1) * 8;
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
  if (!veh) return false; // 現在の地形用の乗り物を未購入なら援護なし

  cur.shipCt = (cur.shipCt || 0) + dt;
  if (cur.shipCt >= VEHICLE_SUPPORT_CT) {
    cur.shipCt = 0;
    const rawAtk = getVehicleSupportAtk(mode);
    const dmg = Math.max(1, rawAtk - Math.floor(eStats.def / 2));
    cur.hp -= dmg;

    fireVehicleCannon(veh);
    setTimeout(() => {
      triggerMotion('enemy-unit-box', 'hit-motion');
      showDamagePopup('enemy-unit-box', `${veh.icon}-${dmg}`, 'ship-dmg');
    }, 250);

    if (cur.hp <= 0) {
      handleEnemyDefeat(cur, eStats);
      return true;
    }
  }
  return false;
}

function upgradeUnit() {
  if ((seaShipTier || 0) <= 0 && (landTankTier || 0) <= 0) {
    return alert('まずは「🏪 ショップ」の乗り物タブから戦車または船を購入してください！');
  }
  if (gold >= upCost) {
    gold -= upCost;
    level++;
    upCost = Math.floor(upCost * 1.4);
    updateUI();
    triggerAutoSave();
  } else {
    alert('ゴールド不足');
  }
}
