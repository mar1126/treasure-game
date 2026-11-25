export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const rawPrompt = String(body.prompt || '').trim().slice(0, 500);
    const type = String(body.type || 'monster');
    const stampText = String(body.stampText || '').trim().slice(0, 12);

    if (!rawPrompt) {
      return Response.json({ error: 'プロンプトが空です' }, { status: 400 });
    }
    if (!env.AI) {
      return Response.json({ error: 'AIバインディング(env.AI)が未設定です' }, { status: 500 });
    }

    let finalPrompt = `cute vibrant 2d game character illustration, ${rawPrompt}, clean background, high quality`;
    if (type === 'bg') {
      finalPrompt = `beautiful 2d fantasy game background art, ${rawPrompt}, vibrant colors, no text`;
    } else if (type === 'stamp') {
      finalPrompt = `cute chibi sticker illustration, expressive pose, ${rawPrompt}${stampText ? `, text "${stampText}"` : ''}, white outline, clean background`;
    }

    const aiRes = await env.AI.run('@cf/bytedance/stable-diffusion-xl-lightning', {
      prompt: finalPrompt
    });

    // バイナリ(ReadableStream / Uint8Array)とJSON({ image })の両方に対応
    let base64Str = '';
    if (aiRes && typeof aiRes.image === 'string') {
      base64Str = aiRes.image;
    } else {
      const buf = aiRes instanceof ReadableStream
        ? await new Response(aiRes).arrayBuffer()
        : aiRes;
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      base64Str = btoa(binary);
    }

    return Response.json({ image: `data:image/png;base64,${base64Str}` });
  } catch (e) {
    return Response.json({ error: 'AI生成エラー: ' + e.message }, { status: 500 });
  }
}
