export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    "SELECT name, icon_json, message FROM chat ORDER BY id DESC LIMIT 20"
  ).all();
  return Response.json(results.reverse());
}

export async function onRequestPost(context) {
  const { name, icon_json, message } = await context.request.json();
  await context.env.DB.prepare(
    "INSERT INTO chat (name, icon_json, message) VALUES (?, ?, ?)"
  ).bind(name, icon_json, message).run();
  return Response.json({ success: true });
}
