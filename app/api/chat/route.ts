import { NextRequest } from 'next/server';
import { createGroqClient } from '@/lib/groq';
import { DEFAULTS } from '@/lib/defaults';
import { fillTemplate } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      transcriptContext,
      suggestionContext,
      apiKey,
      systemPrompt,
      detailedAnswerPrompt,
      isFromSuggestion,
    } = await request.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 400 });
    }

    let resolvedSystemPrompt: string;
    if (isFromSuggestion && detailedAnswerPrompt && suggestionContext) {
      const [type, title, preview] = (suggestionContext as string).split('|||');
      resolvedSystemPrompt = fillTemplate(detailedAnswerPrompt, {
        TRANSCRIPT_CONTEXT: transcriptContext ?? '',
        SUGGESTION_TYPE: type ?? '',
        SUGGESTION_TITLE: title ?? '',
        SUGGESTION_PREVIEW: preview ?? '',
      });
    } else {
      resolvedSystemPrompt = fillTemplate(systemPrompt, {
        TRANSCRIPT_CONTEXT: transcriptContext ?? '',
      });
    }

    const groq = createGroqClient(apiKey);
    const groqStream = await groq.chat.completions.create({
      model: DEFAULTS.GROQ_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: resolvedSystemPrompt },
        ...(messages ?? []),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    console.error('[chat]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
