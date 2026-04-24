'use client';

import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, blockIdx) => {
    const lines = block.split('\n');
    const firstLine = lines[0];

    // Heading: ## or ###
    if (/^#{1,3} /.test(firstLine)) {
      const content = firstLine.replace(/^#{1,3} /, '');
      return (
        <p key={blockIdx} className="font-semibold text-gray-900 mt-2 mb-0.5">
          {renderInline(content)}
        </p>
      );
    }

    // Bullet list block: all lines start with - or *
    const isList = lines.every((l) => /^[-*] /.test(l) || l.trim() === '');
    if (isList) {
      return (
        <ul key={blockIdx} className="list-disc list-inside space-y-0.5 my-1">
          {lines
            .filter((l) => /^[-*] /.test(l))
            .map((l, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {renderInline(l.replace(/^[-*] /, ''))}
              </li>
            ))}
        </ul>
      );
    }

    // Default: paragraph with line breaks
    return (
      <p key={blockIdx} className="leading-relaxed">
        {lines.map((line, lineIdx) => (
          <span key={lineIdx}>
            {renderInline(line)}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm leading-relaxed'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm space-y-1.5'
        }`}
      >
        {message.linkedSuggestionId && isUser && (
          <p className="text-blue-200 text-xs mb-1 font-medium">From suggestion →</p>
        )}
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="text-sm">{renderMarkdown(message.content)}</div>
        )}
        {isStreaming && !isUser && (
          <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  );
}
