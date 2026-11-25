export async function onRequestPost(context) {
  try {
    const { prompt, type } = await context.request.json();
    // モンスター用か背景用かでAIへの指示を最適化
    const fullPrompt = type === 'monster'
      ? `cute game character sprite, ${prompt}, isolated on clean simple background, vibrant colors, 2d game art`
      : `bright resort ocean and beach game background, ${prompt}, anime style scenic art, no characters`;

    const response = await context.env.AI.run(
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      { prompt: fullPrompt }
    );

    // 生成された画像をブラウザでそのまま表示・保存できる形式に変換
    const arrayBuffer = await new Response(response).arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return Response.json({ image: `data:image/png;base64,${base64}` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
