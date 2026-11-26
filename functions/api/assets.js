async function ensureAssetsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS default_assets (
      asset_key TEXT PRIMARY KEY,
      image_data TEXT,
      updated_at INTEGER
    )
  `).run();
}

export async function onRequestGet({ env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    if (!db) return new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } });

    await ensureAssetsTable(db);
    const { results } = await db.prepare("SELECT asset_key, image_data FROM default_assets").all();
    const map = {};
    (results || []).forEach(r => {
      if (r.asset_key && r.image_data) map[r.asset_key] = r.image_data;
    });

    return new Response(JSON.stringify(map), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({}), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = env.DB || env.TREASURE_DB || env.DATABASE || Object.values(env).find(v => v && typeof v.prepare === 'function');
    const body = await request.json();
    const key = String(body.asset_key || "").slice(0, 60);
    const imageData = String(body.image_data || "");

    if (!key || !imageData) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    await ensureAssetsTable(db);
    await db.prepare(
      "INSERT OR REPLACE INTO default_assets (asset_key, image_data, updated_at) VALUES (?, ?, ?)"
    ).bind(key, imageData, Date.now()).run();

    return new Response(JSON.stringify({ ok: true, asset_key: key }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
