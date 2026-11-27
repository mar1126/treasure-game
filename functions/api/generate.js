const HUMANOID_SPECIES = [
  "ゴブリン", "ゴブリン弓兵", "オーク", "コボルト", "リザードマン",
  "スケルトン", "ゾンビ", "マミー", "バンパイア", "ヴァンパイア",
  "ゴーレム", "ガーゴイル", "ミノタウロス", "ケンタウロス", "ハーピー",
  "サキュバス", "インプ", "デーモン", "魔王", "ダークエルフ",
  "エルフ", "ドワーフ", "フェアリー", "ピクシー", "ヴァルキリー",
  "騎士", "パラディン", "魔女", "ネクロマンサー", "ニンジャ", "サムライ"
];

async function fetchJapaneseWebContext(queryText) {
  try {
    const q = String(queryText || "").replace(/[!！@][^\s]+\s*/g, "").trim().slice(0, 40);
    if (!q) return "";
    const url = `https://wikipedia.org{encodeURIComponent(q)}&format=json&srlimit=2`;
    const res = await fetch(url, { headers: { "User-Agent": "FantasyFrontierGame/1.0" } });
    if (!res.ok) return "";
    const data = await res.json();
    const hits = (data && data.query && Array.isArray(data.query.search)) ? data.query.search : [];
    const snippets = hits
      .map(h => String(h.snippet || "").replace(/<[^>]+>/g, ""))
      .filter(Boolean)
      .join(" / ");
    return snippets.slice(0, 220);
  } catch (e) {
    return "";
  }
}

async function understandJapanesePromptWithAI(ai, type, species, rawPrompt, webContext) {
  const isHumanize = /擬人化|美少女|美女|イケメン|女の子|男の子|人型|メイド|巫女/.test(rawPrompt);
  const isHumanoidSpecies = HUMANOID_SPECIES.some(h => String(species || "").includes(h));

  try {
    const sys =
      "You are an expert Japanese-to-English visual prompt translator for Japanese anime/JRPG illustration (Flux). " +
      "Understand Japanese slang, anime/manga tropes, fashion, and monster motifs accurately using the provided Japanese web context. " +
      "Output ONLY a comma-separated list of concrete English visual tags (max 55 words, no sentences, no explanations). " +
      "Rules: " +
      "- If '擬人化' is requested, describe a humanized anime character (tall 8-head proportions, NOT chibi) keeping the monster's motif. " +
      "- If '手足なし' is requested, explicitly write 'limbless blob body, no arms, no legs'. " +
      "- If type is monster and NOT humanized and species is non-human, strictly describe a non-human fantasy monster creature (NO human, NO girl).";

    const userMsg =
      `Task Type: ${type}\n` +
      `Monster Species: ${species} (Humanoid species: ${isHumanoidSpecies})\n` +
      `Japanese User Prompt: ${rawPrompt}\n` +
      (webContext ? `Japanese Reference Info: ${webContext}` : "");

    const res = await ai.run("@cf/qwen/qwen2.5-7b-instruct", {
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg }
      ],
      max_tokens: 120,
      temperature: 0.3
    });

    const out = (res && typeof res.response === "string") ? res.response.trim() : "";
    if (out && out.length > 4) {
      return out.replace(/^["']|["']$/g, "");
    }
  } catch (e) {}

  let prefix = "";
  if (type === "monster" && !isHumanize && !isHumanoidSpecies) {
    prefix = "non-human fantasy RPG creature, NO human, NO girl, ";
  }
  return `${prefix}${species}, ${rawPrompt}`;
}

async function analyzeSourceCharacterImage(ai, base64DataUrl) {
  try {
    const match = String(base64DataUrl || "").match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!match) return "";
    const rawB64 = match.slice(1, 2).pop() || "";
    const binStr = atob(rawB64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

    const visionRes = await ai.run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: Array.from(bytes),
      prompt: "Describe this anime character's exact visual appearance in 35 words: hair color, hairstyle, eye color, headwear/ears/wings/horns, and outfit color/style.",
      max_tokens: 80
    });
    return (visionRes && visionRes.description) ? String(visionRes.description).trim() : "";
  } catch (e) {
    return "";
  }
}

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
    const species = String(body.species || "スライム");
    const rawPrompt = String(body.prompt || "").slice(0, 500);
    const stampText = String(body.stamp_text || "").slice(0, 20);
    const sourceImg = String(body.source_img || "");

    // 1. 日本語Web検索で言葉の意味・特徴を取得
    const webContext = await fetchJapaneseWebContext(rawPrompt || species);

    // 2. 日本語に強い Qwen2.5 で意味を正しく理解して英語ビジュアルタグ化
    const understoodTags = await understandJapanesePromptWithAI(ai, type, species, rawPrompt, webContext);

    const jpStyle = "Japanese JRPG character and monster illustration style, clean bold black outlines, vibrant cel shading, isolated on solid pure white background #FFFFFF, no western comic style, no 3D render, no text";

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${understoodTags}, centered full body game sprite, ${jpStyle}`;
    } else if (type === "bg") {
      fullPrompt = `${understoodTags}, Japanese anime fantasy RPG scenery background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
    } else if (type === "stamp") {
      let charAppearance = "";
      if (sourceImg.startsWith("data:image")) {
        charAppearance = await analyzeSourceCharacterImage(ai, sourceImg);
      }
      const subject = charAppearance ? `Same character (${charAppearance}), ` : "";
      fullPrompt = `Cute chibi SD anime sticker illustration, ${subject}${understoodTags}, expressive face, upper body pose, thick clean white sticker border, isolated on solid pure white background #FFFFFF, Japanese LINE sticker style, no text`;
    }

    const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: fullPrompt,
      steps: 3
    });

    if (!result || !result.image) {
      return new Response(JSON.stringify({
        error: "画像生成に失敗しました。表現を少し変えて再試行してください。"
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      image: `data:image/jpeg;base64,${result.image}`,
      type,
      species,
      stamp_text: stampText
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "詳細エラー: " + String(e && e.message ? e.message : e)
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
