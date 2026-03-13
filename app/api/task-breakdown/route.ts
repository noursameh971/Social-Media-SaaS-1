import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const taskTitle = (body.taskTitle as string) || '';

    if (!taskTitle.trim()) {
      return NextResponse.json({ error: 'taskTitle is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an Elite Productivity Expert. The user will give you a broad task: '${taskTitle}'. Break it down into EXACTLY 3 smaller, highly actionable, and short sub-tasks. Return ONLY a valid JSON object with this exact structure, no markdown: { "subtasks": ["Short Action 1", "Short Action 2", "Short Action 3"] }`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Break down this task into 3 sub-tasks: ${taskTitle}` },
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
    console.error('task-breakdown error:', err);
    const message = err instanceof Error ? err.message : 'Failed to break down task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
