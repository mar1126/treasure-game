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
  // 食材 (category: 'food')
  slime_jelly:   { id: 'slime_jelly',   name: 'ぷるぷるゼリー', cat: 'food', rarity: 'N',  short: 'ゼ', color: '#29b6f6', desc: 'スライムから採れる透き通った甘いゼリー。酒場の定番スイーツの材料になる。' },
  wild_herb:     { id: 'wild_herb',     name: '香り薬草',       cat: 'food', rarity: 'N',  short: '草', color: '#66bb6a', desc: '草原に自生する香り高いハーブ。料理の風味を引き立て、冒険者の疲れを癒やす。' },
  forest_berry:  { id: 'forest_berry',  name: '森のベリー',     cat: 'food', rarity: 'R',  short: '苺', color: '#ec407a', desc: '深緑の森で採れる甘酸っぱい果実。高級タルトや果実酒に欠かせない食材。' },
  royal_honey:   { id: 'royal_honey',   name: '黄金ハチミツ',   cat: 'food', rarity: 'R',  short: '蜜', color: '#ffca28', desc: '森の奥で採れる濃厚な黄金の蜂蜜。料理に加えると酒場の売上が大きく跳ね上がる。' },
  ancient_spice: { id: 'ancient_spice', name: '古代スパイス',   cat: 'food', rarity: 'SR', short: '香', color: '#ff7043', desc: '古代遺跡の壺に眠っていた秘伝の香辛料。一口で活力が湧き上がる幻の調味料。' },
  dragon_meat:   { id: 'dragon_meat',   name: '霜降り竜肉',     cat: 'food', rarity: 'UR', short: '肉', color: '#ef5350', desc: '竜族から稀に得られる最高級の霜降り肉。王侯貴族も憧れる伝説のメイン食材。' },

  // 戦車・強化素材 (category: 'tank')
  iron_scrap:    { id: 'iron_scrap',    name: '鉄くず',         cat: 'tank', rarity: 'N',  short: '鉄', color: '#78909c', desc: '魔物の装備や遺跡から回収された鉄の破片。戦車パーツの修理や基礎強化に使う。' },
  magic_gear:    { id: 'magic_gear',    name: '魔導歯車',       cat: 'tank', rarity: 'R',  short: '歯', color: '#42a5f5', desc: '魔力を帯びて回転し続ける精密な歯車。戦車の装填速度や機関強化に必須の部品。' },
  mithril_ingot: { id: 'mithril_ingot', name: 'ミスリル鋼',     cat: 'tank', rarity: 'SR', short: '鋼', color: '#26c6da', desc: '軽くて強靭な銀色の魔法金属。高ランクの戦車装甲や主砲の精錬に用いられる。' },
  dragon_core:   { id: 'dragon_core',   name: '竜の炉心',       cat: 'tank', rarity: 'UR', short: '炉', color: '#ab47bc', desc: '莫大な熱量を秘めた古代竜の核。最強クラスの戦車兵器を生み出す超希少素材。' },

  // 貴重品 (category: 'key')
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
