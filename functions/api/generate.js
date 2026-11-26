function optimizeJapaneseArtTerms(text) {
  let s = String(text || "");
  const dict = [
    // 擬人化・キャラクター属性
    [/擬人化/g, "humanized anime character version, human form, "],
    [/美少女|美女|かわいい女の子/g, "beautiful anime girl, pretty detailed face, "],
    [/イケメン|美少年|かっこいい男/g, "handsome anime boy, cool face, "],
    [/大人っぽい|お姉さん|セクシー/g, "mature glamorous adult woman, alluring expression, "],
    [/幼い|少女/g, "young cute anime girl, "],
    [/頭身高く|高い頭身|スタイリッシュな頭身|長身|モデル体型/g, "tall slender body, 8 heads tall proportions, long legs, adult proportions, NOT chibi, "],
    [/ちび|ミニキャラ|デフォルメ|SD/g, "cute chibi SD character, 2 heads tall, "],
    [/グラマー|巨乳|豊満/g, "curvy voluptuous figure, "],
    [/スレンダー|細身/g, "slender slim figure, "],

    // 画風・クオリティ
    [/ラノベ風|ソシャゲ風|アニメ風|アニメイラスト/g, "high-end Japanese light novel and gacha game illustration, crisp lineart, vibrant cel shading, "],
    [/厚塗り/g, "rich impasto digital painting style, detailed shading, "],
    [/水彩風/g, "soft watercolor anime illustration, "],
    [/ドット絵|ピクセルアート/g, "detailed 16-bit JRPG pixel art sprite, "],
    [/ダークファンタジー|暗黒/g, "dark fantasy atmosphere, dramatic shadows, "],
    [/神々しい|神聖/g, "divine radiant aura, holy golden light, "],

    // 髪色・髪型・瞳
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
    [/赤目|赤い瞳/g, "glowing ruby red eyes, "],
    [/青目|青い瞳/g, "sapphire blue eyes, "],

    // 種族パーツ
    [/エルフ/g, "pointed elf ears, "],
    [/猫耳|ネコ耳/g, "cute cat ears and tail, "],
    [/狐耳|キツネ耳/g, "fluffy fox ears and bushy tail, "],
    [/犬耳|狼耳/g, "wolf ears and tail, "],
    [/うさ耳|ウサギ耳/g, "bunny ears, "],
    [/角|ツノ/g, "curved demon horns, "],
    [/天使の羽|白い翼/g, "large white feathered angel wings, "],
    [/悪魔の羽|黒い翼/g, "bat-like dark demon wings, "],
    [/竜|ドラゴン/g, "dragon horns, scales and dragon tail, "],
    [/機械|メカ|サイボーグ/g, "futuristic cybernetic armor parts, "],

    // 衣装・装備
    [/騎士|重装備/g, "ornate fantasy knight armor, "],
    [/軽装|冒険者/g, "stylish fantasy adventurer leather outfit, "],
    [/魔法使い|魔女/g, "ornate witch hat and mystical mage robe, "],
    [/巫女/g, "traditional red and white Japanese shrine maiden outfit, "],
    [/メイド/g, "frilled classic maid dress, "],
    [/ドレス/g, "elegant ruffled fantasy gown dress, "],
    [/ゴスロリ/g, "black and lace gothic lolita dress, "],
    [/水着|ビキニ/g, "stylish fantasy summer swimsuit, "],
    [/着物|和服|浴衣/g, "gorgeous floral Japanese kimono, "],
    [/制服/g, "stylish anime academy uniform, "],
    [/マント/g, "flowing heroic cape, "],
    [/王冠|ティアラ/g, "jeweled royal crown tiara, "],
    [/眼鏡|メガネ/g, "stylish glasses, "],

    // 武器・エフェクト
    [/剣|大剣/g, "holding a glowing ornate fantasy sword, "],
    [/弓|アーチャー/g, "holding an ornate fantasy bow and arrow, "],
    [/杖|ステッキ/g, "holding a crystal magic staff, "],
    [/槍/g, "holding a long silver spear, "],
    [/銃|ガンナー/g, "holding a fantasy magic rifle, "],
    [/炎|火/g, "surrounded by swirling fire flames, "],
    [/氷|雪/g, "surrounded by sparkling ice crystals, "],
    [/雷|稲妻/g, "crackling golden lightning sparks, "],
    [/闇|影/g, "swirling dark purple shadow aura, "],
    [/光|星/g, "sparkling starlight particles, "],

    // 表情・ポーズ
    [/笑顔|スマイル/g, "bright cheerful smile, "],
    [/ドヤ顔|不敵/g, "confident smug grin, "],
    [/照れ|赤面/g, "cute slight blush embarrassed expression, "],
    [/クール|無表情/g, "cool composed expression, "],
    [/ウィンク/g, "playful wink, "],
    [/戦闘ポーズ|構え/g, "dynamic action battle stance, "],

    // 背景用ワード
    [/草原/g, "lush green meadow with wildflowers, "],
    [/森|森林/g, "sunlit mystical ancient forest, "],
    [/夕焼け|夕方/g, "breathtaking golden sunset sky, "],
    [/星空|夜空/g, "magnificent starry night sky with glowing nebula, "],
    [/桜/g, "blooming pink cherry blossom trees with falling petals, "],
    [/神殿|遺跡/g, "grand ancient marble temple ruins, "],
    [/城|宮殿/g, "majestic fantasy royal castle, "],
    [/海|ビーチ/g, "crystal clear turquoise ocean beach, "],
    [/ダンジョン|洞窟/g, "glowing crystal cavern dungeon, "]
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
      fullPrompt = `${enPrompt}, motif of ${enSpecies}, high-end Japanese gacha game character art, detailed anime illustration, vibrant colors, crisp lineart, centered full body standing pose, isolated on solid pure white background #FFFFFF, masterpiece, best quality, no text`;
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
