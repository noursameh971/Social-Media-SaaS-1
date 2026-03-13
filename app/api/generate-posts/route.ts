import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `You are an Expert Social Media Manager. Your job is to generate 3 high-engaging social media post ideas based on the provided Topic and Brand Core Identity. You MUST return ONLY a valid JSON object with a posts array. Each post in the array must have exactly these keys: title (short catchy idea), platform (e.g., 'Instagram', 'LinkedIn', 'Twitter'), format (e.g., 'Carousel', 'Reel', 'Text'), and content (the actual post caption/script).`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = body.topic as string;
    const brand_core = body.brand_core as string;

    if (!topic || !brand_core) {
      return NextResponse.json(
        { error: 'topic and brand_core are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Topic: ${topic}\n\nBrand Core Identity: ${brand_core}` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (err) {
    console.error('generate-posts error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
