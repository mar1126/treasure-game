// ゲーム内AI開発コンソール API（マルチモーダル対話・添付・全リポジトリ自動取得・コミット対応）
const ADMIN_USER_IDS = ['H-ORM8PM4M'];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { action, instruction, chatHistory, images, attachments, changes, commitMessage, userId, user_id } = body;

    const reqUserId = String(userId || user_id || '').trim();
    if (!ADMIN_USER_IDS.includes(reqUserId)) {
      return jsonRes({ error: 'アクセスが拒否されました（管理者権限が必要です）' }, 403);
    }

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonRes({ error: 'Cloudflareに GITHUB_TOKEN または GITHUB_REPO が設定されていません' }, 500);
    }

    const cleanRepo = s => String(s || '')
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');

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

    if (action === 'chat' || action === 'generate_batch') {
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

      let systemInstructionText = '';
      if (action === 'chat') {
        systemInstructionText = [
          'あなたはWebブラウザRPG（フロントエンド: ' + mainRepo + ' / セーブ・通信サーバー: ' + (extraRepos.join(', ') || 'なし') + '）の開発アシスタントAIです。',
          'ユーザーからの質問、実装・仕様に関する相談、バグ分析依頼に対し、専門的かつ分かりやすく日本語で回答してください。',
          'コードの一括修正・自動コミットの段階ではないため、専用ブロック（<<<FILE...>>>や<<<SUMMARY>>>）は使用せず、通常の丁寧なテキスト形式で回答してください。',
          '',
          '【全リポジトリの全ファイル群（全' + validFiles.length + 'ファイル）】',
          filesBlock
        ].join('\n');
      } else {
        systemInstructionText = [
          'あなたはWebブラウザRPG（フロントエンド: ' + mainRepo + ' / セーブ・通信サーバー: ' + (extraRepos.join(', ') || 'なし') + '）の熟練エンジニアです。',
          '全リポジトリ内の全' + validFiles.length + 'ファイルを読み込み、ユーザーの指示および会話履歴に従って【修正が必要なファイルのみ】を修正した完全なコードを出力してください。',
          '',
          '【絶対厳守ルール】',
          '- 指示されていない既存のUI、CSS、計算式、関数名、変数名を勝手に変更・削除しないこと。',
          '- index.html を編集する際は <script src="/dev-console.js..."></script> を絶対に消さないこと。',
          '- フロントエンドとサーバー（user-save-do）間のAPI仕様やセーブデータ構造の整合性を完全に一致させること。',
          '- 「// 省略」「// 既存コードと同じ」などの省略は絶対にせず、修正するファイルは先頭から末尾まで完全なコードを出力すること。',
          '- 変更が不要なファイルは出力しないこと。',
          '- JSONは使わず、必ず以下の専用ブロック形式のみで出力すること（マークダウンのコードブロックは付けない）：',
          '',
          '<<<SUMMARY>>>',
          '全体の変更要約（日本語）',
          '<<<END_SUMMARY>>>',
          '