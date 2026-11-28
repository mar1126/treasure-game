// ゲーム内AI一括開発コンソール（複数リポジトリ全ファイル自動検出版）(dev-console.js)
let devBatchFiles = [];

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:16px;padding:14px;width:100%;max-width:430px;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:900;color:#38bdf8;">🛠️ AI全自動一括開発コンソール</div>
          <button onclick="closeDevConsoleModal()" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
        </div>

        <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">全リポジトリ（ゲーム本体＋セーブサーバー）の全ファイルを自動検出し、必要な箇所だけをまとめて修正します。</div>
        <textarea id="dev-instruction" rows="5" placeholder="例：〇〇と〇〇のバグをまとめて直して / 元のデザインに戻して" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:12px;line-height:1.4;margin-bottom:8px;"></textarea>

        <button id="dev-gen-btn" onclick="runDevBatchGenerate()" style="width:100%;padding:10px;border-radius:10px;border:none;background:#0284c7;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">✨ 全リポジトリを自動解析して修正案を作成</button>

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

async function runDevBatchGenerate() {
  const instruction = document.getElementById('dev-instruction')?.value.trim();
  const statusEl = document.getElementById('dev-status-box');
  const genBtn = document.getElementById('dev-gen-btn');
  const previewArea = document.getElementById('dev-preview-area');

  if (!instruction) return alert('AIへの修正指示を入力してください');

  genBtn.disabled = true;
  genBtn.textContent = '⏳ 全リポジトリ自動読込＆AI生成中...';
  statusEl.textContent = 'GitHubの全リポジトリ（本体＋セーブサーバー）から全ファイルを自動取得して解析しています...';
  previewArea.style.display = 'none';

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_batch', instruction })
    });
    const rawResp = await res.text();
    let data = {};
    try {
      data = JSON.parse(rawResp);
    } catch (_) {
      throw new Error(`HTTP ${res.status}: ${rawResp.slice(0, 150) || '空レスポンス'}`);
    }
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}: 生成失敗`);

    devBatchFiles = data.files || [];
    document.getElementById('dev-summary-text').textContent = data.summary;

    const listEl = document.getElementById('dev-files-list');
    if (devBatchFiles.length === 0) {
      listEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;">変更が必要なファイルはありませんでした。</div>';
    } else {
      listEl.innerHTML = devBatchFiles.map((f, i) => `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;margin-bottom:6px;">
          <div style="font-size:11.5px;font-weight:bold;color:#38bdf8;">📄 ${escHtml((f.repo ? f.repo + '/' : '') + f.path)}</div>
          <div style="font-size:10.5px;color:#cbd5e1;margin:2px 0 6px;">${escHtml(f.reason)}</div>
          <textarea id="dev-batch-code-${i}" rows="5" style="width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid #334155;background:#020617;color:#a5f3fc;font-family:monospace;font-size:10px;">${escHtml(f.code)}</textarea>
        </div>
      `).join('');
    }

    previewArea.style.display = 'block';
    statusEl.textContent = `✅ 全${data.scannedCount || '?'}ファイルを読み込み、${devBatchFiles.length}個の修正案を作成しました！`;
  } catch (e) {
    statusEl.textContent = '❌ エラー: ' + e.message;
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = '✨ 全リポジトリを自動解析して修正案を作成';
  }
}

async function runDevBatchCommit() {
  if (!Array.isArray(devBatchFiles) || devBatchFiles.length === 0) return;
  const changes = devBatchFiles.map((f, i) => ({
    repo: f.repo,
    path: f.path,
    code: document.getElementById(`dev-batch-code-${i}`)?.value ?? f.code
  }));

  if (!confirm(`${changes.length}ファイル（${changes.map(c => (c.repo ? c.repo + '/' : '') + c.path).join(', ')}）をGitHubへ一括保存しますか？`)) return;

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
    const rawResp = await res.text();
    let data = {};
    try {
      data = JSON.parse(rawResp);
    } catch (_) {
      throw new Error(`HTTP ${res.status}: ${rawResp.slice(0, 150) || '空レスポンス'}`);
    }
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}: 保存失敗`);

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
