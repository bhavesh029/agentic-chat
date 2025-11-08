# Agentic Chat

A small demo backend for an "agentic" chat system that uses Google's Generative AI (Gemini) for reasoning and an optional web-search tool for up-to-date information. The server exposes a streaming chat endpoint and serves a simple frontend at `public/index.html` that demonstrates Server-Sent Events (SSE) streaming of agent reasoning, tool calls, and the final response.

## What this project does

- Accepts user queries via POST /chat and streams back events (reasoning, tool calls, and final response) using SSE.
- Internally decides whether to call a web search tool (Serper) for recent information, then synthesizes a concise answer with the Gemini model.
- Serves a small demo UI (`public/index.html`) so you can try queries from your browser.

## Project layout (important files)

- `src/server.ts` — Express server that exposes `/chat` and serves static files from `public/`. It handles SSE plumbing.
- `src/agent.ts` — Orchestrates the agent flow: decides if a web search is needed, optionally calls `webSearch`, and streams generation output from Gemini.
- `src/tools/webSearch.ts` — Minimal wrapper around Serper (google.serper.dev) for web search; requires `SERPER_API_KEY` in `.env`.
- `public/index.html` — Simple frontend to interact with the backend and display streamed events.
- `package.json`, `tsconfig.json` — Project configuration and scripts.

## Prerequisites

- Node.js (recommended: Node 18 or later)
- npm (or a compatible package manager)
- API keys:
  - A Google Generative AI / Gemini API key (exported as `GEMINI_API_KEY`)
  - (Optional for web search) A Serper API key (exported as `SERPER_API_KEY`) if you want the web search feature to work

Notes:
- If `GEMINI_API_KEY` is missing the server will throw on startup because the agent requires the Gemini client.
- If `SERPER_API_KEY` is missing, the web search tool returns a friendly message and the agent will continue without external search results.

## .env

Create a `.env` file in the project root (same folder as `package.json`) with the following keys:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
SERPER_API_KEY=your_serper_api_key_here   # optional (for web search)
PORT=3000                                 # optional (defaults to 3000)
```

Replace the placeholder values with your actual API keys. Keep `.env` private and do not commit it to version control.

## Install and run (development)

1. Install dependencies:

```bash
npm install
```

2. Create `.env` as described above.

3. Start the development server (uses `ts-node-dev` for live reload):

```bash
npm run dev
```

4. Open the demo in your browser:

```
http://localhost:3000
```

The browser UI will stream events (reasoning/tool calls/response) from the `/chat` endpoint.

## Example: curl (SSE streaming)

You can also POST directly to the `/chat` SSE endpoint from a terminal. Use `-N` to disable output buffering so you can see SSE events as they arrive:

```bash
curl -N -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"What's new in AI in 2025?"}'
```

Expect to receive a stream of `data: {...}\n\n` events. The demo frontend (`public/index.html`) reads and parses the same events.

## Troubleshooting

- Server crashes on startup with "Missing GEMINI_API_KEY": Create `.env` and add a valid `GEMINI_API_KEY`.
- Web search shows "Search tool is not configured (missing API key)": Add `SERPER_API_KEY` to `.env` if you want web search functionality.
- If SSE responses appear delayed: check for proxy buffering (NGINX, Cloudflare) or compression middleware that buffers responses — SSE requires unbuffered streaming.

## Development notes & next steps

- The agent uses the `@google/generative-ai` client and `model.generateContentStream` to stream model output. The app currently streams Gemini text chunks as SSE "reasoning" events and emits a final "response" event with the completed answer.
- Possible improvements you might add:
  - Authentication and rate-limiting for the `/chat` endpoint.
  - Caching or limiting web-search calls to reduce API usage/costs.
  - More structured event types and a richer frontend with streaming UI improvements.

