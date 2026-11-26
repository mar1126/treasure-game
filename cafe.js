// リゾートカフェ経営・ライブ店内演出・メニュー開発・VIP接客システム (cafe.js)
const CAFE_MENUS = [
  { id: 'tea',      name: '森のハーブティー',       cost: 0,       bonus: 0.05, tag: '初期', desc: '香り高い薬草をブレンドした定番ドリンク（売上+5%）' },
  { id: 'slime',    name: 'スライムゼリーパフェ',   cost: 1200,    bonus: 0.15, tag: '甘味', desc: 'ぷるぷる食感の涼やかな特製パフェ（売上+15%）' },
  { id: 'sandwich', name: '冒険者の厚切りサンド',   cost: 6500,    bonus: 0.25, tag: '軽食', desc: 'ジューシーなお肉を挟んだボリューム満点サンド（売上+25%）' },
  { id: 'curry',    name: '炎竜のスパイスカレー',   cost: 32000,   bonus: 0.40, tag: '名物', desc: '秘伝の赤スパイスが効いた情熱の看板カレー（売上+40%）' },
  { id: 'sky_tea',  name: '天空のフルーツティー',   cost: 150000,  bonus: 0.60, tag: '上品', desc: '雲上の果実を浮かべた黄金色の香り茶（売上+60%）' },
  { id: 'steak',    name: 'ベヒーモスステーキ',     cost: 700000,  bonus: 0.80, tag: '豪華', desc: '最高級の霜降り肉を豪快に焼き上げた逸品（売上+80%）' },
  { id: 'fondant',  name: '魔王の黄金フォンダン',   cost: 3000000, bonus: 1.00, tag: '至高', desc: 'とろける濃厚ショコラに金箔を添えた究極甘味（売上+100%）' },
  { id: 'elixir',   name: '星屑のエリクサーソーダ', cost: 12000000,bonus: 1.30, tag: '伝説', desc: '飲むと活力が湧き上がる神秘の輝きドリンク（売上+130%）' }
];

const CAFE_VIPS = [
  { role: '大富豪の商人',   badge: '商', color: '#f57c00', type: 'gold', mult: 90,  line: '「素晴らしい味だ！弾んでおこう！」' },
  { role: '王国の騎士団長', badge: '騎', color: '#0288d1', type: 'gold', mult: 75,  line: '「遠征の疲れが吹き飛んだぞ！」' },
  { role: 'さすらいの詩人', badge: '詩', color: '#7b1fa2', type: 'gem',  gem: 15,   line: '「この感動を歌にしよう！お礼だ！」' },
  { role: '美食家の貴族',   badge: '貴', color: '#c2185b', type: 'gem',  gem: 25,   line: '「王宮の料理人にも負けぬ逸品ね！」' }
];

const CAFE_CUSTOMERS = [
  { name: '旅人',   char: '旅', color: '#43a047' },
  { name: '冒険者', char: '冒', color: '#1e88e5' },
  { name: '魔法使い', char: '魔', color: '#8e24aa' },
  { name: '商人',   char: '商', color: '#fb8c00' },
  { name: '学者',   char: '学', color: '#00897b' }
];

let unlockedMenus = ['tea'];
let featuredMenuId = 'tea';
let cafeLiveState = {
  customers: [],
  vip: null,
  vipCooldown: 18,
  staffPos: [
    { x: 24, y: 58, dir: 1 },
    { x: 52, y: 66, dir: -1 },
    { x: 78, y: 56, dir: 1 }
  ],
  tickTimer: 0
};

function ensureCafeData() {
  if (!Array.isArray(unlockedMenus) || unlockedMenus.length === 0) unlockedMenus = ['tea'];
  if (!unlockedMenus.includes('tea')) unlockedMenus.unshift('tea');
  if (!featuredMenuId || !unlockedMenus.includes(featuredMenuId)) featuredMenuId = unlockedMenus[unlockedMenus.length - 1] || 'tea';
}

function getFeaturedMenu() {
  ensureCafeData();
  return CAFE_MENUS.find(m => m.id === featuredMenuId) || CAFE_MENUS[0];
}

function getCafeIncome() {
  let staffPower = 0;
  let activeStaffCount = 0;
  (staff || []).forEach(monId => {
    const m = captured.find(x => x.id === monId);
    if (m && typeof getMonStats === 'function') {
      const st = getMonStats(m);
      staffPower += (st.lv * 4) + Math.floor(st.atk * 0.4) + (st.plus * 10);
      activeStaffCount++;
    }
  });
  if (activeStaffCount === 0) return 0;

  const base = (cafeLv * 12) + staffPower;
  const gardenMult = 1 + ((gardenItems || []).length * 0.15);
  const menuObj = getFeaturedMenu();
  const menuMult = 1 + (menuObj ? menuObj.bonus : 0);
  return Math.max(1, Math.floor(base * gardenMult * menuMult));
}

