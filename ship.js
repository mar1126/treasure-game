// 探索船・海域援護砲撃システム (ship.js)
const SHIP_SUPPORT_CT = 3.0; // 海域での援護砲撃間隔（3.0秒）

// 海域限定の探索船援護砲撃エフェクト
function fireShipCannon() {
  const fxLayer = document.getElementById('fx-layer') || document.getElementById('battle-bg');
  if (!fxLayer) return;
  const shot = document.createElement('div');
  shot.className = 'ship-shot';
  shot.textContent = '⛵💥';
  fxLayer.appendChild(shot);
  setTimeout(() => shot.remove(), 420);
}

// バトル中の船援護射撃の進行判定（撃破したら true を返す）
function processShipSupport(cur, eStats, dt) {
  if (mode !== 'sea') return false;

  cur.shipCt = (cur.shipCt || 0) + dt;
  if (cur.shipCt >= SHIP_SUPPORT_CT) {
    cur.shipCt = 0;
    const shipDmg = Math.max(1, baseAtk - Math.floor(eStats.def / 2));
    cur.hp -= shipDmg;

    fireShipCannon();
    setTimeout(() => {
      triggerMotion('enemy-unit-box', 'hit-motion');
      showDamagePopup('enemy-unit-box', `⛵-${shipDmg}`, 'ship-dmg');
    }, 250);

    if (cur.hp <= 0) {
      handleEnemyDefeat(cur, eStats);
      return true;
    }
  }
  return false;
}

// 探索船・援護砲撃の強化ボタン処理
function upgradeUnit() {
  if (gold >= upCost) {
    gold -= upCost;
    level++;
    baseAtk += 8;
    upCost = Math.floor(upCost * 1.4);
    updateUI();
    triggerAutoSave();
  } else {
    alert('ゴールド不足');
  }
}
