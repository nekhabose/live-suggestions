'use client';

import { useState } from 'react';
import type { Settings } from '@/types';

interface SettingsModalProps {
  settings: Settings;
  defaultSettings: Settings;
  onSave: (partial: Partial<Settings>) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, defaultSettings, onSave, onClose }: SettingsModalProps) {
  const [form, setForm] = useState<Settings>({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetField(field: keyof Settings) {
    setForm((prev) => ({ ...prev, [field]: defaultSettings[field] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groq API Key</label>
            <p className="text-xs text-gray-400 mb-2">
              Get your key at{' '}
              <span className="font-mono text-gray-500">console.groq.com</span>. Stored locally in your browser only.
            </p>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.groqApiKey}
                onChange={(e) => setForm((p) => ({ ...p, groqApiKey: e.target.value }))}
                placeholder="gsk_..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Context Windows */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suggestion Context (chars)</label>
              <input
                type="number"
                min={500}
                max={20000}
                value={form.suggestionContextChars}
                onChange={(e) => setForm((p) => ({ ...p, suggestionContextChars: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expanded Answer Context (chars)</label>
              <input
                type="number"
                min={1000}
                max={50000}
                value={form.expandedAnswerContextChars}
                onChange={(e) => setForm((p) => ({ ...p, expandedAnswerContextChars: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chat Context (chars)</label>
              <input
                type="number"
                min={500}
                max={20000}
                value={form.chatContextChars}
                onChange={(e) => setForm((p) => ({ ...p, chatContextChars: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Prompts */}
          {(
            [
              { field: 'suggestionPrompt', label: 'Suggestion Prompt' },
              { field: 'detailedAnswerPrompt', label: 'Detailed Answer Prompt (on click)' },
              { field: 'chatSystemPrompt', label: 'Chat System Prompt' },
            ] as const
          ).map(({ field, label }) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <button
                  onClick={() => resetField(field)}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                value={form[field] as string}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
