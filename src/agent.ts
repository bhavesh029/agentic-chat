import { webSearch } from './tools/webSearch';
import { StreamEvent } from './types';

export async function runAgent(query: string, sendEvent: (e: StreamEvent) => Promise<void>) {
  // 1) initial thought
  await sendEvent({ type: 'reasoning', content: 'Reading the user query and considering what is needed.' });

  // 2) simple heuristic: if query contains "state of" or "2025" -> do web search (demo heuristic)
  const needTool = /202\d|state of|latest|today|recent|updates?/i.test(query);

  if (needTool) {
    const toolInput = query;
    await sendEvent({ type: 'tool_call', tool: 'web_search', input: toolInput });
    const output = await webSearch(toolInput);
    await sendEvent({ type: 'tool_call', tool: 'web_search', input: toolInput, output });
  } else {
    await sendEvent({ type: 'reasoning', content: 'No external data required; proceeding from knowledge.' });
  }

  // 3) produce final answer (synthesis). You would call an LLM here with context.
  // For demo: synthesize from tool output if present; in real, call LLM with tool output prepended.
  const final = `FINAL ANSWER (demo): For your query "${query}", I checked sources and synthesized an answer.`;
  await sendEvent({ type: 'response', content: final });
}