function getCafeTheme() {
  if (cafeLv >= 15) {
    return {
      title: '黄金の王宮ラウンジ',
      bg: 'linear-gradient(180deg, #fff8e1 0%, #ffe082 52%, #d7ccc8 53%, #bcaaa4 100%)',
      border: '#ffb300'
    };
  }
  if (cafeLv >= 6) {
    return {
      title: 'レンガ造りの街角ビストロ',
      bg: 'linear-gradient(180deg, #e1f5fe 0%, #b3e5fc 50%, #ffccbc 51%, #d7ccc8 100%)',
      border: '#4fc3f7'
    };
  }
  return {
    title: '木漏れ日のテラスカフェ',
    bg: 'linear-gradient(180deg, #b3e5fc 0%, #e0f7fa 50%, #dcedc8 51%, #c5e1a5 100%)',
    border: '#81d4fa'
  };
}
function developCafeMenu(menuId) {
  ensureCafeData();
  const menu = CAFE_MENUS.find(m => m.id === menuId);
  if (!menu || unlockedMenus.includes(menuId)) return;
  if (gold < menu.cost) return alert(`ゴールドが足りません（${menu.cost.toLocaleString()} G 必要）`);
  gold -= menu.cost;
  unlockedMenus.push(menuId);
  featuredMenuId = menuId;
  renderCafe();
  updateUI();
  triggerAutoSave(true);
  showToast(`新メニュー「${menu.name}」を開発＆おすすめに設定！`);
}

function setFeaturedMenu(menuId) {
  ensureCafeData();
  if (!unlockedMenus.includes(menuId)) return;
  featuredMenuId = menuId;
  const menu = getFeaturedMenu();
  renderCafe();
  updateUI();
  triggerAutoSave();
  showToast(`本日のおすすめを「${menu.name}」に変更しました`);
}

function claimCafeVip(e) {
  if (e) e.stopPropagation();
  const vip = cafeLiveState.vip;
  if (!vip) return;
  const inc = Math.max(10, getCafeIncome());

  if (vip.type === 'gem') {
    gem += vip.gem;
    showToast(`${vip.role}から +${vip.gem} GEM のチップを獲得！`);
    spawnCafeFloatText(`+${vip.gem} GEM`, '#0288d1');
  } else {
    const bonusGold = inc * vip.mult;
    gold += bonusGold;
    showToast(`${vip.role}から +${bonusGold.toLocaleString()} G のチップを獲得！`);
    spawnCafeFloatText(`+${bonusGold.toLocaleString()} G`, '#f57c00');
  }

  cafeLiveState.vip = null;
  cafeLiveState.vipCooldown = 25;
  renderCafeLiveStage();
  updateUI();
  triggerAutoSave(true);
}

function spawnCafeFloatText(text, color = '#ff7043') {
  const stage = document.getElementById('cafe-live-stage');
  if (!stage) return;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `position:absolute;left:${35 + Math.random() * 30}%;top:32%;font-weight:900;font-size:13px;color:${color};background:rgba(255,255,255,0.92);padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.2);pointer-events:none;z-index:20;animation:floatDmg 0.9s ease-out forwards;`;
  stage.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function assignStaffFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (party.includes(m.id)) return alert('バトル編成中のモンスターはカフェ店員にできません。先にパーティから外してください。');
  if ((trainingSlots || []).includes(m.id)) return alert('訓練場に入っているモンスターは店員にできません。先に訓練場から外してください。');
  if (staff.includes(m.id)) return alert('すでにカフェ店員に配属されています。');

  const empty = staff.findIndex(x => x === null);
  if (empty === -1) return alert('カフェ店員（3枠）がいっぱいです。カフェ画面で枠をタップして外してください。');
  staff.splice(empty, 1, m.id);
  closeMonModal();
  renderCafe();
  renderCaptured();
  updateUI();
  triggerAutoSave();
  showToast(`${m.name}をカフェ店員に配属しました`);
}

function removeStaff(slotIdx) {
  staff.splice(slotIdx, 1, null);
  renderCafe();
  renderCaptured();
  updateUI();
  triggerAutoSave();
  showToast('店員を枠から外しました');
}

function upgradeCafe() {
  if (gold < cafeCost) return alert('ゴールドが足りません');
  gold -= cafeCost;
  cafeLv++;
  cafeCost = Math.floor(cafeCost * 1.48);
  renderCafe();
  updateUI();
  triggerAutoSave();
  showToast(`カフェが Lv.${cafeLv} にグレードアップ！`);
}

