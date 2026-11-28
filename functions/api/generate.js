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
    const url = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=2`;
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

async function fetchWikipediaImageUrl(queryText) {
  try {
    const q = String(queryText || "").replace(/[!！@][^\s]+\s*/g, "").trim().slice(0, 40);
    if (!q) return null;
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=1`;
    const sRes = await fetch(searchUrl, { headers: { "User-Agent": "FantasyFrontierGame/1.0" } });
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const page = sData?.query?.search?.[0];
    if (!page || !page.title) return null;

    const imgUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(page.title)}&prop=pageimages&pithumbsize=500&format=json`;
    const iRes = await fetch(imgUrl, { headers: { "User-Agent": "FantasyFrontierGame/1.0" } });
    if (!iRes.ok) return null;
    const iData = await iRes.json();
    const pages = iData?.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    if (pageId && pages[pageId]?.thumbnail?.source) {
      const thumbSrc = pages[pageId].thumbnail.source;
      const imgFetch = await fetch(thumbSrc);
      if (imgFetch.ok) {
        const buf = await imgFetch.arrayBuffer();
        return Array.from(new Uint8Array(buf));
      }
    }
  } catch (e) {}
  return null;
}


async function understandJapanesePromptWithAI(ai, type, species, rawPrompt, webContext) {
  const isHumanize = /擬人化|美少女|美女|イケメン|女の子|男の子|人型|メイド|巫女/.test(rawPrompt);
  const isHumanoidSpecies = HUMANOID_SPECIES.some(h => String(species || "").includes(h));

  try {
    const sys =
      "You are an expert Japanese-to-English visual prompt translator for Japanese anime/JRPG illustration. " +
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

async function extractDetailedFaceAndOutfit(ai, imgBytes) {
  try {
    const visionRes = await ai.run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: imgBytes,
      prompt: "List exact character identity details in 45 words: eye color and shape, facial features, hair color, bangs/hairstyle, hair accessories/ears/horns, and exact outfit colors and design.",
      max_tokens: 95
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

    const webContext = await fetchJapaneseWebContext(rawPrompt || species);
    let visualContext = "";
    const wikiImgBytes = await fetchWikipediaImageUrl(rawPrompt || species);
    if (wikiImgBytes && wikiImgBytes.length > 0) {
      visualContext = await extractDetailedFaceAndOutfit(ai, wikiImgBytes);
    }
    const combinedContext = webContext + (visualContext ? ` / Visual Features: ${visualContext}` : "");
    const understoodTags = await understandJapanesePromptWithAI(ai, type, species, rawPrompt, combinedContext);

    const jpStyle = "Japanese JRPG character and monster illustration style, clean bold black outlines, vibrant cel shading, isolated on solid pure white background #FFFFFF, no western comic style, no 3D render, no text";


    if (type === "stamp") {
      let imgBytes = null;
      if (sourceImg.startsWith("data:image")) {
        const match = sourceImg.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
        if (match) {
          const rawB64 = match.slice(1, 2).pop() || "";
          const binStr = atob(rawB64);
          imgBytes = Array.from(new Uint8Array(binStr.length), (_, i) => binStr.charCodeAt(i));
        }
      }

      if (imgBytes && imgBytes.length > 0) {
        const identityTraits = await extractDetailedFaceAndOutfit(ai, imgBytes);
        const traitPart = identityTraits ? `${identityTraits}, ` : "";

        const img2imgRes = await ai.run("@cf/runwayml/stable-diffusion-v1-5-img2img", {
          prompt: `cute Japanese anime sticker of this exact same character, ${traitPart}preserve exact face, eye color, bangs, hair accessories and outfit colors, ${understoodTags}, thick white sticker outline, solid pure white background #FFFFFF, Japanese LINE sticker art, masterpiece`,
          negative_prompt: "different face, different eye color, different hair color, different bangs, different outfit, realistic, 3d, western comic, text, watermark, dark background",
          image: imgBytes,
          strength: 0.45,
          guidance: 9.0,
          num_steps: 16
        });
        if (img2imgRes) {
          let base64Str = '';
          if (typeof img2imgRes.image === 'string') {
            base64Str = img2imgRes.image;
          } else {
            const buf = img2imgRes instanceof ReadableStream
              ? await new Response(img2imgRes).arrayBuffer()
              : img2imgRes;
            const bytes = new Uint8Array(buf);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            base64Str = btoa(binary);
          }
          return new Response(JSON.stringify({
            ok: true,
            image: `data:image/png;base64,${base64Str}`,
            type,
            species,
            stamp_text: stampText
          }), { headers: { "Content-Type": "application/json" } });
        }

      }

      const fallbackRes = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: `Cute chibi SD anime sticker illustration of ${understoodTags}, expressive face, upper body pose, thick clean white sticker border, isolated on solid pure white background #FFFFFF, Japanese LINE sticker style, no text`,
        steps: 3
      });
      if (!fallbackRes || !fallbackRes.image) {
        return new Response(JSON.stringify({ error: "スタンプ生成に失敗しました" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        ok: true,
        image: `data:image/jpeg;base64,${fallbackRes.image}`,
        type,
        species,
        stamp_text: stampText
      }), { headers: { "Content-Type": "application/json" } });
    }

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${understoodTags}, centered full body game sprite, ${jpStyle}`;
    } else if (type === "bg") {
      fullPrompt = `${understoodTags}, Japanese anime fantasy RPG scenery background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
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
