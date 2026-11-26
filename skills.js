// 無属性＆6属性 戦闘スキルマスター (skills.js) - 1回の攻撃で最大1つ発動
const MONSTER_SKILLS = [
  // 無属性スキル
  { id: 'tackle',           name: '体当たり',       elem: 'none',  mult: 1.55, rate: 0.30, aoe: false, desc: '無属性の1.55倍単体攻撃' },
  { id: 'double_strike',    name: '二連撃',         elem: 'none',  mult: 1.85, rate: 0.25, aoe: false, desc: '無属性の1.85倍素早い連撃' },
  { id: 'heavy_blow',       name: '強打',           elem: 'none',  mult: 2.00, rate: 0.22, aoe: false, desc: '無属性の2.0倍重撃' },
  { id: 'cross_slash',      name: '十字斬り',       elem: 'none',  mult: 2.15, rate: 0.20, aoe: false, desc: '無属性の2.15倍斬撃' },
  { id: 'howl_slash',       name: '回転なぎ払い',   elem: 'none',  mult: 1.35, rate: 0.24, aoe: true,  desc: '敵全体に無属性の1.35倍攻撃' },

  // 火属性スキル（空に強く、水に弱い）
  { id: 'fire_fang',        name: '火炎の牙',       elem: 'fire',  mult: 1.70, rate: 0.28, aoe: false, desc: '火属性の1.7倍単体攻撃' },
  { id: 'fire_ball',        name: '火球',           elem: 'fire',  mult: 1.95, rate: 0.24, aoe: false, desc: '火属性の1.95倍魔法攻撃' },
  { id: 'flame_slash',      name: '紅蓮斬り',       elem: 'fire',  mult: 2.15, rate: 0.21, aoe: false, desc: '火属性の2.15倍斬撃' },
  { id: 'flame_breath',     name: '火炎の息',       elem: 'fire',  mult: 1.40, rate: 0.24, aoe: true,  desc: '敵全体に火属性の1.4倍ブレス' },
  { id: 'blaze_nova',       name: '業火の渦',       elem: 'fire',  mult: 1.60, rate: 0.20, aoe: true,  desc: '敵全体に火属性の1.6倍魔法' },
  { id: 'meteor_flame',     name: '紅蓮の流星',     elem: 'fire',  mult: 2.45, rate: 0.17, aoe: false, desc: '火属性の2.45倍大魔法' },

  // 水属性スキル（火に強く、地に弱い）
  { id: 'water_pulse',      name: '水流弾',         elem: 'water', mult: 1.70, rate: 0.28, aoe: false, desc: '水属性の1.7倍単体攻撃' },
  { id: 'aqua_thrust',      name: '水穿突き',       elem: 'water', mult: 1.95, rate: 0.24, aoe: false, desc: '水属性の1.95倍突き攻撃' },
  { id: 'trident_wave',     name: '激流槍',         elem: 'water', mult: 2.15, rate: 0.21, aoe: false, desc: '水属性の2.15倍連突き' },
  { id: 'tidal_wave',       name: '大津波',         elem: 'water', mult: 1.50, rate: 0.22, aoe: true,  desc: '敵全体に水属性の1.5倍攻撃' },
  { id: 'grand_deluge',     name: '大海嘯',         elem: 'water', mult: 1.75, rate: 0.18, aoe: true,  desc: '敵全体に水属性の1.75倍大魔法' },

  // 地属性スキル（水に強く、空に弱い）
  { id: 'earth_spike',      name: '岩槍',           elem: 'earth', mult: 1.70, rate: 0.28, aoe: false, desc: '地属性の1.7倍単体攻撃' },
  { id: 'rock_crush',       name: '岩砕き',         elem: 'earth', mult: 2.00, rate: 0.24, aoe: false, desc: '地属性の2.0倍重撃' },
  { id: 'earth_quake',      name: '地響き',         elem: 'earth', mult: 1.55, rate: 0.22, aoe: true,  desc: '敵全体に地属性の1.55倍攻撃' },

  // 空属性スキル（地に強く、火に弱い）
  { id: 'wind_slash',       name: '風切り',         elem: 'sky',   mult: 1.65, rate: 0.29, aoe: false, desc: '空属性の1.65倍素早い攻撃' },
  { id: 'gale_arrow',       name: '疾風矢',         elem: 'sky',   mult: 1.90, rate: 0.25, aoe: false, desc: '空属性の1.9倍射撃' },
  { id: 'aero_cutter',      name: '真空刃',         elem: 'sky',   mult: 2.10, rate: 0.22, aoe: false, desc: '空属性の2.1倍斬撃' },
  { id: 'sky_dive',         name: '急降下撃',       elem: 'sky',   mult: 2.30, rate: 0.19, aoe: false, desc: '空属性の2.3倍強襲' },
  { id: 'sky_volley',       name: '矢の雨',         elem: 'sky',   mult: 1.45, rate: 0.23, aoe: true,  desc: '敵全体に空属性の1.45倍射撃' },
  { id: 'gale_storm',       name: '烈風陣',         elem: 'sky',   mult: 1.60, rate: 0.20, aoe: true,  desc: '敵全体に空属性の1.6倍魔法' },
  { id: 'tempest_wing',     name: '大旋風',         elem: 'sky',   mult: 1.80, rate: 0.17, aoe: true,  desc: '敵全体に空属性の1.8倍大魔法' },

  // 闇属性スキル（光に強く、光に弱い）
  { id: 'shadow_bite',      name: '影噛み',         elem: 'dark',  mult: 1.70, rate: 0.28, aoe: false, drain: 0.2, desc: '闇属性の1.7倍攻撃＋与ダメの20%回復' },
  { id: 'shadow_fang',      name: '闇の牙',         elem: 'dark',  mult: 2.05, rate: 0.23, aoe: false, desc: '闇属性の2.05倍単体攻撃' },
  { id: 'dark_mist',        name: '黒霧',           elem: 'dark',  mult: 1.45, rate: 0.23, aoe: true,  desc: '敵全体に闇属性の1.45倍攻撃' },
  { id: 'shadow_wave',      name: '闇の波動',       elem: 'dark',  mult: 1.65, rate: 0.20, aoe: true,  desc: '敵全体に闇属性の1.65倍魔法' },
  { id: 'abyss_orb',        name: '深淵の魔弾',     elem: 'dark',  mult: 2.40, rate: 0.18, aoe: false, desc: '闇属性の2.4倍大魔法' },

  // 光属性スキル（闇に強く、闇に弱い）
  { id: 'light_ray',        name: '閃光',           elem: 'light', mult: 1.70, rate: 0.28, aoe: false, desc: '光属性の1.7倍単体攻撃' },
  { id: 'holy_shield_bash', name: '聖盾撃',         elem: 'light', mult: 1.95, rate: 0.24, aoe: false, desc: '光属性の1.95倍打撃' },
  { id: 'light_slash',      name: '聖光斬',         elem: 'light', mult: 2.20, rate: 0.21, aoe: false, desc: '光属性の2.2倍斬撃' },
  { id: 'holy_beam',        name: '聖なる光',       elem: 'light', mult: 1.55, rate: 0.22, aoe: true,  desc: '敵全体に光属性の1.55倍魔法' },
  { id: 'radiant_burst',    name: '光の裁き',       elem: 'light', mult: 1.80, rate: 0.18, aoe: true,  desc: '敵全体に光属性の1.8倍大魔法' }
];

function getSkillById(skillId) {
  return MONSTER_SKILLS.find(s => s.id === skillId) || MONSTER_SKILLS[0];
}

function getSpeciesInnateSkillId(speciesName) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(speciesName) : null;
  if (sp && sp.innateSkill) return sp.innateSkill;
  return 'tackle';
}

// 攻撃1回につき最大1つまでスキル発動（通常攻撃は無属性）
function rollOneBattleSkill(skillIds, bonusRate = 0) {
  const ids = Array.isArray(skillIds) && skillIds.length > 0 ? skillIds : ['tackle'];
  for (let i = 0; i < ids.length; i++) {
    const sk = getSkillById(ids[i]);
    if (Math.random() < Math.min(0.75, sk.rate + bonusRate)) {
      return sk;
    }
  }
  return null;
}
