'use client';

import { useState, useRef, useCallback } from 'react';

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm';
}

interface UseAudioCaptureOptions {
  intervalMs: number;
  onChunkReady: (blob: Blob, startMs: number, endMs: number) => void;
  onError: (error: Error) => void;
}

export function useAudioCapture({ intervalMs, onChunkReady, onError }: UseAudioCaptureOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);
  const chunkStartRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');
  const flushResolverRef = useRef<(() => void) | null>(null);

  const startNewRecorder = useCallback(() => {
    if (!streamRef.current) return;
    const mime = mimeTypeRef.current;
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = recorder;
    chunkStartRef.current = Date.now() - sessionStartRef.current;

    recorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0) {
        const endMs = Date.now() - sessionStartRef.current;
        await onChunkReady(e.data, chunkStartRef.current, endMs);
      }
      if (flushResolverRef.current) {
        flushResolverRef.current();
        flushResolverRef.current = null;
      }
    };

    recorder.onerror = (e) => {
      onError(new Error(`MediaRecorder error: ${(e as ErrorEvent).message ?? 'unknown'}`));
    };

    recorder.start();
  }, [onChunkReady, onError]);

  const cycleRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      startNewRecorder();
      return;
    }
    recorder.onstop = () => {
      startNewRecorder();
    };
    recorder.stop();
  }, [startNewRecorder]);

  const flush = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    await new Promise<void>((resolve) => {
      flushResolverRef.current = resolve;
      cycleRecorder();
    });
  }, [cycleRecorder]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setPermissionState('granted');
      mimeTypeRef.current = getSupportedMimeType();
      sessionStartRef.current = Date.now();
      setIsRecording(true);

      startNewRecorder();

      intervalRef.current = setInterval(() => {
        cycleRecorder();
      }, intervalMs);
    } catch (err) {
      setPermissionState('denied');
      onError(err instanceof Error ? err : new Error('Microphone access denied'));
    }
  }, [intervalMs, startNewRecorder, cycleRecorder, onError]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          const endMs = Date.now() - sessionStartRef.current;
          onChunkReady(e.data, chunkStartRef.current, endMs);
        }
      };
      recorder.stop();
    }
    recorderRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsRecording(false);
  }, [onChunkReady]);

  return { isRecording, permissionState, start, stop, flush };
}
