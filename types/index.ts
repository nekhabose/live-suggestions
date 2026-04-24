export type SuggestionType =
  | 'QUESTION_TO_ASK'
  | 'TALKING_POINT'
  | 'FACT_CHECK'
  | 'CLARIFICATION';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  preview: string;
  createdAt: string;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  transcriptSlice: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  linkedSuggestionId?: string;
}

export interface TranscriptChunk {
  id: string;
  text: string;
  createdAt: string;
  audioStartMs: number;
  audioEndMs: number;
}

export interface Settings {
  groqApiKey: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatSystemPrompt: string;
  suggestionContextChars: number;
  expandedAnswerContextChars: number;
  chatContextChars: number;
}

export interface ExportData {
  exportedAt: string;
  sessionStartedAt: string | null;
  sessionDurationMs: number;
  fullTranscript: string;
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
}
