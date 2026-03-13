import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const statsRaw = body.stats;

    const stats =
      typeof statsRaw === 'string'
        ? statsRaw
        : statsRaw && typeof statsRaw === 'object'
          ? JSON.stringify(statsRaw, null, 2)
          : 'No metrics provided.';

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an Elite AI Data Analyst advising a Social Media Agency Manager. I will provide you with the agency's current performance metrics: ${stats}
Your task is to analyze these numbers and write a short, punchy, and highly actionable executive summary (max 3 sentences).
Point out what's going well, identify any bottlenecks (like low publish rates or pending tasks), and give one clear recommendation for the week.
Do NOT use markdown bolding or bullet points. Return plain text only.
Return ONLY a JSON object: { "insight": "your analysis here..." }`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze these agency metrics and provide your executive summary.' },
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
    console.error('agency-insights error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
