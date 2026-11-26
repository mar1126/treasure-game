// 戦車・砲撃支援管理 (vehicle.js)
const TANK_SPECS = [
  { tier: 1, name: '軽装バリスタ車', baseAtk: 25,   interval: 3.4 },
  { tier: 2, name: '鉄輪キャノン車', baseAtk: 80,   interval: 3.2 },
  { tier: 3, name: '蒸気装甲車',     baseAtk: 250,  interval: 3.0 },
  { tier: 4, name: '魔導軽戦車',     baseAtk: 780,  interval: 2.9 },
  { tier: 5, name: '鋼鉄中戦車',     baseAtk: 2400, interval: 2.8 },
  { tier: 6, name: '重装攻城戦車',   baseAtk: 7500, interval: 2.7 }
];

function getTankSpec(tier) {
  return TANK_SPECS.find(t => t.tier === Number(tier)) || null;
}

function getTankLevel() {
  return Math.max(1, Number(landTankLv) || 1);
}

function getTankUpgradeCost() {
  const tier = Number(landTankTier) || 0;
  if (tier <= 0) return 5000;
  const lv = getTankLevel();
  const base = tier === 1 ? 500 : (tier === 2 ? 2500 : (tier === 3 ? 12000 : (tier === 4 ? 60000 : (tier === 5 ? 300000 : 1500000))));
  return Math.floor(base * Math.pow(1.28, lv - 1));
}

function getTankSupportAtk() {
  const spec = getTankSpec(landTankTier);
  if (!spec) return 0;
  const lv = getTankLevel();
  return Math.floor(spec.baseAtk * (1 + (lv - 1) * 0.25));
}

function getTankInterval() {
  const spec = getTankSpec(landTankTier);
  return spec ? spec.interval : 3.4;
}

function updateVehicleUI() {
  const btn = document.getElementById('vehicle-upgrade-btn');
  if (!btn) return;
  const tier = Number(landTankTier) || 0;
  if (tier <= 0) {
    btn.innerHTML = `戦車を建造する（費用: 5,000 G）`;
    return;
  }
  const spec = getTankSpec(tier);
  const lv = getTankLevel();
  const cost = getTankUpgradeCost();
  btn.innerHTML = `${spec ? spec.name : '戦車'}を強化 Lv.${lv}（費用: ${cost.toLocaleString()} G）`;
}

function upgradeUnit() {
  const tier = Number(landTankTier) || 0;
  if (tier <= 0) {
    if (gold < 5000) return alert('ゴールドが足りません（5,000 G 必要）');
    gold -= 5000;
    landTankTier = 1;
    landTankLv = 1;
    landUpCost = getTankUpgradeCost();
    updateUI();
    triggerAutoSave(true);
    showToast('軽装バリスタ車を建造しました！');
    return;
  }

  const cost = getTankUpgradeCost();
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);
  gold -= cost;
  landTankLv = getTankLevel() + 1;
  landUpCost = getTankUpgradeCost();
  updateUI();
  triggerAutoSave(true);
  showToast(`戦車が Lv.${landTankLv} に強化されました！`);
}
