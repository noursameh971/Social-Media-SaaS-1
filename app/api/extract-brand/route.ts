import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { extractText } from 'unpdf';
import officeParser from 'officeparser';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an Elite Brand Architect. Read the synthesized text extracted from MULTIPLE brand documents. Cross-reference the information and extract EVERY critical detail.

Do NOT write generic marketing summaries. You must EXTRACT the exact, specific rules, tone guidelines, architectural phrasing, and deep context directly from the documents. Preserve the brand's unique vocabulary and strict rules (e.g., if they say 'No emojis', include that explicitly).

You must return a JSON object with EXACTLY these top-level keys:

primary_color: MUST be a valid HEX code (e.g., #2C1810). Extract the darkest/dominant brand color. If none, guess based on vibe.

secondary_color: MUST be a valid HEX code (e.g., #F5EFE6). Extract the background/light brand color.

heading_font: String. The primary display/header font name (e.g., Cormorant Garamond).

body_font: String. The secondary/body font name (e.g., Jost).

brand_bible: An object containing exactly these keys: core_identity, target_audience, tone_and_voice, visual_system, business_model_and_product, market_positioning.

CRITICAL: Every key inside the brand_bible object (core_identity, target_audience, tone_and_voice, visual_system, business_model_and_product, market_positioning) MUST BE A PLAIN STRING. NEVER return a nested object or array inside these keys. Use newline characters \\n if you need to list multiple points within the string.

Do NOT bury the hex codes or font names inside the visual_system string only; they MUST be at the root level.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    let fileList = formData.getAll('files') as File[];
    if (!fileList || fileList.length === 0) {
      fileList = formData.getAll('file') as File[];
    }
    if (!fileList || fileList.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    fileList = Array.isArray(fileList) ? fileList.filter((f): f is File => f instanceof Blob) : [];
    if (fileList.length === 0) {
      return NextResponse.json({ error: 'No valid files provided' }, { status: 400 });
    }

    let combinedText = '';

    for (const file of fileList) {
      if (!file || !(file instanceof Blob)) continue;
      const name = (file as File).name?.toLowerCase() ?? '';
      const buffer = Buffer.from(await file.arrayBuffer());
      let extractedText = '';

      try {
        if (name.endsWith('.pdf')) {
          const { text } = await extractText(new Uint8Array(buffer));
          extractedText = typeof text === 'string' ? text : (Array.isArray(text) ? text.join('\n') : '');
        } else if (name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.pptx') || name.endsWith('.ppt')) {
          const ast = await officeParser.parseOffice(buffer);
          extractedText = ast.toText?.() ?? String(ast);
        } else {
          continue;
        }
      } catch (extractErr) {
        console.error('extract-brand extraction error for', (file as File).name, extractErr);
        continue;
      }

      combinedText += '\n\n--- Document: ' + (file as File).name + ' ---\n\n' + extractedText;
    }

    const textContent = combinedText.trim();
    if (!textContent || textContent.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from any document' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const safeText = textContent.length > 15000 ? textContent.substring(0, 15000) + '\n\n...[TRUNCATED DUE TO LIMITS]' : textContent;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract brand information from this synthesized document text:\n\n${safeText}` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    type BrandBible = {
      core_identity?: string;
      target_audience?: string;
      tone_and_voice?: string;
      visual_system?: string;
      business_model_and_product?: string;
      market_positioning?: string;
    };
    let data: {
      brand_bible?: BrandBible;
      primary_color?: string;
      secondary_color?: string;
      heading_font?: string;
      body_font?: string;
    };

    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, '').trim();
      data = JSON.parse(cleaned) as typeof data;
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('extract-brand error:', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
