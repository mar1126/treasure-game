// 全10ステージ・王道ファンタジー100種＆属性・配合法則 (monsters.js)
const ELEMENTS = {
  fire:  { id: 'fire',  name: '火', color: '#e53935', bg: '#ffebee', weakTo: 'water', resistTo: 'fire' },
  water: { id: 'water', name: '水', color: '#1e88e5', bg: '#e3f2fd', weakTo: 'earth', resistTo: 'water' },
  earth: { id: 'earth', name: '地', color: '#8d6e63', bg: '#efebe9', weakTo: 'sky',   resistTo: 'earth' },
  sky:   { id: 'sky',   name: '空', color: '#00acc1', bg: '#e0f7fa', weakTo: 'fire',  resistTo: 'sky' },
  dark:  { id: 'dark',  name: '闇', color: '#6a1b9a', bg: '#f3e5f5', weakTo: 'light', resistTo: 'dark' },
  light: { id: 'light', name: '光', color: '#f9a825', bg: '#fffde7', weakTo: 'dark',  resistTo: 'light' },
  none:  { id: 'none',  name: '無', color: '#546e7a', bg: '#eceff1', weakTo: null,    resistTo: null }
};

function getElementInfo(elemId) {
  return ELEMENTS[elemId] || ELEMENTS.none;
}

// 属性相性倍率（攻撃属性 vs 防御側属性）
function getElementMultiplier(atkElem, defElem) {
  if (!atkElem || atkElem === 'none' || !defElem || defElem === 'none') return 1.0;
  const defInfo = ELEMENTS[defElem];
  if (!defInfo) return 1.0;
  if (defInfo.weakTo === atkElem) return 1.5;   // 弱点（1.5倍）
  if (defInfo.resistTo === atkElem) return 0.6; // 耐性（0.6倍）
  return 1.0;
}

