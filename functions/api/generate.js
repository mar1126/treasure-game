const HUMANOID_SPECIES = [
  "ゴブリン", "ゴブリン弓兵", "オーク", "コボルト", "リザードマン",
  "スケルトン", "ゾンビ", "マミー", "バンパイア", "ヴァンパイア",
  "ゴーレム", "ガーゴイル", "ミノタウロス", "ケンタウロス", "ハーピー",
  "サキュバス", "インプ", "デーモン", "魔王", "ダークエルフ",
  "エルフ", "ドワーフ", "フェアリー", "ピクシー", "ヴァルキリー",
  "騎士", "パラディン", "魔女", "ネクロマンサー", "ニンジャ", "サムライ"
];

function buildJapaneseArtTags(text, speciesName, isMonsterType) {
  let s = String(text || "");
  const isHumanize = /擬人化|美少女|美女|イケメン|女の子|男の子|人型|メイド|巫女/.test(s);
  const isHumanoidSpecies = HUMANOID_SPECIES.some(h => String(speciesName || "").includes(h));

  const dict = [
    [/擬人化/g, "humanized anime character version, human form, "],
    [/美少女|美女/g, "beautiful Japanese anime girl, "],
    [/イケメン|美少年/g, "handsome Japanese anime boy, "],
    [/頭身高く|高い頭身/g, "tall 8 heads proportions, full body, NOT chibi, "],
    [/手足なし|手足がない/g, "limbless blob body, no arms, no legs, no hands, no feet, "],
    [/スライム/g, "cute translucent jelly slime monster, "],
    [/ドラゴン|竜/g, "fierce fantasy dragon monster, "],
    [/騎士|鎧/g, "fantasy armor, "],
    [/魔法使い|魔女/g, "witch hat and magic staff, "],
    [/メイド/g, "frilled maid outfit, "],
    [/笑顔|スマイル/g, "big cheerful happy smile, "],
    [/手を振る/g, "waving hand happily, "],
    [/怒り|ぷんぷん/g, "cute angry pouting expression, "],
    [/泣き|涙/g, "crying with big anime tears, "],
    [/驚き|びっくり/g, "shocked surprised expression, "]
  ];

  for (const [regex, rep] of dict) {
    s = s.replace(regex, rep);
  }

  let prefix = "";
  if (isMonsterType && !isHumanize) {
    if (isHumanoidSpecies) {
      prefix = "fantasy RPG humanoid monster character, ";
    } else {
      prefix = "non-human fantasy RPG creature, pure monster design, NO human, NO girl, NO boy, ";
    }
  }
  return { tags: prefix + s, isHumanize };
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
    const refDesc = String(body.ref_desc || "").slice(0, 250);

    const { tags: prePrompt } = buildJapaneseArtTags(rawPrompt, species, type === "monster");
    let enSpecies = species;
    let enPrompt = prePrompt;

    try {
      if (/[^\x00-\x7F]/.test(species)) {
        const trSp = await ai.run("@cf/meta/m2m100-1.2b", {
          text: species,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trSp && trSp.translated_text) enSpecies = trSp.translated_text;
      }
      if (enPrompt && /[^\x00-\x7F]/.test(enPrompt)) {
        const trPr = await ai.run("@cf/meta/m2m100-1.2b", {
          text: enPrompt,
          source_lang: "japanese",
          target_lang: "english"
        });
        if (trPr && trPr.translated_text) enPrompt = trPr.translated_text;
      }
    } catch (e) {}

    const jpStyle = "Japanese JRPG monster illustration style, clean bold black outlines, vibrant cel shading, isolated on solid pure white background #FFFFFF, no western comic style, no 3D render, no text";

    let fullPrompt = "";
    if (type === "monster") {
      fullPrompt = `${enPrompt}, ${enSpecies}, centered full body game sprite, ${jpStyle}`;
    } else if (type === "bg") {
      fullPrompt = `${enPrompt}, Japanese anime fantasy RPG scenery background art, vibrant lighting, detailed digital painting, scenic view, no characters, no text`;
    } else if (type === "stamp") {
      const baseLook = refDesc ? `${refDesc}, ` : `${enSpecies}, `;
      fullPrompt = `Cute chibi SD anime sticker illustration of ${baseLook}${enPrompt}, expressive face, upper body pose, thick clean white sticker border, isolated on solid pure white background #FFFFFF, Japanese LINE sticker style, no text`;
    }

    const result = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: fullPrompt,
      steps: 4
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
      error: "AI通信エラー（少し待ってからもう一度お試しください）"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
