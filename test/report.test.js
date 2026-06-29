import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFallbackReport, buildSourceList, extractTrendSignals } from "../src/report.js";

describe("report generation", () => {
  const tavilyResponse = {
    answer: "Demand for AI study tools is increasing as students look for faster summarization and tutoring support.",
    results: [
      {
        title: "AI study tools market growth accelerates",
        url: "https://example.com/ai-study-tools",
        content:
          "The market is seeing growth in AI study tools as adoption rises among students. Enterprise education platforms are adding automation and tutoring features.",
        score: 0.91
      },
      {
        title: "New rules shape edtech AI",
        url: "https://example.com/edtech-ai-rules",
        content:
          "Regulation and privacy expectations are influencing edtech AI buying decisions. Schools are asking vendors for compliance and transparency.",
        score: 0.78
      }
    ]
  };

  it("normalizes Tavily sources", () => {
    const sources = buildSourceList(tavilyResponse.results);

    assert.equal(sources.length, 2);
    assert.equal(sources[0].id, 1);
    assert.equal(sources[0].url, "https://example.com/ai-study-tools");
  });

  it("extracts trend signals from source snippets", () => {
    const trends = extractTrendSignals(buildSourceList(tavilyResponse.results));

    assert.equal(trends.length, 2);
    assert.match(trends[0].evidence, /growth|Regulation/i);
  });

  it("builds a cited markdown report", () => {
    const report = buildFallbackReport({
      topic: "AI study tools",
      tavilyResponse,
      generatedAt: new Date("2026-06-29T00:00:00.000Z")
    });

    assert.match(report, /^# Market Research Brief: AI study tools/);
    assert.match(report, /## Key Trends/);
    assert.match(report, /\[\[1\]\]\(https:\/\/example.com\/ai-study-tools\)/);
    assert.match(report, /## Strategic Suggestions/);
  });
});
