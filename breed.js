// モンスター配合・Lv10以上制限・数値継承値(累積＆今回増加分表示)・重複禁止継承 (breed.js)
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
  const rateA = (Number(spA.inheritRate) || 15) / 100;
  const rateB = (Number(spB.inheritRate) || 15) / 100;
  const targetRate = (Number(targetSpecies.inheritRate) || 15) / 100;

  // 今回の配合だけで新たに上がる数値
  const gainHp = Math.max(2, Math.floor((stA.maxHp * rateA + stB.maxHp * rateB) * 0.45 + targetSpecies.baseHp * targetRate * 0.2));
  const gainAtk = Math.max(1, Math.floor((stA.atk * rateA + stB.atk * rateB) * 0.45 + targetSpecies.baseAtk * targetRate * 0.2));
  const gainDef = Math.max(1, Math.floor((stA.def * rateA + stB.def * rateB) * 0.45 + targetSpecies.baseDef * targetRate * 0.2));

  // 親までの蓄積値 ＋ 今回上がる数値 ＝ 子の累積継承値
  const totalHp = Math.max(Number(monA.bonusHp) || 0, Number(monB.bonusHp) || 0) + gainHp;
  const totalAtk = Math.max(Number(monA.bonusAtk) || 0, Number(monB.bonusAtk) || 0) + gainAtk;
  const totalDef = Math.max(Number(monA.bonusDef) || 0, Number(monB.bonusDef) || 0) + gainDef;

  return { gainHp, gainAtk, gainDef, totalHp, totalAtk, totalDef };
}

