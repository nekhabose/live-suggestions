import type { ExportData, TranscriptChunk, SuggestionBatch, ChatMessage } from '@/types';

interface ExportSessionParams {
  sessionStartedAt: string | null;
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
}

export function exportSession(params: ExportSessionParams): void {
  const { sessionStartedAt, transcriptChunks, suggestionBatches, chatMessages } = params;

  const fullTranscript = transcriptChunks.map((c) => c.text).join(' ');
  const lastChunk = transcriptChunks[transcriptChunks.length - 1];
  const sessionDurationMs = lastChunk ? lastChunk.audioEndMs : 0;

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    sessionStartedAt,
    sessionDurationMs,
    fullTranscript,
    transcriptChunks,
    suggestionBatches,
    chatMessages,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `live-suggestions-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
