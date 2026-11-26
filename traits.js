// 王道ファンタジー戦闘特性マスター (traits.js) - 複数所持で重複適用（上限キャップあり）
const MONSTER_TRAITS = [
  { id: 'valor',         name: '戦士の心得',     desc: '攻撃力が15%上昇する',             stat: 'atk',       val: 0.15 },
  { id: 'vitality',      name: '生命の息吹',     desc: '最大HPが18%上昇する',             stat: 'hp',        val: 0.18 },
  { id: 'iron_guard',    name: '鉄壁の構え',     desc: '防御力が20%上昇する',             stat: 'def',       val: 0.20 },
  { id: 'agility',       name: '疾風の身のこなし', desc: '行動間隔（CT）が10%短縮される',   stat: 'ct',        val: 0.10 },
  { id: 'focus',         name: '急所見切り',     desc: 'スキル発動率が8%上昇する',        stat: 'rate',      val: 0.08 },
  { id: 'skill_mastery', name: '技の熟練',       desc: 'スキル威力が18%上昇する',         stat: 'skillMult', val: 0.18 },
  { id: 'first_edge',    name: '先制の構え',     desc: '戦闘開始時のCTゲージが40%溜まる', stat: 'initCt',    val: 0.40 },
  { id: 'guts',          name: '逆境の底力',     desc: 'HP50%以下で攻撃力が28%上昇する',  stat: 'lowHpAtk',  val: 0.28 },
  { id: 'drain_soul',    name: '生命吸収',       desc: '攻撃時に与ダメージの10%HP回復',   stat: 'heal',      val: 0.10 },
  { id: 'fire_soul',     name: '火の加護',       desc: '火属性スキルの威力が22%上昇する', stat: 'elem_fire', val: 0.22 },
  { id: 'water_soul',    name: '水の加護',       desc: '水属性スキルの威力が22%上昇する', stat: 'elem_water',val: 0.22 },
  { id: 'earth_soul',    name: '地の加護',       desc: '地属性スキルの威力が22%上昇する', stat: 'elem_earth',val: 0.22 },
  { id: 'sky_soul',      name: '空の加護',       desc: '空属性スキルの威力が22%上昇する', stat: 'elem_sky',  val: 0.22 },
  { id: 'dark_soul',     name: '闇の加護',       desc: '闇属性スキルの威力が22%上昇する', stat: 'elem_dark', val: 0.22 },
  { id: 'light_soul',    name: '光の加護',       desc: '光属性スキルの威力が22%上昇する', stat: 'elem_light',val: 0.22 },
  { id: 'wisdom',        name: '早熟の知恵',     desc: '獲得経験値が18%増加する',         stat: 'exp',       val: 0.18 },
  { id: 'fortune',       name: 'トレジャーハント', desc: '獲得ゴールドが18%増加する',       stat: 'gold',      val: 0.18 }
];

function getMonsterTrait(traitId) {
  return MONSTER_TRAITS.find(t => t.id === traitId) || MONSTER_TRAITS[0];
}

function getSpeciesInnateTraitId(speciesName) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(speciesName) : null;
  if (sp && sp.innateTrait) return sp.innateTrait;
  return 'valor';
}
