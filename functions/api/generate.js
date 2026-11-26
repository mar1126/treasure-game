function optimizeJapaneseArtTerms(text) {
  let s = String(text || "");
  const dict = [
    [/擬人化/g, "humanized anime character version, human form, "],
    [/美少女|美女|かわいい女の子/g, "beautiful anime girl, pretty detailed face, "],
    [/イケメン|美少年|かっこいい男/g, "handsome anime boy, cool face, "],
    [/大人っぽい|お姉さん|セクシー/g, "mature glamorous adult woman, alluring expression, "],
    [/幼い|少女/g, "young cute anime girl, "],
    [/頭身高く|高い頭身|スタイリッシュな頭身|長身|モデル体型/g, "tall slender body, 8 heads tall proportions, long legs, adult proportions, NOT chibi, "],
    [/ちび|ミニキャラ|デフォルメ|SD/g, "cute chibi SD character, 2 heads tall, "],
    [/グラマー|巨乳|豊満/g, "curvy voluptuous figure, "],
    [/スレンダー|細身/g, "slender slim figure, "],
    [/ラノベ風|ソシャゲ風|アニメ風|アニメイラスト/g, "high-end Japanese light novel and gacha game illustration, crisp lineart, vibrant cel shading, "],
    [/厚塗り/g, "rich impasto digital painting style, detailed shading, "],
    [/水彩風/g, "soft watercolor anime illustration, "],
    [/ドット絵|ピクセルアート/g, "detailed 16-bit JRPG pixel art sprite, "],
    [/ダークファンタジー|暗黒/g, "dark fantasy atmosphere, dramatic shadows, "],
    [/神々しい|神聖/g, "divine radiant aura, holy golden light, "],
    [/銀髪|白髪/g, "long shimmering silver white hair, "],
    [/金髪/g, "shiny golden blonde hair, "],
    [/黒髪/g, "glossy jet black hair, "],
    [/赤髪/g, "crimson red hair, "],
    [/青髪/g, "azure blue hair, "],
    [/緑髪/g, "emerald green hair, "],
    [/ピンク髪|桃髪/g, "pastel pink hair, "],
    [/紫髪/g, "violet purple hair, "],
    [/ツインテール/g, "long twin tails hairstyle, "],
    [/ポニーテール/g, "high ponytail hairstyle, "],
    [/ロングヘア|長髪/g, "flowing waist-length long hair, "],
    [/ショートカット|ショートヘア/g, "stylish short bob hair, "],
    [/オッドアイ/g, "heterochromia different colored eyes, "],
    [/エルフ/g, "pointed elf ears, "],
    [/猫耳|ネコ耳/g, "cute cat ears and tail, "],
    [/狐耳|キツネ耳/g, "fluffy fox ears and bushy tail, "],
    [/天使の羽|白い翼/g, "large white feathered angel wings, "],
    [/悪魔の羽|黒い翼/g, "bat-like dark demon wings, "],
    [/騎士|重装備/g, "ornate fantasy knight armor, "],
    [/軽装|冒険者/g, "stylish fantasy adventurer leather outfit, "],
    [/魔法使い|魔女/g, "ornate witch hat and mystical mage robe, "],
    [/巫女/g, "traditional red and white Japanese shrine maiden outfit, "],
    [/メイド/g, "frilled classic maid dress, "],
    [/ドレス/g, "elegant ruffled fantasy gown dress, "],
    [/ゴスロリ/g, "black and lace gothic lolita dress, "],
    [/水着|ビキニ/g, "stylish fantasy summer swimsuit, "],
    [/着物|和服|浴衣/g, "gorgeous floral Japanese kimono, "],
    [/制服/g, "stylish anime academy uniform, "]
  ];
  for (const [regex, rep] of dict) {
    s = s.replace(regex, rep);
  }
  return s;
}

async function rewritePromptWithLLM(ai, type, species, rawPrompt) {
  try {
    const sysInstruction =
      "You are an expert prompt engineer for Japanese anime game image generation (Flux). " +
      "Convert the user's Japanese request into a concise, vivid comma-separated list of English visual tags (max 65 words). " +
      "If the user says '擬人化' (humanize), explicitly describe a human anime character with tall 8-head proportions (NOT chibi) keeping the monster's motif. " +
      "Output ONLY the English prompt tags, no explanations or quotes.";

    const userMsg = `Type: ${type}\nMotif Monster: ${species}\nUser Request: ${rawPrompt}`;

    const llmRes = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: sysInstruction },
        { role: "user", content: userMsg }
      ],
      max_tokens: 140,
      temperature: 0.4
    });

    const out = (llmRes && typeof llmRes.response === "string") ? llmRes.response.trim() : "";
    if (out && out.length > 5 && !/sorry|cannot|unable|policy/i.test(out)) {
      return out.replace(/^["']|["']$/g, "");
    }
  } catch (e) {}
  return "";
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
    const species = String(body.species || "Slime");
    const rawPrompt = String(body.prompt || "").slice(0, 500);
    const stampText = String(body.stamp_text || "").slice(0, 20);

    // 1. まずLLMでプロンプト自動リライトを試行
    let optimizedPrompt = await rewritePromptWithLLM(ai, type, species, rawPrompt);

    // 2. LLMが応答しなかった場合のフォールバック（辞書＋翻訳モデル）
    if (!optimizedPrompt) {
      const preTranslated = optimizeJapaneseArtTerms(rawPrompt);
      optimizedPrompt = preTranslated;
      try {
        if (/[^\x00-\x7F]/.test(preTranslated)) {
          const tr = await ai.run("@cf/meta/m2m100-1.2b", {
            text: preTranslated,
            source_lang: "japanese",
            target_lang: "english"
          });
          if (tr && tr.translated_text) optimizedPrompt = tr.translated_text;
        }
      } catch (e) {}
    }

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${optimizedPrompt}, high-end Japanese gacha game character art, detailed anime illustration, vibrant colors, crisp lineart, centered full body standing pose, isolated on solid pure white background #FFFFFF, masterpiece, best quality, no text`;
    } else if (type === "bg") {
      fullPrompt = `${optimizedPrompt}, high-end Japanese anime fantasy game background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
    } else if (type === "stamp") {
      fullPrompt = `${optimizedPrompt}, cute expressive anime character sticker, thick clean white sticker outline, isolated on solid pure white background #FFFFFF, high quality game chat stamp`;
    }

    const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: fullPrompt,
      steps: 4
    });

    if (!result || !result.image) {
      return new Response(JSON.stringify({
        error: "生成できませんでした。表現を少し変えてお試しください。"
      }), { status: 500, headers: { "Content-Type": "application/json" } });
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
      error: "AI生成エラーが発生しました"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
