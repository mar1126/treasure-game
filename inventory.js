// 倉庫(スタック管理)・料理レシピ開発・モンスター逃がし還元・アイテム詳細モーダル (inventory.js)
var materials = typeof materials === 'object' && materials ? materials : {};
var unlockedRecipes = Array.isArray(unlockedRecipes) ? unlockedRecipes : [];
var recipeLevels = typeof recipeLevels === 'object' && recipeLevels ? recipeLevels : {};
var bagSubTab = 'food';

const RARITY_STYLES = {
  N:  { label: 'N',  border: '#cbd5e1', bg: '#f8fafc', badgeBg: '#64748b', glow: 'none' },
  R:  { label: 'R',  border: '#38bdf8', bg: '#f0f9ff', badgeBg: '#0284c7', glow: '0 0 8px rgba(56,189,248,0.35)' },
  SR: { label: 'SR', border: '#f59e0b', bg: '#fffbeb', badgeBg: '#d97706', glow: '0 0 10px rgba(245,158,11,0.45)' },
  UR: { label: 'UR', border: '#c084fc', bg: '#faf5ff', badgeBg: '#9333ea', glow: '0 0 14px rgba(192,132,252,0.65)' }
};

const ITEM_MASTER = {
  slime_jelly:   { id: 'slime_jelly',   name: 'ぷるぷるゼリー', cat: 'food', rarity: 'N',  short: 'ゼ', color: '#29b6f6', desc: 'スライムから採れる透き通った甘いゼリー。酒場の定番スイーツの材料になる。' },
  wild_herb:     { id: 'wild_herb',     name: '香り薬草',       cat: 'food', rarity: 'N',  short: '草', color: '#66bb6a', desc: '草原に自生する香り高いハーブ。料理の風味を引き立て、冒険者の疲れを癒やす。' },
  forest_berry:  { id: 'forest_berry',  name: '森のベリー',     cat: 'food', rarity: 'R',  short: '苺', color: '#ec407a', desc: '深緑の森で採れる甘酸っぱい果実。高級タルトや果実酒に欠かせない食材。' },
  royal_honey:   { id: 'royal_honey',   name: '黄金ハチミツ',   cat: 'food', rarity: 'R',  short: '蜜', color: '#ffca28', desc: '森の奥で採れる濃厚な黄金の蜂蜜。料理に加えると酒場の売上が大きく跳ね上がる。' },
  ancient_spice: { id: 'ancient_spice', name: '古代スパイス',   cat: 'food', rarity: 'SR', short: '香', color: '#ff7043', desc: '古代遺跡の壺に眠っていた秘伝の香辛料。一口で活力が湧き上がる幻の調味料。' },
  dragon_meat:   { id: 'dragon_meat',   name: '霜降り竜肉',     cat: 'food', rarity: 'UR', short: '肉', color: '#ef5350', desc: '竜族から稀に得られる最高級の霜降り肉。王侯貴族も憧れる伝説のメイン食材。' },

  iron_scrap:    { id: 'iron_scrap',    name: '鉄くず',         cat: 'tank', rarity: 'N',  short: '鉄', color: '#78909c', desc: '魔物の装備や遺跡から回収された鉄の破片。戦車パーツの修理や基礎強化に使う。' },
  magic_gear:    { id: 'magic_gear',    name: '魔導歯車',       cat: 'tank', rarity: 'R',  short: '歯', color: '#42a5f5', desc: '魔力を帯びて回転し続ける精密な歯車。戦車の装填速度や機関強化に必須の部品。' },
  mithril_ingot: { id: 'mithril_ingot', name: 'ミスリル鋼',     cat: 'tank', rarity: 'SR', short: '鋼', color: '#26c6da', desc: '軽くて強靭な銀色の魔法金属。高ランクの戦車装甲や主砲の精錬に用いられる。' },
  dragon_core:   { id: 'dragon_core',   name: '竜の炉心',       cat: 'tank', rarity: 'UR', short: '炉', color: '#ab47bc', desc: '莫大な熱量を秘めた古代竜の核。最強クラスの戦車兵器を生み出す超希少素材。' },

  guild_medal:   { id: 'guild_medal',   name: '討伐の証',       cat: 'key',  rarity: 'R',  short: '証', color: '#ffa726', desc: '強敵を討伐した冒険者に贈られるギルドの勲章。今後の特殊交換で使用予定。' }
};

