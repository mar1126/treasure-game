export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    "SELECT name, score FROM scores ORDER BY score DESC LIMIT 5"
  ).all();
  return Response.json(results);
}

export async function onRequestPost(context) {
  const { name, score } = await context.request.json();
  await context.env.DB.prepare(
    "INSERT INTO scores (name, score) VALUES (?, ?)"
  ).bind(name, score).run();
  return Response.json({ success: true });
}
