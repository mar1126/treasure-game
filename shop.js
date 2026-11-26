// ショップ・AIアトリエ管理 (shop.js)
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

// --- AIアトリエ機能 ---
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
  const names = Array.from(new Set((captured || []).map(m => m.name)));
  if (names.length === 0) names.push('スライム');

  const monSel = document.getElementById('ai-species-sel');
  if (monSel) {
    const prev = monSel.value;
    monSel.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('');
    if (names.includes(prev)) monSel.value = prev;
  }

  const stampSel = document.getElementById('stamp-species-sel');
  if (stampSel) {
    const prev = stampSel.value;
    const allNames = (typeof ALL_MONSTER_SPECIES !== 'undefined')
      ? ALL_MONSTER_SPECIES.map(s => s.name)
      : names;
    stampSel.innerHTML = allNames.map(n => `<option value="${n}">${n}</option>`).join('');
    if (allNames.includes(prev)) stampSel.value = prev;
  }
}

function updateCharCount(kind) {
  const inp = document.getElementById(`ai-${kind}-prompt`);
  const cnt = document.getElementById(`${kind}-count`);
  if (inp && cnt) cnt.textContent = inp.value.length;
}

function toggleExtend(kind) {
  const chk = document.getElementById(`${kind}-ext`);
  const inp = document.getElementById(`ai-${kind}-prompt`);
  const maxEl = document.getElementById(`${kind}-max`);
  const costEl = document.getElementById(`${kind}-cost`);
  const isExt = chk ? chk.checked : false;
  if (inp) {
    inp.maxLength = isExt ? 500 : 200;
    if (!isExt && inp.value.length > 200) inp.value = inp.value.slice(0, 200);
  }
  if (maxEl) maxEl.textContent = isExt ? '500' : '200';
  if (costEl) costEl.textContent = isExt ? '250' : '200';
  updateCharCount(kind);
}

function renderSpeciesGallery() {
  refreshAiSpeciesSelects();
  const gal = document.getElementById('species-skin-gallery');
  const sel = document.getElementById('ai-species-sel');
  if (!gal || !sel) return;
  const spName = sel.value || 'スライム';
  const spData = (speciesSkins && speciesSkins[spName]) ? speciesSkins[spName] : { list: [], activeIdx: -1 };
  const list = Array.isArray(spData.list) ? spData.list : [];

  if (list.length === 0) {
    gal.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:#78909c;text-align:center;padding:8px;">「${spName}」のAIスキンはまだありません</div>`;
    return;
  }

  gal.innerHTML = list.map((imgData, idx) => {
    const isAct = spData.activeIdx === idx;
    return `
      <div class="slot-box" onclick="equipSpeciesSkinFromGallery('${spName}', ${idx})" style="${isAct ? 'border:2px solid #ff7043;background:#fff8f6;' : ''}">
        <img src="${imgData}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;">
        <div style="font-size:10px;font-weight:bold;color:${isAct ? '#ff7043' : '#546e7a'};margin-top:3px;">${isAct ? '★ 適用中' : 'タップで適用'}</div>
      </div>
    `;
  }).join('');
}

function equipSpeciesSkinFromGallery(spName, idx) {
  if (!speciesSkins[spName]) return;
  speciesSkins[spName].activeIdx = idx;
  if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
  if (typeof renderParty === 'function') renderParty();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderTraining === 'function') renderTraining();
  if (typeof renderCafe === 'function') renderCafe();
  renderSpeciesGallery();
  updateUI();
  triggerAutoSave(true);
  showToast(`${spName}のスキンを適用しました！`);
}

async function generateAI(type) {
  const statusEl = document.getElementById('ai-status');
  const kindKey = type === 'monster' ? 'mon' : type;
  const isExt = document.getElementById(`${kindKey}-ext`)?.checked || false;
  const cost = isExt ? 250 : 200;

  if (gem < cost) return alert(`ジェムが足りません（${cost} GEM 必要）`);

  let prompt = '';
  let species = 'スライム';
  let stampText = '';

  if (type === 'monster') {
    species = document.getElementById('ai-species-sel')?.value || 'スライム';
    prompt = document.getElementById('ai-mon-prompt')?.value.trim() || '';
    if (!prompt) return alert('どんな姿にするかプロンプトを入力してください');
  } else if (type === 'bg') {
    prompt = document.getElementById('ai-bg-prompt')?.value.trim() || '';
    if (!prompt) return alert('どんな背景にするかプロンプトを入力してください');
  } else if (type === 'stamp') {
    species = document.getElementById('stamp-species-sel')?.value || 'スライム';
    stampText = document.getElementById('stamp-text')?.value.trim() || 'やったね！';
    prompt = document.getElementById('ai-stamp-prompt')?.value.trim() || '';
    if (!prompt) return alert('スタンプのイラスト内容を入力してください');
  }

  if (statusEl) statusEl.textContent = 'AI生成中（約5〜10秒）...';
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, species, prompt, stamp_text: stampText })
    });
    const data = await res.json();
    if (!res.ok || !data.image) {
      throw new Error(data.error || '生成に失敗しました');
    }

    gem -= cost;

    if (type === 'monster') {
      if (!speciesSkins[species]) speciesSkins[species] = { list: [], activeIdx: -1 };
      speciesSkins[species].list.push(data.image);
      speciesSkins[species].activeIdx = speciesSkins[species].list.length - 1;
      if (!state.inBattle && typeof resetBattleAllies === 'function') resetBattleAllies();
      if (typeof renderParty === 'function') renderParty();
      if (typeof renderCaptured === 'function') renderCaptured();
      renderSpeciesGallery();
      showToast(`${species}の新しいAIスキンを生成＆適用しました！`);
    } else if (type === 'bg') {
      if (!Array.isArray(aiBackgrounds)) aiBackgrounds = [];
      aiBackgrounds.push({ img: data.image, prompt });
      if (typeof updateIconPreview === 'function') updateIconPreview(false);
      showToast('新しいアイコン背景を生成しました！');
    } else if (type === 'stamp') {
      if (!Array.isArray(aiStamps)) aiStamps = [];
      aiStamps.push({ img: data.image, text: stampText, species });
      if (typeof renderStamps === 'function') renderStamps();
      showToast('新しいチャットスタンプを生成しました！');
    }

    updateUI();
    triggerAutoSave(true);
    if (statusEl) statusEl.textContent = '生成完了！';
  } catch (e) {
    if (statusEl) statusEl.textContent = 'エラー発生';
    alert('AI生成エラー: ' + e.message);
  }
}
