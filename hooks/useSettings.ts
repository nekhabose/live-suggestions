'use client';

import { useState, useEffect } from 'react';
import type { Settings } from '@/types';
import {
  DEFAULT_SUGGESTION_PROMPT,
  DEFAULT_DETAILED_ANSWER_PROMPT,
  DEFAULT_CHAT_SYSTEM_PROMPT,
} from '@/lib/prompts';
import { DEFAULTS } from '@/lib/defaults';

const SETTINGS_KEY = 'live-suggestions-settings';

const DEFAULT_SETTINGS: Settings = {
  groqApiKey: '',
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  detailedAnswerPrompt: DEFAULT_DETAILED_ANSWER_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
  suggestionContextChars: DEFAULTS.SUGGESTION_CONTEXT_CHARS,
  expandedAnswerContextChars: DEFAULTS.EXPANDED_ANSWER_CONTEXT_CHARS,
  chatContextChars: DEFAULTS.CHAT_CONTEXT_CHARS,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function updateSettings(partial: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function resetToDefaults() {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  }

  return { settings, updateSettings, resetToDefaults, DEFAULT_SETTINGS };
}
