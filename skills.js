// 戦闘スキルマスターデータ (skills.js) - 1回の攻撃で発動するのは最大1つまで
const MONSTER_SKILLS = [
  { id: 'power_slash', name: '🔥 渾身の一撃', mult: 1.85, rate: 0.30, aoe: false, desc: '30%で1.85倍の単体強攻撃' },
  { id: 'double_fang', name: '⚡ 疾風二連撃', mult: 2.10, rate: 0.25, aoe: false, desc: '25%で2.1倍の高速連撃' },
  { id: 'meteor_crash', name: '☄️ メテオインパクト', mult: 2.80, rate: 0.18, aoe: false, desc: '18%で2.8倍の超威力単体攻撃' },
  { id: 'wide_wave', name: '🌊 衝撃波（全体）', mult: 1.35, rate: 0.28, aoe: true, desc: '28%で敵全体に1.35倍ダメージ' },
  { id: 'storm_nova', name: '🌪️ テンペスト（全体）', mult: 1.65, rate: 0.20, aoe: true, desc: '20%で敵全体に1.65倍ダメージ' },
  { id: 'armor_break', name: '🔨 装甲粉砕撃', mult: 2.00, rate: 0.26, aoe: false, ignoreDef: true, desc: '26%で敵の防御を無視して2.0倍攻撃' },
  { id: 'drain_bite', name: '🩸 ドレインバイト', mult: 1.60, rate: 0.28, aoe: false, drain: 0.3, desc: '28%で1.6倍攻撃＋与ダメの30%回復' },
  { id: 'thunder_bolt', name: '⚡ 紫電一閃', mult: 2.35, rate: 0.22, aoe: false, desc: '22%で2.35倍の雷撃' },
  { id: 'blizzard_all', name: '❄️ 絶対零度（全体）', mult: 1.80, rate: 0.18, aoe: true, desc: '18%で敵全体に1.8倍の氷結攻撃' },
  { id: 'dragon_roar', name: '🐉 覇王の咆哮（全体）', mult: 2.10, rate: 0.16, aoe: true, desc: '16%で敵全体に2.1倍の究極全体攻撃' }
];

function getSkillById(skillId) {
  return MONSTER_SKILLS.find(s => s.id === skillId) || MONSTER_SKILLS[0];
}

// 種族ごとに決まった固有スキルを返す
function getSpeciesInnateSkillId(speciesName) {
  const sp = typeof getSpeciesData === 'function' ? getSpeciesData(speciesName) : { idx: 0, stage: 1 };
  const idx = (sp.idx + (sp.stage - 1)) % MONSTER_SKILLS.length;
  return MONSTER_SKILLS[idx].id;
}

// 攻撃1回につき最大1つだけスキル発動判定を行う
function rollOneBattleSkill(skillIds, bonusRate = 0) {
  const ids = Array.isArray(skillIds) && skillIds.length > 0 ? skillIds : ['power_slash'];
  for (let i = 0; i < ids.length; i++) {
    const sk = getSkillById(ids[i]);
    if (Math.random() < Math.min(0.85, sk.rate + bonusRate)) {
      return sk; // 1つ発動したら即座にそのスキルを返す（複数同時発動しない）
    }
  }
  return null;
}
