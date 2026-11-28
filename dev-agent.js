// ゲーム内AI開発コンソール用 API (functions/api/dev-agent.js)
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { action, filePath, instruction, newContent, commitMessage } = body;

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonRes({ error: 'Cloudflareに GITHUB_TOKEN または GITHUB_REPO が設定されていません' }, 500);
    }
    if (!filePath || filePath.includes('..')) {
      return jsonRes({ error: '不正なファイルパスです' }, 400);
    }

    const ghUrl = `https://github.com{env.GITHUB_REPO}/contents/${filePath}`;
    const ghHeaders = {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TreasureGame-DevAgent'
    };

    // 現在のファイルをGitHubから取得
    const getRes = await fetch(ghUrl, { headers: ghHeaders });
    if (!getRes.ok) {
      return jsonRes({ error: `GitHubからファイルを取得できませんでした (${getRes.status})` }, 400);
    }
    const fileData = await getRes.json();
    const currentCode = decodeBase64Utf8(fileData.content);

    // モード1: AIに修正案を作成させる（プレビュー生成）
    if (action === 'generate') {
      if (!env.GEMINI_API_KEY) {
        return jsonRes({ error: 'GEMINI_API_KEY が設定されていません' }, 500);
      }
      const prompt = `あなたはWebブラウザRPG（HTML/JS）の熟練エンジニアです。
以下の既存ファイル（${filePath}）に対して、ユーザーの指示通りに修正した【完全なコード】を出力してください。

【絶対厳守ルール】
- 指示されていない既存のUI、CSS、計算式、関数名、変数名を勝手に変更・削除しないこと。
- 「// 省略」「// 既存コードと同じ」などの省略は絶対にせず、ファイルの先頭から末尾まで完全なコードを出力すること。
- 出力は必ず以下のJSON形式のみ（マークダウンの \`\`\`json などは付けない生JSON）で返すこと：
{"summary":"変更内容の分かりやすい要約（日本語）","code":"修正後の完全なファイル内容"}

【ユーザーの修正指示】
${instruction}

【現在のファイル内容（${filePath}）】
${currentCode}`;

      const geminiUrl = `https://googleapis.com{env.GEMINI_API_KEY}`;
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
        return jsonRes({ error: `Gemini APIエラー: ${errTxt}` }, 500);
      }

      const aiJson = await aiRes.json();
      const rawText = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);

      return jsonRes({
        ok: true,
        summary: parsed.summary || '修正案を作成しました',
        code: parsed.code || currentCode,
        sha: fileData.sha
      });
    }

    // モード2: 確認済みのコードをGitHubへ直接コミット（保存）
    if (action === 'commit') {
      if (!newContent) return jsonRes({ error: '保存するコードが空です' }, 400);

      const putRes = await fetch(ghUrl, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage || `AI DevConsole: update ${filePath}`,
          content: encodeBase64Utf8(newContent),
          sha: fileData.sha
        })
      });

      if (!putRes.ok) {
        const errTxt = await putRes.text();
        return jsonRes({ error: `GitHubへの保存に失敗しました: ${errTxt}` }, 500);
      }

      return jsonRes({ ok: true, message: `${filePath} をGitHubに保存しました！約30秒後に自動反映されます。` });
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

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
