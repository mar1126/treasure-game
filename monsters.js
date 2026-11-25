// 10ステージ×10種族マスター・固定ウェーブ配置・配合法則 (monsters.js)
const STAGE_TEMPLATES = {
  land: [
    { name: 'はじまりの草原', base: [
      { icon: '🦊', name: 'フォックス', ct: 1.7, hp: 70, atk: 12, def: 4, inherit: 0.14, img: '/images/mon_fox.png' },
      { icon: '🐗', name: 'ボア', ct: 2.1, hp: 85, atk: 14, def: 6, inherit: 0.15, img: '/images/mon_boar.png' },
      { icon: '🐇', name: 'ラビット', ct: 1.5, hp: 60, atk: 11, def: 3, inherit: 0.13 },
      { icon: '🐛', name: 'キャタピラー', ct: 2.2, hp: 75, atk: 10, def: 7, inherit: 0.14 },
      { icon: '🐝', name: 'ワスプ', ct: 1.6, hp: 58, atk: 15, def: 3, inherit: 0.15 },
      { icon: '🐸', name: 'フロッグ', ct: 2.0, hp: 72, atk: 12, def: 5, inherit: 0.14 },
      { icon: '🦔', name: 'ヘッジホッグ', ct: 2.3, hp: 80, atk: 11, def: 9, inherit: 0.16 },
      { icon: '🐿️', name: 'スクイレル', ct: 1.5, hp: 62, atk: 13, def: 4, inherit: 0.13 },
      { icon: '🐍', name: 'ヴァイパー', ct: 1.8, hp: 68, atk: 16, def: 4, inherit: 0.15 },
      { icon: '🐺', name: 'ウルフ', ct: 1.7, hp: 82, atk: 17, def: 5, inherit: 0.17 }
    ]},
    { name: '深い霧の森', base: [
      { icon: '🦎', name: 'リザード', ct: 1.9, hp: 78, atk: 15, def: 6, inherit: 0.16, img: '/images/mon_lizard.png' },
      { icon: '🦉', name: 'オウル', ct: 1.6, hp: 68, atk: 16, def: 5, inherit: 0.16, img: '/images/mon_owl.png' },
      { icon: '🕷️', name: 'スパイダー', ct: 1.8, hp: 70, atk: 17, def: 5, inherit: 0.15 },
      { icon: '🍄', name: 'マッシュ', ct: 2.4, hp: 92, atk: 12, def: 9, inherit: 0.17 },
      { icon: '🦇', name: 'バット', ct: 1.5, hp: 64, atk: 16, def: 4, inherit: 0.15 },
      { icon: '🦌', name: 'スタッグ', ct: 2.0, hp: 88, atk: 15, def: 7, inherit: 0.17 },
      { icon: '🐢', name: 'トータス', ct: 2.7, hp: 110, atk: 12, def: 12, inherit: 0.19 },
      { icon: '🦡', name: 'バジャー', ct: 1.9, hp: 84, atk: 17, def: 6, inherit: 0.16 },
      { icon: '🦅', name: 'ホーク', ct: 1.6, hp: 72, atk: 19, def: 5, inherit: 0.17 },
      { icon: '🐻', name: 'グリズリー', ct: 2.5, hp: 105, atk: 20, def: 8, inherit: 0.19, img: '/images/mon_grizzly.png' }
    ]},
    { name: '乾いた岩山', prefix: 'ロック' },
    { name: '古代の遺跡', prefix: 'エンシェント' },
    { name: '灼熱の砂漠', prefix: 'サンド' },
    { name: '氷結の雪原', prefix: 'フロスト' },
    { name: '雷鳴の渓谷', prefix: 'サンダー' },
    { name: '溶岩の火山', prefix: 'マグマ' },
    { name: '天空の浮島', prefix: 'スカイ' },
    { name: '終焉の魔大陸', prefix: 'カオス' }
  ],
  sea: [
    { name: '穏やかな浅瀬', base: [
      { icon: '🦀', name: 'クラブ', ct: 2.4, hp: 82, atk: 12, def: 8, inherit: 0.15, img: '/images/mon_crab.png' },
      { icon: '🐡', name: 'ハリセンボン', ct: 2.0, hp: 74, atk: 13, def: 6, inherit: 0.14, img: '/images/mon_puffer.png' },
      { icon: '🦐', name: 'シュリンプ', ct: 1.6, hp: 60, atk: 14, def: 4, inherit: 0.13 },
      { icon: '🐚', name: 'シェル', ct: 2.6, hp: 95, atk: 10, def: 11, inherit: 0.16 },
      { icon: '🐠', name: 'トロピカル', ct: 1.5, hp: 58, atk: 13, def: 3, inherit: 0.13 },
      { icon: '🪼', name: 'ジェリー', ct: 2.1, hp: 70, atk: 15, def: 5, inherit: 0.15 },
      { icon: '🐢', name: 'ウミガメ', ct: 2.5, hp: 96, atk: 12, def: 10, inherit: 0.17 },
      { icon: '🦞', name: 'ロブスター', ct: 2.1, hp: 80, atk: 16, def: 7, inherit: 0.16 },
      { icon: '🐬', name: 'ドルフィン', ct: 1.6, hp: 76, atk: 16, def: 5, inherit: 0.16 },
      { icon: '🐙', name: 'オクトパス', ct: 2.1, hp: 88, atk: 18, def: 6, inherit: 0.18, img: '/images/mon_octopus.png' }
    ]},
    { name: 'サンゴ礁の海', prefix: 'コーラル' },
    { name: '難破船の海域', prefix: 'ゴースト' },
    { name: '渦潮の海峡', prefix: 'ストーム' },
    { name: '深海の海溝', prefix: 'アビス' },
    { name: '氷山漂う極海', prefix: 'グレイシア' },
    { name: '海底火山の海', prefix: 'ボルケーノ' },
    { name: '竜巻の魔海域', prefix: 'テンペスト' },
    { name: '古代アトランティス', prefix: 'レリック' },
    { name: '海神の聖域', prefix: 'ポセイドン' }
  ]
};

