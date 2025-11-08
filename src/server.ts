import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runAgent } from "./agent";
import { StreamEvent } from "./types";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
/**
 * Utility: sets up Server-Sent Events headers and disables buffering
 */
function setupSSE(res: express.Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // Disable response buffering (important!)
  res.flushHeaders?.();

  // For some reverse proxies (like Nginx or Cloudflare)
  // make sure to disable their buffering layer too, if needed.
}

/**
 * Utility: send one JSON event over SSE
 */
function sendSSE(res: express.Response, event: StreamEvent) {
  // Each SSE message must start with "data:" and end with double newline.
  res.write(`data: ${JSON.stringify(event)}\n\n`);

  // Explicit flush for immediate delivery (if express supports it)
  if ((res as any).flush) (res as any).flush();
}

/**
 * POST /chat
 * Body: { "query": "Explain the state of AI in 2025?" }
 * Streams reasoning, tool calls, and final response as JSON events.
 */
app.post("/chat", async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing 'query' field in request body" });
  }

  setupSSE(res);

  // Immediately acknowledge
  sendSSE(res, { type: "reasoning", content: "Accepted query, initializing agent..." });

  // Helper passed to runAgent for live event streaming
  const sendEvent = async (e: StreamEvent) => {
    sendSSE(res, e);
    // Small delay prevents overwhelming the client
    await new Promise((r) => setTimeout(r, 5));
  };

  try {
    await runAgent(query, sendEvent);
    sendSSE(res, { type: "reasoning", content: "Agent finished." });
    res.end();
  } catch (err: any) {
    console.error("[/chat] Agent error:", err);
    sendSSE(res, { type: "response", content: `Error: ${err.message || "Unknown error"}` });
    res.end();
  }
});

// Explicitly enable flushing for compression middlewares if needed
// app.use(require("compression")()); // ← disable this if you use SSE

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));