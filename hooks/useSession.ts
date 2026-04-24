'use client';

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { useAudioCapture } from './useAudioCapture';
import { streamChat } from './useStreamingChat';
import { exportSession as doExport } from '@/lib/exportSession';
import type { TranscriptChunk, SuggestionBatch, Suggestion, ChatMessage, Settings } from '@/types';

interface SessionState {
  isRecording: boolean;
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
  sessionStartedAt: string | null;
  pendingSuggestions: boolean;
  isChatStreaming: boolean;
  error: string | null;
}

type Action =
  | { type: 'ADD_TRANSCRIPT_CHUNK'; chunk: TranscriptChunk }
  | { type: 'ADD_SUGGESTION_BATCH'; batch: SuggestionBatch }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_LAST_CHAT_MESSAGE'; content: string }
  | { type: 'SET_RECORDING'; value: boolean; startedAt?: string }
  | { type: 'SET_PENDING_SUGGESTIONS'; value: boolean }
  | { type: 'SET_CHAT_STREAMING'; value: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'ADD_TRANSCRIPT_CHUNK':
      return { ...state, transcriptChunks: [...state.transcriptChunks, action.chunk] };
    case 'ADD_SUGGESTION_BATCH':
      return { ...state, suggestionBatches: [action.batch, ...state.suggestionBatches] };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'UPDATE_LAST_CHAT_MESSAGE': {
      const msgs = [...state.chatMessages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: action.content };
      }
      return { ...state, chatMessages: msgs };
    }
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.value,
        sessionStartedAt: action.startedAt ?? state.sessionStartedAt,
      };
    case 'SET_PENDING_SUGGESTIONS':
      return { ...state, pendingSuggestions: action.value };
    case 'SET_CHAT_STREAMING':
      return { ...state, isChatStreaming: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const initialState: SessionState = {
  isRecording: false,
  transcriptChunks: [],
  suggestionBatches: [],
  chatMessages: [],
  sessionStartedAt: null,
  pendingSuggestions: false,
  isChatStreaming: false,
  error: null,
};

export function useSession(settings: Settings) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerSuggestionsRef = useRef<() => void>(() => {});

  function setError(error: string) {
    dispatch({ type: 'SET_ERROR', error });
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 8000);
  }

  function getRecentTranscript(chunks: TranscriptChunk[], maxChars: number): string {
    return chunks.map((c) => c.text).join(' ').slice(-maxChars);
  }

  async function transcribeChunk(blob: Blob, startMs: number, endMs: number) {
    const formData = new FormData();
    formData.append('audio', blob);
    formData.append('apiKey', settings.groqApiKey);

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const raw = await res.text();
      let data: { error?: string; text?: string } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || 'Invalid server response' };
      }

      if (!res.ok || data.error) {
        setError(`Transcription failed (${res.status}): ${data.error ?? `HTTP ${res.status}`}`);
        return;
      }
      if (data.text?.trim()) {
        const chunk: TranscriptChunk = {
          id: crypto.randomUUID(),
          text: data.text.trim(),
          createdAt: new Date().toISOString(),
          audioStartMs: startMs,
          audioEndMs: endMs,
        };
        dispatch({ type: 'ADD_TRANSCRIPT_CHUNK', chunk });
      }
    } catch (err) {
      setError(`Transcription error: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  }

  const { isRecording: audioIsRecording, permissionState, start: audioStart, stop: audioStop, flush: flushCurrentChunk } =
    useAudioCapture({
      intervalMs: 30_000,
      onChunkReady: transcribeChunk,
      onError: (err) => setError(err.message),
    });

  const triggerSuggestions = useCallback(async () => {
    const currentState = stateRef.current;
    if (currentState.pendingSuggestions) return;

    if (audioIsRecording) {
      await flushCurrentChunk();
    }

    const recentTranscript = getRecentTranscript(
      stateRef.current.transcriptChunks,
      settings.suggestionContextChars
    );
    if (!recentTranscript.trim()) return;

    dispatch({ type: 'SET_PENDING_SUGGESTIONS', value: true });
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptSlice: recentTranscript,
          apiKey: settings.groqApiKey,
          systemPrompt: settings.suggestionPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(`Suggestions failed: ${data.error ?? 'Unknown error'}`);
        return;
      }

      const batch: SuggestionBatch = {
        id: crypto.randomUUID(),
        suggestions: data.suggestions.map((s: Omit<Suggestion, 'id' | 'createdAt'>) => ({
          ...s,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        })),
        transcriptSlice: recentTranscript,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_SUGGESTION_BATCH', batch });
    } catch (err) {
      setError(`Suggestions error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      dispatch({ type: 'SET_PENDING_SUGGESTIONS', value: false });
    }
  }, [settings.groqApiKey, settings.suggestionContextChars, settings.suggestionPrompt, audioIsRecording, flushCurrentChunk]);

  triggerSuggestionsRef.current = triggerSuggestions;

  function startRecording() {
    if (!settings.groqApiKey) {
      setError('Please add your Groq API key in Settings first');
      return;
    }
    dispatch({ type: 'SET_RECORDING', value: true, startedAt: new Date().toISOString() });
    audioStart();

    // Uses ref so the interval always calls the latest triggerSuggestions
    // even if settings change while recording.
    suggestionIntervalRef.current = setInterval(() => {
      triggerSuggestionsRef.current();
    }, 30_000);
  }

  function stopRecording() {
    audioStop();
    dispatch({ type: 'SET_RECORDING', value: false });
    if (suggestionIntervalRef.current) {
      clearInterval(suggestionIntervalRef.current);
      suggestionIntervalRef.current = null;
    }
  }

  async function sendChatMessage(content: string, linkedSuggestionId?: string, suggestionContext?: string) {
    if (!content.trim() || state.isChatStreaming) return;
    if (!settings.groqApiKey) {
      setError('Please add your Groq API key in Settings first');
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      linkedSuggestionId,
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMessage });

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMessage });
    dispatch({ type: 'SET_CHAT_STREAMING', value: true });

    const currentState = stateRef.current;
    const transcriptContext = getRecentTranscript(
      currentState.transcriptChunks,
      linkedSuggestionId ? settings.expandedAnswerContextChars : settings.chatContextChars
    );

    const messages = [
      ...currentState.chatMessages,
      { role: 'user' as const, content: content.trim() },
    ].map(({ role, content: c }) => ({ role, content: c }));

    let accumulated = '';
    await streamChat({
      messages,
      transcriptContext,
      suggestionContext,
      apiKey: settings.groqApiKey,
      systemPrompt: settings.chatSystemPrompt,
      detailedAnswerPrompt: settings.detailedAnswerPrompt,
      isFromSuggestion: !!linkedSuggestionId,
      onDelta: (delta) => {
        accumulated += delta;
        dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', content: accumulated });
      },
      onError: (err) => {
        setError(`Chat error: ${err}`);
        dispatch({ type: 'SET_CHAT_STREAMING', value: false });
      },
      onDone: () => {
        dispatch({ type: 'SET_CHAT_STREAMING', value: false });
      },
    });
  }

  async function clickSuggestion(suggestion: Suggestion) {
    const suggestionContext = `${suggestion.type}|||${suggestion.title}|||${suggestion.preview}`;
    const userContent = `Tell me more about: **${suggestion.title}**\n\n${suggestion.preview}`;
    await sendChatMessage(userContent, suggestion.id, suggestionContext);
  }

  function exportSession() {
    doExport({
      sessionStartedAt: state.sessionStartedAt,
      transcriptChunks: state.transcriptChunks,
      suggestionBatches: state.suggestionBatches,
      chatMessages: state.chatMessages,
    });
  }

  // Sync isRecording with audio capture state
  useEffect(() => {
    if (!audioIsRecording && state.isRecording) {
      dispatch({ type: 'SET_RECORDING', value: false });
    }
  }, [audioIsRecording, state.isRecording]);

  return {
    state,
    permissionState,
    startRecording,
    stopRecording,
    triggerSuggestions,
    sendChatMessage,
    clickSuggestion,
    exportSession,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}
