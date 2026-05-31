/**
 * generate-sitemap.cjs
 * Генерирует sitemap.xml в корне проекта на основе статических страниц
 * и данных из JSON-файлов (objects, services, blog-articles).
 *
 * Запуск: node scripts/generate-sitemap.cjs
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://germesgarant.by";
const OUTPUT_SITEMAP = path.join(ROOT, "sitemap.xml");

/* ===================== Статические страницы ===================== */

const STATIC_PAGES = [
  { loc: "/",                    priority: "1.0", changefreq: "daily"   },
  { loc: "/nedvizhimost-lida",   priority: "0.9", changefreq: "daily"   },
  { loc: "/about",        priority: "0.8", changefreq: "monthly" },
  { loc: "/blog",                priority: "0.8", changefreq: "weekly"  },
  { loc: "/faq",                 priority: "0.6", changefreq: "monthly" },
  { loc: "/contact",             priority: "0.6", changefreq: "monthly" },
];

/* ===================== Источники из JSON ===================== */

const SOURCES = [
  {
    file: path.join(ROOT, "data", "objects.json"),
    buildUrl: (slug) => `${SITE_URL}/objects/${encodeURIComponent(slug)}`,
    priority: "0.8",
    changefreq: "weekly",
    dateField: null,
  },
  {
    file: path.join(ROOT, "data", "services.json"),
    buildUrl: (slug) => `${SITE_URL}/services/${encodeURIComponent(slug)}`,
    priority: "0.7",
    changefreq: "monthly",
    dateField: null,
  },
  {
    file: path.join(ROOT, "data", "blog-articles.json"),
    buildUrl: (slug) => `${SITE_URL}/blog/${encodeURIComponent(slug)}`,
    priority: "0.7",
    changefreq: "monthly",
    dateField: "date",
  },
];

/* ===================== Helpers ===================== */

function collectItemsDeep(data, acc = []) {
  if (Array.isArray(data)) {
    data.forEach((item) => collectItemsDeep(item, acc));
  } else if (data && typeof data === "object") {
    if (typeof data.slug === "string" && data.slug.trim()) {
      acc.push(data);
    } else {
      Object.values(data).forEach((v) => collectItemsDeep(v, acc));
    }
  }
  return acc;
}

function uniqBySlag(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
}

function parseDate(str) {
  if (!str || typeof str !== "string") return null;
  const match = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00+00:00`);
  return isNaN(d.getTime()) ? null : d.toISOString().replace(/\.\d+Z$/, "+00:00");
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrlEntry({ loc, lastmod, priority, changefreq }) {
  return [
    `  <url>`,
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `  </url>`,
  ].join("\n");
}

/* ===================== Main ===================== */

function generateSitemap() {
  const now = isoNow();
  const entries = [];

  STATIC_PAGES.forEach(({ loc, priority, changefreq }) => {
    entries.push(buildUrlEntry({
      loc: `${SITE_URL}${loc}`,
      lastmod: now,
      priority,
      changefreq,
    }));
  });

  SOURCES.forEach(({ file, buildUrl, priority, changefreq, dateField }) => {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  Файл не найден: ${file}`);
      return;
    }

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const items = uniqBySlag(collectItemsDeep(json));

    items.forEach((item) => {
      const lastmod = (dateField && parseDate(item[dateField])) || now;
      entries.push(buildUrlEntry({
        loc: buildUrl(item.slug),
        lastmod,
        priority,
        changefreq,
      }));
    });
  });

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n` +
    entries.join("\n\n") +
    `\n\n</urlset>\n`;

  fs.writeFileSync(OUTPUT_SITEMAP, xml, "utf8");

  console.log("✅ sitemap.xml создан");
  console.log(`🔗 Всего URL: ${entries.length}`);
  console.log(`   - Статических страниц: ${STATIC_PAGES.length}`);
  console.log(`   - Из JSON: ${entries.length - STATIC_PAGES.length}`);
}

generateSitemap();
