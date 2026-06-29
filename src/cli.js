#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildFallbackReport, buildOpenAiReport } from "./report.js";
import { searchTavily } from "./tavily.js";

loadDotEnv();

const args = parseArgs(process.argv.slice(2));

async function main() {
  if (args.help || !args.topic) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const tavilyResponse = await searchTavily({
    query: args.topic,
    maxResults: Number(args.maxResults || 8),
    searchDepth: args.searchDepth || "basic",
    topic: args.searchTopic || "general",
    timeRange: args.timeRange || "month"
  });

  const report =
    (await buildOpenAiReport({ topic: args.topic, tavilyResponse })) ||
    buildFallbackReport({ topic: args.topic, tavilyResponse });

  if (args.output) {
    const outputPath = resolve(args.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report, "utf8");
    console.log(`Report written to ${outputPath}`);
    return;
  }

  console.log(report);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--topic" || arg === "-t") {
      parsed.topic = argv[++index];
    } else if (arg === "--output" || arg === "-o") {
      parsed.output = argv[++index];
    } else if (arg === "--max-results") {
      parsed.maxResults = argv[++index];
    } else if (arg === "--search-depth") {
      parsed.searchDepth = argv[++index];
    } else if (arg === "--topic-type") {
      parsed.searchTopic = argv[++index];
    } else if (arg === "--time-range") {
      parsed.timeRange = argv[++index];
    } else if (!parsed.topic) {
      parsed.topic = arg;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`AI Market Research Agent

Usage:
  npm start -- --topic "AI note-taking apps for students"
  npm start -- "EV charging infrastructure market" --output reports/ev-charging.md

Options:
  -t, --topic          Market or company question to research
  -o, --output         Write Markdown report to a file instead of stdout
  --max-results        Tavily result count, default 8
  --search-depth       Tavily depth: basic, advanced, fast, ultra-fast
  --topic-type         Tavily topic: general, news, finance
  --time-range         Tavily recency: day, week, month, year
  -h, --help           Show help

Environment:
  TAVILY_API_KEY       Required
  OPENAI_API_KEY       Optional, enables AI synthesis
  OPENAI_MODEL         Optional, default gpt-4.1-mini
`);
}

function loadDotEnv(path = ".env") {
  const envPath = resolve(path);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
