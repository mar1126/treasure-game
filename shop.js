// ショップ・便利機能＆乗り物購入システム (shop.js)
let shopSubTab = 'gem'; // 'gem' または 'vehicle'

function getStaminaIntervalMs() {
  return staminaFastUnlocked ? 50 * 1000 : 60 * 1000;
}

function getShopGoldAmount() {
  const maxArea = Math.max(state.sea.area || 1, state.land.area || 1);
  return maxArea * 500;
}

function switchShopSub(tab, btn) {
  shopSubTab = tab;
  document.querySelectorAll('.shop-sub-btn').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderShop();
}

function renderShop() {
  const el = document.getElementById('shop-list');
  if (!el) return;

  if (shopSubTab === 'gem') {
    const goldAmount = getShopGoldAmount();
    const items = [
      { id: 'auto', icon: '🔄', title: '自動戦闘（オート連戦）', desc: '戦闘勝利後、自動で次の敵と連戦します。バトル画面上部のボタンでON/OFF切替可能。', cost: 1500, unlocked: autoUnlocked },
      { id: 'speed2x', icon: '⏩', title: '通常戦闘倍速（2倍速）', desc: 'バトルの進行速度が2倍になります。バトル画面上部のボタンで「▷ 1x / ▷▷ 2x」切替可能。', cost: 3000, unlocked: speed2xUnlocked },
      { id: 'stamina_fast', icon: '⏱️', title: 'クールダウン永続 -10秒', desc: 'スタミナ1回復の間隔を永続で10秒短くします。（60秒 → 50秒）', cost: 2500, unlocked: staminaFastUnlocked },
      { id: 'stamina_potion', icon: '⚡', title: 'スタミナ全回復', desc: `消費したスタミナを即座に最大値（${MAX_STAMINA}）まで全回復します。`, cost: 100, unlocked: false },
      { id: 'gold_pack', icon: '💰', title: `ゴールド袋（+${goldAmount.toLocaleString()} G）`, desc: '到達エリアに応じた大量のゴールドを即座に獲得します。', cost: 300, unlocked: false }
    ];

    el.innerHTML = items.map(item => {
      const btnHtml = item.unlocked
        ? `<button class="shop-buy-btn done" disabled>開放済み</button>`
        : `<button class="shop-buy-btn" onclick="buyShopItem('${item.id}')">💎 ${item.cost.toLocaleString()}</button>`;
      return `
        <div class="shop-item-card">
          <div class="shop-item-info">
            <div class="shop-item-title">${item.icon} ${item.title}</div>
            <div class="shop-item-desc">${item.desc}</div>
          </div>
          <div class="shop-item-action">${btnHtml}</div>
        </div>
      `;
    }).join('');
  } else {
    if (typeof VEHICLES === 'undefined') {
      el.innerHTML = '<p style="font-size:12px;color:#e53935;">vehicle.js が読み込まれていません。</p>';
      return;
    }
    const renderVehicleGroup = (title, list, currentTier, targetMode) => {
      const cards = list.map((v, idx) => {
        const tierNum = idx + 1;
        const isOwned = currentTier >= tierNum;
        const isNext = currentTier + 1 === tierNum;
        let btnHtml = '';
        if (isOwned) {
          btnHtml = `<button class="shop-buy-btn done" disabled>${currentTier === tierNum ? '装備中' : '購入済'}</button>`;
        } else if (isNext) {
          btnHtml = `<button class="shop-buy-btn" style="background:#0288d1;" onclick="buyVehicle('${targetMode}', ${tierNum})">🪙 ${v.cost.toLocaleString()} G</button>`;
        } else {
          btnHtml = `<button class="shop-buy-btn done" style="background:#eceff1;color:#90a4ae;" disabled>前段階が必要</button>`;
        }
        return `
          <div class="shop-item-card">
            <div class="shop-item-info">
              <div class="shop-item-title">${v.icon} ${v.name} <span style="font-size:11px;color:#ff7043;">(援護威力 +${v.power.toLocaleString()})</span></div>
              <div class="shop-item-desc">${v.desc}</div>
            </div>
            <div class="shop-item-action">${btnHtml}</div>
          </div>
        `;
      }).join('');
      return `<div style="font-size:12px;font-weight:bold;color:#0277bd;margin:10px 0 6px;">${title}</div>${cards}`;
    };

    el.innerHTML =
      renderVehicleGroup('🌲 陸地用・戦車＆兵器（陸戦で3秒ごとに援護砲撃）', VEHICLES.land, landTankTier, 'land') +
      renderVehicleGroup('🌊 海域用・探索船＆戦艦（海戦で3秒ごとに援護砲撃）', VEHICLES.sea, seaShipTier, 'sea');
  }
}

function buyVehicle(targetMode, tierNum) {
  const list = VEHICLES[targetMode] || [];
  const veh = list.slice(tierNum - 1, tierNum).pop();
  if (!veh) return;
  if (gold < veh.cost) return alert(`ゴールドが足りません！（${veh.cost.toLocaleString()} G 必要）`);
  if (!confirm(`${veh.cost.toLocaleString()} G で「${veh.name}」を購入しますか？`)) return;

  gold -= veh.cost;
  if (targetMode === 'land') landTankTier = tierNum;
  else seaShipTier = tierNum;

  showToast(`🎉 ${veh.icon} ${veh.name}を購入しました！`);
  renderShop();
  updateUI();
  triggerAutoSave(true);
}

function buyShopItem(itemId) {
  if (itemId === 'auto') {
    if (autoUnlocked) return;
    if (gem < 1500) return alert('ジェムが足りません！（1,500💎必要）');
    if (!confirm('1,500💎を消費して「自動戦闘（オート連戦）」を永久解放しますか？')) return;
    gem -= 1500; autoUnlocked = true; autoActive = true;
    showToast('🔄 自動戦闘を解放しました！');
  } else if (itemId === 'speed2x') {
    if (speed2xUnlocked) return;
    if (gem < 3000) return alert('ジェムが足りません！（3,000💎必要）');
    if (!confirm('3,000💎を消費して「通常戦闘倍速（2倍速）」を永久解放しますか？')) return;
    gem -= 3000; speed2xUnlocked = true; speed2xActive = true;
    showToast('⏩ 通常戦闘2倍速を解放しました！');
  } else if (itemId === 'stamina_fast') {
    if (staminaFastUnlocked) return;
    if (gem < 2500) return alert('ジェムが足りません！（2,500💎必要）');
    if (!confirm('2,500💎を消費して「スタミナ回復 -10秒」を永久解放しますか？')) return;
    gem -= 2500; staminaFastUnlocked = true;
    showToast('⏱️ スタミナ回復間隔が50秒になりました！');
  } else if (itemId === 'stamina_potion') {
    syncStamina();
    if (stamina >= MAX_STAMINA) return alert('すでにスタミナは満タンです！');
    if (gem < 100) return alert('ジェムが足りません！（100💎必要）');
    gem -= 100; stamina = MAX_STAMINA; staminaUpdatedAt = Date.now();
    showToast('⚡ スタミナが全回復しました！');
  } else if (itemId === 'gold_pack') {
    if (gem < 300) return alert('ジェムが足りません！（300💎必要）');
    const gain = getShopGoldAmount();
    gem -= 300; gold += gain;
    showToast(`💰 +${gain.toLocaleString()} G を獲得！`);
  }

  renderShop();
  updateUI();
  triggerAutoSave(true);
}
