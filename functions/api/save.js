export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = (url.searchParams.get('user_id') || '').trim();

  if (!userId || userId.length > 64) {
    return Response.json({ error: 'Invalid user_id' }, { status: 400 });
  }

  try {
    // 1. ユーザー専用の Durable Object から取得
    if (env.USER_DO) {
      const id = env.USER_DO.idFromName(userId);
      const stub = env.USER_DO.get(id);
      const doRes = await stub.fetch('https://do.internal', { method: 'GET' });
      const doData = await doRes.json();

      if (doData && doData.save_json) {
        return Response.json(doData);
      }
    }

    // 2. 初回移行用：従来の D1 から読み込んで専用 Durable Object へ自動引っ越し
    if (env.DB) {
      const row = await env.DB.prepare(
        'SELECT user_id, user_name, save_json, updated_at FROM saves WHERE user_id = ?'
      ).bind(userId).first();

      if (row && row.save_json && env.USER_DO) {
        const id = env.USER_DO.idFromName(userId);
        const stub = env.USER_DO.get(id);
        await stub.fetch('https://do.internal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });
      }
      return Response.json(row || {});
    }

    return Response.json({});
  } catch (e) {
    return Response.json({ error: 'Load error', detail: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const userId = (body.user_id || '').trim();
    const userName = (body.user_name || 'ハンター').trim().slice(0, 16);
    const saveJson = body.save_json;

    if (!userId || userId.length > 64 || typeof saveJson !== 'string') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (saveJson.length > 1500000) {
      return Response.json({ error: 'Save data too large' }, { status: 413 });
    }
    const parsed = JSON.parse(saveJson);

    // 1. ユーザー専用の Durable Object に競合なしで保存
    if (env.USER_DO) {
      const id = env.USER_DO.idFromName(userId);
      const stub = env.USER_DO.get(id);
      const doRes = await stub.fetch('https://do.internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_name: userName, save_json: saveJson })
      });
      if (!doRes.ok) throw new Error('DO save failed');
    }

    // 2. ランキング集計用の軽量サマリーだけを D1 にも同期
    if (env.DB) {
      const rankSummary = JSON.stringify({
        state: {
          sea: { area: parsed?.state?.sea?.area || 1 },
          land: { area: parsed?.state?.land?.area || 1 }
        }
      });
      await env.DB.prepare(`
        INSERT INTO saves (user_id, user_name, save_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          user_name = excluded.user_name,
          save_json = excluded.save_json,
          updated_at = datetime('now')
      `).bind(userId, userName, rankSummary).run();
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Save error', detail: e.message }, { status: 500 });
  }
}