const RECIPE_MASTER = [
  { id: 'slime_pudding',   name: '極上スライムプリン', rarity: 'N',  baseGold: 18, buffType: 'hp',   buffVal: 5,  buffLabel: '味方最大HP +5%/Lv',   ing: { slime_jelly: 3 }, desc: 'ぷるぷるゼリーを冷やし固めた酒場の看板デザート。冒険者の体力を底上げする。' },
  { id: 'herb_stew',       name: '冒険者の薬草シチュー', rarity: 'N',  baseGold: 22, buffType: 'atk',  buffVal: 4,  buffLabel: '味方攻撃力 +4%/Lv',   ing: { wild_herb: 3, slime_jelly: 1 }, desc: '香り薬草をじっくり煮込んだ温かいシチュー。食べると力が湧いてくる。' },
  { id: 'berry_tart',      name: '森のベリータルト',   rarity: 'R',  baseGold: 45, buffType: 'gold', buffVal: 6,  buffLabel: '戦闘獲得G +6%/Lv',    ing: { forest_berry: 3, wild_herb: 2 }, desc: '甘酸っぱい森のベリーを贅沢に乗せたタルト。酒場の評判を一気に高める。' },
  { id: 'honey_mead',      name: '黄金ハチミツ酒',     rarity: 'R',  baseGold: 55, buffType: 'exp',  buffVal: 6,  buffLabel: '獲得EXP +6%/Lv',      ing: { royal_honey: 2, forest_berry: 2 }, desc: '黄金ハチミツを発酵させた芳醇なエール。経験の吸収効率を高める人気の一杯。' },
  { id: 'spice_curry',     name: '古代スパイスカレー', rarity: 'SR', baseGold: 110, buffType: 'atk', buffVal: 8,  buffLabel: '味方攻撃力 +8%/Lv',   ing: { ancient_spice: 2, royal_honey: 2 }, desc: '古代スパイスが香る秘伝のカレー。パーティ全体の攻撃力を飛躍的に高める。' },
  { id: 'dragon_steak',    name: '竜王の霜降りステーキ', rarity: 'UR', baseGold: 260, buffType: 'all', buffVal: 10, buffLabel: '全ステータス +10%/Lv', ing: { dragon_meat: 1, ancient_spice: 2 }, desc: '霜降り竜肉を豪快に焼き上げた伝説の逸品。酒場もパーティも最高峰へと導く。' }
];

function addMaterial(itemId, count = 1) {
  if (!ITEM_MASTER[itemId] || count <= 0) return;
  if (!materials || typeof materials !== 'object') materials = {};
  materials[itemId] = (Number(materials[itemId]) || 0) + Number(count);
}

function unlockRecipe(recipeId) {
  if (!Array.isArray(unlockedRecipes)) unlockedRecipes = [];
  if (!unlockedRecipes.includes(recipeId)) {
    unlockedRecipes.push(recipeId);
    return true;
  }
  return false;
}

function getTavernRecipeBonus() {
  let extraGps = 0;
  let atkPct = 0, hpPct = 0, goldPct = 0, expPct = 0;
  (unlockedRecipes || []).forEach(rid => {
    const lv = Number(recipeLevels?.[rid] || 0);
    if (lv <= 0) return;
    const rec = RECIPE_MASTER.find(r => r.id === rid);
    if (!rec) return;
    extraGps += rec.baseGold * lv;
    if (rec.buffType === 'atk') atkPct += rec.buffVal * lv;
    if (rec.buffType === 'hp') hpPct += rec.buffVal * lv;
    if (rec.buffType === 'gold') goldPct += rec.buffVal * lv;
    if (rec.buffType === 'exp') expPct += rec.buffVal * lv;
    if (rec.buffType === 'all') {
      atkPct += rec.buffVal * lv;
      hpPct += rec.buffVal * lv;
    }
  });
  return { extraGps, atkPct, hpPct, goldPct, expPct };
}
function renderItemVisual(itemId, size = 40, fallbackShort = '物', fallbackColor = '#78909c') {
  const customImg = (typeof officialAssets === 'object' && officialAssets)
    ? (officialAssets[`item:${itemId}`] || officialAssets[`recipe:${itemId}`])
    : null;
  if (customImg) {
    return `<img src="${customImg}" style="width:${size}px;height:${size}px;object-fit:contain;display:block;">`;
  }
  const fSize = Math.max(12, Math.round(size * 0.44));
  return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${fallbackColor};color:#ffffff;font-weight:900;font-size:${fSize}px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -2px 4px rgba(0,0,0,0.2);">${fallbackShort}</div>`;
}

