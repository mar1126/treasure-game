async function ensureSaveTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS saves (
      user_id TEXT PRIMARY KEY,
      user_name TEXT,
      max_stage INTEGER,
      max_floor INTEGER,
      save_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    if (!db) {
      return new Response(JSON.stringify({ error: 'DB not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    await ensureSaveTable(db);

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const row = await db.prepare(
      'SELECT user_id, user_name, save_json, updated_at FROM saves WHERE user_id = ?'
    ).bind(userId).first();

    return new Response(JSON.stringify(row || {}), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    if (!db) {
      return new Response(JSON.stringify({ error: 'DB not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    await ensureSaveTable(db);

    const body = await request.json();
    const { user_id, user_name, max_stage, max_floor, save_json } = body;
    if (!user_id || !save_json) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(
      `INSERT INTO saves (user_id, user_name, max_stage, max_floor, save_json, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         user_name = excluded.user_name,
         max_stage = excluded.max_stage,
         max_floor = excluded.max_floor,
         save_json = excluded.save_json,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(user_id, user_name || 'ハンター', Number(max_stage) || 1, Number(max_floor) || 1, save_json).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}