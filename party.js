function renderTraining() {
  const el = document.getElementById('training-slots');
  const cntEl = document.getElementById('train-count-disp');
  const limit = Math.min(20, Math.max(3, Number(maxTrainingSlots) || 3));
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < limit) trainingSlots.push(null);
  trainingSlots = trainingSlots.slice(0, limit);

  const activeCount = trainingSlots.filter(id => id && captured.some(x => x.id === id)).length;
  if (cntEl) cntEl.textContent = `${activeCount}/${limit}`;

  if (!el) return;
  el.innerHTML = trainingSlots.map((monId, slotIdx) => {
    const m = captured.find(x => x.id === monId);
    if (!m) {
      return `<div class="mini-mon-card empty" onclick="alert('「仲間一覧」タブからモンスターをタップし、「訓練場に配置する」を選んでください（戦闘EXPの10%を獲得）')">
        <div class="m-top">訓練${slotIdx + 1}</div>
        <div class="m-icon" style="opacity:0.4;font-size:18px;">＋</div>
        <div class="m-bot">空き</div>
      </div>`;
    }
    const disp = getMonsterVisual(m), st = getMonStats(m);
    const plusText = st.plus > 0 ? `+${st.plus}` : '';
    return `<div class="mini-mon-card train" onclick="removeFromTraining(${slotIdx})">
      <div class="m-top"><span class="m-lv">Lv.${st.lv}</span><span class="m-tag train">解除</span></div>
      <div class="m-icon">${renderSprite(disp, 30, '6px')}</div>
      <div class="m-bot">${plusText ? `<span class="m-plus">${plusText}</span>` : `<span class="m-nm">${m.name}</span>`}</div>
    </div>`;
  }).join('');
}

function assignTrainingFromModal() {
  const m = captured.slice(selectedMonIdx, selectedMonIdx + 1).pop();
  if (!m) return;
  if (party.includes(m.id)) return alert('バトル編成中のモンスターは訓練場に入れられません。先にパーティから外してください。');
  const limit = Math.min(20, Math.max(3, Number(maxTrainingSlots) || 3));
  if (!Array.isArray(trainingSlots)) trainingSlots = [];
  while (trainingSlots.length < limit) trainingSlots.push(null);

  if (trainingSlots.includes(m.id)) return alert('すでに訓練場に入っています。');
  const empty = trainingSlots.findIndex(x => x === null);
  if (empty === -1) return alert(`訓練場（${limit}枠）がいっぱいです。「訓練場」タブの［＋］ボタンで枠を拡張するか、配置中の仲間を外してください。`);
  trainingSlots.splice(empty, 1, m.id);
  closeMonModal();
  renderTraining(); renderCaptured(); triggerAutoSave();
  showToast(`${m.name}を訓練場に配置しました`);
}