function openItemDetailModal(kind, id) {
  let modal = document.getElementById('item-detail-modal');
  if (!modal) return;

  let data = null;
  let qtyText = '';
  let extraHtml = '';

  if (kind === 'item') {
    data = ITEM_MASTER[id];
    const cnt = Number(materials?.[id] || 0);
    qtyText = `所持数: ${cnt} 個`;
  } else if (kind === 'recipe') {
    const rec = RECIPE_MASTER.find(r => r.id === id);
    if (rec) {
      const lv = Number(recipeLevels?.[id] || 0);
      data = { id: rec.id, name: `【レシピ】${rec.name}`, rarity: rec.rarity, short: '食', color: '#ff7043', desc: rec.desc };
      qtyText = lv > 0 ? `開発レベル: Lv.${lv}（酒場売上 +${rec.baseGold * lv} G/秒）` : '未開発（酒場で開発可能）';
      const ingNames = Object.entries(rec.ing).map(([k, v]) => `${ITEM_MASTER[k]?.name || k} ×${v}`).join(' / ');
      extraHtml = `<div style="margin-top:8px;padding:8px;border-radius:8px;background:#fff8e1;border:1px solid #ffe082;font-size:11px;color:#5d4037;">
        <div><b>料理効果：</b>${rec.buffLabel}</div>
        <div style="margin-top:3px;"><b>必要食材：</b>${ingNames}</div>
      </div>`;
    }
  }
  if (!data) return;

  const rStyle = RARITY_STYLES[data.rarity] || RARITY_STYLES.N;
  const isAdmin = typeof isAdminUser === 'function' && isAdminUser();

  modal.innerHTML = `
    <div onclick="event.stopPropagation()" style="background:#ffffff;border-radius:16px;padding:16px;width:90%;max-width:340px;border:2.5px solid ${rStyle.border};box-shadow:0 10px 28px rgba(0,0,0,0.28);">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:62px;height:62px;border-radius:14px;border:2px solid ${rStyle.border};background:${rStyle.bg};box-shadow:${rStyle.glow};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${renderItemVisual(data.id, 48, data.short, data.color)}
        </div>
        <div style="flex:1;min-width:0;">
          <span style="display:inline-block;padding:1px 7px;border-radius:6px;background:${rStyle.badgeBg};color:#ffffff;font-size:10px;font-weight:bold;margin-bottom:3px;">${rStyle.label}</span>
          <div style="font-size:15px;font-weight:900;color:#1e293b;word-break:break-all;">${data.name}</div>
          <div style="font-size:11px;color:#0284c7;font-weight:bold;margin-top:2px;">${qtyText}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px;color:#334155;line-height:1.55;">
        ${data.desc}
      </div>
      ${extraHtml}
      ${isAdmin ? `<div style="margin-top:8px;font-size:10px;color:#94a3b8;">管理者ID: <code style="background:#f1f5f9;padding:1px 4px;border-radius:4px;">!アイテム ${data.id}</code></div>` : ''}
      <button onclick="closeItemDetailModal()" style="margin-top:12px;width:100%;padding:9px;border-radius:10px;border:none;background:#475569;color:#ffffff;font-size:12px;font-weight:bold;cursor:pointer;">閉じる</button>
    </div>
  `;
  modal.style.display = 'flex';
}

function closeItemDetailModal() {
  const modal = document.getElementById('item-detail-modal');
  if (modal) modal.style.display = 'none';
}

