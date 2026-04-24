'use client';

import { useState } from 'react';
import LeftPanel from '@/components/LeftPanel';
import MiddlePanel from '@/components/MiddlePanel';
import RightPanel from '@/components/RightPanel';
import SettingsModal from '@/components/SettingsModal';
import StatusBar from '@/components/StatusBar';
import { useSession } from '@/hooks/useSession';
import { useSettings } from '@/hooks/useSettings';
import type { Suggestion } from '@/types';

export default function Home() {
  const { settings, updateSettings, DEFAULT_SETTINGS } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  const {
    state,
    permissionState,
    startRecording,
    stopRecording,
    triggerSuggestions,
    sendChatMessage,
    clickSuggestion,
    exportSession,
    clearError,
  } = useSession(settings);

  const hasTranscript = state.transcriptChunks.length > 0;

  function handleSuggestionClick(suggestion: Suggestion) {
    clickSuggestion(suggestion);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">Live Suggestions</span>
          {!settings.groqApiKey && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              No API key — click Settings
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSession}
            disabled={!hasTranscript}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ↓ Export
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Transcript */}
        <div className="w-1/3 border-r border-gray-200 p-4 overflow-hidden flex flex-col bg-white">
          <LeftPanel
            isRecording={state.isRecording}
            transcriptChunks={state.transcriptChunks}
            permissionState={permissionState}
            onStart={startRecording}
            onStop={stopRecording}
          />
        </div>

        {/* Middle: Suggestions */}
        <div className="w-1/3 border-r border-gray-200 p-4 overflow-hidden flex flex-col bg-gray-50">
          <MiddlePanel
            suggestionBatches={state.suggestionBatches}
            pendingSuggestions={state.pendingSuggestions}
            hasTranscript={hasTranscript}
            onRefresh={triggerSuggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        {/* Right: Chat */}
        <div className="w-1/3 p-4 overflow-hidden flex flex-col bg-white">
          <RightPanel
            chatMessages={state.chatMessages}
            isChatStreaming={state.isChatStreaming}
            onSend={(content) => sendChatMessage(content)}
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSave={(partial) => {
            updateSettings(partial);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Error Toast */}
      <StatusBar error={state.error} onDismiss={clearError} />
    </div>
  );
}
