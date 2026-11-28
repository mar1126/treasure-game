// ゲーム内AI開発コンソール API（メイン＋user-save-do 全リポジトリ自動取得・一括コミット対応）
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { action, instruction, changes, commitMessage } = body;

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonRes({ error: 'Cloudflareに GITHUB_TOKEN または GITHUB_REPO が設定されていません' }, 500);
    }

    const cleanRepo = s => String(s || '')
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git\$/i, '')
      .replace(/^\/+|\/+\$/g, '');

    const mainRepo = cleanRepo(env.GITHUB_REPO);
    const extraRepos = (env.GITHUB_EXTRA_REPOS || '')
      .split(',')
      .map(cleanRepo)
      .filter(Boolean);
    const allRepos = [mainRepo, ...extraRepos];

    const ghOrigin = ['https://', 'api.', 'github.com'].join('');
    const ghApi = (path) => ghOrigin + path;
    const ghHeaders = {
      'Authorization': 'Bearer ' + env.GITHUB_TOKEN.trim(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Cloudflare-Pages-DevAgent'
    };

    if (action === 'generate_batch') {
      if (!env.GEMINI_API_KEY) return jsonRes({ error: 'GEMINI_API_KEY が未設定です' }, 500);

      const targetExts = ['.html', '.js', '.css', '.json', '.sql', '.md', '.toml'];
      const validFiles = [];

      for (const repo of allRepos) {
        const repoUrl = ghApi('/repos/' + repo);
        const repoInfoRes = await fetch(repoUrl, { headers: ghHeaders });
        if (!repoInfoRes.ok) {
          const errTxt = await repoInfoRes.text();
          return jsonRes({ error: repoUrl + ' 取得失敗 (' + repoInfoRes.status + '): ' + errTxt.slice(0, 120) }, 400);
        }
        const repoInfo = await repoInfoRes.json();
        const branch = repoInfo.default_branch || 'main';

        const treeUrl = ghApi('/repos/' + repo + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1');
        const treeRes = await fetch(treeUrl, { headers: ghHeaders });
        if (!treeRes.ok) continue;
        const treeData = await treeRes.json();

        const blobs = (treeData.tree || []).filter(item =>
          item.type === 'blob' &&
          targetExts.some(ext => item.path.toLowerCase().endsWith(ext)) &&
          !item.path.startsWith('.')
        );

        const repoFiles = await Promise.all(blobs.map(async (blob) => {
          const fileUrl = ghApi('/repos/' + repo + '/contents/' + blob.path + '?ref=' + encodeURIComponent(branch));
          const res = await fetch(fileUrl, { headers: ghHeaders });
          if (!res.ok) return null;
          const data = await res.json();
          return {
            repo,
            path: blob.path,
            content: decodeBase64Utf8(data.content)
          };
        }));

        repoFiles.filter(Boolean).forEach(f => validFiles.push(f));
      }

      const filesBlock = validFiles
        .map(f => '=== REPO: ' + f.repo + ' | FILE: ' + f.path + ' ===\n' + f.content + '\n=== END FILE ===')
        .join('\n\n');

      const prompt = [
        'あなたはWebブラウザRPG（フロントエンド: ' + mainRepo + ' / セーブ・通信サーバー: ' + (extraRepos.join(', ') || 'なし') + '）の熟練エンジニアです。',
        '全リポジトリ内の全' + validFiles.length + 'ファイルを読み込み、ユーザーの指示に従って【修正が必要なファイルのみ】を修正した完全なコードを出力してください。',
        '',
        '【絶対厳守ルール】',
        '- 指示されていない既存のUI、CSS、計算式、関数名、変数名を勝手に変更・削除しないこと。',
        '- フロントエンドとサーバー（user-save-do）間のAPI仕様やセーブデータ構造の整合性を完全に一致させること。',
        '- 「// 省略」「// 既存コードと同じ」などの省略は絶対にせず、修正するファイルは先頭から末尾まで完全なコードを出力すること。',
        '- 変更が不要なファイルは出力しないこと。',
        '- JSONは使わず、必ず以下の専用ブロック形式のみで出力すること（マークダウンの ``` は絶対に付けない）：',
        '',
        '<<<SUMMARY>>>',
        '全体の変更要約（日本語）',
        '<<<END_SUMMARY>>>',
        '<<<FILE:' + mainRepo + ':ファイルパス>>>',
        '<<<REASON>>>このファイルの変更理由<<<END_REASON>>>',
        '修正後の完全なコード（先頭から末尾まで省略なし）',
        '<<<END_FILE>>>',
        '',
        '【ユーザーの修正指示】',
        instruction,
        '',
        '【全リポジトリの全ファイル群（全' + validFiles.length + 'ファイル）】',
        filesBlock
      ].join('\n');
      const geminiOrigin = ['https://', 'generativelanguage.', 'googleapis.com'].join('');
      const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview'];
      let aiJson = null;
      let lastErr = '';

      for (const model of models) {
        const geminiUrl = geminiOrigin + '/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY.trim());
        const aiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 65536 }
          })
        });

        if (aiRes.ok) {
          aiJson = await aiRes.json();
          break;
        }
        lastErr = await aiRes.text();
      }

      if (!aiJson) {
        return jsonRes({ error: 'Gemini APIエラー: ' + lastErr }, 500);
      }

      const candList = Array.isArray(aiJson.candidates) ? aiJson.candidates : [];
      const cand0 = candList.length > 0 ? candList.at(0) : null;
      const partList = (cand0 && cand0.content && Array.isArray(cand0.content.parts)) ? cand0.content.parts : [];
      const part0 = partList.length > 0 ? partList.at(0) : null;
      const rawText = (part0 && typeof part0.text === 'string') ? part0.text : '';

      const sumMatch = rawText.match(/<<<SUMMARY>>>([\s\S]*?)<<<END_SUMMARY>>>/);
      const summary = sumMatch ? sumMatch.at(1).trim() : '一括修正案を作成しました';

      const resultFiles = [];
      const fileRegex = /<<<FILE:([^:>]+):([^>]+)>>>([\s\S]*?)<<<END_FILE>>>/g;
      let m;
      while ((m = fileRegex.exec(rawText)) !== null) {
        const fRepo = cleanRepo(m.at(1)) || mainRepo;
        const fPath = String(m.at(2) || '').trim();
        let bodyText = String(m.at(3) || '');
        let reason = '';
        const rMatch = bodyText.match(/<<<REASON>>>([\s\S]*?)<<<END_REASON>>>/);
        if (rMatch) {
          reason = rMatch.at(1).trim();
          bodyText = bodyText.replace(rMatch.at(0), '');
        }
        const cleanCode = bodyText.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
        if (fPath && cleanCode) {
          resultFiles.push({ repo: fRepo, path: fPath, reason, code: cleanCode });
        }
      }

      return jsonRes({
        ok: true,
        scannedCount: validFiles.length,
        summary,
        files: resultFiles
      });
    }

    if (action === 'commit_batch') {
      if (!Array.isArray(changes) || changes.length === 0) {
        return jsonRes({ error: '保存する変更ファイルがありません' }, 400);
      }

      const byRepo = {};
      changes.forEach(ch => {
        const r = cleanRepo(ch.repo) || mainRepo;
        if (!byRepo[r]) byRepo[r] = [];
        byRepo[r].push(ch);
      });

      const savedList = [];
      for (const [repo, repoChanges] of Object.entries(byRepo)) {
        const repoInfoRes = await fetch(ghApi('/repos/' + repo), { headers: ghHeaders });
        if (!repoInfoRes.ok) return jsonRes({ error: repo + ' の情報取得に失敗しました' }, 500);
        const repoInfo = await repoInfoRes.json();
        const branch = repoInfo.default_branch || 'main';

        const refRes = await fetch(ghApi('/repos/' + repo + '/git/ref/heads/' + encodeURIComponent(branch)), { headers: ghHeaders });
        if (!refRes.ok) return jsonRes({ error: repo + ' のブランチ取得に失敗しました' }, 500);
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        const commitRes = await fetch(ghApi('/repos/' + repo + '/git/commits/' + latestCommitSha), { headers: ghHeaders });
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const treeItems = repoChanges.map(ch => ({
          path: ch.path,
          mode: '100644',
          type: 'blob',
          content: ch.code
        }));

        const treeRes = await fetch(ghApi('/repos/' + repo + '/git/trees'), {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        if (!treeRes.ok) return jsonRes({ error: repo + ' のGit Tree作成に失敗しました' }, 500);
        const newTreeData = await treeRes.json();

        const newCommitRes = await fetch(ghApi('/repos/' + repo + '/git/commits'), {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commitMessage || 'AI DevConsole Batch (' + repoChanges.map(c => c.path).join(', ') + ')',
            tree: newTreeData.sha,
            parents: [latestCommitSha]
          })
        });
        if (!newCommitRes.ok) return jsonRes({ error: repo + ' のコミット作成に失敗しました' }, 500);
        const newCommitData = await newCommitRes.json();

        const updateRefRes = await fetch(ghApi('/repos/' + repo + '/git/refs/heads/' + encodeURIComponent(branch)), {
          method: 'PATCH',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommitData.sha })
        });
        if (!updateRefRes.ok) return jsonRes({ error: repo + ' のブランチ更新に失敗しました' }, 500);

        repoChanges.forEach(c => savedList.push(repo + '/' + c.path));
      }

      return jsonRes({
        ok: true,
        message: savedList.length + 'ファイル（' + savedList.join(', ') + '）をGitHubへ一括保存しました！約30秒後に自動反映されます。'
      });
    }

    return jsonRes({ error: '不明なactionです' }, 400);
  } catch (e) {
    return jsonRes({ error: e.message || 'サーバーエラーが発生しました' }, 500);
  }
}

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function decodeBase64Utf8(b64) {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
