// ゲーム内AI一括開発コンソール（マルチモーダル対話・添付・全リポジトリ対応版）(dev-console.js)
let devBatchFiles = [];
let devChatHistory = [];
let devAttachments = [];
const DEV_ADMIN_USER_IDS = ['H-ORM8PM4M'];

function isDevAdminUser() {
  const currentUid = (typeof userId !== 'undefined' && userId) ? userId : localStorage.getItem('treasure_uid');
  return DEV_ADMIN_USER_IDS.includes(String(currentUid || ''));
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function copyDevText(text, btn) {
  if (!text) return;
  const finish = () => {
    if (btn) {
      const orig = btn.getAttribute('data-orig-text') || btn.textContent;
      if (!btn.getAttribute('data-orig-text')) btn.setAttribute('data-orig-text', orig);
      btn.textContent = '✅ コピー完了';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
  } else {
    fallbackCopy(text, finish);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
  if (cb) cb();
}

function copyDevLogMessage(btn) {
  const card = btn.closest('.dev-chat-card');
  if (!card) return;
  const bodyEl = card.querySelector('.dev-msg-body');
  if (bodyEl) {
    copyDevText(bodyEl.innerText || bodyEl.textContent, btn);
  }
}

function copyDevCodeBlock(elementId, btn) {
  const el = document.getElementById(elementId);
  if (el) {
    copyDevText(el.value || el.innerText || el.textContent, btn);
  }
}

function initDevConsoleButton() {
  const existing = document.getElementById('dev-console-trigger');
  if (!isDevAdminUser()) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  const btn = document.createElement('button');
  btn.id = 'dev-console-trigger';
  btn.textContent = '🛠️ AI開発';
  btn.onclick = openDevConsoleModal;
  btn.style.cssText = 'position:fixed;bottom:64px;right:10px;z-index:9990;padding:6px 10px;border-radius:20px;border:1px solid #334155;background:rgba(15,23,42,0.88);color:#f8fafc;font-size:11px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;';
  document.body.appendChild(btn);
}

function openDevConsoleModal() {
  if (!isDevAdminUser()) {
    alert('管理者権限がありません。');
    return;
  }

  let modal = document.getElementById('dev-console-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dev-console-modal';
    modal.onclick = closeDevConsoleModal;
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);display:none;align-items:center;justify-content:center;z-index:9999;padding:10px;';
    modal.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:16px;padding:14px;width:100%;max-width:460px;max-height:94vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:14px;font-weight:900;color:#38bdf8;">🛠️ AI開発コンソール（対話＆マルチモーダル）</div>
          <button onclick="closeDevConsoleModal()" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
        </div>

        <div style="font-size:11px;color:#94a3b8;">会話でAIと相談しながら仕様を詰め、修正案を作成・確認・コミットできます。</div>

        <!-- 対話チャットログ -->
        <div id="dev-chat-log" style="background:#020617;border:1px solid #334155;border-radius:10px;padding:10px;max-height:200px;min-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;font-size:11.5px;line-height:1.45;">
          <div style="color:#64748b;font-style:italic;text-align:center;">💡 開発アシスタントが待機中。指示や質問、ファイル添付を行ってください。</div>
        </div>

        <!-- 添付ファイル一覧表示 -->
        <div id="dev-attachment-list" style="display:none;flex-wrap:wrap;gap:6px;background:#1e293b;padding:6px;border-radius:8px;border:1px solid #334155;"></div>

        <!-- 添付ボタン ＆ 指示入力欄 -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <label style="font-size:11px;color:#cbd5e1;font-weight:bold;">指示・質問入力欄:</label>
            <button onclick="document.getElementById('dev-file-input').click()" style="background:#1e293b;color:#38bdf8;border:1px solid #0284c7;border-radius:6px;padding:2px 8px;font-size:10.5px;font-weight:bold;cursor:pointer;">📎 画像・ファイル添付</button>
            <input type="file" id="dev-file-input" multiple accept="image/*,.js,.html,.css,.json,.txt,.md,.sql" style="display:none;" onchange="handleDevFileSelect(event)">
          </div>
          <textarea id="dev-instruction" rows="3" placeholder="例：〇〇機能の不具合原因を教えて / アトリエUIを明るいカラーに変更して" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:12px;line-height:1.4;"></textarea>
        </div>

        <!-- 送信アクションボタン群 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button id="dev-chat-btn" onclick="runDevChatSubmit('chat')" style="padding:9px;border-radius:8px;border:none;background:#3b82f6;color:#fff;font-size:11.5px;font-weight:bold;cursor:pointer;">💬 相談・質問する<br><span style="font-size:9.5px;font-weight:normal;opacity:0.9;">(コード変更なし)</span></button>
          <button id="dev-gen-btn" onclick="runDevChatSubmit('generate_batch')" style="padding:9px;border-radius:8px;border:none;background:#0284c7;color:#fff;font-size:11.5px;font-weight:bold;cursor:pointer;">✨ 修正案を作成して反映準備する</button>
        </div>

        <div id="dev-status-box" style="font-size:11px;color:#fbbf24;white-space:pre-wrap;"></div>

        <!-- 修正プレビュー・コミットエリア -->
        <div id="dev-preview-area" style="display:none;border-top:1px solid #334155;padding-top:10px;">
          <div style="font-size:11px;font-weight:bold;color:#4ade80;margin-bottom:4px;">📋 一括修正の要約：</div>
          <div id="dev-summary-text" style="background:#1e293b;padding:8px;border-radius:8px;font-size:11.5px;color:#e2e8f0;margin-bottom:8px;"></div>
          <div id="dev-files-list" style="margin-bottom:8px;"></div>
          
          <button id="dev-ui-preview-btn" onclick="runDevUiPreview()" style="width:100%;padding:9px;border-radius:8px;border:none;background:#8b5cf6;color:#fff;font-size:12px;font-weight:bold;cursor:pointer;margin-bottom:8px;">👁️ 変更後のUI画面をプレビュー確認する</button>
          
          <div id="dev-iframe-container" style="display:none;margin-bottom:10px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">📱 スマホ画面プレビュー枠（375px × 600px相当）</div>
            <div style="width:375px;height:600px;max-width:100%;margin:0 auto;border:2px solid #475569;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.5);">
              <iframe id="dev-preview-iframe" sandbox="allow-scripts allow-same-origin" style="width:100%;height:100%;border:none;background:#ffffff;"></iframe>
            </div>
          </div>

          <button id="dev-commit-btn" onclick="runDevBatchCommit()" style="width:100%;padding:10px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:12.5px;font-weight:bold;cursor:pointer;">🚀 修正ファイルをGitHubへ一括保存する</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  renderDevChatLog();
}

function closeDevConsoleModal() {
  const modal = document.getElementById('dev-console-modal');
  if (modal) modal.style.display = 'none';
}

function resizeImageFile(file, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64Data = dataUrl.split(',')[1];
        resolve({ mimeType, data: base64Data, previewUrl: dataUrl });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleDevFileSelect(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const imgObj = await resizeImageFile(file, 1024);
        devAttachments.push({
          type: 'image',
          name: file.name,
          mimeType: imgObj.mimeType,
          data: imgObj.data,
          previewUrl: imgObj.previewUrl
        });
      } catch (e) {
        alert('画像の読み込みに失敗しました: ' + file.name);
      }
    } else {
      try {
        const text = await file.text();
        devAttachments.push({
          type: 'text',
          name: file.name,
          content: text
        });
      } catch (e) {
        alert('ファイルの読み込みに失敗しました: ' + file.name);
      }
    }
  }
  event.target.value = '';
  renderDevAttachments();
}

function removeDevAttachment(idx) {
  devAttachments.splice(idx, 1);
  renderDevAttachments();
}

function renderDevAttachments() {
  const listEl = document.getElementById('dev-attachment-list');
  if (!listEl) return;

  if (devAttachments.length === 0) {
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  listEl.style.display = 'flex';
  listEl.innerHTML = devAttachments.map((att, idx) => {
    if (att.type === 'image') {
      return `
        <div style="position:relative;width:44px;height:44px;border:1px solid #0284c7;border-radius:6px;overflow:hidden;background:#0f172a;">
          <img src="${att.previewUrl}" style="width:100%;height:100%;object-fit:cover;">
          <button onclick="removeDevAttachment(${idx})" style="position:absolute;top:1px;right:1px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:14px;height:14px;font-size:9px;line-height:1;cursor:pointer;">✕</button>
        </div>
      `;
    }
    return `
      <div style="display:inline-flex;align-items:center;gap:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:2px 6px;border-radius:6px;font-size:10px;">
        <span>📄 ${escHtml(att.name)}</span>
        <button onclick="removeDevAttachment(${idx})" style="background:none;border:none;color:#ef4444;font-size:11px;font-weight:bold;cursor:pointer;">✕</button>
      </div>
    `;
  }).join('');
}

function renderDevChatLog() {
  const logEl = document.getElementById('dev-chat-log');
  if (!logEl) return;

  if (devChatHistory.length === 0) {
    logEl.innerHTML = '<div style="color:#64748b;font-style:italic;text-align:center;">💡 開発アシスタントが待機中。指示や質問、ファイル添付を行ってください。</div>';
    return;
  }

  logEl.innerHTML = devChatHistory.map(h => {
    const isUser = h.role === 'user';
    const bg = isUser ? '#1e293b' : '#0f2744';
    const border = isUser ? '#334155' : '#0284c7';
    const title = isUser ? '👤 あなた' : '🤖 AIアシスタント';

    let attHtml = '';
    if (Array.isArray(h.attachments) && h.attachments.length > 0) {
      attHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">` +
        h.attachments.map(att => att.type === 'image'
          ? `<img src="${att.previewUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #0284c7;">`
          : `<span style="font-size:9.5px;background:#0f172a;padding:1px 5px;border-radius:4px;border:1px solid #334155;">📄 ${escHtml(att.name)}</span>`
        ).join('') +
        `</div>`;
    }

    const isModel = h.role === 'model';
    const titleHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="font-size:10px;font-weight:bold;color:${isUser ? '#94a3b8' : '#38bdf8'};">${title}</div>
        ${isModel ? `<button onclick="copyDevLogMessage(this)" style="background:#0f172a;color:#38bdf8;border:1px solid #0284c7;border-radius:4px;padding:2px 8px;font-size:9.5px;font-weight:bold;cursor:pointer;transition:all 0.15s ease;">📋 コピー</button>` : ''}
      </div>
    `;


    return `
      <div class="dev-chat-card" style="background:${bg};border:1px solid ${border};border-radius:8px;padding:7px 9px;">
        ${titleHtml}
        <div class="dev-msg-body" style="color:#f8fafc;white-space:pre-wrap;">${escHtml(h.text)}</div>
        ${attHtml}
      </div>
    `;
  }).join('');

  logEl.scrollTop = logEl.scrollHeight;
}

async function runDevChatSubmit(actionType) {
  const instructionEl = document.getElementById('dev-instruction');
  const instruction = instructionEl ? instructionEl.value.trim() : '';
  const statusEl = document.getElementById('dev-status-box');
  const chatBtn = document.getElementById('dev-chat-btn');
  const genBtn = document.getElementById('dev-gen-btn');
  const previewArea = document.getElementById('dev-preview-area');

  if (!instruction && devAttachments.length === 0) {
    return alert('AIへの指示・質問または添付ファイルを入力してください');
  }
  if (!isDevAdminUser()) return alert('管理者権限が必要です');

  const currentUserId = (typeof userId !== 'undefined' && userId) ? userId : localStorage.getItem('treasure_uid');

  if (chatBtn) chatBtn.disabled = true;
  if (genBtn) genBtn.disabled = true;

  const currentAtts = [...devAttachments];
  const reqImages = currentAtts.filter(a => a.type === 'image').map(a => ({ mimeType: a.mimeType, data: a.data }));
  const reqTexts = currentAtts.filter(a => a.type === 'text').map(a => ({ name: a.name, content: a.content }));
  const reqMode = actionType === 'chat' ? 'consult' : 'generate';

  if (actionType === 'chat') {
    statusEl.textContent = '⏳ AI回答を生成中...';
  } else {
    statusEl.textContent = '⏳ 全リポジトリを読み込んで修正案を解析・作成中...';
    previewArea.style.display = 'none';
  }

  try {
    const res = await fetch('/api/dev-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionType,
        mode: reqMode,
        instruction,
        chatHistory: devChatHistory,
        images: reqImages,
        attachments: reqTexts,
        userId: currentUserId
      })
    });

    const rawResp = await res.text();
    let data = {};
    try { data = JSON.parse(rawResp); } catch (_) {
      throw new Error(`HTTP ${res.status}: ${rawResp.slice(0, 150) || '空レスポンス'}`);
    }
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}: 処理失敗`);

    // チャット履歴追加
    devChatHistory.push({
      role: 'user',
      text: instruction || '（ファイルの確認・解析リクエスト）',
      attachments: currentAtts
    });

    if (actionType === 'chat' || reqMode === 'consult') {
      devChatHistory.push({
        role: 'model',
        text: data.reply || 'ご質問への回答を作成しました。'
      });
      statusEl.textContent = '✅ 回答を受信しました！';
    } else {
      devBatchFiles = data.files || [];
      const summaryText = data.summary || '一括修正案を作成しました。';
      
      devChatHistory.push({
        role: 'model',
        text: `【修正案作成完了】\n${summaryText}\n(対象ファイル: ${devBatchFiles.length}件)`
      });

      document.getElementById('dev-summary-text').textContent = summaryText;

      const listEl = document.getElementById('dev-files-list');
      if (devBatchFiles.length === 0) {
        listEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;">変更が必要なファイルはありませんでした。</div>';
      } else {
        listEl.innerHTML = devBatchFiles.map((f, i) => `
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <div style="font-size:11.5px;font-weight:bold;color:#38bdf8;">📄 ${escHtml((f.repo ? f.repo + '/' : '') + f.path)}</div>
              <button onclick="copyDevCodeBlock('dev-batch-code-${i}', this)" style="background:#0f172a;color:#38bdf8;border:1px solid #0284c7;border-radius:4px;padding:2px 7px;font-size:9.5px;font-weight:bold;cursor:pointer;">📋 コピー</button>
            </div>
            <div style="font-size:10.5px;color:#cbd5e1;margin:2px 0 6px;">${escHtml(f.reason)}</div>
            <textarea id="dev-batch-code-${i}" rows="5" style="width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid #334155;background:#020617;color:#a5f3fc;font-family:monospace;font-size:10px;">${escHtml(f.code)}</textarea>
          </div>
        `).join('');
      }

      previewArea.style.display = 'block';
      statusEl.textContent = `✅ 全${data.scannedCount || '?'}ファイルを解析し、${devBatchFiles.length}個の修正案を作成しました！`;
    }

    if (instructionEl) instructionEl.value = '';
    devAttachments = [];
    renderDevAttachments();
    renderDevChatLog();
  } catch (e) {
    statusEl.textContent = '❌ エラー: ' + e.message;
  } finally {
    if (chatBtn) chatBtn.disabled = false;
    if (genBtn) genBtn.disabled = false;
  }
}

async function runDevUiPreview() {
  const container = document.getElementById('dev-iframe-container');
  const iframe = document.getElementById('dev-preview-iframe');
  if (!container || !iframe) return;

  container.style.display = 'block';

  let baseHtml = '';
  const indexFileIdx = devBatchFiles.findIndex(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
  if (indexFileIdx !== -1) {
    baseHtml = document.getElementById(`dev-batch-code-${indexFileIdx}`)?.value ?? devBatchFiles[indexFileIdx].code;
  } else {
    try {
      const res = await fetch(window.location.pathname || '/');
      if (res.ok) {
        baseHtml = await res.text();
      } else {
        baseHtml = document.documentElement.outerHTML;
      }
    } catch (e) {
      baseHtml = document.documentElement.outerHTML;
    }
  }

  devBatchFiles.forEach((f, i) => {
    const code = document.getElementById(`dev-batch-code-${i}`)?.value ?? f.code;
    const filename = f.path.split('/').pop();
    if (!filename) return;

    if (f.path.endsWith('.js')) {
      const scriptReg = new RegExp(`<script[^>]*src=["'][^"']*${filename.replace('.', '\\.')}(?:\\?[^"']*)?["'][^>]*>\\s*<\\/script>`, 'gi');
      if (scriptReg.test(baseHtml)) {
        baseHtml = baseHtml.replace(scriptReg, `<script>${code.replace(/<\/script>/gi, '<\\/script>')}</script>`);
      } else {
        baseHtml = baseHtml.replace('</body>', `<script>${code.replace(/<\/script>/gi, '<\\/script>')}</script></body>`);
      }
    } else if (f.path.endsWith('.css')) {
      const linkReg = new RegExp(`<link[^>]*href=["'][^"']*${filename.replace('.', '\\.')}(?:\\?[^"']*)?["'][^>]*>`, 'gi');
      if (linkReg.test(baseHtml)) {
        baseHtml = baseHtml.replace(linkReg, `<style>${code.replace(/<\/style>/gi, '<\\/style>')}</style>`);
      } else {
        baseHtml = baseHtml.replace('</head>', `<style>${code.replace(/<\/style>/gi, '<\\/style>')}</style></head>`);
      }
    }
  });

  iframe.srcdoc = baseHtml;
}

async function runDevBatchCommit() {
  if (!Array.isArray(devBatchFiles) || devBatchFiles.length === 0) return;
  if (!isDevAdminUser()) return alert('管理者権限が必要です');

  const currentUserId = (typeof userId !== 'undefined' && userId) ? userId : localStorage.getItem('treasure_uid');

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
      body: JSON.stringify({ action: 'commit_batch', changes, userId: currentUserId })
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

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initDevConsoleButton);
  setTimeout(initDevConsoleButton, 1000);
  setInterval(initDevConsoleButton, 2000);
}