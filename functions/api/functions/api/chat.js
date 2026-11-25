function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, user_name, icon_json, message, created_at FROM chats ORDER BY id DESC LIMIT 30'
    ).all();

    return Response.json((results || []).reverse());
  } catch (e) {
    return Response.json([], { status: 200 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const userName = escapeHtml((body.name || 'ハンター').trim().slice(0, 16));
    const iconJson = typeof body.icon_json === 'string' ? body.icon_json.slice(0, 300) : '{"emoji":"🦊","rotate":0}';
    let message = String(body.message || '').trim();

    if (!message) {
      return Response.json({ error: 'Empty message' }, { status: 400 });
    }

    if (message.startsWith('[STAMP]data:image/')) {
      if (message.length > 350000) {
        return Response.json({ error: 'Stamp image too large' }, { status: 413 });
      }
    } else {
      message = escapeHtml(message.slice(0, 100));
    }

    await env.DB.prepare(
      'INSERT INTO chats (user_name, icon_json, message, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).bind(userName, iconJson, message).run();

    // 負荷対策：最新50件より古いメッセージを自動削除
    await env.DB.prepare(
      'DELETE FROM chats WHERE id NOT IN (SELECT id FROM chats ORDER BY id DESC LIMIT 50)'
    ).run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Chat error', detail: e.message }, { status: 500 });
  }
}
