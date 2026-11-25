// モンスター配合・+値上限解放・スキル＆特性継承システム (breed.js)
let breedParentA = '';
let breedParentB = '';

function getBreedCost(monA, monB) {
  const nextPlus = Math.max(monA.plus || 0, monB.plus || 0) + 1;
  return Math.floor(300 * Math.pow(1.65, nextPlus - 1));
}

function calcInheritedBonus(monA, monB, targetSpecies) {
  const spA = getSpeciesData(monA.name);
  const spB = getSpeciesData(monB.name);
  const stA = getMonStats(monA);
  const stB = getMonStats(monB);
  const rateA = Number(spA.inheritRate) || 0.15;
  const rateB = Number(spB.inheritRate) || 0.15;
  const targetRate = Number(targetSpecies.inheritRate) || 0.15;

  // 親の現在ステータス（レベルが高いほど伸びる）× 種族継承係数
  const addHp = Math.floor((stA.maxHp * rateA + stB.maxHp * rateB) * 0.5 + targetSpecies.baseHp * targetRate * 0.25);
  const addAtk = Math.floor((stA.atk * rateA + stB.atk * rateB) * 0.5 + targetSpecies.baseAtk * targetRate * 0.25);
  const addDef = Math.floor((stA.def * rateA + stB.def * rateB) * 0.5 + targetSpecies.baseDef * targetRate * 0.25);
  return { addHp, addAtk, addDef };
}

function renderBreedUI() {
  const selA = document.getElementById('breed-parent-a');
  const selB = document.getElementById('breed-parent-b');
  const box = document.getElementById('breed-preview-area');
  if (!selA || !selB || !box) return;

  // 編成中・訓練中・カフェ店員は親に選べない（誤消去防止）
  const lockedIds = new Set([...(party || []), ...(trainingSlots || []), ...(staff || [])].filter(Boolean));
  const candidates = captured.filter(m => !lockedIds.has(m.id));

  if (!candidates.some(m => m.id === breedParentA)) breedParentA = candidates?.id || '';
  if (!candidates.some(m => m.id === breedParentB && m.id !== breedParentA)) {
    const second = candidates.find(m => m.id !== breedParentA);
    breedParentB = second ? second.id : '';
  }

  const makeOpts = (list, selectedId) => list.map(m => {
    const pTag = (m.plus || 0) > 0 ? `+${m.plus}` : '';
    return `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.icon} ${m.name}${pTag} (Lv.${m.lv}/${m.maxLv || 10})</option>`;
  }).join('') || '<option value="">配合可能な仲間がいません</option>';

  selA.innerHTML = makeOpts(candidates, breedParentA);
  selB.innerHTML = makeOpts(candidates.filter(m => m.id !== breedParentA), breedParentB);

  const monA = candidates.find(m => m.id === breedParentA);
  const monB = candidates.find(m => m.id === breedParentB && m.id !== breedParentA);

  if (!monA || !monB) {
    box.innerHTML = `<p style="font-size:12px;color:#78909c;text-align:center;padding:12px 0;">配合には、編成・訓練・カフェから外したモンスターが2体必要です。</p>`;
    return;
  }

  const resSp = getBreedResultSpecies(monA, monB);
  const nextPlus = Math.max(monA.plus || 0, monB.plus || 0) + 1;
  const nextMaxLv = Math.max(monA.maxLv || 10, monB.maxLv || 10) + 5;
  const cost = getBreedCost(monA, monB);
  const bonus = calcInheritedBonus(monA, monB, resSp);

  // 配合先の固有スキル1つ＆固有特性1つ（固定・消せない）
  const fixedSkillId = getSpeciesInnateSkillId(resSp.name);
  const fixedTraitId = getSpeciesInnateTraitId(resSp.name);
  const fixedSk = getSkillById(fixedSkillId);
  const fixedTr = getMonsterTrait(fixedTraitId);

  // 両親から選べるスキル候補（固有スキルと重複しないもの）
  const parentSkills = Array.from(new Set([...(monA.skills || []), ...(monB.skills || [])])).filter(id => id !== fixedSkillId);
  const parentTraits = Array.from(new Set([...(monA.traits || []), ...(monB.traits || [])])).filter(id => id !== fixedTraitId);

  box.innerHTML = `
    <div style="background:#f8fdff;border:1.5px solid #81d4fa;border-radius:12px;padding:10px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:bold;color:#0277bd;margin-bottom:4px;">
        ✨ 配合結果: ${resSp.icon} ${resSp.name} +${nextPlus}
      </div>
      <div style="font-size:11px;color:#455a64;line-height:1.5;">
        ・レベル: Lv.1 に戻る（<b>上限 Lv.${nextMaxLv}</b> に拡張）<br>
        ・ステータス継承値: <b>HP+${bonus.addHp} / ATK+${bonus.addAtk} / DEF+${bonus.addDef}</b><br>
        ・配合費用: <b style="color:#d98200;">${cost.toLocaleString()} G</b>（親2体は消滅します）
      </div>
    </div>

    <div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:4px;">🔥 スキル継承（最大5つ：固有1＋選択4つまで）</div>
    <div style="font-size:11px;background:#fff3e0;padding:6px 8px;border-radius:8px;margin-bottom:6px;color:#e65100;">
      ★固定: <b>${fixedSk.name}</b>（${fixedSk.desc}）
    </div>
    <div style="margin-bottom:10px;">
      ${parentSkills.length === 0 ? '<div style="font-size:11px;color:#90a4ae;">継承可能な追加スキルはありません</div>' :
        parentSkills.map((sid, idx) => {
          const sk = getSkillById(sid);
          return `<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;cursor:pointer;">
            <input type="checkbox" class="breed-skill-chk" value="${sid}" ${idx < 4 ? 'checked' : ''} onchange="limitBreedCheckboxes('breed-skill-chk', 4)">
            <span><b>${sk.name}</b>（${sk.desc}）</span>
          </label>`;
        }).join('')
      }
    </div>

    <div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:4px;">🧬 特性継承（最大5つ：固有1＋選択4つまで）</div>
    <div style="font-size:11px;background:#e8f5e9;padding:6px 8px;border-radius:8px;margin-bottom:6px;color:#2e7d32;">
      ★固定: <b>${fixedTr.name}</b>（${fixedTr.desc}）
    </div>
    <div style="margin-bottom:12px;">
      ${parentTraits.length === 0 ? '<div style="font-size:11px;color:#90a4ae;">継承可能な追加特性はありません</div>' :
        parentTraits.map((tid, idx) => {
          const tr = getMonsterTrait(tid);
          return `<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;cursor:pointer;">
            <input type="checkbox" class="breed-trait-chk" value="${tid}" ${idx < 4 ? 'checked' : ''} onchange="limitBreedCheckboxes('breed-trait-chk', 4)">
            <span><b>${tr.name}</b>（${tr.desc}）</span>
          </label>`;
        }).join('')
      }
    </div>

    <button class="btn-coral" onclick="executeBreed()">🧬 配合を実行する（${cost.toLocaleString()} G）</button>
  `;
}

