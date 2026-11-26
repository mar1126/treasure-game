// ショップ・アトリエ管理（白背景透明化＋開発者公式アセット登録対応）(shop.js)
let shopSubTab = 'gem';

function switchShopSub(sub, btn) {
  shopSubTab = sub;
  document.querySelectorAll('.shop-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (sub === 'tank' && typeof openTankShop === 'function') {
    openTankShop(btn);
  } else {
    renderShop();
  }
}

function renderShop() {
  const box = document.getElementById('shop-list');
  if (!box) return;
  if (shopSubTab === 'tank' && typeof renderTankCardsDirect === 'function') {
    box.innerHTML = renderTankCardsDirect(Number(landTankTier) || 0);
    return;
  }

  const goldAmt = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 2000;
  const items = [
    {
      id: 'stamina',
      title: 'スタミナ全回復（30回復）',
      desc: '冒険に必要なスタミナを即座にMAX（30）まで回復します。',
      cost: 100,
      done: false
    },
    {
      id: 'gold',
      title: `ゴールド交換（+${goldAmt.toLocaleString()} G）`,
      desc: '現在の進行度に応じたゴールドを獲得します。',
      cost: 100,
      done: false
    },
    {
      id: 'auto',
      title: '階層間オート周回解放',
      desc: '階層クリア後に自動で次の階層へ出撃し続ける周回機能を解放します。',
      cost: 500,
      done: Boolean(autoUnlocked)
    },
    {
      id: 'speed2x',
      title: '戦闘速度 2倍速解放',
      desc: 'バトルの進行速度を2倍に切り替えられるようになります。',
      cost: 500,
      done: Boolean(speed2xUnlocked)
    },
    {
      id: 'staminaFast',
      title: 'スタミナ回復速度 2倍（30秒で1回復）',
      desc: 'スタミナの自然回復間隔が60秒から30秒に短縮されます。',
      cost: 800,
      done: Boolean(staminaFastUnlocked)
    }
  ];

  box.innerHTML = items.map(it => `
    <div class="shop-item-card">
      <div class="shop-item-info">
        <div class="shop-item-title">${it.title}</div>
        <div class="shop-item-desc">${it.desc}</div>
      </div>
      <div class="shop-item-action">
        ${it.done
          ? `<button class="shop-buy-btn done" disabled>解放済</button>`
          : `<button class="shop-buy-btn" onclick="buyShopItem('${it.id}', ${it.cost})">${it.cost} GEM</button>`
        }
      </div>
    </div>
  `).join('');
}

function buyShopItem(id, cost) {
  if (gem < cost) return alert(`ジェムが足りません（${cost} GEM 必要）`);
  if (id === 'stamina') {
    if (stamina >= MAX_STAMINA) return alert('スタミナはすでにMAXです');
    gem -= cost;
    stamina = MAX_STAMINA;
    staminaUpdatedAt = Date.now();
    showToast('スタミナが全回復しました！');
  } else if (id === 'gold') {
    const amt = typeof getShopGoldAmount === 'function' ? getShopGoldAmount() : 2000;
    gem -= cost;
    gold += amt;
    showToast(`${amt.toLocaleString()} G を獲得しました！`);
  } else if (id === 'auto') {
    if (autoUnlocked) return;
    gem -= cost;
    autoUnlocked = true;
    autoActive = true;
    showToast('階層間オート周回を解放しました！');
  } else if (id === 'speed2x') {
    if (speed2xUnlocked) return;
    gem -= cost;
    speed2xUnlocked = true;
    speed2xActive = true;
    showToast('戦闘速度 2倍速を解放しました！');
  } else if (id === 'staminaFast') {
    if (staminaFastUnlocked) return;
    gem -= cost;
    staminaFastUnlocked = true;
    showToast('スタミナ回復速度が2倍になりました！');
  }
  renderShop();
  updateUI();
  triggerAutoSave(true);
}

function switchAiSub(sub, btn) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.ai-sub-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('ai-sub-' + sub);
  if (target) target.classList.add('active');
  refreshAiSpeciesSelects();
  renderSpeciesGallery();
  if (typeof renderStamps === 'function') renderStamps();
}

function refreshAiSpeciesSelects() {
  const allNames = (typeof ALL_MONSTER_SPECIES !== 'undefined')
    ? ALL_MONSTER_SPECIES.map(s => s.name)
    : Array.from(new Set((captured || []).map(m => m.name)));
  if (allNames.length === 0) allNames.push('スライム');

  const monSel = document.getElementById('ai-species-sel');
  if (monSel) {
    const prev = monSel.value;
    monSel.innerHTML = allNames.map(n => `<option value="${n}">${n}</option>`).join('');
    if (allNames.includes(prev)) monSel.value = prev;
  }

  const stampSel = document.getElementById('stamp-species-sel');
  if (stampSel) {
    const prev = stampSel.value;
    stampSel.innerHTML = allNames.map(n => `<option value="${n}">${n}</option>`).join('');
    if (allNames.includes(prev)) stampSel.value = prev;
  }
}
