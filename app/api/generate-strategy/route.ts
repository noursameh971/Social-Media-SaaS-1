import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client_name = (body.client_name as string) || 'The Brand';
    const industry = (body.industry as string) || 'General';
    const brand_core = (body.brand_core as string) || '';
    const business_model = (body.business_model as string) || '';
    const art_direction = (body.art_direction as string) || '';
    const target_market = (body.target_market as string) || '';
    const primary_color = (body.primary_color as string) || '';
    const secondary_color = (body.secondary_color as string) || '';
    const heading_font = (body.heading_font as string) || '';
    const body_font = (body.body_font as string) || '';
    const custom_rules = (body.custom_rules as string) || '';
    const brand_bible = body.brand_bible as Record<string, unknown> | null | undefined;

    if (!brand_core.trim()) {
      return NextResponse.json({ error: 'brand_core is required' }, { status: 400 });
    }

    const bbContext = brand_bible && typeof brand_bible === 'object'
      ? `\nFULL BRAND BIBLE (from extraction): ${JSON.stringify(brand_bible)}\n`
      : '';

    const systemPrompt = `You are a World-Class Chief Branding Officer and Brand Architect. Your job is to create a profound, expert-level Brand Strategy (Brand Bible) for '${client_name}' in the '${industry}' sector.

DEEP CONTEXT:

Brand Core/DNA: '${brand_core}'

Business Model & Monetization: '${business_model || 'Not specified'}'

Art Direction & Aesthetics: '${art_direction || 'Not specified'}'

Target Market & Demographics: '${target_market || 'Not specified'}'

Current Goals/Rules: '${custom_rules || 'None specified'}'

Visuals: ${primary_color || 'Not specified'}, ${secondary_color || 'Not specified'}, Fonts: ${heading_font || 'Not specified'}/${body_font || 'Not specified'}.${bbContext}

YOUR TASK: Analyze this deeply. Do not output generic marketing fluff. Think about psychology, market positioning, and visual storytelling.
Return ONLY a valid JSON object with EXACTLY this structure:

brand_archetype: String (e.g., The Creator, The Ruler - explain why briefly).
psychological_hooks: Array of strings (What deep psychological needs does this brand fulfill for the target market?).
art_direction_manifesto: String (How the visual aesthetics translate into brand feelings).
campaign_concepts: Array of objects with core_idea (string) and visual_execution (string) - 2-4 creative campaign concepts.
content_pillars: Array of objects with name, purpose, and visual_cue (How this pillar should look).
brand_voice_guidelines: String (Strict rules on how the brand speaks and what words it avoids).`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the Brand Bible.' },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let data: {
      brand_archetype: string;
      psychological_hooks: string[];
      art_direction_manifesto: string;
      campaign_concepts?: { core_idea: string; visual_execution: string }[];
      content_pillars: { name: string; purpose: string; visual_cue: string }[];
      brand_voice_guidelines: string;
    };

    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, '').trim();
      data = JSON.parse(cleaned) as typeof data;
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('generate-strategy error:', err);
    const message = err instanceof Error ? err.message : 'Strategy generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
