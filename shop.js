// ショップ・永続機能解放・消耗品システム (shop.js)
function getStaminaIntervalMs() {
  return staminaFastUnlocked ? 50 * 1000 : 60 * 1000;
}

function getShopGoldAmount() {
  const maxArea = Math.max(state.sea.area || 1, state.land.area || 1);
  return maxArea * 500;
}

function renderShop() {
  const el = document.getElementById('shop-list');
  if (!el) return;

  const goldAmount = getShopGoldAmount();
  const items = [
    {
      id: 'auto',
      icon: '🔄',
      title: '自動戦闘（オート連戦）',
      desc: '戦闘勝利後、自動で次の敵と連戦します。バトル画面上部のボタンでいつでもON/OFFを切り替えられます。',
      cost: 1500,
      unlocked: autoUnlocked,
      type: 'perm'
    },
    {
      id: 'speed2x',
      icon: '⏩',
      title: '通常戦闘倍速（2倍速）',
      desc: 'バトルの進行速度が2倍になります。解放後、バトル画面上部のボタンで「▷ 1x / ▷▷ 2x」を切り替えられます。',
      cost: 3000,
      unlocked: speed2xUnlocked,
      type: 'perm'
    },
    {
      id: 'stamina_fast',
      icon: '⏱️',
      title: 'クールダウン永続 -10秒',
      desc: 'スタミナ1回復の間隔を永続で10秒短くします。（60秒 → 50秒）',
      cost: 2500,
      unlocked: staminaFastUnlocked,
      type: 'perm'
    },
    {
      id: 'stamina_potion',
      icon: '⚡',
      title: 'スタミナ全回復',
      desc: `消費したスタミナを即座に最大値（${MAX_STAMINA}）まで全回復します。購入上限なし。`,
      cost: 100,
      unlocked: false,
      type: 'consumable'
    },
    {
      id: 'gold_pack',
      icon: '💰',
      title: `ゴールド袋（+${goldAmount.toLocaleString()} G）`,
      desc: '到達エリアに応じた大量のゴールドを即座に獲得します。強化やカフェ拡張に！',
      cost: 300,
      unlocked: false,
      type: 'consumable'
    }
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
}

function buyShopItem(itemId) {
  if (itemId === 'auto') {
    if (autoUnlocked) return;
    if (gem < 1500) return alert('ジェムが足りません！（1,500💎必要）');
    if (!confirm('1,500💎を消費して「自動戦闘（オート連戦）」を永久解放しますか？')) return;
    gem -= 1500;
    autoUnlocked = true;
    autoActive = true;
    showToast('🔄 自動戦闘を解放しました！');
  } else if (itemId === 'speed2x') {
    if (speed2xUnlocked) return;
    if (gem < 3000) return alert('ジェムが足りません！（3,000💎必要）');
    if (!confirm('3,000💎を消費して「通常戦闘倍速（2倍速）」を永久解放しますか？')) return;
    gem -= 3000;
    speed2xUnlocked = true;
    speed2xActive = true;
    showToast('⏩ 通常戦闘2倍速を解放しました！');
  } else if (itemId === 'stamina_fast') {
    if (staminaFastUnlocked) return;
    if (gem < 2500) return alert('ジェムが足りません！（2,500💎必要）');
    if (!confirm('2,500💎を消費して「スタミナ回復 -10秒」を永久解放しますか？')) return;
    gem -= 2500;
    staminaFastUnlocked = true;
    showToast('⏱️ スタミナ回復間隔が50秒になりました！');
  } else if (itemId === 'stamina_potion') {
    syncStamina();
    if (stamina >= MAX_STAMINA) return alert('すでにスタミナは満タンです！');
    if (gem < 100) return alert('ジェムが足りません！（100💎必要）');
    gem -= 100;
    stamina = MAX_STAMINA;
    staminaUpdatedAt = Date.now();
    showToast('⚡ スタミナが全回復しました！');
  } else if (itemId === 'gold_pack') {
    if (gem < 300) return alert('ジェムが足りません！（300💎必要）');
    const gain = getShopGoldAmount();
    gem -= 300;
    gold += gain;
    showToast(`💰 +${gain.toLocaleString()} G を獲得！`);
  }

  renderShop();
  updateUI();
  triggerAutoSave(true);
}
