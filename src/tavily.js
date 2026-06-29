const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export async function searchTavily({
  query,
  apiKey = process.env.TAVILY_API_KEY,
  maxResults = 8,
  searchDepth = "basic",
  topic = "general",
  timeRange = "month",
  fetchImpl = fetch
}) {
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY. Add it to your environment or .env file.");
  }

  const response = await fetchImpl(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      topic,
      time_range: timeRange,
      include_answer: "advanced",
      include_raw_content: false,
      include_favicon: true,
      include_usage: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${body}`);
  }

  return response.json();
}
