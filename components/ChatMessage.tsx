'use client';

import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.linkedSuggestionId && isUser && (
          <p className="text-blue-200 text-xs mb-1 font-medium">From suggestion →</p>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
        {isStreaming && !isUser && (
          <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
