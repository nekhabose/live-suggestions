import { NextRequest, NextResponse } from 'next/server';
import { createGroqClient } from '@/lib/groq';
import { DEFAULTS } from '@/lib/defaults';
import type { SuggestionType } from '@/types';

export const runtime = 'nodejs';

const VALID_TYPES: SuggestionType[] = ['QUESTION_TO_ASK', 'TALKING_POINT', 'FACT_CHECK', 'CLARIFICATION'];

export async function POST(request: NextRequest) {
  try {
    const { transcriptSlice, apiKey, systemPrompt } = await request.json();

    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    if (!transcriptSlice?.trim()) return NextResponse.json({ error: 'Empty transcript' }, { status: 400 });

    const groq = createGroqClient(apiKey);
    const completion = await groq.chat.completions.create({
      model: DEFAULTS.GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 3 suggestions for this transcript:\n\n${transcriptSlice}` },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { suggestions?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from model' }, { status: 500 });
    }

    if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      return NextResponse.json({ error: 'No suggestions returned' }, { status: 500 });
    }

    const suggestions = parsed.suggestions.slice(0, 3).map((s: unknown) => {
      const item = s as Record<string, unknown>;
      return {
        type: VALID_TYPES.includes(item.type as SuggestionType) ? item.type : 'TALKING_POINT',
        title: String(item.title ?? '').slice(0, 100),
        preview: String(item.preview ?? ''),
      };
    });

    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Suggestion generation failed';
    console.error('[suggestions]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
