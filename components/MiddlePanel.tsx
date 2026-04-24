'use client';

import SuggestionBatch from './SuggestionBatch';
import type { SuggestionBatch as SuggestionBatchType, Suggestion } from '@/types';

interface MiddlePanelProps {
  suggestionBatches: SuggestionBatchType[];
  pendingSuggestions: boolean;
  hasTranscript: boolean;
  onRefresh: () => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export default function MiddlePanel({
  suggestionBatches,
  pendingSuggestions,
  hasTranscript,
  onRefresh,
  onSuggestionClick,
}: MiddlePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Live Suggestions</h2>
        <button
          onClick={onRefresh}
          disabled={pendingSuggestions || !hasTranscript}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {pendingSuggestions ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Thinking…
            </>
          ) : (
            <>↻ Refresh</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {suggestionBatches.length === 0 && !pendingSuggestions && (
          <div className="text-sm text-gray-400 text-center mt-8 space-y-2">
            <p>No suggestions yet.</p>
            <p className="text-xs">Start recording and speak — suggestions will auto-refresh every 30 seconds, or click Refresh.</p>
          </div>
        )}

        {pendingSuggestions && suggestionBatches.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-8 gap-3 text-gray-400">
            <span className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Generating suggestions…</p>
          </div>
        )}

        {suggestionBatches.map((batch, i) => (
          <SuggestionBatch
            key={batch.id}
            batch={batch}
            onSuggestionClick={onSuggestionClick}
            isLatest={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
