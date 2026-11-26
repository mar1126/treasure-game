async function ensureChatSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      user_icon TEXT,
      message TEXT,
      stamp_img TEXT,
      reactions TEXT,
      created_at INTEGER
    )
  `).run();

  const cols = ["user_icon TEXT", "reactions TEXT"];
  for (const colDef of cols) {
    try {
      await db.prepare(`ALTER TABLE chat_messages ADD COLUMN ${colDef}`).run();
    } catch (e) {}
  }
}

export async function onRequestGet({ env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    if (!db) return new Response(JSON.stringify({ error: "No D1 DB" }), { status: 500 });

    await ensureChatSchema(db);
    const { results } = await db.prepare("SELECT * FROM chat_messages ORDER BY id DESC LIMIT 40").all();
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
    await ensureChatSchema(db);

    if (body.action === "react") {
      const msgId = Number(body.message_id);
      const stampImg = String(body.stamp_img || "");
      const userId = String(body.user_id || "");
      if (!msgId || !stampImg) return new Response(JSON.stringify({ ok: false }), { status: 400 });

      const row = await db.prepare("SELECT reactions FROM chat_messages WHERE id = ?").bind(msgId).first();
      if (!row) return new Response(JSON.stringify({ ok: false }), { status: 404 });

      let list = [];
      try { list = JSON.parse(row.reactions || "[]"); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];

      list.push({ user_id: userId, img: stampImg, at: Date.now() });
      if (list.length > 30) list = list.slice(list.length - 30);

      await db.prepare("UPDATE chat_messages SET reactions = ? WHERE id = ?")
        .bind(JSON.stringify(list), msgId).run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const userId = String(body.user_id || "").slice(0, 40);
    const userName = String(body.user_name || "ハンター").slice(0, 20);
    const userIcon = String(body.user_icon || "");
    const message = String(body.message || "").slice(0, 140);
    const stampImg = String(body.stamp_img || "");

    if (!message && !stampImg) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    await db.prepare(
      "INSERT INTO chat_messages (user_id, user_name, user_icon, message, stamp_img, reactions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(userId, userName, userIcon, message, stampImg, "[]", Date.now()).run();

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
