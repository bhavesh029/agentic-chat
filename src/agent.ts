import { GoogleGenerativeAI } from "@google/generative-ai";
import { webSearch } from "./tools/webSearch";
import { StreamEvent } from "./types";
import dotenv from "dotenv";

dotenv.config();
// Initialize Gemini client (uses GEMINI_API_KEY from env)
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get the model you want to use
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function runAgent(
  query: string,
  sendEvent: (e: StreamEvent) => Promise<void>
) {
  await sendEvent({
    type: "reasoning",
    content: "Analyzing query intent and deciding if a web search is needed...",
  });

  // Step 1: Decide whether a web search is needed
  const decidePrompt = `
You are a reasoning AI assistant that decides whether a web search is needed.
User asked: "${query}"
If the question is about "latest", "current", "2025", "today", or "recent", respond ONLY with "search".
Otherwise respond ONLY with "no".
`;

  // ✅ FIXED: Call generateContent on the model
  const decideResult = await model.generateContent(decidePrompt);
  const decideResp = decideResult.response;
  const decision = decideResp.text().trim().toLowerCase();
  const needsSearch = decision.includes("search");

  let searchResults = "";

  if (needsSearch) {
    await sendEvent({ type: "tool_call", tool: "web_search", input: query });
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
      content: "No external data required; proceeding from internal knowledge.",
    });
  }

  // Step 2: Generate final answer using streaming
  await sendEvent({
    type: "reasoning",
    content: "Synthesizing final response...",
  });

  const finalPrompt = `
User question: ${query}

${
    needsSearch
      ? `Here are some web search results:\n${searchResults}`
      : "No external sources were used."
  }

Provide a concise, factual, well-written explanation (under 200 words).
`;

  // ✅ FIXED: Call generateContentStream on the model
  const streamResult = await model.generateContentStream(finalPrompt);

  let fullText = "";
  // ✅ FIXED: Iterate over streamResult.stream
  for await (const chunk of streamResult.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      await sendEvent({ type: "reasoning", content: text });
    }
  }

  // ✅ FIXED: Get final response from streamResult.response
  const finalResponse = await streamResult.response;
  const fullAnswer = finalResponse.text();

  await sendEvent({ type: "response", content: fullAnswer });
}