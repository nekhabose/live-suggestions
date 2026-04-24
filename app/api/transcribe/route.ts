import { NextRequest, NextResponse } from 'next/server';
import { createGroqClient } from '@/lib/groq';
import { DEFAULTS } from '@/lib/defaults';

export const runtime = 'nodejs';

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

function buildUploadFile(audioBlob: Blob): File {
  const rawMimeType = audioBlob.type || 'audio/webm';
  const mimeType = rawMimeType.split(';')[0].trim() || 'audio/webm';
  const extension = MIME_TYPE_TO_EXTENSION[rawMimeType] ?? MIME_TYPE_TO_EXTENSION[mimeType] ?? 'webm';
  const fileName =
    audioBlob instanceof File && audioBlob.name && audioBlob.name.includes('.')
      ? audioBlob.name.replace(/\.[^.]+$/, `.${extension}`)
      : `audio.${extension}`;

  return new File([audioBlob], fileName, { type: mimeType });
}

function getErrorDetails(err: unknown): { status: number; message: string } {
  if (err instanceof Error) {
    const groqError = err as Error & {
      status?: number;
      error?: { message?: unknown; error?: unknown };
    };
    const maybeStatus = groqError.status;
    const providerMessage =
      typeof groqError.error?.message === 'string'
        ? groqError.error.message
        : typeof groqError.error?.error === 'string'
          ? groqError.error.error
          : null;

    return {
      status: typeof maybeStatus === 'number' ? maybeStatus : 500,
      message: providerMessage ?? err.message,
    };
  }

  return { status: 500, message: 'Transcription failed' };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob | null;
    const apiKey = formData.get('apiKey') as string | null;

    if (!apiKey) {
      return NextResponse.json({ text: '' });
    }
    if (!audioBlob) {
      return NextResponse.json({ error: 'Missing audio data' }, { status: 400 });
    }
    // Groq rejects audio shorter than 0.01s — chunks under 8 KB are typically
    // just WebM container headers with no real audio frames
    if (audioBlob.size < 8000) {
      return NextResponse.json({ text: '' });
    }

    const start = Date.now();
    const file = buildUploadFile(audioBlob);

    const groq = createGroqClient(apiKey);
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: DEFAULTS.GROQ_TRANSCRIPTION_MODEL,
      response_format: 'json',
      language: 'en',
    });

    return NextResponse.json({
      text: transcription.text,
      durationMs: Date.now() - start,
    });
  } catch (err: unknown) {
    const { status, message } = getErrorDetails(err);
    console.error('[transcribe]', { status, message, err });
    return NextResponse.json({ error: message }, { status });
  }
}
