// 便利機能（ジェム）＆ 兵器工房（ゴールド）ショップシステム (shop.js)
let shopSubTab = 'gem';

function getStaminaIntervalMs() {
  return staminaFastUnlocked ? 20000 : 60000;
}

function switchShopSub(subName, btn) {
  shopSubTab = subName;
  document.querySelectorAll('.shop-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderShop();
}

function makeTankCardHtml(tier, name, cost, baseAtk, interval, desc, curTier) {
  let btnHtml = '<button class="shop-buy-btn done" disabled>未解放</button>';
  if (curTier >= tier) {
    btnHtml = '<button class="shop-buy-btn done" disabled>所持済</button>';
  } else if (curTier === tier - 1) {
    btnHtml = `<button class="shop-buy-btn" onclick="buyShopTank(${tier})">${cost.toLocaleString()} G</button>`;
  }
  return `
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">Rank ${tier}：${name}</div>
        <div class="shop-item-desc">${desc}<br>基本砲撃力: <b>${baseAtk.toLocaleString()}</b>（${interval}秒ごと）</div>
      </div>
      <div class="shop-item-action">${btnHtml}</div>
    </div>
  `;
}

function renderShop() {
  const box = document.getElementById('shop-list');
  if (!box) return;

  if (shopSubTab === 'tank') {
    const curTier = Number(landTankTier) || 0;
    box.innerHTML =
      `<div style="font-size:11px;color:#546e7a;margin-bottom:8px;">購入した戦車は全ステージで自動的に砲撃援護を行います（ランク順に購入可能）。</div>` +
      makeTankCardHtml(1, '軽装バリスタ車', 5000, 25, 3.4, '大型の連射弩弓を積んだ軽快な移動砲台', curTier) +
      makeTankCardHtml(2, '鉄輪キャノン車', 45000, 80, 3.2, '大砲を1門搭載した鉄輪補強の砲撃車', curTier) +
      makeTankCardHtml(3, '蒸気装甲車', 350000, 250, 3.0, '魔導蒸気機関で走る装甲板付きの砲撃車両', curTier) +
      makeTankCardHtml(4, '魔導軽戦車', 2500000, 780, 2.9, '魔力弾を放つ旋回砲塔を備えた軽戦車', curTier) +
      makeTankCardHtml(5, '鋼鉄中戦車', 15000000, 2400, 2.8, '厚い鋼鉄装甲と連装砲を備えた主力戦車', curTier) +
      makeTankCardHtml(6, '重装攻城戦車', 80000000, 7500, 2.7, '城壁をも砕く大口径砲を積んだ重戦車', curTier);
    return;
  }

  const goldReward = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 500;
  box.innerHTML = `
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">階層間オート周回 解放</div>
        <div class="shop-item-desc">5ウェーブ踏破後も自動で次の階層へ連続出撃できるようになります。</div>
      </div>
      <div class="shop-item-action">
        ${autoUnlocked ? `<button class="shop-buy-btn done" disabled>解放済</button>` : `<button class="shop-buy-btn" onclick="buyShopItem('auto')">1,500 GEM</button>`}
      </div>
    </div>
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">戦闘スピード2倍速 解放</div>
        <div class="shop-item-desc">バトルの進行速度を2倍に切り替えられるようになります。</div>
      </div>
      <div class="shop-item-action">
        ${speed2xUnlocked ? `<button class="shop-buy-btn done" disabled>解放済</button>` : `<button class="shop-buy-btn" onclick="buyShopItem('speed2x')">1,000 GEM</button>`}
      </div>
    </div>
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">スタミナ回復速度 3倍</div>
        <div class="shop-item-desc">スタミナ1回復にかかる時間が「60秒 → 20秒」に短縮されます。</div>
      </div>
      <div class="shop-item-action">
        ${staminaFastUnlocked ? `<button class="shop-buy-btn done" disabled>解放済</button>` : `<button class="shop-buy-btn" onclick="buyShopItem('stamina_fast')">800 GEM</button>`}
      </div>
    </div>
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">スタミナ全回復 (+30)</div>
        <div class="shop-item-desc">現在のスタミナを最大値（30）まで即座に回復します。</div>
      </div>
      <div class="shop-item-action">
        <button class="shop-buy-btn" onclick="buyShopItem('stamina')">50 GEM</button>
      </div>
    </div>
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">ゴールド支給パック</div>
        <div class="shop-item-desc">現在の到達ステージに応じた資金（<b>${goldReward.toLocaleString()} G</b>）を獲得します。</div>
      </div>
      <div class="shop-item-action">
        <button class="shop-buy-btn" onclick="buyShopItem('gold')">100 GEM</button>
      </div>
    </div>
  `;
}

function buyShopTank(targetTier) {
  const costs = { 1: 5000, 2: 45000, 3: 350000, 4: 2500000, 5: 15000000, 6: 80000000 };
  const names = { 1: '軽装バリスタ車', 2: '鉄輪キャノン車', 3: '蒸気装甲車', 4: '魔導軽戦車', 5: '鋼鉄中戦車', 6: '重装攻城戦車' };
  const cost = costs[targetTier];
  const name = names[targetTier];
  if (!cost || !name) return;

  const curTier = Number(landTankTier) || 0;
  if (targetTier <= curTier) return alert('すでに購入済みです');
  if (targetTier > curTier + 1) return alert('ひとつ前のランクから順番に購入してください');
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);

  gold -= cost;
  landTankTier = targetTier;
  if (landTankTier === 1) { landTankLv = 1; landUpCost = 500; }
  updateUI();
  renderShop();
  triggerAutoSave(true);
  showToast(`${name}を購入しました`);
}

function buyShopItem(type) {
  if (type === 'auto') {
    if (autoUnlocked || gem < 1500) return alert('ジェムが足りません（1,500 GEM 必要）');
    gem -= 1500; autoUnlocked = true; autoActive = true;
    showToast('階層間オート周回を解放しました');
  } else if (type === 'speed2x') {
    if (speed2xUnlocked || gem < 1000) return alert('ジェムが足りません（1,000 GEM 必要）');
    gem -= 1000; speed2xUnlocked = true; speed2xActive = true;
    showToast('戦闘スピード2倍速を解放しました');
  } else if (type === 'stamina_fast') {
    if (staminaFastUnlocked || gem < 800) return alert('ジェムが足りません（800 GEM 必要）');
    syncStamina(); gem -= 800; staminaFastUnlocked = true; staminaUpdatedAt = Date.now();
    showToast('スタミナ回復速度が3倍になりました');
  } else if (type === 'stamina') {
    syncStamina();
    if (stamina >= MAX_STAMINA) return alert('すでにスタミナは満タンです');
    if (gem < 50) return alert('ジェムが足りません（50 GEM 必要）');
    gem -= 50; stamina = MAX_STAMINA; staminaUpdatedAt = Date.now();
    showToast('スタミナが全回復しました');
  } else if (type === 'gold') {
    if (gem < 100) return alert('ジェムが足りません（100 GEM 必要）');
    const amount = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 500;
    gem -= 100; gold += amount;
    showToast(`${amount.toLocaleString()} G を獲得しました`);
  }
  updateUI();
  renderShop();
  triggerAutoSave(true);
}