function calcReleaseRewardsForMonster(mon) {
  const sp = typeof getSpeciesByName === 'function' ? getSpeciesByName(mon.name) : null;
  const elem = mon.elem || sp?.elem || 'none';
  const rar = mon.rarity || sp?.rarity || 'N';
  const lv = Math.max(1, Number(mon.lv) || 1);
  const bonusMul = 1 + Math.floor(lv / 5) * 0.5;

  const drops = [];
  if (elem === 'water') {
    drops.push({ id: 'slime_jelly', count: Math.max(1, Math.round(1 * bonusMul)) });
  } else if (elem === 'earth' || elem === 'wind' || elem === 'sky') {
    drops.push({ id: Math.random() < 0.55 ? 'wild_herb' : 'forest_berry', count: Math.max(1, Math.round(1 * bonusMul)) });
  } else if (elem === 'fire') {
    drops.push({ id: Math.random() < 0.65 ? 'iron_scrap' : 'ancient_spice', count: Math.max(1, Math.round(1 * bonusMul)) });
  } else if (elem === 'light') {
    drops.push({ id: Math.random() < 0.6 ? 'royal_honey' : 'magic_gear', count: Math.max(1, Math.round(1 * bonusMul)) });
  } else if (elem === 'dark') {
    drops.push({ id: Math.random() < 0.7 ? 'magic_gear' : 'mithril_ingot', count: 1 });
  } else {
    drops.push({ id: Math.random() < 0.5 ? 'iron_scrap' : 'wild_herb', count: Math.max(1, Math.round(1 * bonusMul)) });
  }

  if (rar === 'SR' || rar === 'UR') {
    drops.push({ id: rar === 'UR' ? 'dragon_core' : 'mithril_ingot', count: 1 });
  }

  const recipeChance = rar === 'UR' ? 0.25 : (rar === 'SR' ? 0.14 : (rar === 'R' ? 0.08 : 0.04));
  let foundRecipe = null;
  if (Math.random() < recipeChance) {
    const locked = RECIPE_MASTER.filter(r => !(unlockedRecipes || []).includes(r.id));
    if (locked.length > 0) {
      foundRecipe = locked[Math.floor(Math.random() * locked.length)];
    }
  }
  return { drops, foundRecipe };
}

function releaseSingleMonster(capturedIndex) {
  const m = (captured || [])[capturedIndex];
  if (!m) return;
  if (m.locked) return alert('ロック中のモンスターは逃がせません！');
  const inParty = (party || []).some(v => v === capturedIndex || v === m.id);
  const inTrain = (trainingSlots || []).some(v => v === capturedIndex || v === m.id);
  const inStaff = (staff || []).some(v => v === capturedIndex || v === m.id);
  if (inParty || inTrain || inStaff) {
    return alert('パーティ・訓練場・酒場店員に配置中のモンスターは逃がせません！');
  }

  const { drops, foundRecipe } = calcReleaseRewardsForMonster(m);
  drops.forEach(d => addMaterial(d.id, d.count));
  if (foundRecipe) unlockRecipe(foundRecipe.id);

  captured.splice(capturedIndex, 1);
  if (typeof fixIndicesAfterSplice === 'function') fixIndicesAfterSplice(capturedIndex);

  const dropText = drops.map(d => `${ITEM_MASTER[d.id]?.name}×${d.count}`).join('・');
  if (typeof closeMonsterModal === 'function') closeMonsterModal();
  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderBag === 'function') renderBag();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);

  if (foundRecipe) {
    alert(`「${m.name}」を野に還しました！\n獲得素材: ${dropText}\n\n✨ひらめき！新料理レシピ【${foundRecipe.name}】を発見しました！`);
  } else {
    showToast(`${m.name}を野に還し、${dropText}を獲得！`);
  }
}

