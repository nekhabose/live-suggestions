'use client';

import { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/types';

interface RightPanelProps {
  chatMessages: ChatMessageType[];
  isChatStreaming: boolean;
  onSend: (content: string) => void;
}

export default function RightPanel({ chatMessages, isChatStreaming, onSend }: RightPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isChatStreaming) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-semibold text-gray-800 mb-4">Chat</h2>

      <div className="flex-1 overflow-y-auto pr-1 mb-3">
        {chatMessages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Click a suggestion or type a question to get started.
          </p>
        )}
        {chatMessages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={isChatStreaming && i === chatMessages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the conversation… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatStreaming}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium shrink-0"
          >
            {isChatStreaming ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              '↑'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
