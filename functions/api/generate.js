function optimizeJapaneseArtTerms(text) {
  let s = String(text || "");
  const dict = [
    [/擬人化/g, "humanized anime girl version, human female character, "],
    [/美少女|美女/g, "beautiful anime girl, pretty face, "],
    [/イケメン|美少年/g, "handsome anime boy, "],
    [/頭身高く|高い頭身|スタイリッシュな頭身|長身/g, "tall slender body, 8 heads tall proportions, long legs, adult proportions, NOT chibi, "],
    [/ちび|ミニキャラ|デフォルメ/g, "cute chibi character, "],
    [/エルフ/g, "elf ears, "],
    [/弓使い|アーチャー/g, "archer holding a bow, "],
    [/騎士|鎧/g, "knight in fantasy armor, "],
    [/魔法使い|魔女/g, "mage with magic staff, "],
    [/ドレス/g, "elegant fantasy dress, "],
    [/水着/g, "stylish summer swimsuit, "],
    [/メイド/g, "cute maid outfit, "],
    [/着物|和服/g, "traditional Japanese kimono, "],
    [/ゴスロリ/g, "gothic lolita dress, "],
    [/猫耳/g, "cat ears, "],
    [/翼|羽/g, "angel wings, "]
  ];
  for (const [regex, rep] of dict) {
    s = s.replace(regex, rep);
  }
  return s;
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

    const preTranslatedPrompt = optimizeJapaneseArtTerms(rawPrompt);
    let enSpecies = species;
    let enPrompt = preTranslatedPrompt;

    try {
      if (/[^\x00-\x7F]/.test(species)) {
        const trSp = await ai.run("@cf/meta/m2m100-1.2b", {
          text: species,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trSp && trSp.translated_text) enSpecies = trSp.translated_text;
      }
      if (preTranslatedPrompt && /[^\x00-\x7F]/.test(preTranslatedPrompt)) {
        const trPr = await ai.run("@cf/meta/m2m100-1.2b", {
          text: preTranslatedPrompt,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trPr && trPr.translated_text) enPrompt = trPr.translated_text;
      }
    } catch (e) {}

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${enPrompt}, motif of ${enSpecies}, high-end Japanese social game character art, detailed anime illustration, vibrant colors, crisp lineart, centered full body standing pose, isolated on solid pure white background #FFFFFF, masterpiece, best quality, no text`;
    } else if (type === "bg") {
      fullPrompt = `${enPrompt}, high-end Japanese anime fantasy game background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
    } else if (type === "stamp") {
      fullPrompt = `${enPrompt}, cute expressive anime character sticker, motif of ${enSpecies}, thick clean white sticker outline, isolated on solid pure white background #FFFFFF, high quality game chat stamp`;
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
