const SKILL_DB = {
  'オクトパス': { name: '墨噴射', rate: 0.25, mult: 2.2, desc: '25%の確率で2.2倍ダメージを与え、敵をひるませる' },
  'シャーク': { name: 'ジョーズバイト', rate: 0.30, mult: 2.5, desc: '30%の確率で急所を噛み砕き2.5倍ダメージ' },
  'クラブ': { name: 'シザークラッシュ', rate: 0.25, mult: 2.0, desc: '25%の確率でハサミを叩きつけ2.0倍ダメージ' },
  'ハリセンボン': { name: 'ニードルバースト', rate: 0.35, mult: 1.8, desc: '35%の確率で無数の針を飛ばし1.8倍ダメージ' },
  'ダイオウイカ': { name: '深海の渦潮', rate: 0.20, mult: 3.2, desc: '20%の確率で巨大渦潮を起こし3.2倍ダメージ' },
  'ホエール': { name: 'タイダルウェーブ', rate: 0.20, mult: 3.5, desc: '20%の確率で大津波を発生させ3.5倍ダメージ' },
  'フォックス': { name: '狐火連舞', rate: 0.35, mult: 2.0, desc: '35%の確率で青い炎を放ち2.0倍ダメージ' },
  'ボア': { name: 'ワイルドタックル', rate: 0.25, mult: 2.6, desc: '25%の確率で全力突進し2.6倍ダメージ' },
  'リザード': { name: 'テイルウィップ', rate: 0.30, mult: 2.1, desc: '30%の確率で鋭い尾撃を放ち2.1倍ダメージ' },
  'オウル': { name: 'ナイトスナイプ', rate: 0.25, mult: 2.8, desc: '25%の確率で弱点を狙撃し2.8倍ダメージ' },
  'グリズリー': { name: 'メガトンナックル', rate: 0.20, mult: 3.3, desc: '20%の確率で大地を砕く3.3倍ダメージ' },
  'ワイバーン': { name: 'ドラゴンブレス', rate: 0.25, mult: 3.6, desc: '25%の確率で灼熱のブレスを吐き3.6倍ダメージ' }
};

const TRAIT_LIST = [
  { id: 'gold_up', name: '黄金の嗅覚', desc: 'バトル勝利時の獲得ゴールド +30%' },
  { id: 'sea_lord', name: '海洋の覇者', desc: '海エリアでの自身の攻撃力 +40%' },
  { id: 'land_lord', name: '大地の王者', desc: '陸エリアでの自身の攻撃力 +40%' },
  { id: 'cafe_star', name: '看板モンスター', desc: 'カフェ店員に配属すると売上 +35%' },
  { id: 'crit_master', name: '会心の極意', desc: 'スキル発動率 +10%' }
];

function getRandomTrait() {
  return TRAIT_LIST[Math.floor(Math.random() * TRAIT_LIST.length)];
}

function getMonsterSkill(name) {
  return SKILL_DB[name] || { name: '全力突撃', rate: 0.2, mult: 2.0, desc: '20%の確率で2.0倍ダメージ' };
}

function getMonsterTrait(traitId) {
  return TRAIT_LIST.find(t => t.id === traitId) || TRAIT_LIST[0];
}
