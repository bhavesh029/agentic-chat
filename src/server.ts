import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent } from './agent';
import { StreamEvent } from './types';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

function setupSSEHeaders(res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.(); // if supported
}

// Helper: send JSON as an SSE data event
function sseSend(res: express.Response, obj: any) {
  // each SSE message should be prefixed with "data: "
  // We'll send a single-line JSON object
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

app.post('/chat', async (req, res) => {
  const { query } = req.body ?? {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'missing query string in request body' });
  }

  setupSSEHeaders(res);

  // send a welcome / ack
  sseSend(res, { type: 'reasoning', content: 'Accepted query, starting agent.' });

  // sendEvent implementation wired to SSE
  const sendEvent = async (ev: StreamEvent) => {
    sseSend(res, ev);
    // small flush to push data to client
    await new Promise(r => setTimeout(r, 10));
  };

  try {
    await runAgent(query, sendEvent);
    // close stream with a done event
    sseSend(res, { type: 'reasoning', content: 'Agent finished.' });
    // SSE streams are ended by closing the connection
    res.end();
  } catch (err) {
    console.error('Agent error', err);
    sseSend(res, { type: 'response', content: `Error: ${(err as Error).message}` });
    res.end();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Agentic chat server listening on ${port}`));