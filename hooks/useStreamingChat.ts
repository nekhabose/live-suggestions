'use client';

interface StreamChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  transcriptContext: string;
  suggestionContext?: string;
  apiKey: string;
  systemPrompt: string;
  detailedAnswerPrompt?: string;
  isFromSuggestion: boolean;
  onDelta: (delta: string) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function streamChat(params: StreamChatParams): Promise<void> {
  const {
    messages,
    transcriptContext,
    suggestionContext,
    apiKey,
    systemPrompt,
    detailedAnswerPrompt,
    isFromSuggestion,
    onDelta,
    onError,
    onDone,
  } = params;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        transcriptContext,
        suggestionContext,
        apiKey,
        systemPrompt,
        detailedAnswerPrompt,
        isFromSuggestion,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Chat request failed' }));
      onError(err.error ?? 'Chat request failed');
      return;
    }

    if (!response.body) {
      onError('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.delta) {
            onDelta(parsed.delta);
          }
        } catch {
          // partial chunk, continue
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Chat failed');
  }
}
