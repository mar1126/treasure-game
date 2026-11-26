export async function onRequestPost({ request, env }) {
  try {
    const ai = env.AI || Object.values(env).find(v => v && typeof v.run === "function");
    if (!ai) {
      return new Response(JSON.stringify({
        error: "Cloudflareの「設定 → バインディング」から Workers AI（変数名: AI）を追加してください"
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const body = await request.json();
    const type = String(body.type || "monster");
    const species = String(body.species || "Slime");
    const userPrompt = String(body.prompt || "").slice(0, 500);
    const stampText = String(body.stamp_text || "").slice(0, 20);

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `Fantasy RPG monster character illustration, ${species}, ${userPrompt}, cute and cool game sprite art style, clean isolated white background, centered full body, high quality, no text, no watermark`;
    } else if (type === "bg") {
      fullPrompt = `Fantasy RPG game scenery background art, ${userPrompt}, vibrant lighting, detailed digital painting, atmospheric, no characters, no text`;
    } else if (type === "stamp") {
      fullPrompt = `Cute chibi fantasy RPG character sticker illustration of ${species}, ${userPrompt}, expressive emotion, thick clean sticker outline, white background, high quality anime game stamp style`;
    }

    const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: fullPrompt,
      steps: 4
    });

    if (!result || !result.image) {
      return new Response(JSON.stringify({ error: "画像データの生成に失敗しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const dataUrl = `data:image/jpeg;base64,${result.image}`;
    return new Response(JSON.stringify({
      ok: true,
      image: dataUrl,
      type,
      species,
      stamp_text: stampText
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "AI生成エラー" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
