'use client';

import type { Suggestion, SuggestionType } from '@/types';

const TYPE_CONFIG: Record<SuggestionType, { label: string; border: string; badge: string; badgeText: string }> = {
  ANSWER_TO_QUESTION: {
    label: 'Answer',
    border: 'border-teal-400',
    badge: 'bg-teal-100 text-teal-700',
    badgeText: '↩ Answer',
  },
  QUESTION_TO_ASK: {
    label: 'Question to Ask',
    border: 'border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    badgeText: '? Question',
  },
  TALKING_POINT: {
    label: 'Talking Point',
    border: 'border-green-400',
    badge: 'bg-green-100 text-green-700',
    badgeText: '▸ Talking Point',
  },
  FACT_CHECK: {
    label: 'Fact Check',
    border: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    badgeText: '✓ Fact Check',
  },
  CLARIFICATION: {
    label: 'Clarification',
    border: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    badgeText: '◎ Clarification',
  },
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
}

export default function SuggestionCard({ suggestion, onClick }: SuggestionCardProps) {
  const config = TYPE_CONFIG[suggestion.type] ?? TYPE_CONFIG.TALKING_POINT;

  return (
    <button
      onClick={() => onClick(suggestion)}
      className={`w-full text-left rounded-lg border-l-4 ${config.border} bg-white p-3 shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 cursor-pointer group`}
    >
      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${config.badge}`}>
        {config.badgeText}
      </span>
      <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 group-hover:text-blue-700 transition-colors">
        {suggestion.title}
      </p>
      <p className="text-gray-600 text-xs leading-relaxed">{suggestion.preview}</p>
      <p className="text-blue-500 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Click for detailed answer →
      </p>
    </button>
  );
}
