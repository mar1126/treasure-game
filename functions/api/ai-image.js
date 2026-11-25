export async function onRequestPost(context) {
  try {
    const { prompt, type, stampText } = await context.request.json();
    let fullPrompt = "";

    if (type === 'monster') {
      fullPrompt = `cute game character sprite, ${prompt}, isolated on clean simple white background, vibrant colors, 2d game art`;
    } else if (type === 'bg') {
      fullPrompt = `bright resort ocean and beach game background, ${prompt}, anime style scenic art, no characters`;
    } else if (type === 'stamp') {
      const textPart = stampText ? `, with bold cute speech bubble text saying "${stampText}"` : "";
      fullPrompt = `cute chibi game chat sticker emote, ${prompt}${textPart}, thick white sticker outline, expressive, vibrant 2d art`;
    }

    const response = await context.env.AI.run(
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      { prompt: fullPrompt }
    );

    const arrayBuffer = await new Response(response).arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return Response.json({ image: `data:image/png;base64,${base64}` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
