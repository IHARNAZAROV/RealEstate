const fs = require('fs');
const path = require('path');

const MAX_RSS_SIZE_BYTES = 10 * 1024 * 1024;
const SITE_URL = 'https://turko.by';
const BLOG_PATH_PREFIX = '/blog';
const DEFAULT_AUTHOR = 'ГермесГрупп';
const DEFAULT_CATEGORY = 'Недвижимость';
const CHANNEL_TITLE = 'Блог агентства недвижимости ГермесГрупп';
const CHANNEL_DESCRIPTION =
  'Статьи о недвижимости, покупке, продаже квартир и рынке недвижимости Лиды';

const scriptDir = __dirname;
const outputPath = path.join(scriptDir, 'rss.xml');

const sourceCandidates = [
  path.join(scriptDir, 'blog-articles.json'),
  path.join(scriptDir, 'data', 'blog-articles.json'),
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return dateValue;
  }

  const raw = String(dateValue).trim();
  if (!raw) {
    return null;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const ddMmYyyyMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ddMmYyyyMatch) {
    const [, dd, mm, yyyy, hh = '00', min = '00', sec = '00'] = ddMmYyyyMatch;
    const isoLike = `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
    const parsed = new Date(isoLike);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function formatPubDate(dateString) {
  const parsed = parseDate(dateString);
  return parsed ? parsed.toUTCString() : new Date(dateString).toUTCString();
}

function resolveImageUrl(image) {
  if (!image) {
    return '';
  }
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  if (image.startsWith('/')) {
    return `${SITE_URL}${image}`;
  }
  return `${SITE_URL}/${image}`;
}

function extractContentText(content) {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') {
          return block;
        }
        if (!block || typeof block !== 'object') {
          return '';
        }
        if (typeof block.text === 'string') {
          return block.text;
        }
        if (Array.isArray(block.items)) {
          return block.items.join('. ');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text;
    }
    return JSON.stringify(content);
  }

  return String(content);
}

function buildItemXml(article) {
  const articleUrl = `${SITE_URL}${BLOG_PATH_PREFIX}/${article.slug}.html`;
  const description = article.description || article.contentText.slice(0, 250);
  const imageUrl = resolveImageUrl(article.image);

  const mediaGroup = imageUrl
    ? [
        '    <media:group>',
        `      <media:content url="${escapeXml(imageUrl)}" type="image/jpeg"/>`,
        `      <media:thumbnail url="${escapeXml(imageUrl)}"/>`,
        '    </media:group>',
      ].join('\n')
    : '';

  const itemLines = [
    '  <item>',
    `    <title>${escapeXml(article.title)}</title>`,
    `    <link>${escapeXml(articleUrl)}</link>`,
    `    <pdalink>${escapeXml(articleUrl)}</pdalink>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <author>${escapeXml(article.author || DEFAULT_AUTHOR)}</author>`,
    `    <category>${escapeXml(article.category || DEFAULT_CATEGORY)}</category>`,
    mediaGroup,
    `    <pubDate>${escapeXml(formatPubDate(article.date))}</pubDate>`,
    '    <yandex:genre>article</yandex:genre>',
    `    <yandex:full-text>${escapeXml(article.contentText)}</yandex:full-text>`,
    '  </item>',
  ];

  return itemLines.filter((line) => line !== '').join('\n');
}

function buildRssXml(itemsXml) {
  const channelLink = `${SITE_URL}/`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss',
    '  xmlns:yandex="http://news.yandex.ru"',
    '  xmlns:media="http://search.yahoo.com/mrss/"',
    '  version="2.0">',
    '<channel>',
    `  <title>${escapeXml(CHANNEL_TITLE)}</title>`,
    `  <link>${escapeXml(channelLink)}</link>`,
    `  <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>`,
    itemsXml,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}

function findSourcePath() {
  const existingPath = sourceCandidates.find((filePath) => fs.existsSync(filePath));
  if (!existingPath) {
    throw new Error(
      `Файл blog-articles.json не найден. Проверены пути: ${sourceCandidates.join(', ')}`,
    );
  }
  return existingPath;
}

function readArticles() {
  const sourcePath = findSourcePath();
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('blog-articles.json должен содержать массив статей.');
  }

  return parsed;
}

function normalizeAndFilterArticles(articles) {
  const now = new Date();

  return articles
    .map((article) => {
      const contentText = extractContentText(article.content).trim();
      const parsedDate = parseDate(article.date);

      return {
        ...article,
        contentText,
        parsedDate,
      };
    })
    .filter(
      (article) =>
        article.title &&
        article.slug &&
        article.contentText &&
        article.parsedDate &&
        article.parsedDate.getTime() <= now.getTime(),
    )
    .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
}

function trimToMaxSize(sortedArticles) {
  const acceptedItems = [];

  for (const article of sortedArticles) {
    acceptedItems.push(buildItemXml(article));
    const xml = buildRssXml(acceptedItems.join('\n'));
    const sizeBytes = Buffer.byteLength(xml, 'utf8');

    if (sizeBytes > MAX_RSS_SIZE_BYTES) {
      acceptedItems.pop();
      break;
    }
  }

  return {
    xml: buildRssXml(acceptedItems.join('\n')),
    includedCount: acceptedItems.length,
  };
}

function generateRss() {
  const articles = readArticles();
  const normalized = normalizeAndFilterArticles(articles);
  const { xml, includedCount } = trimToMaxSize(normalized);
  const skippedCount = articles.length - normalized.length;

  fs.writeFileSync(outputPath, xml, 'utf8');

  const sizeKb = (Buffer.byteLength(xml, 'utf8') / 1024).toFixed(2);
  console.log(`rss.xml успешно создан: ${outputPath}`);
  console.log(`Статей обработано: ${articles.length}, включено в RSS: ${includedCount}`);
  console.log(`Пропущено статей (невалидные поля или дата в будущем): ${skippedCount}`);
  console.log(`Размер rss.xml: ${sizeKb} KB`);
}

generateRss();
