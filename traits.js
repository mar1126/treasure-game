// モンスター個体特性マスターデータ (traits.js)
const MONSTER_TRAITS = [
  { id: 'sea_lord', name: '🌊 海の覇者', desc: '海洋バトル時、自身の攻撃力+40%' },
  { id: 'land_lord', name: '🌲 陸の覇者', desc: '陸上バトル時、自身の攻撃力+40%' },
  { id: 'crit_master', name: '⚡ 会心の達人', desc: '固有スキルの発動率+10%' },
  { id: 'gold_up', name: '💰 トレジャーハンター', desc: 'バトル勝利時の獲得ゴールド+30%' },
  { id: 'cafe_star', name: '🍰 看板スタッフ', desc: 'カフェ店員に配属時、店舗売上+35%' }
];

function getRandomTrait() {
  const idx = Math.floor(Math.random() * MONSTER_TRAITS.length);
  return MONSTER_TRAITS.slice(idx, idx + 1).pop() || MONSTER_TRAITS.slice(0, 1).pop();
}

function getMonsterTrait(traitId) {
  return MONSTER_TRAITS.find(t => t.id === traitId) || MONSTER_TRAITS.slice(0, 1).pop();
}