function renderBreedUI() {
  const selA = document.getElementById('breed-parent-a');
  const selB = document.getElementById('breed-parent-b');
  const box = document.getElementById('breed-preview-area');
  if (!selA || !selB || !box) return;

  const lockedIds = new Set([...(party || []), ...(trainingSlots || []), ...(staff || [])].filter(Boolean));
  const candidates = captured.filter(m => !lockedIds.has(m.id) && (Number(m.lv) || 1) >= 10);

  if (!candidates.some(m => m.id === breedParentA)) breedParentA = candidates[0]?.id || '';
  if (!candidates.some(m => m.id === breedParentB && m.id !== breedParentA)) {
    const second = candidates.find(m => m.id !== breedParentA);
    breedParentB = second ? second.id : '';
  }

  const makeOpts = (list, selectedId) => list.map(m => {
    const pTag = (m.plus || 0) > 0 ? `+${m.plus}` : '';
    return `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name}${pTag} (Lv.${m.lv}/${m.maxLv || 10})</option>`;
  }).join('') || '<option value="">Lv.10以上の待機モンスターがいません</option>';

  selA.innerHTML = makeOpts(candidates, breedParentA);
  selB.innerHTML = makeOpts(candidates.filter(m => m.id !== breedParentA), breedParentB);

  const monA = candidates.find(m => m.id === breedParentA);
  const monB = candidates.find(m => m.id === breedParentB && m.id !== breedParentA);

  if (!monA || !monB) {
    box.innerHTML = `<p style="font-size:12px;color:#78909c;text-align:center;padding:12px 0;">配合には、編成・訓練・カフェから外した <b>Lv.10以上</b> のモンスターが2体必要です。</p>`;
    return;
  }

  const resSp = getBreedResultSpecies(monA, monB);
  const nextPlus = Math.max(monA.plus || 0, monB.plus || 0) + 1;
  const nextMaxLv = Math.max(monA.maxLv || 10, monB.maxLv || 10) + 5;
  const cost = getBreedCost(monA, monB);
  const bonus = calcInheritedBonus(monA, monB, resSp);

  // 確定継承（同じスキル・特性の重複を完全排除）
  const fixedSkills = Array.from(new Set([
    getSpeciesInnateSkillId(monA.name),
    getSpeciesInnateSkillId(monB.name),
    getSpeciesInnateSkillId(resSp.name)
  ]));
  const fixedTraits = Array.from(new Set([
    getSpeciesInnateTraitId(monA.name),
    getSpeciesInnateTraitId(monB.name),
    getSpeciesInnateTraitId(resSp.name)
  ]));

  // 追加選択候補（確定枠と同じものは除外して重複防止）
  const freeSkillCandidates = Array.from(new Set([...(monA.skills || []), ...(monB.skills || [])])).filter(id => !fixedSkills.includes(id));
  const freeTraitCandidates = Array.from(new Set([...(monA.traits || []), ...(monB.traits || [])])).filter(id => !fixedTraits.includes(id));
  const maxFreeSkills = Math.min(2, Math.max(0, 5 - fixedSkills.length));
  const maxFreeTraits = Math.min(2, Math.max(0, 5 - fixedTraits.length));

  box.innerHTML = `
    <div style="background:#f8fdff;border:1.5px solid #81d4fa;border-radius:12px;padding:10px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:bold;color:#0277bd;margin-bottom:4px;">
        配合結果: ${resSp.name} +${nextPlus} ${renderElementBadge(resSp.elem)}
      </div>
      <div style="font-size:11px;color:#455a64;line-height:1.55;">
        ・レベル: Lv.1 に戻る（<b>上限 Lv.${nextMaxLv}</b> に拡張）<br>
        ・今回の継承値: <b>HP +${bonus.gainHp} / ATK +${bonus.gainAtk} / DEF +${bonus.gainDef}</b><br>
        ・配合費用: <b style="color:#d98200;">${cost.toLocaleString()} G</b>（親2体はいなくなります）
      </div>
    </div>

    <div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:4px;">スキル継承（同じスキルは重複不可）</div>
    <div style="font-size:11px;background:#fff3e0;padding:6px 8px;border-radius:8px;margin-bottom:6px;color:#e65100;line-height:1.5;">
      <b>[確定継承（親1・親2・配合先の固有）]</b><br>
      ${fixedSkills.map(sid => {
        const sk = getSkillById(sid);
        return `・${renderElementBadge(sk.elem)} <b>${sk.name}</b>（${sk.desc}）`;
      }).join('<br>')}
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:11px;color:#546e7a;margin-bottom:3px;">追加で継承するスキルを選択（最大${maxFreeSkills}つまで）：</div>
      ${freeSkillCandidates.length === 0 ? '<div style="font-size:11px;color:#90a4ae;">追加選択できるスキルはありません</div>' :
        freeSkillCandidates.map((sid, idx) => {
          const sk = getSkillById(sid);
          return `<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;cursor:pointer;">
            <input type="checkbox" class="breed-skill-chk" value="${sid}" ${idx < maxFreeSkills ? 'checked' : ''} onchange="limitBreedCheckboxes('breed-skill-chk', ${maxFreeSkills})">
            <span>${renderElementBadge(sk.elem)} <b>${sk.name}</b>（${sk.desc}）</span>
          </label>`;
        }).join('')
      }
    </div>

    <div style="font-size:12px;font-weight:bold;color:#0277bd;margin-bottom:4px;">特性継承（同じ特性は重複不可）</div>
    <div style="font-size:11px;background:#e8f5e9;padding:6px 8px;border-radius:8px;margin-bottom:6px;color:#2e7d32;line-height:1.5;">
      <b>[確定継承（親1・親2・配合先の固有）]</b><br>
      ${fixedTraits.map(tid => {
        const tr = getMonsterTrait(tid);
        return `・<b>${tr.name}</b>（${tr.desc}）`;
      }).join('<br>')}
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;color:#546e7a;margin-bottom:3px;">追加で継承する特性を選択（最大${maxFreeTraits}つまで）：</div>
      ${freeTraitCandidates.length === 0 ? '<div style="font-size:11px;color:#90a4ae;">追加選択できる特性はありません</div>' :
        freeTraitCandidates.map((tid, idx) => {
          const tr = getMonsterTrait(tid);
          return `<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 0;cursor:pointer;">
            <input type="checkbox" class="breed-trait-chk" value="${tid}" ${idx < maxFreeTraits ? 'checked' : ''} onchange="limitBreedCheckboxes('breed-trait-chk', ${maxFreeTraits})">
            <span><b>${tr.name}</b>（${tr.desc}）</span>
          </label>`;
        }).join('')
      }
    </div>

    <button class="btn-coral" onclick="executeBreed()">配合を実行する（${cost.toLocaleString()} G）</button>
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
    alert(`追加で継承できるのは最大${maxCount}つまでです`);
    checked[checked.length - 1].checked = false;
  }
}

function executeBreed() {
  const monA = captured.find(m => m.id === breedParentA);
  const monB = captured.find(m => m.id === breedParentB);
  if (!monA || !monB || monA.id === monB.id) return alert('親モンスターを2体選択してください');
  if ((Number(monA.lv) || 1) < 10 || (Number(monB.lv) || 1) < 10) {
    return alert('配合には両親ともに Lv.10以上 が必要です');
  }

  const cost = getBreedCost(monA, monB);
  if (gold < cost) return alert(`ゴールドが足りません（${cost.toLocaleString()} G 必要）`);

  const resSp = getBreedResultSpecies(monA, monB);
  const nextPlus = Math.max(monA.plus || 0, monB.plus || 0) + 1;
  const nextMaxLv = Math.max(monA.maxLv || 10, monB.maxLv || 10) + 5;
  const bonus = calcInheritedBonus(monA, monB, resSp);

  const fixedSkills = Array.from(new Set([
    getSpeciesInnateSkillId(monA.name),
    getSpeciesInnateSkillId(monB.name),
    getSpeciesInnateSkillId(resSp.name)
  ]));
  const fixedTraits = Array.from(new Set([
    getSpeciesInnateTraitId(monA.name),
    getSpeciesInnateTraitId(monB.name),
    getSpeciesInnateTraitId(resSp.name)
  ]));

  const maxFreeSkills = Math.min(2, Math.max(0, 5 - fixedSkills.length));
  const maxFreeTraits = Math.min(2, Math.max(0, 5 - fixedTraits.length));
  const chosenSkills = Array.from(document.querySelectorAll('.breed-skill-chk:checked')).map(el => el.value).slice(0, maxFreeSkills);
  const chosenTraits = Array.from(document.querySelectorAll('.breed-trait-chk:checked')).map(el => el.value).slice(0, maxFreeTraits);

  // 最終的な重複排除保証
  const finalSkills = Array.from(new Set([...fixedSkills, ...chosenSkills])).slice(0, 5);
  const finalTraits = Array.from(new Set([...fixedTraits, ...chosenTraits])).slice(0, 5);

  if (!confirm(`${cost.toLocaleString()} G を消費して「${resSp.name} +${nextPlus}」を誕生させますか？\n（今回の継承値: HP+${bonus.gainHp} / ATK+${bonus.gainAtk} / DEF+${bonus.gainDef}）`)) return;

  gold -= cost;
  captured = captured.filter(m => m.id !== monA.id && m.id !== monB.id);

  const child = {
    id: 'M' + Date.now() + Math.floor(Math.random() * 999),
    name: resSp.name,
    elem: resSp.elem,
    lv: 1,
    maxLv: nextMaxLv,
    exp: 0,
    plus: nextPlus,
    bonusHp: bonus.totalHp,
    bonusAtk: bonus.totalAtk,
    bonusDef: bonus.totalDef,
    baseHp: resSp.baseHp,
    baseAtk: resSp.baseAtk,
    baseDef: resSp.baseDef,
    ct: resSp.ct,
    skills: finalSkills,
    traits: finalTraits,
    customSkin: null,
    customBgIdx: -1
  };

  captured.push(child);
  if (!speciesSkins[resSp.name]) speciesSkins[resSp.name] = { list: [], activeIdx: -1 };

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
  showToast(`${resSp.name} +${nextPlus} が誕生しました`);
}
