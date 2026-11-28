// ゲーム内AI開発コンソール（複数ファイル一括対応版）(dev-console.js)
let devBatchFiles = [];

const DEV_ALL_FILES = [
  { path: 'index.html', label: 'index.html（画面HTML）' },
  { path: 'game.js', label: 'game.js（メイン進行）' },
  { path: 'party.js', label: 'party.js（編成・仲間）' },
  { path: 'breed.js', label: 'breed.js（配合）' },
  { path: 'cafe.js', label: 'cafe.js（酒場）' },
  { path: 'inventory.js', label: 'inventory.js（倉庫・料理）' },
  { path: 'battle.js', label: 'battle.js（バトル）' },
  { path: 'monsters.js', label: 'monsters.js（種族・スキル）' },
  { path: 'storage.js', label: 'storage.js（セーブ・ロード）' },
  { path: 'atelier.js', label: 'atelier.js（アトリエ）' }
];

function initDevConsoleButton() {
  if (document.getElementById('dev-console-trigger')) return;
  const btn = document.createElement('button');
  btn.id = 'dev-console-trigger';
  btn.textContent = '🛠️ AI開発';
  btn.onclick = openDevConsoleModal;
  btn.style.cssText = 'position:fixed;bottom:64px;right:10px;z-index:9990;padding:6px 10px;border-radius:20px;border:1px solid #334155;background:rgba(15,23,42,0.88);color:#f8fafc;font-size:11px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;';
  document.body.appendChild(btn);
}

function openDevConsoleModal() {
  let modal = document.getElementById('dev-console-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dev-console-modal';
    modal.onclick = closeDevConsoleModal;
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);display:none;align-items:center;justify-content:center;z-index:9999;padding:10px;';

    const checksHtml = DEV_ALL_FILES.map(f => `
      <label style="display:flex;align-items:center;gap:4px;font-size:10.5px;background:#1e293b;padding:4px 6px;border-radius:6px;cursor:pointer;">
        <input type="checkbox" class="dev-file-chk" value="${f.path}" checked>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.label}</span>
      </label>
    `).join('');

    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:16px;padding:14px;width:100%;max-width:430px;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:900;color:#38bdf8;">🛠️ AI一括開発コンソール</div>
          <button onclick="closeDevConsoleModal()" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:11px;color:#94a3b8;">AIに読み込ませるファイル（複数選択可）</span>
          <button onclick="toggleAllDevFiles()" style="font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer;">全選択/解除</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;">
          ${checksHtml}
        </div>

        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">AIへの一括修正・機能追加の指示</div>
        <textarea id="dev-instruction" rows="4" placeholder="例：〇〇と〇〇のバグをまとめて直して / 元のUIに戻して" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:12px;line-height:1.4;margin-bottom:8px;"></textarea>

        <button id="dev-gen-btn" onclick="runDevBatchGenerate()" style="width:100%;padding:10px;border-radius:10px;border:none;background:#0284c7;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">✨ 選択ファイルを一括解析して修正案を作成</button>

        <div id="dev-status-box" style="margin-top:8px;font-size:11.5px;color:#fbbf24;white-space:pre-wrap;"></div>

        <div id="dev-preview-area" style="display:none;margin-top:10px;border-top:1px solid #334155;padding-top:10px;">
          <div style="font-size:11px;font-weight:bold;color:#4ade80;margin-bottom:4px;">📋 一括修正の要約：</div>
          <div id="dev-summary-text" style="background:#1e293b;padding:8px;border-radius:8px;font-size:11.5px;color:#e2e8f0;margin-bottom:8px;"></div>
          <div id="dev-files-list" style="margin-bottom:8px;"></div>
          <button id="dev-commit-btn" onclick="runDevBatchCommit()" style="width:100%;padding:10px;border-radius:10px;border:none;background:#16a34a;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">🚀 修正ファイルをGitHubへ一括保存する</button>
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

function toggleAllDevFiles() {
  const chks = Array.from(document.querySelectorAll('.dev-file-chk'));
  const allChecked = chks.every(c => c.checked);
  chks.forEach(c => { c.checked = !allChecked; });
}

async function runDevBatchGenerate() {
  const filePaths = Array.from(document.querySelectorAll('.dev-file-chk:checked')).map(c => c.value);
  const instruction = document.getElementById('dev-instruction')?.value.trim();
  const statusEl = document.getElementById('dev-status-box');
  const genBtn = document.getElementById('dev-gen-btn');
  const previewArea = document.getElementById('dev-preview-area');

  if (filePaths.length === 0) return alert('対象ファイルを1つ以上チェックしてください');
  if (!instruction) return alert('AIへの修正指示を入力してください');

  genBtn.disabled = true;
  genBtn.textContent = '⏳ 複数ファイル一括解析＆生成中（20〜40秒）...';
  statusEl.textContent = `${filePaths.length}個のファイルをGitHubから読み込んで一括解析しています...`;
  previewArea.style.display = 'none';

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_batch', filePaths, instruction })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '生成失敗');

    devBatchFiles = data.files || [];
    document.getElementById('dev-summary-text').textContent = data.summary;

    const listEl = document.getElementById('dev-files-list');
    if (devBatchFiles.length === 0) {
      listEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;">変更が必要なファイルはありませんでした。</div>';
    } else {
      listEl.innerHTML = devBatchFiles.map((f, i) => `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;margin-bottom:6px;">
          <div style="font-size:11.5px;font-weight:bold;color:#38bdf8;">📄 ${f.path}</div>
          <div style="font-size:10.5px;color:#cbd5e1;margin:2px 0 6px;">${f.reason}</div>
          <textarea id="dev-batch-code-${i}" rows="5" style="width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid #334155;background:#020617;color:#a5f3fc;font-family:monospace;font-size:10px;">${f.code}</textarea>
        </div>
      `).join('');
    }

    previewArea.style.display = 'block';
    statusEl.textContent = `✅ ${devBatchFiles.length}個のファイルの修正案ができました！内容を確認して「一括保存」を押してください。`;
  } catch (e) {
    statusEl.textContent = '❌ エラー: ' + e.message;
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = '✨ 選択ファイルを一括解析して修正案を作成';
  }
}

async function runDevBatchCommit() {
  if (!Array.isArray(devBatchFiles) || devBatchFiles.length === 0) return;
  const changes = devBatchFiles.map((f, i) => ({
    path: f.path,
    code: document.getElementById(`dev-batch-code-${i}`)?.value ?? f.code
  }));

  if (!confirm(`${changes.length}ファイル（${changes.map(c => c.path).join(', ')}）を1回のコミットでGitHubへ一括保存しますか？`)) return;

  const statusEl = document.getElementById('dev-status-box');
  const commitBtn = document.getElementById('dev-commit-btn');
  commitBtn.disabled = true;
  commitBtn.textContent = '⏳ 一括保存中...';

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'commit_batch', changes })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '保存失敗');

    statusEl.textContent = '🎉 ' + data.message;
    alert(data.message);
  } catch (e) {
    statusEl.textContent = '❌ 保存エラー: ' + e.message;
  } finally {
    commitBtn.disabled = false;
    commitBtn.textContent = '🚀 修正ファイルをGitHubへ一括保存する';
  }
}

window.addEventListener('DOMContentLoaded', initDevConsoleButton);
