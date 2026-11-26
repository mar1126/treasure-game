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
    const rawPrompt = String(body.prompt || "").slice(0, 500);
    const stampText = String(body.stamp_text || "").slice(0, 20);

    // 1. 日本語の種族名とユーザープロンプトを英語に自動翻訳
    let enSpecies = species;
    let enPrompt = rawPrompt;
    try {
      if (/[^\x00-\x7F]/.test(species)) {
        const trSp = await ai.run("@cf/meta/m2m100-1.2b", {
          text: species,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trSp && trSp.translated_text) enSpecies = trSp.translated_text;
      }
      if (rawPrompt && /[^\x00-\x7F]/.test(rawPrompt)) {
        const trPr = await ai.run("@cf/meta/m2m100-1.2b", {
          text: rawPrompt,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trPr && trPr.translated_text) enPrompt = trPr.translated_text;
      }
    } catch (e) {}

    // 2. ユーザーの指示（擬人化など）を最優先にしたプロンプト構築
    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${enPrompt}, inspired by ${enSpecies}, Japanese anime game character illustration, vibrant colors, crisp lineart, centered full body, isolated on solid pure white background, masterpiece, high quality, no text`;
    } else if (type === "bg") {
      fullPrompt = `${enPrompt}, Japanese anime fantasy game background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
    } else if (type === "stamp") {
      fullPrompt = `${enPrompt}, cute chibi anime character sticker inspired by ${enSpecies}, expressive face, thick white sticker border, isolated on solid pure white background, high quality game stamp`;
    }

    const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: fullPrompt,
      steps: 4
    });

    if (!result || !result.image) {
      return new Response(JSON.stringify({
        error: "安全フィルターまたは生成エラーにより画像を作成できませんでした。表現を少し変えてお試しください。"
      }), {
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
    return new Response(JSON.stringify({
      error: "生成エラー（不適切な表現が含まれているか通信エラーの可能性があります）"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
