export async function onRequestGet({ env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    if (!db) {
      return new Response(JSON.stringify({ error: "D1バインディングが見つかりません: " + Object.keys(env).join(",") }), { status: 500 });
    }
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_name TEXT,
        message TEXT,
        stamp_img TEXT,
        created_at INTEGER
      )
    `).run();

    const { results } = await db.prepare(
      "SELECT * FROM chat_messages ORDER BY id DESC LIMIT 30"
    ).all();

    return new Response(JSON.stringify((results || []).reverse()), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    const body = await request.json();
    const userId = String(body.user_id || "").slice(0, 40);
    const userName = String(body.user_name || "ハンター").slice(0, 20);
    const message = String(body.message || "").slice(0, 120);
    const stampImg = String(body.stamp_img || "");

    if (!message && !stampImg) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    await db.prepare(
      "INSERT INTO chat_messages (user_id, user_name, message, stamp_img, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, userName, message, stampImg, Date.now()).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
