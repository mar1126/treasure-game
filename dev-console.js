// ゲーム内AI開発コンソール (dev-console.js)
let devGeneratedCode = '';
let devTargetFile = '';

function initDevConsoleButton() {
  if (document.getElementById('dev-console-trigger')) return;
  const btn = document.createElement('button');
  btn.id = 'dev-console-trigger';
  btn.textContent = '🛠️ AI開発';
  btn.onclick = openDevConsoleModal;
  btn.style.cssText = [
    'position:fixed',
    'bottom:64px',
    'right:10px',
    'z-index:9990',
    'padding:6px 10px',
    'border-radius:20px',
    'border:1px solid #334155',
    'background:rgba(15,23,42,0.88)',
    'color:#f8fafc',
    'font-size:11px',
    'font-weight:bold',
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
    'cursor:pointer'
  ].join(';');
  document.body.appendChild(btn);
}

function openDevConsoleModal() {
  let modal = document.getElementById('dev-console-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dev-console-modal';
    modal.onclick = closeDevConsoleModal;
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);display:none;align-items:center;justify-content:center;z-index:9999;padding:10px;';
    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:16px;padding:14px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:14px;font-weight:900;color:#38bdf8;">🛠️ ゲーム内 AI開発コンソール</div>
          <button onclick="closeDevConsoleModal()" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
        </div>

        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">編集する対象ファイル</div>
        <select id="dev-file-select" style="width:100%;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:12px;margin-bottom:8px;">
          <option value="party.js">party.js（編成・訓練・仲間一覧）</option>
          <option value="breed.js">breed.js（配合システム）</option>
          <option value="cafe.js">cafe.js（酒場・店員・売上）</option>
          <option value="inventory.js">inventory.js（倉庫・料理開発・野に還す）</option>
          <option value="battle.js">battle.js（バトル進行・エフェクト）</option>
          <option value="game.js">game.js（メイン進行・UI更新）</option>
          <option value="monsters.js">monsters.js（モンスター種族・スキル）</option>
          <option value="storage.js">storage.js（セーブ・ロード）</option>
          <option value="index.html">index.html（画面HTML・スクリプト読込）</option>
        </select>

        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">AIへの修正・機能追加の指示</div>
        <textarea id="dev-instruction" rows="4" placeholder="例：〇〇のバグを直して / 〇〇のUIを元のデザインに戻して" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:12px;line-height:1.4;margin-bottom:8px;"></textarea>

        <button id="dev-gen-btn" onclick="runDevAgentGenerate()" style="width:100%;padding:10px;border-radius:10px;border:none;background:#0284c7;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">✨ AIに修正案を作成させる</button>

        <div id="dev-status-box" style="margin-top:8px;font-size:11.5px;color:#fbbf24;white-space:pre-wrap;"></div>

        <div id="dev-preview-area" style="display:none;margin-top:10px;border-top:1px solid #334155;padding-top:10px;">
          <div style="font-size:11px;font-weight:bold;color:#4ade80;margin-bottom:4px;">📋 AIの修正内容要約：</div>
          <div id="dev-summary-text" style="background:#1e293b;padding:8px;border-radius:8px;font-size:11.5px;color:#e2e8f0;margin-bottom:8px;"></div>

          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">修正後のコード（直接微調整も可）</div>
          <textarea id="dev-code-preview" rows="8" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #334155;background:#020617;color:#a5f3fc;font-family:monospace;font-size:10.5px;margin-bottom:8px;"></textarea>

          <button id="dev-commit-btn" onclick="runDevAgentCommit()" style="width:100%;padding:10px;border-radius:10px;border:none;background:#16a34a;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">🚀 GitHubへ反映（保存）する</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function closeDevConsoleModal() {
  const modal = document.getElementById('dev-console-modal');
  if (modal) modal.style.display = 'none';
}

async function runDevAgentGenerate() {
  const filePath = document.getElementById('dev-file-select')?.value;
  const instruction = document.getElementById('dev-instruction')?.value.trim();
  const statusEl = document.getElementById('dev-status-box');
  const genBtn = document.getElementById('dev-gen-btn');
  const previewArea = document.getElementById('dev-preview-area');

  if (!instruction) {
    alert('AIへの修正指示を入力してください');
    return;
  }

  genBtn.disabled = true;
  genBtn.textContent = '⏳ GitHub読込＆AI生成中（15〜30秒）...';
  statusEl.textContent = `${filePath} を読み込んで修正案を作成しています...`;
  previewArea.style.display = 'none';

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', filePath, instruction })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '生成失敗');

    devTargetFile = filePath;
    devGeneratedCode = data.code;
    document.getElementById('dev-summary-text').textContent = data.summary;
    document.getElementById('dev-code-preview').value = data.code;
    previewArea.style.display = 'block';
    statusEl.textContent = '✅ 修正案ができました！内容を確認して「GitHubへ反映」を押してください。';
  } catch (e) {
    statusEl.textContent = '❌ エラー: ' + e.message;
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = '✨ AIに修正案を作成させる';
  }
}

async function runDevAgentCommit() {
  const code = document.getElementById('dev-code-preview')?.value;
  const statusEl = document.getElementById('dev-status-box');
  const commitBtn = document.getElementById('dev-commit-btn');

  if (!devTargetFile || !code) return;
  if (!confirm(`${devTargetFile} をGitHubに上書き保存しますか？\n（万が一戻したい時はGitHubの履歴から1ボタンで戻せます）`)) return;

  commitBtn.disabled = true;
  commitBtn.textContent = '⏳ GitHubに保存中...';

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'commit',
        filePath: devTargetFile,
        newContent: code,
        commitMessage: `AI DevConsole: update ${devTargetFile}`
      })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '保存失敗');

    statusEl.textContent = '🎉 ' + data.message;
    alert(data.message);
  } catch (e) {
    statusEl.textContent = '❌ 保存エラー: ' + e.message;
  } finally {
    commitBtn.disabled = false;
    commitBtn.textContent = '🚀 GitHubへ反映（保存）する';
  }
}

window.addEventListener('DOMContentLoaded', initDevConsoleButton);
