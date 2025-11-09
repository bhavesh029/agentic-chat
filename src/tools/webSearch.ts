import fetch from "node-fetch";
import "../dotenv.config";

export async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error("Missing SERPER_API_KEY in .env");
    return "Search tool is not configured (missing API key).";
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    const data = await res.json();

    if (!data.organic || data.organic.length === 0) {
      return "No search results found.";
    }

    const results = data.organic.slice(0, 5)
      .map((r: any, i: number) =>
        `${i + 1}. ${r.title}\n${r.snippet}\nSource: ${r.link}`
      )
      .join("\n\n");

    return `Here are some relevant search results:\n\n${results}`;
  } catch (err) {
    console.error("Serper search error:", err);
    return "Web search failed.";
  }
}