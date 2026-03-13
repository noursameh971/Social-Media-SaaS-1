import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const campaignName = (body.campaignName as string) || '';
    const campaignDescription = (body.campaignDescription as string) || '';
    const brandBibleRaw = body.brandBible;

    const brandBible =
      typeof brandBibleRaw === 'string'
        ? brandBibleRaw
        : brandBibleRaw && typeof brandBibleRaw === 'object'
          ? JSON.stringify(brandBibleRaw, null, 2)
          : 'No brand guidelines provided.';

    if (!campaignName.trim()) {
      return NextResponse.json({ error: 'campaignName is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an Elite Social Media AI Director. Your job is to generate a campaign content calendar based on the provided Brand Bible: ${brandBible}

Campaign Name: ${campaignName}

Campaign Goal: ${campaignDescription}

You must output EXACTLY 5 diverse social media posts for this campaign.

Mix platforms between 'Instagram' and 'LinkedIn'.

Strictly enforce the Tone of Voice from the Brand Bible (e.g., if no emojis are allowed, use ZERO emojis. Use short sentences if required).

Return ONLY a valid JSON object with this exact structure, no markdown, no explanations:
{ "posts": [ { "title": "Internal Post Idea", "content": "The actual post caption...", "platform": "Instagram" } ] }`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate the 5-post content calendar for campaign: ${campaignName}` },
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
    console.error('campaign-autopilot error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate campaign';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