function buyDecor(name, cost) {
  if (gold < cost) return alert('ゴールドが足りません');
  gold -= cost;
  gardenItems.push(name);
  renderCafe();
  updateUI();
  triggerAutoSave();
  showToast(`${name}をカフェに設置しました（売上+15%）`);
}
function tickCafeSimulation() {
  const activeStaff = (staff || []).map(id => captured.find(x => x.id === id)).filter(Boolean);
  if (activeStaff.length === 0) return;

  for (let i = 0; i < 3; i++) {
    const pos = cafeLiveState.staffPos[i];
    if (!pos) continue;
    pos.x += pos.dir * (6 + Math.random() * 5);
    if (pos.x > 82) { pos.x = 82; pos.dir = -1; }
    if (pos.x < 14) { pos.x = 14; pos.dir = 1; }
  }

  if (cafeLiveState.customers.length < 3 && Math.random() < 0.55) {
    const tpl = CAFE_CUSTOMERS[Math.floor(Math.random() * CAFE_CUSTOMERS.length)];
    const menu = getFeaturedMenu();
    cafeLiveState.customers.push({
      id: Date.now() + Math.random(),
      name: tpl.name,
      char: tpl.char,
      color: tpl.color,
      x: 16 + cafeLiveState.customers.length * 28 + Math.floor(Math.random() * 6),
      timer: 5,
      order: menu ? menu.name : 'ハーブティー'
    });
  }

  for (let i = cafeLiveState.customers.length - 1; i >= 0; i--) {
    const c = cafeLiveState.customers[i];
    c.timer--;
    if (c.timer <= 0) {
      const inc = getCafeIncome();
      if (inc > 0 && document.getElementById('tab-cafe')?.classList.contains('active')) {
        spawnCafeFloatText(`+${(inc * 2).toLocaleString()} G`, '#2e7d32');
      }
      cafeLiveState.customers.splice(i, 1);
    }
  }

  if (!cafeLiveState.vip) {
    cafeLiveState.vipCooldown--;
    if (cafeLiveState.vipCooldown <= 0) {
      const vTpl = CAFE_VIPS[Math.floor(Math.random() * CAFE_VIPS.length)];
      cafeLiveState.vip = { ...vTpl, timer: 25 };
    }
  } else {
    cafeLiveState.vip.timer--;
    if (cafeLiveState.vip.timer <= 0) {
      cafeLiveState.vip = null;
      cafeLiveState.vipCooldown = 20;
    }
  }

  if (document.getElementById('tab-cafe')?.classList.contains('active')) {
    renderCafeLiveStage();
  }
}

setInterval(tickCafeSimulation, 1500);

function renderCafeLiveStage() {
  const stage = document.getElementById('cafe-live-stage');
  if (!stage) return;
  const theme = getCafeTheme();
  const menu = getFeaturedMenu();
  stage.style.background = theme.bg;
  stage.style.borderColor = theme.border;

  const activeStaff = (staff || []).map((id, idx) => ({ m: captured.find(x => x.id === id), idx })).filter(x => x.m);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;font-size:10px;font-weight:bold;color:#263238;background:rgba(255,255,255,0.72);border-bottom:1px solid rgba(0,0,0,0.08);">
      <span>${theme.title}</span>
      <span style="color:#e65100;">おすすめ: ${menu.name} (+${Math.round(menu.bonus * 100)}%)</span>
    </div>
  `;

  // インテリア装飾アイコン（設置済みの家具を店内に並べる）
  const decors = (gardenItems || []).slice(0, 8);
  if (decors.length > 0) {
    html += `<div style="position:absolute;top:30px;left:8px;right:8px;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none;opacity:0.9;">`;
    decors.forEach(d => {
      const badge = d === 'ヤシの木' ? '木' : (d === '花壇' ? '花' : '泉');
      html += `<span style="background:rgba(255,255,255,0.85);border:1px solid #a5d6a7;color:#2e7d32;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:6px;">${badge}</span>`;
    });
    html += `</div>`;
  }

  // 来店中のお客さん（テーブル席）
  cafeLiveState.customers.forEach(c => {
    html += `
      <div style="position:absolute;left:${c.x}%;top:44%;transform:translate(-50%,-50%);text-align:center;transition:all 0.4s;">
        <div style="font-size:9px;background:rgba(255,255,255,0.92);color:#37474f;padding:1px 5px;border-radius:6px;border:1px solid #cfd8dc;white-space:nowrap;margin-bottom:2px;">${c.order}</div>
        <div style="width:26px;height:26px;margin:0 auto;border-radius:50%;background:#fff;border:2px solid ${c.color};color:${c.color};font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.15);">${c.char}</div>
      </div>
    `;
  });

  // VIP来客（タップでチップ獲得！）
  if (cafeLiveState.vip) {
    const v = cafeLiveState.vip;
    html += `
      <div onclick="claimCafeVip(event)" style="position:absolute;right:10px;bottom:10px;background:#fff8e1;border:2px solid #ffb300;border-radius:10px;padding:5px 8px;cursor:pointer;box-shadow:0 3px 10px rgba(255,179,0,0.45);z-index:15;max-width:190px;">
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="width:22px;height:22px;border-radius:50%;background:${v.color};color:#fff;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${v.badge}</span>
          <div style="min-width:0;">
            <div style="font-size:10px;font-weight:bold;color:#e65100;">VIP来店！${v.role}</div>
            <div style="font-size:9px;color:#5d4037;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">タップして接客（チップ獲得）</div>
          </div>
        </div>
      </div>
    `;
  }

  // 動き回る店員モンスター
  if (activeStaff.length === 0) {
    html += `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#546e7a;padding-top:18px;">店員を配属するとお店がオープンします！</div>`;
  } else {
    activeStaff.forEach(({ m, idx }) => {
      const pos = cafeLiveState.staffPos[idx] || { x: 30 + idx * 20, y: 72 };
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : '魔';
      html += `
        <div style="position:absolute;left:${pos.x}%;top:74%;transform:translate(-50%,-50%);transition:left 1.3s ease-in-out;text-align:center;z-index:10;">
          ${renderSprite(disp, 30, '50%')}
          <div style="font-size:8.5px;font-weight:bold;color:#263238;background:rgba(255,255,255,0.85);padding:0 4px;border-radius:4px;margin-top:1px;">${m.name}</div>
        </div>
      `;
    });
  }

  stage.innerHTML = html;
}

