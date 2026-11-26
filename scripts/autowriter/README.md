# Autowriter

`scripts/autowriter/write.mjs` drafts the next `todo` items in `queue.json` with the free Gemini API first (secret `GEMINI_API_KEY`, defaulting to `gemini-3.5-flash-lite`) and Groq as the fallback (secret `GROQ_API_KEY`). It uses the same quality checks as Daily Insight Desk: word count, heading structure, in-sentence internal links (including on-topic `/tools/` calculators), no invented tests or statistics, no “we have not tested” disclaimers, benefits-only product copy, no legal or tax advice claims, and unique heroes via `hero-registry.json`.

The GitHub Action `.github/workflows/daily-articles.yml` runs every day at 12:17 UTC (09:17 America/Fortaleza) and publishes two articles to `main`. You can also run it manually. Locally:

```bash
GEMINI_API_KEY=... GROQ_API_KEY=... PIXABAY_API_KEY=... node scripts/autowriter/write.mjs 1
```

Web Stories are disabled for this site (`ENABLE_STORIES = false`). Affiliate URLs in `src/_data/products.js` are marked TODO until the applications are approved; the writer must not invent offer links. The site inserts the affiliate disclosure before the first offer link. The insurance checklist topic is an explainer, not advice.