function onChangeBreedParent(which, val) {
  if (which === 'A') breedParentA = val;
  else breedParentB = val;
  renderBreedUI();
}

function limitBreedCheckboxes(clsName, maxCount) {
  const boxes = Array.from(document.querySelectorAll(`.${clsName}`));
  const checked = boxes.filter(b => b.checked);
  if (checked.length > maxCount) {
    alert(`継承できるのは最大${maxCount}つまでです！（固有枠と合わせて合計5つ）`);
    checked[checked.length - 1].checked = false;
  }
}

function executeBreed() {
  const monA = captured.find(m => m.id === breedParentA);
  const monB = captured.find(m => m.id === breedParentB);
  if (!monA || !monB || monA.id === monB.id) return alert('親モンスターを2体選択してください！');

  const cost = getBreedCost(monA, monB);
  if (gold < cost) return alert(`ゴールドが足りません！（${cost.toLocaleString()} G 必要）`);

  const resSp = getBreedResultSpecies(monA, monB);
  const nextPlus = Math.max(monA.plus || 0, monB.plus || 0) + 1;
  const nextMaxLv = Math.max(monA.maxLv || 10, monB.maxLv || 10) + 5;
  const bonus = calcInheritedBonus(monA, monB, resSp);

  const fixedSkillId = getSpeciesInnateSkillId(resSp.name);
  const fixedTraitId = getSpeciesInnateTraitId(resSp.name);
  const chosenSkills = Array.from(document.querySelectorAll('.breed-skill-chk:checked')).map(el => el.value).slice(0, 4);
  const chosenTraits = Array.from(document.querySelectorAll('.breed-trait-chk:checked')).map(el => el.value).slice(0, 4);

  if (!confirm(`${cost.toLocaleString()} G を消費して「${resSp.name} +${nextPlus}」を誕生させますか？\n（※親の ${monA.name} と ${monB.name} はいなくなります）`)) return;

  gold -= cost;
  captured = captured.filter(m => m.id !== monA.id && m.id !== monB.id);

  const child = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 999),
    icon: resSp.icon,
    name: resSp.name,
    type: resSp.type,
    lv: 1,
    maxLv: nextMaxLv,
    exp: 0,
    plus: nextPlus,
    bonusHp: bonus.addHp,
    bonusAtk: bonus.addAtk,
    bonusDef: bonus.addDef,
    baseHp: resSp.baseHp,
    baseAtk: resSp.baseAtk,
    baseDef: resSp.baseDef,
    ct: resSp.ct,
    skills: [fixedSkillId, ...chosenSkills],
    traits: [fixedTraitId, ...chosenTraits],
    customSkin: null,
    customBgIdx: -1
  };

  captured.push(child);
  if (!speciesSkins[resSp.name]) speciesSkins[resSp.name] = { list: [], activeIdx: -1, defaultIcon: resSp.icon };

  const emptyParty = party.findIndex(x => x === null);
  if (emptyParty !== -1) party.splice(emptyParty, 1, child.id);

  resetBattleAllies();
  renderParty();
  renderCaptured();
  renderTraining();
  renderBreedUI();
  updateSelectOptions();
  updateUI();
  triggerAutoSave(true);
  showToast(`🎉 ${resSp.name} +${nextPlus} が誕生しました！`);
}
