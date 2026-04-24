'use client';

import SuggestionCard from './SuggestionCard';
import type { SuggestionBatch as SuggestionBatchType, Suggestion } from '@/types';

interface SuggestionBatchProps {
  batch: SuggestionBatchType;
  onSuggestionClick: (suggestion: Suggestion) => void;
  isLatest?: boolean;
}

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function SuggestionBatch({ batch, onSuggestionClick, isLatest }: SuggestionBatchProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {isLatest && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Latest
          </span>
        )}
        <span className="text-xs text-gray-400">{timeAgo(batch.createdAt)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {batch.suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
}