function renderCafe() {
  ensureCafeData();
  renderCafeLiveStage();

  // 店員スロット描画
  const staffEl = document.getElementById('staff-slots');
  if (staffEl) {
    staffEl.innerHTML = (staff || []).slice(0, 3).map((monId, idx) => {
      const m = captured.find(x => x.id === monId);
      if (!m) {
        return `<div class="slot-box" onclick="alert('「編成・訓練」タブの仲間一覧からモンスターをタップし、「カフェ店員に配属する」を選んでください')"><div class="lvl">店員${idx + 1}</div><div class="icon">＋</div><div class="name">空き枠</div><div class="sub">タップで案内</div></div>`;
      }
      const disp = typeof getMonsterVisual === 'function' ? getMonsterVisual(m) : '魔';
      const st = typeof getMonStats === 'function' ? getMonStats(m) : { lv: 1, atk: 10 };
      return `<div class="slot-box staff" onclick="removeStaff(${idx})"><div class="lvl"><span>Lv.${st.lv}</span><span>外す</span></div><div class="icon">${renderSprite(disp, 34)}</div><div class="name">${m.name}</div><div class="sub">接客中</div></div>`;
    }).join('');
  }

  // メニュー開発＆おすすめ一覧描画
  const menuBox = document.getElementById('cafe-menu-list');
  if (menuBox) {
    menuBox.innerHTML = CAFE_MENUS.map(m => {
      const isUnlocked = unlockedMenus.includes(m.id);
      const isFeatured = featuredMenuId === m.id;
      let btnHtml = `<button class="shop-buy-btn" onclick="developCafeMenu('${m.id}')">開発 ${m.cost.toLocaleString()}G</button>`;
      if (isFeatured) {
        btnHtml = `<button class="shop-buy-btn done" disabled>おすすめ中</button>`;
      } else if (isUnlocked) {
        btnHtml = `<button class="shop-buy-btn" style="background:#0288d1;" onclick="setFeaturedMenu('${m.id}')">おすすめにする</button>`;
      }
      return `
        <div class="shop-item-card" style="${isFeatured ? 'border-color:#ff7043;background:#fff8f6;' : ''}">
          <div class="shop-item-info">
            <div class="shop-item-title"><span class="badge-tag" style="margin-right:4px;">${m.tag}</span>${m.name}</div>
            <div class="shop-item-desc">${m.desc}</div>
          </div>
          <div class="shop-item-action">${btnHtml}</div>
        </div>
      `;
    }).join('');
  }

  if (document.getElementById('cafe-rate')) document.getElementById('cafe-rate').textContent = getCafeIncome().toLocaleString();
  if (document.getElementById('cafe-lv')) document.getElementById('cafe-lv').textContent = cafeLv;
  if (document.getElementById('cafe-cost')) document.getElementById('cafe-cost').textContent = cafeCost.toLocaleString();
  if (document.getElementById('garden-bonus')) document.getElementById('garden-bonus').textContent = (gardenItems || []).length * 15;
}