// 全200種族（陸100・海100）を構築
const ALL_MONSTER_SPECIES = [];
const STAGE_MONSTERS = { land: {}, sea: {} };

['land', 'sea'].forEach(mType => {
  const baseList1 = STAGE_TEMPLATES[mType][0].base;
  const baseList2 = STAGE_TEMPLATES[mType][1].base || baseList1;

  for (let stg = 1; stg <= 10; stg++) {
    const tpl = STAGE_TEMPLATES[mType][stg - 1];
    let list = [];
    if (tpl.base) {
      list = tpl.base.map((b, idx) => ({
        id: `${mType}_${stg}_${idx}`,
        type: mType,
        stage: stg,
        idx,
        name: b.name,
        icon: b.icon,
        ct: b.ct,
        baseHp: b.hp,
        baseAtk: b.atk,
        baseDef: b.def,
        inheritRate: b.inherit,
        imgFile: b.img || null
      }));
    } else {
      const refList = (stg % 2 === 1) ? baseList1 : baseList2;
      list = refList.map((b, idx) => ({
        id: `${mType}_${stg}_${idx}`,
        type: mType,
        stage: stg,
        idx,
        name: `${tpl.prefix}${b.name}`,
        icon: b.icon,
        ct: b.ct,
        baseHp: Math.floor(b.hp * (1 + (stg - 1) * 0.04)),
        baseAtk: Math.floor(b.atk * (1 + (stg - 1) * 0.04)),
        baseDef: Math.floor(b.def * (1 + (stg - 1) * 0.04)),
        inheritRate: Number((b.inherit + (stg - 1) * 0.008).toFixed(3)),
        imgFile: b.img || null
      }));
    }
    STAGE_MONSTERS[mType][stg] = list;
    ALL_MONSTER_SPECIES.push(...list);
  }
});

// 互換用配列
const landMonsters = STAGE_MONSTERS.land[1];
const seaMonsters = STAGE_MONSTERS.sea[1];

function getSpeciesData(name) {
  return ALL_MONSTER_SPECIES.find(x => x.name === name) || ALL_MONSTER_SPECIES[0];
}

function getStageName(mType, stg) {
  const tpl = STAGE_TEMPLATES[mType]?.[stg - 1];
  return tpl ? `Stage${stg} ${tpl.name}` : `Stage${stg}`;
}

