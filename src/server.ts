import express from "express";
import cors from "cors";
import { runAgent } from "./agent";
import { StreamEvent } from "./types";
import "./dotenv.config";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function setupSSE(res: express.Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

}

function sendSSE(res: express.Response, event: StreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  if ((res as any).flush) (res as any).flush();
}

app.post("/chat", async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing 'query' field in request body" });
  }

  setupSSE(res);

  sendSSE(res, { type: "reasoning", content: "Accepted query, initializing agent..." });

  const sendEvent = async (e: StreamEvent) => {
    sendSSE(res, e);
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


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));