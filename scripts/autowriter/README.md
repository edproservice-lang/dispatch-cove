# Autowriter (ready, not scheduled)

`scripts/autowriter/write.mjs` drafts the next `todo` items in `queue.json` with the free Gemini API first (secret `GEMINI_API_KEY`) and Groq as the fallback (secret `GROQ_API_KEY`). It uses the same quality checks as Daily Insight Desk: word count, heading structure, in-sentence internal links, no invented tests or statistics, no “we have not tested” disclaimers, benefits-only product copy, and unique heroes via `hero-registry.json`.

A daily GitHub Action is **not enabled yet**. When you want a draft, run the script locally or add a workflow later:

```bash
GEMINI_API_KEY=... GROQ_API_KEY=... PIXABAY_API_KEY=... node scripts/autowriter/write.mjs 1
```

Web Stories are disabled for this site (`ENABLE_STORIES = false`). Affiliate URLs in `src/_data/products.js` are marked TODO until the applications are approved; the writer must not invent offer links. The insurance checklist topic is an explainer, not advice.
