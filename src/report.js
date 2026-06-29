const TREND_KEYWORDS = [
  "growth",
  "demand",
  "adoption",
  "investment",
  "funding",
  "regulation",
  "automation",
  "ai",
  "price",
  "consumer",
  "enterprise",
  "startup",
  "platform",
  "market"
];

export function normalizeResult(result, index) {
  return {
    id: index + 1,
    title: cleanText(result.title || `Source ${index + 1}`),
    url: result.url || "",
    content: cleanText(result.content || result.raw_content || ""),
    score: typeof result.score === "number" ? result.score : null
  };
}

export function buildSourceList(results) {
  return results.map(normalizeResult).filter((result) => result.url && result.content);
}

export function extractTrendSignals(sources, limit = 5) {
  const scored = sources
    .map((source) => {
      const keywordHits = TREND_KEYWORDS.filter((keyword) =>
        source.content.toLowerCase().includes(keyword)
      );

      return {
        ...source,
        keywordHits,
        weight: keywordHits.length + (source.score || 0)
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return scored.slice(0, limit).map((source) => ({
    label: titleToTrend(source.title),
    evidence: firstUsefulSentence(source.content),
    source
  }));
}

export function buildFallbackReport({ topic, tavilyResponse, generatedAt = new Date() }) {
  const sources = buildSourceList(tavilyResponse.results || []);
  const trends = extractTrendSignals(sources);
  const citations = new Map(sources.map((source) => [source.id, source]));
  const answer = cleanText(tavilyResponse.answer || "");

  return [
    `# Market Research Brief: ${topic}`,
    "",
    `Generated: ${generatedAt.toISOString()}`,
    "",
    "## Executive Summary",
    "",
    answer
      ? `${answer} ${formatCitation(sources[0])}`
      : "Tavily returned relevant market signals, but no consolidated answer. The analysis below is based on the cited search snippets.",
    "",
    "## Key Trends",
    "",
    ...formatTrendBullets(trends),
    "",
    "## Strategic Suggestions",
    "",
    ...formatSuggestionBullets(trends),
    "",
    "## Watchlist",
    "",
    "- Track regulatory changes, competitor launches, pricing changes, and funding activity weekly.",
    "- Re-run this report with `--time-range week` for near-term shifts and `--topic news` for breaking developments.",
    "- Validate the highest-impact claims with primary sources before making budget or product decisions.",
    "",
    "## Source Notes",
    "",
    ...formatSourceNotes([...citations.values()]),
    ""
  ].join("\n");
}

export async function buildOpenAiReport({
  topic,
  tavilyResponse,
  openAiApiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  fetchImpl = fetch
}) {
  if (!openAiApiKey) {
    return null;
  }

  const sources = buildSourceList(tavilyResponse.results || []);
  const sourceDigest = sources
    .map((source) => `[${source.id}] ${source.title}\nURL: ${source.url}\nDETAILS: ${source.content}`)
    .join("\n\n");

  const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a concise market research analyst. Produce Markdown only. Cite claims with bracketed source numbers like [1]. Do not invent facts beyond the provided sources."
        },
        {
          role: "user",
          content: [
            `Topic: ${topic}`,
            "",
            "Write a structured market research brief with these sections:",
            "1. Executive Summary",
            "2. Key Trends",
            "3. Customer / Buyer Signals",
            "4. Competitive Implications",
            "5. Strategic Suggestions",
            "6. Risks and Unknowns",
            "7. Sources",
            "",
            "For suggestions, make them concrete and action-oriented.",
            "Use citations throughout. Include each source URL in the Sources section.",
            "",
            "Tavily answer:",
            cleanText(tavilyResponse.answer || "No Tavily answer provided."),
            "",
            "Sources:",
            sourceDigest
          ].join("\n")
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI synthesis failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function firstUsefulSentence(content) {
  const sentences = cleanText(content)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 35);

  return sentences[0] || cleanText(content).slice(0, 220);
}

function titleToTrend(title) {
  return cleanText(title)
    .replace(/\s*[-|–].*$/, "")
    .replace(/^(How|Why|What)\s+/i, "")
    .replace(/\?$/, "");
}

function formatCitation(source) {
  return source ? `[[${source.id}]](${source.url})` : "";
}

function formatTrendBullets(trends) {
  if (!trends.length) {
    return ["- No strong trend signals were found in the returned snippets."];
  }

  return trends.map(
    (trend) => `- **${trend.label}:** ${trend.evidence} ${formatCitation(trend.source)}`
  );
}

function formatSuggestionBullets(trends) {
  if (!trends.length) {
    return ["- Broaden the query or increase `--max-results` to collect enough evidence for recommendations."];
  }

  return trends.slice(0, 4).map((trend) => {
    const verb = trend.source.keywordHits.includes("regulation")
      ? "Map compliance requirements and turn them into buyer-facing trust claims"
      : trend.source.keywordHits.includes("funding") || trend.source.keywordHits.includes("investment")
        ? "Watch funded competitors and prioritize differentiators they cannot copy quickly"
        : trend.source.keywordHits.includes("automation") || trend.source.keywordHits.includes("ai")
          ? "Package automation around a painful, repeatable workflow"
          : "Run customer discovery around this signal before committing roadmap budget";

    return `- **${verb}:** ${trend.evidence} ${formatCitation(trend.source)}`;
  });
}

function formatSourceNotes(sources) {
  if (!sources.length) {
    return ["No sources returned."];
  }

  return sources.map((source) => {
    const score = source.score === null ? "" : ` Relevance score: ${source.score.toFixed(3)}.`;
    return `- [${source.id}] [${source.title}](${source.url}).${score} ${firstUsefulSentence(source.content)}`;
  });
}
