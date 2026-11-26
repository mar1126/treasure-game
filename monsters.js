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

function getElementMultiplier(atkElem, defElem) {
  if (!atkElem || atkElem === 'none' || !defElem || defElem === 'none') return 1.0;
  const defInfo = ELEMENTS[defElem];
  if (!defInfo) return 1.0;
  if (defInfo.weakTo === atkElem) return 1.5;
  if (defInfo.resistTo === atkElem) return 0.6;
  return 1.0;
}

const STAGE_DATA = [
  {
    stage: 1, name: '街周辺',
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
    stage: 2, name: '木漏れ日の森',
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
    stage: 3, name: '赤土の荒野',
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
    stage: 4, name: '潮風の浜辺',
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
    stage: 5, name: 'サンゴの砂浜',
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
STAGE_DATA.push(
  {
    stage: 6, name: '古びた石の遺跡',
    monsters: [
      { name: 'スケルトン', elem: 'dark', ct: 1.8, hp: 135, atk: 36, def: 9, inherit: 18, trait: 'first_edge', skill: 'cross_slash' },
      { name: 'ガーゴイル', elem: 'earth', ct: 2.1, hp: 162, atk: 34, def: 16, inherit: 19, trait: 'iron_guard', skill: 'rock_crush' },
      { name: 'ゴースト', elem: 'dark', ct: 1.7, hp: 124, atk: 39, def: 8, inherit: 18, trait: 'agility', skill: 'shadow_wave' },
      { name: '遺跡の探索者', elem: 'earth', ct: 1.7, hp: 138, atk: 38, def: 10, inherit: 20, trait: 'fortune', skill: 'double_strike' },
      { name: 'リビングアーマー', elem: 'light', ct: 2.3, hp: 175, atk: 35, def: 18, inherit: 20, trait: 'iron_guard', skill: 'holy_shield_bash' },
      { name: 'スペルキャスター', elem: 'fire', ct: 2.0, hp: 126, atk: 44, def: 8, inherit: 20, trait: 'skill_mastery', skill: 'blaze_nova' },
      { name: 'ミミック', elem: 'dark', ct: 1.9, hp: 150, atk: 41, def: 13, inherit: 19, trait: 'drain_soul', skill: 'shadow_bite' },
      { name: 'ミノタウロス', elem: 'earth', ct: 2.2, hp: 182, atk: 45, def: 12, inherit: 21, trait: 'guts', skill: 'earth_quake' },
      { name: 'リッチ', elem: 'dark', ct: 2.0, hp: 140, atk: 48, def: 9, inherit: 22, trait: 'dark_soul', skill: 'abyss_orb' },
      { name: '古代の守護巨像', elem: 'light', ct: 2.6, hp: 215, atk: 44, def: 20, inherit: 23, trait: 'vitality', skill: 'holy_beam' }
    ]
  },
  {
    stage: 7, name: '白銀の雪原',
    monsters: [
      { name: 'フロストスライム', elem: 'water', ct: 1.8, hp: 155, atk: 42, def: 12, inherit: 19, trait: 'vitality', skill: 'water_pulse' },
      { name: 'アイスウルフ', elem: 'water', ct: 1.6, hp: 150, atk: 47, def: 10, inherit: 20, trait: 'agility', skill: 'aqua_thrust' },
      { name: '雪原の狩人', elem: 'sky', ct: 1.6, hp: 148, atk: 49, def: 10, inherit: 21, trait: 'focus', skill: 'sky_volley' },
      { name: 'イエティ', elem: 'earth', ct: 2.3, hp: 198, atk: 48, def: 15, inherit: 21, trait: 'guts', skill: 'heavy_blow' },
      { name: '氷の精霊', elem: 'water', ct: 1.8, hp: 145, atk: 51, def: 10, inherit: 20, trait: 'water_soul', skill: 'grand_deluge' },
      { name: '白銀の剣士', elem: 'light', ct: 1.7, hp: 165, atk: 52, def: 13, inherit: 22, trait: 'valor', skill: 'light_slash' },
      { name: 'フロストワイバーン', elem: 'sky', ct: 1.9, hp: 176, atk: 54, def: 13, inherit: 22, trait: 'sky_soul', skill: 'gale_storm' },
      { name: '氷結の魔女', elem: 'water', ct: 2.0, hp: 152, atk: 57, def: 10, inherit: 22, trait: 'skill_mastery', skill: 'tidal_wave' },
      { name: 'フェンリル', elem: 'dark', ct: 1.6, hp: 172, atk: 59, def: 12, inherit: 23, trait: 'first_edge', skill: 'shadow_fang' },
      { name: 'フロストドラゴン', elem: 'water', ct: 2.2, hp: 225, atk: 58, def: 18, inherit: 24, trait: 'water_soul', skill: 'grand_deluge' }
    ]
  },
  {
    stage: 8, name: '灼熱の砂漠',
    monsters: [
      { name: 'サンドワーム', elem: 'earth', ct: 2.2, hp: 195, atk: 54, def: 16, inherit: 20, trait: 'earth_soul', skill: 'earth_quake' },
      { name: 'ファイアスピリット', elem: 'fire', ct: 1.7, hp: 162, atk: 60, def: 11, inherit: 21, trait: 'fire_soul', skill: 'flame_breath' },
      { name: '砂漠の踊り子', elem: 'sky', ct: 1.5, hp: 158, atk: 62, def: 11, inherit: 22, trait: 'agility', skill: 'aero_cutter' },
      { name: 'マミー', elem: 'dark', ct: 2.1, hp: 188, atk: 58, def: 15, inherit: 20, trait: 'drain_soul', skill: 'dark_mist' },
      { name: 'アヌビス戦士', elem: 'dark', ct: 1.8, hp: 185, atk: 65, def: 14, inherit: 22, trait: 'dark_soul', skill: 'shadow_wave' },
      { name: '炎の剣闘士', elem: 'fire', ct: 1.7, hp: 192, atk: 67, def: 15, inherit: 23, trait: 'valor', skill: 'flame_slash' },
      { name: 'キマイラ', elem: 'fire', ct: 1.9, hp: 205, atk: 68, def: 15, inherit: 23, trait: 'guts', skill: 'blaze_nova' },
      { name: '太陽の巫女', elem: 'light', ct: 1.9, hp: 172, atk: 69, def: 13, inherit: 23, trait: 'light_soul', skill: 'holy_beam' },
      { name: 'イフリート', elem: 'fire', ct: 2.0, hp: 215, atk: 73, def: 16, inherit: 24, trait: 'fire_soul', skill: 'meteor_flame' },
      { name: 'スフィンクス', elem: 'light', ct: 2.2, hp: 248, atk: 72, def: 20, inherit: 25, trait: 'wisdom', skill: 'radiant_burst' }
    ]
  },
  {
    stage: 9, name: '霧の渓谷',
    monsters: [
      { name: 'ワイバーン', elem: 'sky', ct: 1.7, hp: 210, atk: 74, def: 16, inherit: 22, trait: 'sky_soul', skill: 'sky_dive', img: '/images/mon_wyvern.png' },
      { name: 'デュラハン', elem: 'dark', ct: 1.9, hp: 228, atk: 76, def: 19, inherit: 23, trait: 'iron_guard', skill: 'shadow_wave' },
      { name: '風読みの賢者', elem: 'sky', ct: 1.8, hp: 192, atk: 80, def: 14, inherit: 24, trait: 'skill_mastery', skill: 'tempest_wing' },
      { name: 'ベヒーモス', elem: 'earth', ct: 2.4, hp: 275, atk: 78, def: 23, inherit: 24, trait: 'vitality', skill: 'earth_quake' },
      { name: 'ヴァルキリー', elem: 'light', ct: 1.6, hp: 216, atk: 82, def: 17, inherit: 25, trait: 'first_edge', skill: 'light_slash' },
      { name: 'シャドウナイト', elem: 'dark', ct: 1.8, hp: 224, atk: 84, def: 18, inherit: 24, trait: 'dark_soul', skill: 'abyss_orb' },
      { name: 'サンダーバード', elem: 'sky', ct: 1.5, hp: 204, atk: 86, def: 15, inherit: 24, trait: 'agility', skill: 'tempest_wing' },
      { name: '竜騎士', elem: 'fire', ct: 1.7, hp: 235, atk: 88, def: 19, inherit: 25, trait: 'valor', skill: 'meteor_flame' },
      { name: 'ヒュドラ', elem: 'water', ct: 2.1, hp: 268, atk: 86, def: 20, inherit: 25, trait: 'drain_soul', skill: 'grand_deluge' },
      { name: 'ストームドラゴン', elem: 'sky', ct: 2.0, hp: 285, atk: 92, def: 22, inherit: 26, trait: 'sky_soul', skill: 'tempest_wing' }
    ]
  },
  {
    stage: 10, name: '王都の古代神殿',
    monsters: [
      { name: 'テンプルナイト', elem: 'light', ct: 1.8, hp: 255, atk: 92, def: 22, inherit: 24, trait: 'iron_guard', skill: 'light_slash' },
      { name: 'アークメイジ', elem: 'fire', ct: 1.9, hp: 225, atk: 98, def: 17, inherit: 25, trait: 'skill_mastery', skill: 'meteor_flame' },
      { name: 'ケルベロス', elem: 'fire', ct: 1.6, hp: 248, atk: 100, def: 19, inherit: 25, trait: 'fire_soul', skill: 'blaze_nova' },
      { name: 'エンジェル', elem: 'light', ct: 1.7, hp: 238, atk: 99, def: 19, inherit: 26, trait: 'light_soul', skill: 'radiant_burst' },
      { name: 'デーモンロード', elem: 'dark', ct: 1.8, hp: 262, atk: 104, def: 20, inherit: 26, trait: 'dark_soul', skill: 'abyss_orb' },
      { name: '神殿の聖女', elem: 'light', ct: 1.8, hp: 230, atk: 102, def: 18, inherit: 26, trait: 'drain_soul', skill: 'holy_beam' },
      { name: 'アースドラゴン', elem: 'earth', ct: 2.2, hp: 310, atk: 102, def: 26, inherit: 27, trait: 'earth_soul', skill: 'earth_quake' },
      { name: 'フェニックス', elem: 'fire', ct: 1.6, hp: 252, atk: 108, def: 19, inherit: 27, trait: 'guts', skill: 'meteor_flame' },
      { name: '近衛騎士団長', elem: 'light', ct: 1.7, hp: 280, atk: 110, def: 24, inherit: 28, trait: 'valor', skill: 'radiant_burst' },
      { name: 'エンシェントドラゴン', elem: 'light', ct: 2.0, hp: 340, atk: 118, def: 28, inherit: 30, trait: 'light_soul', skill: 'radiant_burst' }
    ]
  }
);

const ALL_MONSTER_SPECIES = [];
const STAGE_MONSTERS = {};

STAGE_DATA.forEach(stObj => {
  const list = stObj.monsters.map((m, idx) => ({
    id: `s${stObj.stage}_${idx}`,
    stage: stObj.stage,
    idx,
    name: m.name,
    elem: m.elem || 'none',
    ct: m.ct,
    baseHp: m.hp,
    baseAtk: m.atk,
    baseDef: m.def,
    inheritRate: m.inherit,
    innateTrait: m.trait,
    innateSkill: m.skill,
    imgFile: m.img || null
  }));
  STAGE_MONSTERS[stObj.stage] = list;
  ALL_MONSTER_SPECIES.push(...list);
});
