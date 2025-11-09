import { GoogleGenerativeAI } from "@google/generative-ai";
import { webSearch } from "./tools/webSearch";
import { StreamEvent } from "./types";
import "./dotenv.config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function runAgent(
  query: string,
  sendEvent: (e: StreamEvent) => Promise<void>
) {
  await sendEvent({
    type: "reasoning",
    content: "Analyzing query intent and deciding if external context is needed...",
  });

  const decidePrompt = `
You are an AI agent deciding whether to use a web search tool to answer a user query.

Guidelines:
- Use the web tool for anything involving *real-time*, *recent*, or *factual data* (e.g. current events, latest research, weather, prices, trends, "today", "now", "2025").
- Use your internal knowledge for conceptual, historical, or general reasoning questions.
- Respond ONLY with one word:
  - "search" → if a web search is needed
  - "no" → if not needed

User query: "${query}"
`;

  const decideResult = await model.generateContent(decidePrompt);
  const decision = decideResult.response.text().trim().toLowerCase();
  const needsSearch = decision.includes("search");

  let searchResults = "";

  if (needsSearch) {
    await sendEvent({
      type: "reasoning",
      content: "Decided to fetch live web data for better accuracy.",
    });
    await sendEvent({ type: "tool_call", tool: "web_search", input: query });

    // 🔹 Real-time web search (using Serper.dev)
    searchResults = await webSearch(query);

    await sendEvent({
      type: "tool_call",
      tool: "web_search",
      input: query,
      output: searchResults,
    });
  } else {
    await sendEvent({
      type: "reasoning",
      content: "No external search required; answering from internal knowledge.",
    });
  }

  await sendEvent({
    type: "reasoning",
    content: "Synthesizing final response...",
  });

  const finalPrompt = `
You are a helpful AI agent answering the user's question.

User question: ${query}

${
    needsSearch
      ? `You have access to the following search results:\n${searchResults}`
      : "You should answer using your own general knowledge (no external search used)."
  }

Provide a clear, factual, and concise answer. If you used sources, refer to them naturally (e.g., "According to Reuters...").
Keep it under 200 words.
`;

  const streamResult = await model.generateContentStream(finalPrompt);

  let fullText = "";
  for await (const chunk of streamResult.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      await sendEvent({ type: "reasoning", content: text });
    }
  }

  const finalResponse = await streamResult.response;
  const fullAnswer = finalResponse.text();
  await sendEvent({ type: "response", content: fullAnswer });
}