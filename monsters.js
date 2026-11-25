// モンスター種族マスターデータ＆デフォルト立ち絵管理 (monsters.js)
const seaMonsters = [
  { icon: '🐙', name: 'オクトパス', ct: 2.2, imgFile: '/images/mon_octopus.png' },
  { icon: '🦈', name: 'シャーク', ct: 1.8, imgFile: '/images/mon_shark.png' },
  { icon: '🦀', name: 'クラブ', ct: 2.6, imgFile: '/images/mon_crab.png' },
  { icon: '🐡', name: 'ハリセンボン', ct: 2.0, imgFile: '/images/mon_puffer.png' },
  { icon: '🦑', name: 'ダイオウイカ', ct: 1.9, imgFile: '/images/mon_squid.png' },
  { icon: '🐳', name: 'ホエール', ct: 2.8, imgFile: '/images/mon_whale.png' }
];

const landMonsters = [
  { icon: '🦊', name: 'フォックス', ct: 1.7, imgFile: '/images/mon_fox.png' },
  { icon: '🐗', name: 'ボア', ct: 2.1, imgFile: '/images/mon_boar.png' },
  { icon: '🦎', name: 'リザード', ct: 1.9, imgFile: '/images/mon_lizard.png' },
  { icon: '🦉', name: 'オウル', ct: 1.6, imgFile: '/images/mon_owl.png' },
  { icon: '🐻', name: 'グリズリー', ct: 2.7, imgFile: '/images/mon_grizzly.png' },
  { icon: '🐉', name: 'ワイバーン', ct: 2.3, imgFile: '/images/mon_wyvern.png' }
];

// 読み込み成功したデフォルト立ち絵画像のキャッシュ
const validDefaultMonsterImages = {};

function initDefaultMonsterImages() {
  [...seaMonsters, ...landMonsters].forEach(m => {
    if (!m.imgFile) return;
    const img = new Image();
    img.onload = () => {
      validDefaultMonsterImages[m.name] = m.imgFile;
      if (typeof renderParty === 'function') renderParty();
      if (typeof renderCaptured === 'function') renderCaptured();
      if (typeof updateUI === 'function') updateUI();
    };
    img.src = m.imgFile;
  });
}

function getDefaultMonsterVisual(name, fallbackEmoji) {
  if (validDefaultMonsterImages[name]) return validDefaultMonsterImages[name];
  const found = [...seaMonsters, ...landMonsters].find(x => x.name === name);
  return found ? found.icon : (fallbackEmoji || '🐾');
}

window.addEventListener('DOMContentLoaded', initDefaultMonsterImages);
