# AI Market Research Agent

AI Market Research Agent is a small Node.js CLI that searches the web with Tavily and returns a structured Markdown market research brief with trends, suggestions, and citations.

The agent can run in two modes:

- **AI synthesis mode:** Tavily gathers current sources, then OpenAI turns them into a fuller analyst-style brief.
- **Local formatter mode:** Tavily gathers current sources, then the built-in formatter creates a cited Markdown report without an LLM key.

## Features

- Web research through Tavily's Search API
- Markdown output designed for quick sharing or saving
- Source citations attached to market signals and suggestions
- Optional OpenAI synthesis for richer trend analysis
- Zero runtime dependencies beyond Node.js 20+

## Setup

```bash
git clone https://github.com/billybobhit/ai-market-research-agent.git
cd ai-market-research-agent
cp .env.example .env
```

Add your Tavily API key to `.env`:

```bash
TAVILY_API_KEY=tvly-your-api-key
```

OpenAI is optional:

```bash
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4.1-mini
```

The CLI automatically loads `.env` from the project root.

## Usage

Generate a report in the terminal:

```bash
npm start -- --topic "AI note-taking apps for high school students"
```

Save a report:

```bash
npm start -- --topic "EV charging infrastructure market in the United States" --output reports/ev-charging.md
```

Use fresher news-style results:

```bash
npm start -- --topic "AI coding tools market trends" --topic-type news --time-range week --max-results 10
```

## CLI Options

| Option | Description | Default |
| --- | --- | --- |
| `--topic`, `-t` | Market, company, or category to research | Required |
| `--output`, `-o` | File path for the generated Markdown report | Prints to stdout |
| `--max-results` | Number of Tavily results to use | `8` |
| `--search-depth` | Tavily search depth: `basic`, `advanced`, `fast`, or `ultra-fast` | `basic` |
| `--topic-type` | Tavily topic type: `general`, `news`, or `finance` | `general` |
| `--time-range` | Recency filter: `day`, `week`, `month`, or `year` | `month` |

## Output Format

Reports include:

- Executive Summary
- Key Trends
- Customer / Buyer Signals when OpenAI synthesis is enabled
- Competitive Implications when OpenAI synthesis is enabled
- Strategic Suggestions
- Risks / Unknowns or Watchlist
- Sources with links

## Project Structure

```text
src/
  cli.js       Command-line interface and .env loading
  tavily.js    Tavily Search API client
  report.js    Markdown report builders
test/
  report.test.js
```

## Testing

```bash
npm test
```
