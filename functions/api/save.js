export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return Response.json({ error: 'no user_id' }, { status: 400 });

  const row = await context.env.DB.prepare(
    "SELECT user_name, save_json FROM saves WHERE user_id = ?"
  ).bind(userId).first();

  return Response.json(row || { notFound: true });
}

export async function onRequestPost(context) {
  const { user_id, user_name, save_json } = await context.request.json();
  await context.env.DB.prepare(
    "INSERT INTO saves (user_id, user_name, save_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET user_name=excluded.user_name, save_json=excluded.save_json, updated_at=CURRENT_TIMESTAMP"
  ).bind(user_id, user_name, save_json).run();

  return Response.json({ success: true });
}
