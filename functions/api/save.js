export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = (url.searchParams.get('user_id') || '').trim();

  if (!userId || userId.length > 64) {
    return Response.json({ error: 'Invalid user_id' }, { status: 400 });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT user_id, user_name, save_json, updated_at FROM saves WHERE user_id = ?'
    ).bind(userId).first();

    return Response.json(row || {});
  } catch (e) {
    return Response.json({ error: 'DB read error', detail: e.message }, { status: 500 });
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
    // D1行サイズ制限保護（950KB上限）
    if (saveJson.length > 950000) {
      return Response.json({ error: 'Save data too large' }, { status: 413 });
    }
    // JSON構文が壊れていないか検証
    JSON.parse(saveJson);

    await env.DB.prepare(`
      INSERT INTO saves (user_id, user_name, save_json, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        user_name = excluded.user_name,
        save_json = excluded.save_json,
        updated_at = datetime('now')
    `).bind(userId, userName, saveJson).run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'DB save error', detail: e.message }, { status: 500 });
  }
}
