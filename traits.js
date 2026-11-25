// 戦闘特化型・特性マスターデータ (traits.js) - 複数所持で全効果重複！
const MONSTER_TRAITS = [
  { id: 'atk_up_1', name: '⚔️ 闘争本能', desc: '自身の攻撃力+18%', stat: 'atk', val: 0.18 },
  { id: 'atk_up_2', name: '🔥 猛攻の心得', desc: '自身の攻撃力+25%', stat: 'atk', val: 0.25 },
  { id: 'hp_up_1', name: '💚 生命の輝き', desc: '自身の最大HP+22%', stat: 'hp', val: 0.22 },
  { id: 'hp_up_2', name: '💖 不屈の肉体', desc: '自身の最大HP+30%', stat: 'hp', val: 0.30 },
  { id: 'def_up_1', name: '🛡️ 鉄壁の守り', desc: '自身の防御力+25%', stat: 'def', val: 0.25 },
  { id: 'spd_up_1', name: '⚡ 神速の反射', desc: '攻撃クールタイム12%短縮', stat: 'ct', val: 0.12 },
  { id: 'crit_rate', name: '🎯 急所狙い', desc: 'スキル発動率+10%', stat: 'rate', val: 0.10 },
  { id: 'skill_dmg', name: '💥 技の極意', desc: 'スキルダメージ倍率+25%', stat: 'skillMult', val: 0.25 },
  { id: 'sea_lord', name: '🌊 海の覇者', desc: '海域バトル時、攻撃力+35%', stat: 'seaAtk', val: 0.35 },
  { id: 'land_lord', name: '🌲 陸の覇者', desc: '陸地バトル時、攻撃力+35%', stat: 'landAtk', val: 0.35 },
  { id: 'lifesteal', name: '🩸 吸血の牙', desc: '攻撃時に与ダメージの12%HP回復', stat: 'heal', val: 0.12 },
  { id: 'exp_up', name: '📘 学習上手', desc: '獲得経験値+20%', stat: 'exp', val: 0.20 },
  { id: 'gold_up', name: '💰 黄金の嗅覚', desc: '獲得ゴールド+20%', stat: 'gold', val: 0.20 }
];

function getMonsterTrait(traitId) {
  return MONSTER_TRAITS.find(t => t.id === traitId) || MONSTER_TRAITS[0];
}

// 種族ごとに決まった初期特性を返す
function getSpeciesInnateTraitId(speciesName) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(speciesName) : { idx: 0, type: 'land' };
  const table = ['atk_up_1', 'hp_up_1', 'spd_up_1', 'def_up_1', 'crit_rate', 'lifesteal', 'hp_up_2', 'skill_dmg', 'atk_up_2', sp.type === 'sea' ? 'sea_lord' : 'land_lord'];
  return table[sp.idx % table.length];
}