function releaseBulkMonsters() {
  const targets = [];
  (captured || []).forEach((m, idx) => {
    if (!m || m.locked) return;
    const inParty = (party || []).some(v => v === idx || v === m.id);
    const inTrain = (trainingSlots || []).some(v => v === idx || v === m.id);
    const inStaff = (staff || []).some(v => v === idx || v === m.id);
    if (!inParty && !inTrain && !inStaff) targets.push(idx);
  });

  if (targets.length === 0) {
    return alert('一括で逃がせる未編成・未ロックのモンスターがいません。');
  }
  if (!confirm(`パーティ・訓練場・酒場・ロック以外のモンスター ${targets.length}体 をまとめて野に還しますか？`)) return;

  const totalDrops = {};
  const newRecipes = [];

  for (let i = targets.length - 1; i >= 0; i--) {
    const idx = targets[i];
    const m = captured[idx];
    const { drops, foundRecipe } = calcReleaseRewardsForMonster(m);
    drops.forEach(d => {
      addMaterial(d.id, d.count);
      totalDrops[d.id] = (totalDrops[d.id] || 0) + d.count;
    });
    if (foundRecipe && unlockRecipe(foundRecipe.id)) {
      newRecipes.push(foundRecipe.name);
    }
    captured.splice(idx, 1);
    if (typeof fixIndicesAfterSplice === 'function') fixIndicesAfterSplice(idx);
  }

  if (typeof renderCaptured === 'function') renderCaptured();
  if (typeof renderBag === 'function') renderBag();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);

  const summary = Object.entries(totalDrops).map(([id, c]) => `・${ITEM_MASTER[id]?.name || id} ×${c}`).join('\n');
  const recMsg = newRecipes.length > 0 ? `\n\n✨新料理レシピ発見！\n` + newRecipes.map(n => `・【レシピ】${n}`).join('\n') : '';
  alert(`${targets.length}体のモンスターを野に還しました！\n\n【獲得素材】\n${summary || 'なし'}${recMsg}`);
}
function grantBattleLoot(stageNum, floorNum, isBoss) {
  const s = Number(stageNum) || 1;
  const gained = [];

  if (Math.random() < (isBoss ? 0.9 : 0.45)) {
    const pool = s === 1 ? ['slime_jelly', 'wild_herb', 'iron_scrap']
      : (s === 2 ? ['forest_berry', 'royal_honey', 'magic_gear', 'iron_scrap']
      : ['ancient_spice', 'mithril_ingot', 'magic_gear', 'royal_honey']);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const cnt = isBoss ? (1 + Math.floor(Math.random() * 2)) : 1;
    addMaterial(id, cnt);
    gained.push(`${ITEM_MASTER[id].name}×${cnt}`);
  }

  if (isBoss) {
    if (s >= 4 && Math.random() < 0.12) {
      const rareId = Math.random() < 0.5 ? 'dragon_meat' : 'dragon_core';
      addMaterial(rareId, 1);
      gained.push(`【UR】${ITEM_MASTER[rareId].name}×1`);
    }
    if (Math.random() < 0.25) {
      const locked = RECIPE_MASTER.filter(r => !(unlockedRecipes || []).includes(r.id));
      if (locked.length > 0) {
        const rec = locked[Math.floor(Math.random() * locked.length)];
        if (unlockRecipe(rec.id)) {
          gained.push(`✨レシピ【${rec.name}】`);
        }
      }
    }
  }
  return gained;
}

function switchBagSubTab(tab, btn) {
  bagSubTab = tab;
  document.querySelectorAll('.bag-sub-btn').forEach(b => {
    b.style.background = '#f1f5f9';
    b.style.color = '#475569';
    b.style.borderColor = '#cbd5e1';
  });
  if (btn) {
    btn.style.background = '#ff7043';
    btn.style.color = '#ffffff';
    btn.style.borderColor = '#ff7043';
  }
  renderBag();
}

