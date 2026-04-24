# Live Suggestions — AI Meeting Copilot

Real-time AI suggestions during live conversations. Captures mic audio, transcribes it every 30 seconds, and surfaces three context-aware suggestions alongside a streaming chat panel.

**Live URL**: _(add deployed URL here before submitting)_

---

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **⚙ Settings**, and paste your Groq API key (`gsk_...` from [console.groq.com](https://console.groq.com)).

No environment variables. No database. No account required.

### Requirements

- Node.js ≥ 18
- A modern browser with MediaRecorder support (Chrome, Firefox, Safari 14.1+)
- A Groq API key

### Build & deploy

```bash
npm run build          # type-check + production bundle
vercel deploy          # or: netlify deploy --prod, railway up, etc.
```

No server-side secrets — the Groq key is supplied by the user at runtime and never stored server-side.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes + React in one repo, no separate backend needed. Server components for layout, client components for interactive state. |
| Transcription | Groq — Whisper Large V3 | Required by spec. Fastest Whisper inference available; handles 30s audio chunks reliably. |
| LLM | Groq — `openai/gpt-oss-120b` | Required by spec. Same model for all submissions so evaluation is prompt-quality only, not model-quality. |
| Styling | Tailwind CSS | Utility classes keep component files self-contained; no context-switching to a stylesheet. |
| State | React `useReducer` | Shallow, synchronous state tree. A typed reducer is easier to audit than a Zustand store for a project this size. |
| Streaming | Server-Sent Events (SSE) | One-directional streaming from server → client. Simpler than WebSockets for this pattern; native browser support, no extra library. |
| Storage | None | Requirement: no persistence needed on reload. `localStorage` holds only user settings (prompts, context window sizes). |

---

## Architecture

```
Browser
├── useAudioCapture        — MediaRecorder, 30s stop-restart cycle
├── useSession             — central reducer; orchestrates all async flows
│   ├── transcribeChunk    → POST /api/transcribe  (FormData: audio + apiKey)
│   ├── triggerSuggestions → POST /api/suggestions (JSON: transcript slice)
│   └── sendChatMessage    → POST /api/chat        (SSE stream)
├── useSettings            — localStorage persistence for prompts + context windows
└── useStreamingChat       — SSE reader, line-buffered delta accumulation

API Routes (Next.js, Node runtime)
├── /api/transcribe   — Groq Whisper Large V3
├── /api/suggestions  — Groq GPT-OSS 120B, response_format: json_object
└── /api/chat         — Groq GPT-OSS 120B, stream: true → SSE
```

### Audio pipeline

MediaRecorder uses a **stop-restart pattern** rather than `timeslice`. Every 30 seconds the current recorder is stopped and a new one starts immediately via `onstop`. This produces complete, self-contained audio files (valid WebM/MP4/OGG with headers) that Whisper can process directly. `timeslice` produces headerless fragments that require manual container reconstruction — not worth the complexity.

MIME type priority: `audio/webm;codecs=opus` → `audio/webm` → `audio/ogg;codecs=opus` → `audio/mp4`. The most specific codec is tried first so the browser picks the best quality it supports.

A `flush()` operation is available: when the user manually hits Refresh, the current in-progress chunk is completed and transcribed before suggestions are generated, so the most recent speech is included.

---

## Prompt Strategy

This is the core of the submission. Three separate prompts, each with a different job.

### 1. Suggestion prompt (`/api/suggestions`)

**Goal**: produce three suggestions that are immediately useful even if never clicked, vary by type, and are hyper-specific to what was just said.

**Key constraints in the prompt**:
- All 3 suggestions must be **different types** (QUESTION_TO_ASK, TALKING_POINT, FACT_CHECK, CLARIFICATION). This forces variety — without it, the model defaults to three questions every time.
- The `preview` field must deliver **standalone value**: 2–3 sentences of real insight, not a teaser. A good preview makes clicking optional, not required.
- `title` is capped at 10 words. Shorter titles are faster to scan during a live conversation.
- The prompt instructs the model to weight the **most recent part of the transcript**. Recency is the strongest signal for what matters right now.
- `response_format: json_object` is set on the API call. This forces the model to output parseable JSON regardless of what the prompt says — no markdown fences, no explanation preamble.

**Context window**: last 4,000 characters (~1,000 tokens, ~2–3 minutes of speech). Long enough to have topic context, short enough to be fast and to keep suggestions anchored to the current moment rather than the start of the meeting.

**Type selection logic**: the model decides which 3 of the 4 types to use based on context:
- `QUESTION_TO_ASK` when there's an opening to probe deeper or something unexplained
- `TALKING_POINT` when the conversation has a gap the user could fill with a fact or angle
- `FACT_CHECK` when a specific claim was made that could be wrong or worth verifying
- `CLARIFICATION` when jargon or an ambiguous term appeared that the user may not have caught

### 2. Detailed answer prompt (`/api/chat`, triggered on card click)

**Goal**: give a thorough, immediately actionable response the user can act on right now, mid-conversation.

**Context window**: last 12,000 characters. More context matters here — the user clicked because they want depth, and the question is often about something said earlier in the meeting.

**Structure per type** (injected via `{{SUGGESTION_TYPE}}`):
- `QUESTION_TO_ASK` → verbatim question to say, 2 follow-ups if the answer is evasive, what a good vs. deflecting answer looks like
- `TALKING_POINT` → draft language they can use verbatim, a framing sentence to introduce it naturally, supporting evidence
- `FACT_CHECK` → the claim that was made, the correct information with confidence level, the most diplomatic way to raise the correction
- `CLARIFICATION` → full definition, how it applies specifically to this conversation, how to ask without seeming uninformed

The suggestion type, title, and preview are all injected into the prompt via `fillTemplate()`. The model knows exactly what was clicked, not just the chat message text.

### 3. Chat system prompt (`/api/chat`, general messages)

**Goal**: answer follow-up questions from the user as a well-informed colleague who is also in the room.

**Context window**: last 8,000 characters. Balanced — enough for full topic context, not so much that latency suffers on short factual questions.

**Tone calibration**: the prompt explicitly says "smart colleague whispering advice, not a formal report generator." This suppresses the model's tendency to produce structured headers and bullet-point essays for simple questions. Short direct answers when the question is simple; depth when asked.

The full transcript context is injected into the system prompt on every request, not the chat history. This keeps the model grounded in what was actually said rather than relying on the user to re-state context.

### All prompts are user-editable

Every prompt and every context window size is exposed in Settings. The defaults are the result of iteration — users can tune them without touching code.

---

## Tradeoffs

**User-supplied API key, stored in localStorage**
The spec requires users to paste their own key. It lives in `localStorage` and is sent from the browser to the API routes on every request. This means the key is visible in DevTools Network tab. The alternative (a server-side env var) was rejected because it violates the spec requirement and eliminates per-user billing isolation. For a shared deployment where every user brings their own key, this is the correct design.

**Stop-restart MediaRecorder over `timeslice`**
`timeslice` appends data continuously but produces headerless fragments after the first event. Reassembling them into a valid audio file requires buffering and manual container reconstruction. Stop-restart produces one complete file per chunk with no extra work, and Whisper handles it cleanly. The 30-second boundary means at most 30 seconds of speech is delayed — acceptable for a copilot.

**SSE over WebSockets for streaming**
Chat responses stream via Server-Sent Events. SSE is one-directional (server → client), which is all that's needed here. It works over plain HTTP, needs no upgrade handshake, and is natively readable by the browser's `ReadableStream` API. WebSockets would add complexity for no benefit.

**`useReducer` over a state management library**
The state tree is shallow and synchronous: transcript chunks, suggestion batches, chat messages, a few booleans. A typed reducer with explicit actions is easier to reason about and audit than a Zustand store for a project this size. Adding a library would be premature.

**Settings as a modal, not a route**
Navigating to a `/settings` page would unmount the session components and destroy in-memory state. A modal overlay keeps the session alive during settings edits. The cost is slightly more component complexity; the benefit is the user never loses a session by accidentally opening settings.

**No batching of transcript + suggestion requests**
Transcription and suggestion generation are separate API calls triggered on the same 30-second interval. This means there's a small window where a new transcript chunk arrives while suggestions are being generated. The suggestion generator always reads `stateRef.current` (not a closure snapshot), so it picks up the freshest state available. The one-chunk lag on manual Refresh (while recording) is documented behavior, not a bug.

**In-memory session, JSON export for evaluation**
No database, no auth, no persistence. The export function produces a complete snapshot: full transcript, every suggestion batch with the transcript slice that generated it, full chat history, all with ISO timestamps. This is sufficient for the stated evaluation criteria.
