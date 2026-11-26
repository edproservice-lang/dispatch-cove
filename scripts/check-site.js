import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import site from "../src/_data/site.js";
import indexnow from "../src/_data/indexnow.js";

const root = join(import.meta.dirname, "..", "_site");
const host = new URL(site.url).origin;
const errors = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function fail(message) {
  errors.push(message);
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const pages = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.slice(root.length);
  const urlPath = rel.endsWith("/index.html")
    ? rel.slice(0, -"index.html".length) || "/"
    : rel;
  pages.set(urlPath, html);

  if (site.ga && !html.includes(site.ga)) fail(`${urlPath} is missing the Analytics tag`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${urlPath} is missing a title`);
  if (!/name="description" content="[^"]+"/.test(html)) fail(`${urlPath} is missing a meta description`);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/);
  if (!canonical) fail(`${urlPath} is missing a canonical`);
  else if (!canonical[1].startsWith(host)) {
    fail(`${urlPath} canonical is not on ${host}`);
  } else if (!html.includes('name="robots" content="noindex"')) {
    const expected = `${host}${urlPath}`;
    if (canonical[1] !== expected) fail(`${urlPath} canonical is ${canonical[1]}, expected ${expected}`);
  }
  if (!html.includes('property="og:title"')) fail(`${urlPath} is missing Open Graph title`);
  if (!html.includes('property="og:description"')) fail(`${urlPath} is missing Open Graph description`);
  if (!html.includes('property="og:url"')) fail(`${urlPath} is missing Open Graph URL`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${urlPath} should have exactly one h1`);
  if (/daily insight desk|dailyinsightdesk|facelessforge|jvz4\.com|jvzoo/i.test(html)) {
    fail(`${urlPath} still mentions Daily Insight Desk or leftover branding`);
  }
  if (/<form[\s>]/i.test(html)) fail(`${urlPath} has a form; do not pretend to collect email`);

  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      fail(`${urlPath} has invalid JSON-LD: ${error.message}`);
    }
  }

  const soon = html.match(/<ul class="soon-list">([\s\S]*?)<\/ul>/);
  if (soon && /<a[\s>]/i.test(soon[1])) fail(`${urlPath} links a coming-soon title`);
}

for (const required of [
  "/",
  "/getting-started/",
  "/load-boards/",
  "/factoring/",
  "/software/",
  "/owner-operators/",
  "/about/",
  "/contact/",
  "/privacy-policy/",
  "/affiliate-disclosure/",
  "/getting-started/how-to-become-a-truck-dispatcher-with-no-experience/",
  "/load-boards/dat-vs-truckstop-for-a-new-dispatcher/",
  "/factoring/freight-factoring-recourse-vs-non-recourse/",
]) {
  if (!pages.has(required)) fail(`Missing required page ${required}`);
}

for (const [urlPath, html] of pages) {
  if (/\[Author name\]|\[Short bio|TODO_AFFILIATE_URL|href="TODO/i.test(html)) {
    fail(`${urlPath} still shows a raw placeholder that should not ship`);
  }
}

for (const [urlPath, html] of pages) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (href.startsWith("mailto:") || href.startsWith("https://") || href.startsWith("http://")) continue;
    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (!html.includes(`id="${id}"`)) fail(`${urlPath} links to missing #${id}`);
      continue;
    }
    const [path, hash] = href.split("#");
    const normalized = path.endsWith("/") || path.includes(".") ? path : `${path}/`;
    const relative = normalized.replace(/^\/+/, "");
    const target = relative.endsWith(".html") || relative.split("/").pop()?.includes(".")
      ? join(root, relative)
      : join(root, relative, "index.html");
    const exists = files.includes(target) || pages.has(normalized);
    if (!exists) fail(`${urlPath} links to missing ${href}`);
    if (hash) {
      const targetHtml = pages.get(normalized);
      if (targetHtml && !targetHtml.includes(`id="${hash}"`)) {
        fail(`${urlPath} links to ${href}, but #${hash} is missing`);
      }
    }
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match ? match[1] : "";
}

function relHas(rel, token) {
  return rel.toLowerCase().split(/\s+/).includes(token);
}