const STAGE_DATA = [
  {
    stage: 1, name: '緑の草原', vehicleType: 'land',
    monsters: [
      { name: 'スライム', elem: 'water', ct: 1.8, hp: 58, atk: 10, def: 3, inherit: 14, trait: 'wisdom', skill: 'tackle', img: '/images/mon_slime.png' },
      { name: 'プチバット', elem: 'sky', ct: 1.5, hp: 52, atk: 11, def: 2, inherit: 13, trait: 'agility', skill: 'wind_slash' },
      { name: 'マンドラゴラ', elem: 'earth', ct: 1.9, hp: 62, atk: 11, def: 4, inherit: 14, trait: 'vitality', skill: 'earth_spike' },
      { name: 'フォレストウルフ', elem: 'earth', ct: 1.7, hp: 66, atk: 13, def: 4, inherit: 15, trait: 'valor', skill: 'double_strike', img: '/images/mon_fox.png' },
      { name: 'ゴブリン', elem: 'earth', ct: 1.9, hp: 68, atk: 13, def: 4, inherit: 15, trait: 'fortune', skill: 'heavy_blow' },
      { name: 'コボルト', elem: 'fire', ct: 1.8, hp: 65, atk: 14, def: 4, inherit: 15, trait: 'first_edge', skill: 'fire_fang' },
      { name: 'ウィスプ', elem: 'light', ct: 1.6, hp: 56, atk: 14, def: 3, inherit: 14, trait: 'focus', skill: 'light_ray' },
      { name: 'シャドウラット', elem: 'dark', ct: 1.6, hp: 60, atk: 13, def: 3, inherit: 14, trait: 'drain_soul', skill: 'shadow_bite' },
      { name: 'ゴブリン弓兵', elem: 'sky', ct: 1.8, hp: 64, atk: 15, def: 4, inherit: 16, trait: 'skill_mastery', skill: 'gale_arrow' },
      { name: 'ホブゴブリン', elem: 'fire', ct: 2.0, hp: 82, atk: 16, def: 6, inherit: 17, trait: 'valor', skill: 'flame_slash' }
    ]
  },
  {
    stage: 2, name: '木漏れ日の森', vehicleType: 'land',
    monsters: [
      { name: 'ポイズンマッシュ', elem: 'dark', ct: 2.2, hp: 84, atk: 13, def: 8, inherit: 15, trait: 'iron_guard', skill: 'dark_mist' },
      { name: 'シルフ', elem: 'sky', ct: 1.5, hp: 68, atk: 16, def: 4, inherit: 16, trait: 'agility', skill: 'aero_cutter', img: '/images/mon_owl.png' },
      { name: 'リザードマン', elem: 'water', ct: 1.9, hp: 82, atk: 17, def: 6, inherit: 16, trait: 'valor', skill: 'aqua_thrust', img: '/images/mon_lizard.png' },
      { name: '見習い剣士', elem: 'light', ct: 1.7, hp: 84, atk: 18, def: 6, inherit: 18, trait: 'first_edge', skill: 'cross_slash' },
      { name: 'エルフの弓使い', elem: 'sky', ct: 1.6, hp: 76, atk: 20, def: 5, inherit: 18, trait: 'focus', skill: 'sky_volley' },
      { name: '森の魔術師', elem: 'fire', ct: 2.0, hp: 74, atk: 21, def: 4, inherit: 17, trait: 'skill_mastery', skill: 'fire_ball' },
      { name: 'アラクネ', elem: 'dark', ct: 1.8, hp: 80, atk: 19, def: 6, inherit: 16, trait: 'drain_soul', skill: 'shadow_fang' },
      { name: 'トレント', elem: 'earth', ct: 2.5, hp: 112, atk: 16, def: 11, inherit: 19, trait: 'iron_guard', skill: 'rock_crush' },
      { name: 'ワーウルフ', elem: 'dark', ct: 1.7, hp: 92, atk: 22, def: 6, inherit: 18, trait: 'guts', skill: 'double_strike' },
      { name: 'フォレストベア', elem: 'earth', ct: 2.3, hp: 110, atk: 23, def: 8, inherit: 19, trait: 'vitality', skill: 'earth_quake', img: '/images/mon_grizzly.png' }
    ]
  },
  {
    stage: 3, name: '赤土の荒野', vehicleType: 'land',
    monsters: [
      { name: 'ロックゴーレム', elem: 'earth', ct: 2.6, hp: 128, atk: 19, def: 14, inherit: 18, trait: 'iron_guard', skill: 'rock_crush' },
      { name: 'ハーピー', elem: 'sky', ct: 1.5, hp: 86, atk: 23, def: 5, inherit: 17, trait: 'agility', skill: 'gale_storm' },
      { name: 'オーク戦士', elem: 'earth', ct: 2.1, hp: 114, atk: 24, def: 8, inherit: 18, trait: 'valor', skill: 'heavy_blow' },
      { name: 'サラマンダー', elem: 'fire', ct: 1.8, hp: 98, atk: 26, def: 7, inherit: 18, trait: 'fire_soul', skill: 'flame_breath' },
      { name: '荒野の盗賊', elem: 'dark', ct: 1.6, hp: 92, atk: 25, def: 6, inherit: 17, trait: 'fortune', skill: 'double_strike' },
      { name: 'フレイムメイジ', elem: 'fire', ct: 2.0, hp: 88, atk: 28, def: 5, inherit: 18, trait: 'skill_mastery', skill: 'blaze_nova' },
      { name: 'デススコーピオン', elem: 'dark', ct: 1.8, hp: 96, atk: 26, def: 7, inherit: 17, trait: 'focus', skill: 'shadow_fang' },
      { name: 'グリフォン', elem: 'sky', ct: 1.7, hp: 108, atk: 28, def: 8, inherit: 20, trait: 'first_edge', skill: 'sky_dive' },
      { name: '重装歩兵', elem: 'light', ct: 2.3, hp: 130, atk: 24, def: 13, inherit: 19, trait: 'iron_guard', skill: 'holy_shield_bash' },
      { name: 'マンティコア', elem: 'fire', ct: 1.9, hp: 122, atk: 30, def: 8, inherit: 20, trait: 'guts', skill: 'flame_slash' }
    ]
  },
  {
    stage: 4, name: '潮風の入江', vehicleType: 'sea',
    monsters: [
      { name: 'アクアスライム', elem: 'water', ct: 1.8, hp: 105, atk: 22, def: 7, inherit: 16, trait: 'vitality', skill: 'water_pulse' },
      { name: 'シーサーペント', elem: 'water', ct: 1.9, hp: 116, atk: 25, def: 8, inherit: 17, trait: 'water_soul', skill: 'aqua_thrust' },
      { name: 'マーマン兵士', elem: 'water', ct: 1.8, hp: 118, atk: 27, def: 8, inherit: 18, trait: 'valor', skill: 'trident_wave' },
      { name: 'セイレーン', elem: 'sky', ct: 1.7, hp: 104, atk: 28, def: 7, inherit: 19, trait: 'drain_soul', skill: 'aero_cutter' },
      { name: '海賊剣士', elem: 'water', ct: 1.7, hp: 114, atk: 29, def: 8, inherit: 18, trait: 'fortune', skill: 'cross_slash' },
      { name: 'ストームバード', elem: 'sky', ct: 1.5, hp: 100, atk: 30, def: 6, inherit: 18, trait: 'agility', skill: 'gale_storm' },
      { name: 'ディープクラゲ', elem: 'dark', ct: 2.0, hp: 108, atk: 29, def: 7, inherit: 17, trait: 'skill_mastery', skill: 'dark_mist' },
      { name: 'クラブナイト', elem: 'earth', ct: 2.4, hp: 142, atk: 26, def: 15, inherit: 19, trait: 'iron_guard', skill: 'rock_crush', img: '/images/mon_crab.png' },
      { name: '海賊砲撃手', elem: 'fire', ct: 2.2, hp: 116, atk: 33, def: 7, inherit: 19, trait: 'focus', skill: 'blaze_nova' },
      { name: 'クラーケン', elem: 'water', ct: 2.1, hp: 148, atk: 32, def: 10, inherit: 20, trait: 'water_soul', skill: 'tidal_wave', img: '/images/mon_octopus.png' }
    ]
  },
  {
    stage: 5, name: 'サンゴの浅瀬', vehicleType: 'sea',
    monsters: [
      { name: 'コーラルゴーレム', elem: 'earth', ct: 2.5, hp: 158, atk: 28, def: 16, inherit: 19, trait: 'iron_guard', skill: 'earth_quake' },
      { name: 'ウンディーネ', elem: 'water', ct: 1.7, hp: 120, atk: 34, def: 8, inherit: 20, trait: 'water_soul', skill: 'water_pulse' },
      { name: '人魚の巫女', elem: 'light', ct: 1.9, hp: 118, atk: 33, def: 8, inherit: 20, trait: 'drain_soul', skill: 'holy_beam' },
      { name: 'アビスシャーク', elem: 'water', ct: 1.7, hp: 138, atk: 38, def: 8, inherit: 20, trait: 'valor', skill: 'aqua_thrust', img: '/images/mon_shark.png' },
      { name: '水棲の聖騎士', elem: 'light', ct: 1.9, hp: 146, atk: 35, def: 12, inherit: 21, trait: 'light_soul', skill: 'light_slash' },
      { name: 'テンペストレイ', elem: 'sky', ct: 1.6, hp: 126, atk: 37, def: 8, inherit: 19, trait: 'agility', skill: 'gale_storm' },
      { name: 'ダークスクイド', elem: 'dark', ct: 1.9, hp: 134, atk: 39, def: 9, inherit: 20, trait: 'dark_soul', skill: 'shadow_wave', img: '/images/mon_squid.png' },
      { name: 'シードラゴン', elem: 'water', ct: 2.0, hp: 154, atk: 40, def: 11, inherit: 21, trait: 'skill_mastery', skill: 'tidal_wave' },
      { name: '深海の魔導士', elem: 'dark', ct: 2.0, hp: 128, atk: 42, def: 8, inherit: 21, trait: 'focus', skill: 'abyss_orb' },
      { name: 'リヴァイアサン', elem: 'water', ct: 2.3, hp: 185, atk: 42, def: 14, inherit: 23, trait: 'water_soul', skill: 'grand_deluge', img: '/images/mon_whale.png' }
    ]
  }
];