// 決定論的（毎回固定）なウェーブ編成（1〜3体・同種族複数も配置）
function getFixedWaveEnemies(mType, stg, floor, wave) {
  const pool = STAGE_MONSTERS[mType]?.[stg] || STAGE_MONSTERS.land[1];
  const seed = stg * 10000 + floor * 17 + wave * 7;

  // ウェーブ1〜2は1〜2体、ウェーブ3〜4は2〜3体、ウェーブ5はボス含め2〜3体
  let count = 1;
  if (wave === 5) count = (floor % 2 === 0) ? 3 : 2;
  else if (wave >= 3) count = 2 + (seed % 2);
  else count = 1 + ((floor + wave) % 2);

  // 同種族複数配置パターン（30%のウェーブで同じ種族が2〜3体並ぶ）
  const sameSpeciesWave = ((floor * 3 + wave) % 3 === 0) && count >= 2;
  const mainIdx = (floor + wave * 2) % 10;

  // 階層＆ステージに応じた強さ倍率（50-5まで段階的に上昇）
  const stageScale = Math.pow(3.2, stg - 1);
  const floorScale = 1 + (floor - 1) * 0.14;
  const waveScale = (wave === 5) ? 1.35 : (1 + (wave - 1) * 0.06);
  const totalMult = stageScale * floorScale * waveScale;

  const enemies = [];
  for (let i = 0; i < count; i++) {
    let pickIdx = sameSpeciesWave ? mainIdx : (mainIdx + i * 3) % 10;
    if (wave === 5 && i === 0) pickIdx = 9; // ウェーブ5の先頭はステージの主（10番目）
    const sp = pool[pickIdx];
    const maxHp = Math.floor(sp.baseHp * 1.4 * totalMult);
    enemies.push({
      slot: i,
      name: (wave === 5 && i === 0) ? `👑 ${sp.name}` : sp.name,
      rawName: sp.name,
      icon: sp.icon,
      maxHp,
      hp: maxHp,
      atk: Math.floor(sp.baseAtk * 0.75 * totalMult),
      def: Math.floor(sp.baseDef * 0.6 * totalMult),
      ct: sp.ct,
      curCt: (i * 0.35), // 攻撃タイミングが少しズレて臨場感が出る
      expReward: Math.floor((12 + stg * 18 + floor * 3) * (wave === 5 ? 1.5 : 1.0) / count),
      goldReward: Math.floor((15 + stg * 22 + floor * 4) * (wave === 5 ? 1.6 : 1.0) / count)
    });
  }
  return enemies;
}

// 配合結果の法則性（上位ステージへ一気に飛び級できないバランス設計）
function getBreedResultSpecies(monA, monB) {
  const spA = getSpeciesData(monA.name);
  const spB = getSpeciesData(monB.name);

  // 同じ種族同士なら同ステージの次の種族へランクアップ（最大同ステージ内）
  let targetType = spA.type;
  let targetStage = Math.min(spA.stage, spB.stage);

  // 両親が同じステージ帯で、かつ親Aの+値が2以上なら1つ上のステージの種族に進化可能
  if (spA.stage === spB.stage && (monA.plus || 0) >= 2 && spA.stage < 10) {
    targetStage = spA.stage + 1;
  } else if (spA.stage !== spB.stage) {
    // ステージ差がある場合は低い方のステージ〜中間まで（飛び級防止）
    targetStage = Math.floor((spA.stage + spB.stage) / 2);
  }

  const pool = STAGE_MONSTERS[targetType][targetStage];
  // 両親と異なる別種族を法則的に決定
  let resIdx = (spA.idx + spB.idx + 1) % pool.length;
  if (pool[resIdx].name === spA.name || pool[resIdx].name === spB.name) {
    resIdx = (resIdx + 2) % pool.length;
  }
  return pool[resIdx];
}

// デフォルト立ち絵画像の読み込み
const validDefaultMonsterImages = {};
function initDefaultMonsterImages() {
  ALL_MONSTER_SPECIES.forEach(m => {
    if (!m.imgFile || validDefaultMonsterImages[m.name]) return;
    const img = new Image();
    img.onload = () => { validDefaultMonsterImages[m.name] = m.imgFile; };
    img.src = m.imgFile;
  });
}
function getDefaultMonsterVisual(name, fallbackEmoji) {
  if (validDefaultMonsterImages[name]) return validDefaultMonsterImages[name];
  const found = ALL_MONSTER_SPECIES.find(x => x.name === name);
  return found ? found.icon : (fallbackEmoji || '🐾');
}
window.addEventListener('DOMContentLoaded', initDefaultMonsterImages);
