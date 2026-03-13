import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { clientId, title, hook, platform } = body;

    if (!clientId || !title || !platform) {
      return NextResponse.json(
        { error: 'clientId, title, and platform are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('tone_of_voice, target_audience, mission, usp, pain_points')
      .eq('client_id', clientId)
      .maybeSingle();

    const tone = brief?.tone_of_voice || 'professional and engaging';
    const audience = brief?.target_audience || 'a general audience';
    const mission = brief?.mission || 'not specified';
    const usp = brief?.usp || 'not specified';
    const painPoints = brief?.pain_points || 'not specified';

    const hasStrategy = !briefError && brief && (brief.tone_of_voice || brief.target_audience || brief.mission || brief.usp || brief.pain_points);

    const userPrompt = hasStrategy
      ? `You are an expert Social Media Strategist and Content Creator. Write a highly engaging script/caption for ${platform} about "${title}".

Use this hook to open strong: ${hook || '(create an attention-grabbing hook)'}

Brand context:
- Tone of voice: ${tone}
- Target audience: ${audience}
- Brand mission: ${mission}
- Unique selling proposition: ${usp}
- Pain points the brand solves: ${painPoints}

Requirements:
- Match the brand's tone exactly
- Speak directly to the target audience
- Weave in the USP naturally
- Keep it platform-appropriate (${platform} has different best practices)
- Include a clear CTA if appropriate
- Format the output cleanly with clear sections if needed (e.g., Hook, Body, CTA)
- Make it scroll-stopping and shareable`
      : `You are an expert Social Media Strategist. Write a highly engaging script/caption for ${platform} about "${title}".

Use this hook to open strong: ${hook || '(create an attention-grabbing hook)'}

No brand strategy was found for this client, so create a versatile, professional post that would work for most brands. Keep it engaging, clear, and platform-appropriate for ${platform}. Include a natural CTA. Format the output cleanly.`;

    const groq = new Groq({ apiKey });
    const modelId = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const completion = await groq.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: 'You are an expert Social Media Strategist. Write engaging, platform-appropriate content. Output only the script/caption, no meta commentary.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    const generatedScript = content.trim();

    return NextResponse.json({ generatedScript });
  } catch (err) {
    console.error('generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
