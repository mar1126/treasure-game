// ゲーム内AI開発コンソール API（メイン＋user-save-do 全リポジトリ自動取得・一括コミット対応）
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { action, instruction, changes, commitMessage } = body;

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonRes({ error: 'Cloudflareに GITHUB_TOKEN または GITHUB_REPO が設定されていません' }, 500);
    }

    const mainRepo = env.GITHUB_REPO.trim();
    const extraRepos = (env.GITHUB_EXTRA_REPOS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const allRepos = [mainRepo, ...extraRepos];

    const ghHeaders = {
      'Authorization': 'token ' + env.GITHUB_TOKEN.trim(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Cloudflare-Pages-DevAgent/1.0'
    };

    if (action === 'generate_batch') {
      if (!env.GEMINI_API_KEY) return jsonRes({ error: 'GEMINI_API_KEY が未設定です' }, 500);

      const targetExts = ['.html', '.js', '.css', '.json', '.sql', '.md', '.toml'];
      const validFiles = [];

      for (const repo of allRepos) {
        const repoBase = 'https://github.com' + repo;
        const repoInfoRes = await fetch(repoBase, { headers: ghHeaders });
        if (!repoInfoRes.ok) {
          const errTxt = await repoInfoRes.text();
          return jsonRes({ error: repo + ' 取得失敗 (' + repoInfoRes.status + '): ' + errTxt.slice(0, 120) }, 400);
        }
        const repoInfo = await repoInfoRes.json();
        const branch = repoInfo.default_branch || 'main';

        const treeRes = await fetch(repoBase + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1', { headers: ghHeaders });
        if (!treeRes.ok) continue;
        const treeData = await treeRes.json();

        const blobs = (treeData.tree || []).filter(item =>
          item.type === 'blob' &&
          targetExts.some(ext => item.path.toLowerCase().endsWith(ext)) &&
          !item.path.startsWith('.')
        );

        const repoFiles = await Promise.all(blobs.map(async (blob) => {
          const res = await fetch(repoBase + '/contents/' + blob.path + '?ref=' + encodeURIComponent(branch), { headers: ghHeaders });
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
        '- 変更が不要なファイルは出力配列に含めないこと。',
        '- 出力は必ず以下のJSON形式のみ（マークダウンの ```json などは付けない生JSON）で返すこと：',
        '{"summary":"全体の変更要約（日本語）","files":[{"repo":"' + mainRepo + '","path":"ファイルパス","reason":"このファイルの変更点","code":"修正後の完全なコード"}]}',
        '',
        '【ユーザーの修正指示】',
        instruction,
        '',
        '【全リポジトリの全ファイル群（全' + validFiles.length + 'ファイル）】',
        filesBlock
      ].join('\n');

      const geminiUrl = 'https://googleapis.com' + env.GEMINI_API_KEY.trim();
      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!aiRes.ok) {
        const errTxt = await aiRes.text();
        return jsonRes({ error: 'Gemini APIエラー (' + aiRes.status + '): ' + errTxt }, 500);
      }

      const aiJson = await aiRes.json();
      const firstCand = Array.isArray(aiJson.candidates) ? aiJson.candidates[0] : null;
      const firstPart = (firstCand && firstCand.content && Array.isArray(firstCand.content.parts)) ? firstCand.content.parts[0] : null;
      const rawText = (firstPart && firstPart.text) ? firstPart.text : '{}';
      const parsed = JSON.parse(rawText);

      const resultFiles = (parsed.files || []).map(f => ({
        repo: f.repo || mainRepo,
        path: f.path,
        reason: f.reason || '',
        code: f.code
      }));

      return jsonRes({
        ok: true,
        scannedCount: validFiles.length,
        summary: parsed.summary || '一括修正案を作成しました',
        files: resultFiles
      });
    }

    if (action === 'commit_batch') {
      if (!Array.isArray(changes) || changes.length === 0) {
        return jsonRes({ error: '保存する変更ファイルがありません' }, 400);
      }

      const byRepo = {};
      changes.forEach(ch => {
        const r = ch.repo || mainRepo;
        if (!byRepo[r]) byRepo[r] = [];
        byRepo[r].push(ch);
      });

      const savedList = [];
      for (const [repo, repoChanges] of Object.entries(byRepo)) {
        const repoBase = 'https://github.com' + repo;
        const repoInfoRes = await fetch(repoBase, { headers: ghHeaders });
        if (!repoInfoRes.ok) return jsonRes({ error: repo + ' の情報取得に失敗しました' }, 500);
        const repoInfo = await repoInfoRes.json();
        const branch = repoInfo.default_branch || 'main';

        const refRes = await fetch(repoBase + '/git/ref/heads/' + encodeURIComponent(branch), { headers: ghHeaders });
        if (!refRes.ok) return jsonRes({ error: repo + ' のブランチ取得に失敗しました' }, 500);
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        const commitRes = await fetch(repoBase + '/git/commits/' + latestCommitSha, { headers: ghHeaders });
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const treeItems = repoChanges.map(ch => ({
          path: ch.path,
          mode: '100644',
          type: 'blob',
          content: ch.code
        }));

        const treeRes = await fetch(repoBase + '/git/trees', {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        if (!treeRes.ok) return jsonRes({ error: repo + ' のGit Tree作成に失敗しました' }, 500);
        const newTreeData = await treeRes.json();

        const newCommitRes = await fetch(repoBase + '/git/commits', {
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

        const updateRefRes = await fetch(repoBase + '/git/refs/heads/' + encodeURIComponent(branch), {
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
