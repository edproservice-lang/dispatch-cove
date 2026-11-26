# Dispatch Cove

Practical English-language guides for U.S. truck dispatchers and owner-operators, published at [dispatchcove.com](https://dispatchcove.com). Built with [Eleventy](https://www.11ty.dev/) and deployed on Vercel.

```bash
npm install
npm run build
npm run dev
```

`npm run build` writes `_site/` and checks internal links, canonical URLs, the sitemap, and `robots.txt`. Guides live in `src/getting-started/`, `src/load-boards/`, `src/factoring/`, `src/software/`, `src/owner-operators/`, and `src/compliance/`. Free calculators live in `src/tools/`. Category copy and upcoming titles live in `src/_data/silos.js`. Affiliate URLs live in `src/_data/products.js`. Entries marked `TODO` have no live offer link yet.

The `{% product "id" %}` shortcode renders the offer box. When a live affiliate URL is present, the photo and button use `rel="sponsored nofollow noopener"` and `target="_blank"`. A short commission note is inserted before the first offer link. Do not invent tests, statistics, or testimonials, and do not write that a product was or was not tested.

The autowriter at `scripts/autowriter/` publishes two guides a day via `.github/workflows/daily-articles.yml` (09:17 America/Fortaleza). Gemini is the primary writer; Groq is the fallback.