function renderBag() {
  const box = document.getElementById('bag-content');
  if (!box) return;

  if (bagSubTab === 'food') {
    const foodItems = Object.values(ITEM_MASTER).filter(it => it.cat === 'food');
    let html = `<div style="font-size:12px;font-weight:bold;color:#e65100;margin-bottom:6px;">🍖 所持食材（タップで詳細）</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">`;
    foodItems.forEach(it => {
      const cnt = Number(materials?.[it.id] || 0);
      const rStyle = RARITY_STYLES[it.rarity] || RARITY_STYLES.N;
      html += `
        <div onclick="openItemDetailModal('item','${it.id}')" style="border:2px solid ${rStyle.border};background:${rStyle.bg};box-shadow:${rStyle.glow};border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;opacity:${cnt > 0 ? 1 : 0.45};">
          <div style="display:flex;justify-content:center;margin-bottom:4px;">${renderItemVisual(it.id, 38, it.short, it.color)}</div>
          <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
          <div style="font-size:11px;font-weight:900;color:#0284c7;margin-top:2px;">×${cnt}</div>
        </div>
      `;
    });
    html += `</div>`;

    html += `<div style="font-size:12px;font-weight:bold;color:#e65100;margin-bottom:6px;">📜 発見済み料理レシピ（${(unlockedRecipes || []).length} / ${RECIPE_MASTER.length}）</div>`;
    if (!unlockedRecipes || unlockedRecipes.length === 0) {
      html += `<div style="font-size:11px;color:#94a3b8;padding:12px;text-align:center;background:#f8fafc;border-radius:10px;">まだレシピがありません。モンスターを野に還すかボス撃破でひらめきます！</div>`;
    } else {
      html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">`;
      unlockedRecipes.forEach(rid => {
        const rec = RECIPE_MASTER.find(r => r.id === rid);
        if (!rec) return;
        const lv = Number(recipeLevels?.[rid] || 0);
        const rStyle = RARITY_STYLES[rec.rarity] || RARITY_STYLES.N;
        html += `
          <div onclick="openItemDetailModal('recipe','${rec.id}')" style="border:2px solid ${rStyle.border};background:${rStyle.bg};box-shadow:${rStyle.glow};border-radius:12px;padding:8px;display:flex;align-items:center;gap:8px;cursor:pointer;">
            ${renderItemVisual(rec.id, 38, '食', '#ff7043')}
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${rec.name}</div>
              <div style="font-size:10px;color:${lv > 0 ? '#16a34a' : '#d97706'};font-weight:bold;">${lv > 0 ? `開発 Lv.${lv}` : '未開発（酒場へ）'}</div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }
    box.innerHTML = html;
  } else if (bagSubTab === 'tank') {
    const tankItems = Object.values(ITEM_MASTER).filter(it => it.cat === 'tank');
    let html = `<div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:6px;">⚙️ 戦車・精錬素材（タップで詳細）</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">`;
    tankItems.forEach(it => {
      const cnt = Number(materials?.[it.id] || 0);
      const rStyle = RARITY_STYLES[it.rarity] || RARITY_STYLES.N;
      html += `
        <div onclick="openItemDetailModal('item','${it.id}')" style="border:2px solid ${rStyle.border};background:${rStyle.bg};box-shadow:${rStyle.glow};border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;opacity:${cnt > 0 ? 1 : 0.45};">
          <div style="display:flex;justify-content:center;margin-bottom:4px;">${renderItemVisual(it.id, 38, it.short, it.color)}</div>
          <div style="font-size:10px;font-weight:bold;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
          <div style="font-size:11px;font-weight:900;color:#0284c7;margin-top:2px;">×${cnt}</div>
        </div>
      `;
    });
    html += `</div><div style="font-size:11px;color:#64748b;background:#f8fafc;padding:10px;border-radius:10px;">※戦車パーツ（主砲・装甲・エンジン）の装備・精錬機能は次期アップデートでここに解放されます！</div>`;
    box.innerHTML = html;
  } else if (bagSubTab === 'relic') {
    box.innerHTML = `<div style="font-size:12px;color:#64748b;text-align:center;padding:24px 12px;background:#f8fafc;border-radius:12px;">
      <b>🏺 アーティファクト保管庫</b><br><br>
      パーティ全員に効果を発揮するアーティファクト（開幕バリア等の固有スキル付き）は、次期アップデートでここに格納されます！
    </div>`;
  } else {
    const keyItems = Object.values(ITEM_MASTER).filter(it => it.cat === 'key');
    let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">`;
    keyItems.forEach(it => {
      const cnt = Number(materials?.[it.id] || 0);
      const rStyle = RARITY_STYLES[it.rarity] || RARITY_STYLES.N;
      html += `
        <div onclick="openItemDetailModal('item','${it.id}')" style="border:2px solid ${rStyle.border};background:${rStyle.bg};border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;opacity:${cnt > 0 ? 1 : 0.45};">
          <div style="display:flex;justify-content:center;margin-bottom:4px;">${renderItemVisual(it.id, 38, it.short, it.color)}</div>
          <div style="font-size:10px;font-weight:bold;color:#1e293b;">${it.name}</div>
          <div style="font-size:11px;font-weight:900;color:#0284c7;">×${cnt}</div>
        </div>
      `;
    });
    html += `</div>`;
    box.innerHTML = html;
  }
}
function developOrUpgradeRecipe(recipeId) {
  const rec = RECIPE_MASTER.find(r => r.id === recipeId);
  if (!rec) return;
  const curLv = Number(recipeLevels?.[recipeId] || 0);
  const mult = curLv + 1;

  for (const [itemId, baseNeed] of Object.entries(rec.ing)) {
    const need = baseNeed * mult;
    if ((Number(materials?.[itemId]) || 0) < need) {
      return alert(`食材が足りません！（${ITEM_MASTER[itemId]?.name} が ${need}個 必要）`);
    }
  }
  for (const [itemId, baseNeed] of Object.entries(rec.ing)) {
    materials[itemId] -= baseNeed * mult;
  }
  if (!recipeLevels || typeof recipeLevels !== 'object') recipeLevels = {};
  recipeLevels[recipeId] = curLv + 1;

  if (typeof renderCafe === 'function') renderCafe();
  if (typeof renderBag === 'function') renderBag();
  if (typeof updateUI === 'function') updateUI();
  if (typeof triggerAutoSave === 'function') triggerAutoSave(true);
  showToast(curLv === 0 ? `新メニュー「${rec.name}」を開発しました！` : `「${rec.name}」が Lv.${curLv + 1} に成長！`);
}

function renderTavernRecipesSection() {
  const host = document.getElementById('tavern-recipe-panel');
  if (!host) return;
  const bonus = getTavernRecipeBonus();
  let html = `
    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#5d4037;">
      <b>🍽️ 現在の料理バフ合計：</b>酒場売上 +${bonus.extraGps}G/秒 ｜ 攻撃+${bonus.atkPct}% ｜ HP+${bonus.hpPct}% ｜ 獲得G+${bonus.goldPct}% ｜ EXP+${bonus.expPct}%
    </div>
  `;
  if (!unlockedRecipes || unlockedRecipes.length === 0) {
    html += `<div style="font-size:11px;color:#94a3b8;text-align:center;padding:12px;">発見済みの料理レシピがありません。モンスターを野に還す（逃がす）と低確率でレシピをひらめきます！</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    unlockedRecipes.forEach(rid => {
      const rec = RECIPE_MASTER.find(r => r.id === rid);
      if (!rec) return;
      const lv = Number(recipeLevels?.[rid] || 0);
      const mult = lv + 1;
      const rStyle = RARITY_STYLES[rec.rarity] || RARITY_STYLES.N;
      let canMake = true;
      const ingHtml = Object.entries(rec.ing).map(([k, v]) => {
        const need = v * mult;
        const have = Number(materials?.[k] || 0);
        if (have < need) canMake = false;
        return `<span style="color:${have >= need ? '#16a34a' : '#dc2626'};font-weight:bold;">${ITEM_MASTER[k]?.name}(${have}/${need})</span>`;
      }).join('・');

      html += `
        <div style="border:2px solid ${rStyle.border};background:${rStyle.bg};border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:9px;">
          <div onclick="openItemDetailModal('recipe','${rec.id}')" style="cursor:pointer;">${renderItemVisual(rec.id, 42, '食', '#ff7043')}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:bold;color:#1e293b;">${rec.name} <span style="color:#ff7043;">Lv.${lv}</span></div>
            <div style="font-size:10px;color:#475569;">+${rec.baseGold}/秒・${rec.buffLabel}</div>
            <div style="font-size:10px;margin-top:2px;">必要: ${ingHtml}</div>
          </div>
          <button onclick="developOrUpgradeRecipe('${rec.id}')" style="padding:7px 10px;border-radius:9px;border:none;background:${canMake ? '#ff7043' : '#cbd5e1'};color:#ffffff;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">${lv === 0 ? '開発する' : 'LvUP'}</button>
        </div>
      `;
    });
    html += `</div>`;
  }
  host.innerHTML = html;
}

(function initInventoryAndTavernDOM() {
  function setup() {
    const nav = document.querySelector('.bottom-nav');
    if (nav && !document.getElementById('nav-bag-btn')) {
      nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.style.fontSize = '9.5px';
        btn.style.padding = '5px 1px';
        if (btn.textContent.includes('カフェ')) {
          btn.innerHTML = btn.innerHTML.replace('カフェ', '酒場');
        }
      });
      const shopBtn = Array.from(nav.querySelectorAll('.nav-item')).find(b => b.textContent.includes('ショップ'));
      const bagBtn = document.createElement('button');
      bagBtn.id = 'nav-bag-btn';
      bagBtn.className = 'nav-item';
      bagBtn.style.cssText = 'font-size:9.5px;padding:5px 1px;';
            bagBtn.innerHTML = '倉庫';
      bagBtn.onclick = function() { if (typeof switchTab === 'function') switchTab('bag', this); };
      if (shopBtn && shopBtn.nextSibling) {
        nav.insertBefore(bagBtn, shopBtn.nextSibling);
      } else {
        nav.appendChild(bagBtn);
      }
    }

    const main = document.querySelector('.main-content');
    if (main && !document.getElementById('tab-bag')) {
      const pane = document.createElement('div');
      pane.id = 'tab-bag';
      pane.className = 'tab-pane';
      pane.innerHTML = `
        <div class="card">
          <div class="card-title">🎒 冒険者の倉庫（スタック管理）</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:12px;">
            <button class="bag-sub-btn" onclick="switchBagSubTab('food',this)" style="padding:7px 2px;border-radius:8px;border:1.5px solid #ff7043;background:#ff7043;color:#ffffff;font-size:10.5px;font-weight:bold;cursor:pointer;">食材・レシピ</button>
            <button class="bag-sub-btn" onclick="switchBagSubTab('tank',this)" style="padding:7px 2px;border-radius:8px;border:1.5px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:10.5px;font-weight:bold;cursor:pointer;">戦車・素材</button>
            <button class="bag-sub-btn" onclick="switchBagSubTab('relic',this)" style="padding:7px 2px;border-radius:8px;border:1.5px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:10.5px;font-weight:bold;cursor:pointer;">アーティファクト</button>
            <button class="bag-sub-btn" onclick="switchBagSubTab('key',this)" style="padding:7px 2px;border-radius:8px;border:1.5px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:10.5px;font-weight:bold;cursor:pointer;">貴重品</button>
          </div>
          <div id="bag-content"></div>
        </div>
      `;
      main.appendChild(pane);
    }

    const cafePane = document.getElementById('tab-cafe');
    if (cafePane && !document.getElementById('tavern-recipe-card')) {
      const card = document.createElement('div');
      card.id = 'tavern-recipe-card';
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">🍺 名物料理・ドリンク開発</div>
        <div id="tavern-recipe-panel"></div>
      `;
      cafePane.appendChild(card);
    }

    if (!document.getElementById('item-detail-modal')) {
      const modal = document.createElement('div');
      modal.id = 'item-detail-modal';
      modal.onclick = closeItemDetailModal;
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.62);display:none;align-items:center;justify-content:center;z-index:9999;';
      document.body.appendChild(modal);
    }

    renderBag();
    renderTavernRecipesSection();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
// 旧HTMLインライン呼び出し互換＆バトル味方スキン同期パッチ
window.buyDecor = function() { if (typeof showToast === 'function') showToast('装飾ショップは廃止されました'); };
window.openSynthModal = function() { if (typeof openSynthesisModal === 'function') openSynthesisModal(); };
window.closeSynthModal = function() { if (typeof closeSynthesisModal === 'function') closeSynthesisModal(); };
window.selectMonster = function(idx) { if (typeof openMonsterModal === 'function') openMonsterModal(idx); };
window.showMonsterDetail = function(idx) { if (typeof openMonsterModal === 'function') openMonsterModal(idx); };

setInterval(() => {
  if (Array.isArray(battleAllies) && typeof getSpeciesDisplay === 'function' && typeof renderSprite === 'function') {
    for (let i = 0; i < 3; i++) {
      const a = battleAllies[i];
      const slot = document.getElementById(`ally-slot-${i}`);
      if (a && slot) {
        const spEl = slot.querySelector('.unit-sprite');
        if (spEl && spEl.textContent.trim() === '魔') {
          const disp = getSpeciesDisplay(a.name);
          a.disp = disp;
          spEl.innerHTML = renderSprite(disp, 46, '10px');
        }
      }
    }
  }
}, 500);
