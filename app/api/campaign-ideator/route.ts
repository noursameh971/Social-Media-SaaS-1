import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const theme = (body.theme as string) || '';
    const brandBibleRaw = body.brandBible;

    const brandBible =
      typeof brandBibleRaw === 'string'
        ? brandBibleRaw
        : brandBibleRaw && typeof brandBibleRaw === 'object'
          ? JSON.stringify(brandBibleRaw, null, 2)
          : 'No brand guidelines provided.';

    if (!theme.trim()) {
      return NextResponse.json({ error: 'theme is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an Elite Agency Chief Marketing Officer. Your job is to pitch campaign ideas based on the provided Brand Bible: ${brandBible}

Requested Theme/Focus: ${theme}

You must output EXACTLY 3 brilliant, distinct marketing campaign concepts.

Ensure the ideas strictly align with the brand's tone of voice and target audience.

Return ONLY a valid JSON object with this exact structure, no markdown, no explanations:
{ "campaigns": [ { "name": "Catchy Campaign Name", "description": "Detailed strategic concept and goals of the campaign..." } ] }`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Pitch 3 campaign ideas for theme: ${theme}` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    console.error('campaign-ideator error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate campaign ideas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
