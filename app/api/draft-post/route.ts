import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = (body.topic as string) || '';
    const platform = (body.platform as string) || '';
    const brand_bible = body.brand_bible;

    const brandBibleStr =
      typeof brand_bible === 'string'
        ? brand_bible
        : brand_bible && typeof brand_bible === 'object'
          ? JSON.stringify(brand_bible, null, 2)
          : 'No brand guidelines provided.';

    if (!topic.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an Elite Social Media Copywriter for a specific brand. You are given the brand's 'Brand Bible': ${brandBibleStr}
Your task is to write a single social media post for ${platform} about this topic: '${topic}'.
CRITICAL RULES:

You MUST strictly follow the 'tone_and_voice' rules from the Brand Bible.

If the bible forbids emojis, DO NOT use a single emoji.

If the bible demands short sentences, write short sentences.

Do not include hashtags unless appropriate for the platform and tone.

Return ONLY the post content text. No explanations, no JSON, no quotes around the text.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write the post for ${platform} about: ${topic}` },
      ],
      temperature: 0.6,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ content });
  } catch (err) {
    console.error('draft-post error:', err);
    const message = err instanceof Error ? err.message : 'Failed to draft post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
