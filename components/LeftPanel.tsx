'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptChunk } from '@/types';

interface LeftPanelProps {
  isRecording: boolean;
  transcriptChunks: TranscriptChunk[];
  permissionState: 'unknown' | 'granted' | 'denied';
  onStart: () => void;
  onStop: () => void;
}

export default function LeftPanel({
  isRecording,
  transcriptChunks,
  permissionState,
  onStart,
  onStop,
}: LeftPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptChunks]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Transcript</h2>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>

      {/* Mic Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={isRecording ? onStop : onStart}
          disabled={permissionState === 'denied'}
          className={`relative w-16 h-16 rounded-full transition-all duration-200 focus:outline-none focus:ring-4 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200 shadow-lg shadow-red-200'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200 shadow-lg shadow-blue-200'
          } ${permissionState === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
          )}
          <span className="relative z-10 flex items-center justify-center text-white text-2xl">
            {isRecording ? '⏹' : '🎙'}
          </span>
        </button>
      </div>

      {permissionState === 'denied' && (
        <p className="text-xs text-red-500 text-center mb-3">Microphone access denied</p>
      )}

      {!isRecording && transcriptChunks.length === 0 && (
        <p className="text-sm text-gray-400 text-center mt-4">
          Click the mic to start recording. Transcript will appear here every 30 seconds.
        </p>
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {transcriptChunks.map((chunk, i) => (
          <div key={chunk.id} className="text-sm text-gray-700 leading-relaxed">
            {i > 0 && <hr className="border-gray-100 mb-3" />}
            <span className="text-xs text-gray-400 block mb-1">
              {new Date(chunk.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {chunk.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