for (const [urlPath, html] of pages) {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const open = match[0];
    const href = attr(open, "href");
    if (!/^https?:\/\//i.test(href)) continue;
    let hostName = "";
    try {
      hostName = new URL(href).hostname.toLowerCase();
    } catch {
      fail(`${urlPath} has an invalid URL ${href}`);
      continue;
    }
    const rel = attr(open, "rel");
    const isAffiliate = /\baffiliate-link\b/.test(attr(open, "class")) || relHas(rel, "sponsored");
    if (isAffiliate) {
      for (const token of ["sponsored", "nofollow", "noopener"]) {
        if (!relHas(rel, token)) fail(`${urlPath} affiliate link is missing rel=${token} (${href})`);
      }
      if (attr(open, "target") !== "_blank") fail(`${urlPath} affiliate link is missing target=_blank`);
    }
  }
}

const robots = readFileSync(join(root, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${host}/sitemap.xml`)) {
  fail("robots.txt does not point at the sitemap");
}
for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "Bingbot"]) {
  const block = new RegExp(`User-agent:\\s*${bot}\\s*\\nAllow:\\s*/`, "i");
  if (!block.test(robots)) fail(`robots.txt does not explicitly allow ${bot}`);
}

if (site.googleSiteVerification) {
  const home = pages.get("/");
  const tag = `name="google-site-verification" content="${site.googleSiteVerification}"`;
  if (!home?.includes(tag)) fail("home page is missing the Google site verification tag");
}

const indexNowKeyFile = join(root, `${indexnow.key}.txt`);
if (!statSync(indexNowKeyFile, { throwIfNoEntry: false })) {
  fail(`IndexNow key file /${indexnow.key}.txt is missing`);
} else if (readFileSync(indexNowKeyFile, "utf8").trim() !== indexnow.key) {
  fail("IndexNow key file does not contain the key");
}

const llmsPath = join(root, "llms.txt");
if (!statSync(llmsPath, { throwIfNoEntry: false })) {
  fail("llms.txt is missing");
} else {
  const llms = readFileSync(llmsPath, "utf8");
  if (!llms.startsWith(`# ${site.name}`)) fail("llms.txt must start with the site name");
  for (const [urlPath] of pages) {
    if (!/^\/(getting-started|load-boards|factoring|software|owner-operators)\/.+/.test(urlPath)) continue;
    if (!llms.includes(`${host}${urlPath}`)) {
      fail(`llms.txt is missing ${urlPath}`);
    }
  }
}

for (const [urlPath, html] of pages) {
  if (!/^\/(getting-started|load-boards|factoring|software|owner-operators)\/.+/.test(urlPath)) continue;
  let article;
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(block[1]);
      const nodes = data["@graph"] || [data];
      article = nodes.find((node) => node["@type"] === "Article") || article;
    } catch {
      // invalid JSON-LD is already reported above
    }
  }
  if (!article) fail(`${urlPath} is missing Article JSON-LD`);
  else {
    for (const field of ["datePublished", "dateModified", "author", "publisher"]) {
      if (!article[field]) fail(`${urlPath} Article schema is missing ${field}`);
    }
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
if (!sitemap.includes("<urlset")) fail("sitemap.xml is not a urlset");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const locSet = new Set(locs);
if (new Set(locs).size !== locs.length) fail("sitemap contains duplicate URLs");
for (const loc of locs) {
  if (!loc.startsWith(`${host}/`)) fail(`Sitemap URL is off-host: ${loc}`);
  const path = loc.replace(host, "") || "/";
  if (!pages.has(path)) fail(`Sitemap lists ${loc}, which is not a built page`);
  if (pages.get(path)?.includes('name="robots" content="noindex"')) fail(`Sitemap lists noindex page ${loc}`);
}
for (const [urlPath, html] of pages) {
  if (urlPath.endsWith(".html")) continue;
  if (html.includes('name="robots" content="noindex"')) continue;
  const loc = `${host}${urlPath}`;
  if (!locSet.has(loc)) fail(`Page missing from sitemap: ${loc}`);
}
if (sitemap.includes("404")) fail("sitemap includes the 404 page");

const AFFILIATE_NOTE = "We may earn a commission if you buy through our links, at no extra cost to you.";
for (const [urlPath, html] of pages) {
  const firstOffer = html.search(/class="[^"]*\baffiliate-link\b/i);
  if (firstOffer === -1) continue;
  if (!html.includes(AFFILIATE_NOTE)) {
    fail(`${urlPath} is missing the in-article affiliate commission note`);
    continue;
  }
  const noteAt = html.indexOf(AFFILIATE_NOTE);
  if (noteAt > firstOffer) fail(`${urlPath} places the affiliate commission note after the first offer link`);
}

if (errors.length) {
  console.error(`Site check failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site check passed (${pages.size} HTML pages, ${locs.length} sitemap URLs).`);
