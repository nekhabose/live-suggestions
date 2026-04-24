# Live Suggestions — AI Meeting Copilot

Real-time AI suggestions during live conversations. Three-column layout: transcript, suggestions, chat.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click Settings, paste your Groq API key.

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Groq SDK** — Whisper Large V3 for transcription, `openai/gpt-oss-120b` for suggestions and chat
- **Tailwind CSS** — styling
- **No database** — all state in memory, exportable as JSON

## How It Works

### Audio Capture
MediaRecorder captures mic audio using a **stop-restart pattern** every 30 seconds. Each chunk is a complete, self-contained audio file (not headerless fragments from `timeslice`) that Whisper can process directly.

### Live Data Flow
1. Mic → 30s audio chunk → `/api/transcribe` → Whisper → text appended to transcript
2. Every 30s (auto) or on Refresh click → `/api/suggestions` → last 4,000 chars of transcript → 3 suggestions
3. Click suggestion or type → `/api/chat` → streaming SSE → chat panel

### API Routes
- `POST /api/transcribe` — `multipart/form-data` with audio blob + API key → transcript text
- `POST /api/suggestions` — JSON with transcript slice → 3 suggestion objects
- `POST /api/chat` — JSON with messages + transcript context → streaming SSE

## Prompt Strategy

### Suggestion Prompt
Designed to produce **varied, specific** suggestions by:
- Forcing 3 different suggestion types per batch (QUESTION_TO_ASK, TALKING_POINT, FACT_CHECK, CLARIFICATION)
- Requiring the preview to deliver standalone value — useful even if never clicked
- Using `response_format: json_object` to guarantee parseable output
- Constraining to recency (last 4,000 chars ≈ 2-3 min of speech)

### Detailed Answer Prompt
Structured response based on type:
- **QUESTION_TO_ASK**: verbatim question + 2 follow-ups + how to read the answer
- **TALKING_POINT**: draft language they can use + framing
- **FACT_CHECK**: the claim, the truth, how to raise it diplomatically
- **CLARIFICATION**: full definition + how it applies in this conversation

### Chat Prompt
Transcript injected as context. Tone: a smart colleague whispering advice, not a formal assistant.

### Context Windows
- Suggestions: 4,000 chars (~1,000 tokens, ~2-3 min of speech) — enough signal, fast enough
- Expanded answers: 12,000 chars — more context when depth matters
- Chat: 8,000 chars — balanced

All prompts and context window sizes are editable in Settings.

## Tradeoffs

- **No server-side API key storage** — key flows from browser → API route → Groq. Simpler, no auth needed.
- **Stop-restart MediaRecorder** over timeslice — produces valid audio files Whisper can process. Timeslice produces headerless fragments.
- **Settings as modal** not a separate route — keeps session state alive during settings edits.
- **useReducer** over Zustand — shallow state tree doesn't need an external library.

## Testing

No automated test suite. Run `npm run build` to catch TypeScript and lint errors, then smoke-test manually:
1. Paste a Groq API key in Settings
2. Click the mic, speak for 30+ seconds, confirm transcript appears
3. Confirm 3 suggestions generate automatically
4. Click a suggestion and confirm a detailed answer streams in the chat
5. Type a free-form question and confirm a response
6. Click Export and verify the JSON includes transcript, suggestions, and chat

## Deploy

```bash
npm run build    # Verify no build errors first
vercel deploy    # Or: netlify deploy --prod, railway up, etc.
```

No environment variables needed — users paste their own Groq API key in the Settings UI.

**Live URL**: _(add your deployed URL here before submitting)_
