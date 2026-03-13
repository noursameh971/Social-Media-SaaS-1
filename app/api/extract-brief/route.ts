import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const EXTRACT_PROMPT = `Extract the following information from this document and return ONLY a JSON object with these exact keys:
{
  "mission": string (brand mission and vision, purpose, long-term goals),
  "usp": string (unique selling proposition, what makes them different),
  "target_audience": string (demographics: age, location, job, who they are),
  "pain_points": string (problems this brand solves for the audience, what keeps them awake at night),
  "tone_of_voice": string (how the brand sounds: e.g., professional, friendly, witty, authoritative, the wise mentor),
  "content_pillars": string (the 3-4 core themes or topics the brand will post about)
}
If any field is not found in the document, use an empty string.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const anthropic = new Anthropic({ apiKey });

    // Document/PDF block - SDK types may not include document yet; API supports it
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: EXTRACT_PROMPT,
            },
          ],
        },
      ] as any,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    let parsed: Record<string, string>;
    try {
      const raw = textBlock.text.trim();
      const jsonStr = raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim() : raw;
      parsed = JSON.parse(jsonStr) as Record<string, string>;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response as JSON' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('extract-brief error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract brief' },
      { status: 500 }
    );
  }
}
