/* =========================================================
   BLOG DETAIL PAGE SCRIPT
   Работает с массивом статей и slug
   ========================================================= */

/* =========================================================
   CACHED DOM ELEMENTS & STATE
   ========================================================= */
let cachedDOMElements = {
  progressBar: null,
  article: null,
  readingTimeEl: null,
  postContent: null,
  postImage: null,
  pageTitle: null,
  pageLead: null,
  pageEyebrow: null,
  postDate: null,
  postAuthor: null,
  postCategory: null,
  breadcrumb: null,
  recentPosts: null,
  relatedPosts: null,
  instagramContainer: null,
};

let scrollState = {
  lastScrollTime: 0,
  throttleDelay: 16, // ~60fps
};

/* =========================================================
   1. DOM READY
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  loadArticleData();
  initScrollObserver();
});

/* =========================================================
   HELPER: Cache DOM Elements
   ========================================================= */
function cacheDOM() {
  cachedDOMElements.progressBar = document.getElementById("readingProgressBar");
  cachedDOMElements.article = document.querySelector(".blog-detail");
  cachedDOMElements.readingTimeEl = document.getElementById("reading-time");
  cachedDOMElements.postContent = document.getElementById("post-content");
  cachedDOMElements.postImage = document.getElementById("post-image");
  cachedDOMElements.pageTitle = document.getElementById("page-title");
  cachedDOMElements.pageLead = document.getElementById("page-lead");
  cachedDOMElements.pageEyebrow = document.getElementById("page-eyebrow");
  cachedDOMElements.postDate = document.getElementById("post-date");
  cachedDOMElements.postAuthor = document.getElementById("post-author");
  cachedDOMElements.postCategory = document.getElementById("post-category");
  cachedDOMElements.breadcrumb = document.getElementById("breadcrumb");
  cachedDOMElements.recentPosts = document.getElementById("recent-posts");
  cachedDOMElements.relatedPosts = document.getElementById("relatedPosts");
  cachedDOMElements.instagramContainer = document.querySelector("[data-instagram]");
}

/* =========================================================
   HELPER: Throttle scroll events
   ========================================================= */
function throttleScroll(callback) {
  return function () {
    const now = Date.now();
    if (now - scrollState.lastScrollTime >= scrollState.throttleDelay) {
      scrollState.lastScrollTime = now;
      callback();
    }
  };
}

function getSlugFromUrl() {
  const url = new URL(window.location.href);
  const qsSlug = url.searchParams.get("slug");

  if (qsSlug) return qsSlug;

  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length === 2 && parts[0] === "blog") {
    return decodeURIComponent(parts[1]);
  }

  return "";
}

/* =========================================================
   2. LOAD JSON
   ========================================================= */
function loadArticleData() {
  fetch("/data/blog-articles.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Не удалось загрузить JSON");
      }
      return response.json();
    })
    .then((articles) => {
      if (!Array.isArray(articles) || articles.length === 0) {
        console.error("JSON пуст или имеет неверный формат");
        return;
      }

      const article = getArticleBySlug(articles);

      if (!article) {
        console.error("Статья не найдена");
        return;
      }

window.currentArticle = article;

renderArticle(article);

renderViewsCounter(article);

renderRelatedPosts(currentArticle, articles);

/* ВАЖНО — рендер тегов */
if (window.blogTags && article.tags) {
  window.blogTags.renderPostTags(article.tags);
}

const currentSlug = getSlugFromUrl() || article.slug;
renderRandomPosts(articles, currentSlug);
    })
    .catch((error) => {
      console.error("Ошибка загрузки статьи:", error);
    });
}

/* =========================================================
   3. GET ARTICLE BY SLUG
   ========================================================= */
function getArticleBySlug(articles) {
  const slug = getSlugFromUrl();

  if (!slug) {
    return articles[0]; // fallback — первая статья
  }

  return articles.find((article) => article.slug === slug);
}

/* =========================================================
   4. RENDER FULL ARTICLE
   ========================================================= */
function renderArticle(article) {
  renderMeta(article);
  renderHeader(article);
  // Breadcrumb is server-rendered in PHP (see blog-detail.php)
  renderImage(article);
  renderContent(article);
  renderConclusion(article);
  renderInstagram(article);
  renderSchema(article);
}

/* =========================================================
   5. META & SEO
   ========================================================= */
function renderMeta(article) {
  if (article.title) {
    document.title = `${article.title} — ГермесГарант`;
  }

  const description = document.querySelector('meta[name="description"]');
  if (description && article.metaDescription) {
    description.setAttribute("content", article.metaDescription);
  }

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && article.slug) {
    canonical.href = `https://germesgarant.by/blog/${article.slug}`;
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && article.title) {
    ogTitle.setAttribute("content", `${article.title} — ГермесГарант`);
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription && article.metaDescription) {
    ogDescription.setAttribute("content", article.metaDescription);
  }

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl && article.slug) {
    ogUrl.setAttribute("content", `https://germesgarant.by/blog/${article.slug}`);
  }

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle && article.title) {
    twitterTitle.setAttribute("content", `${article.title} — ГермесГарант`);
  }

  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterDescription && article.metaDescription) {
    twitterDescription.setAttribute("content", article.metaDescription);
  }
}

/* =========================================================
   6. HEADER / TITLE / BREADCRUMB
   ========================================================= */
function renderHeader(article) {
  // PAGE INTRO TITLE
  if (cachedDOMElements.pageTitle) {
    cachedDOMElements.pageTitle.textContent = article.title || "";
  }

  // PAGE INTRO LEAD (опционально)
  if (cachedDOMElements.pageLead && article.lead) {
    cachedDOMElements.pageLead.textContent = article.lead;
  }

  // EYEBROW (если захочешь из JSON)
  if (cachedDOMElements.pageEyebrow && article.category) {
    cachedDOMElements.pageEyebrow.textContent = article.category;
  }

  // DATE, AUTHOR, CATEGORY
  if (cachedDOMElements.postDate && article.date) {
    cachedDOMElements.postDate.textContent = article.date;
  }

  if (cachedDOMElements.postAuthor && article.author) {
    cachedDOMElements.postAuthor.textContent = article.author;
  }

  if (cachedDOMElements.postCategory && article.category) {
    cachedDOMElements.postCategory.textContent = article.category;
  }
}


/* =========================================================
   BREADCRUMB
   ========================================================= */
function renderBreadcrumb(article) {
  const breadcrumb = cachedDOMElements.breadcrumb;
  if (!breadcrumb || !article) return;

  // Используем DocumentFragment для batch-вставки (быстрее)
  const fragment = document.createDocumentFragment();

  const home = document.createElement("li");
  home.innerHTML = `<a href="/">Главная</a>`;

  const blog = document.createElement("li");
  blog.innerHTML = `<a href="/blog">Блог</a>`;

  const current = document.createElement("li");
  current.textContent = article.title || "";

  fragment.appendChild(home);
  fragment.appendChild(blog);
  fragment.appendChild(current);

  breadcrumb.textContent = ""; // Очистка вместо innerHTML = ""
  breadcrumb.appendChild(fragment);
}

/* =========================================================
   SCHEMA.ORG (JSON-LD)
   ========================================================= */

function renderSchema(article) {
  if (!article) return;

  // Проверяем, не добавлен ли уже schema (во избежание дублирования)
  const existingSchema = document.querySelector('script[data-schema="blog-posting"]');
  if (existingSchema) existingSchema.remove();
  const existingBreadcrumbSchema = document.querySelector(
    'script[data-schema="blog-breadcrumb"]',
  );
  if (existingBreadcrumbSchema) existingBreadcrumbSchema.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": ["Article", "BlogPosting"],
    headline: article.title,
    description: article.lead || article.metaDescription || article.conclusion || "",
    author: {
      "@type": "Organization",
      name: article.author || "ГермесГарант",
      url: "https://germesgarant.by/",
    },
    datePublished: article.date,
    dateModified: article.date,
    image: article.image ? `https://germesgarant.by${article.image}` : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://germesgarant.by/blog/${article.slug}`,
    },
    url: `https://germesgarant.by/blog/${article.slug}`,
    publisher: {
      "@type": "Organization",
      name: "germesgarant.by",
      logo: {
        "@type": "ImageObject",
        url: "https://germesgarant.by/images/logo-text.svg",
      },
    },
  };

  // Удаляем undefined поля (чистота schema)
  Object.keys(schema).forEach(
    (key) => schema[key] === undefined && delete schema[key],
  );

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  script.setAttribute("data-schema", "blog-posting");

  document.head.appendChild(script);

  // BreadcrumbList JSON-LD is server-rendered in PHP (see blog-detail.php)
}

/* =========================================================
   VIEWS COUNTER
   Один инкремент на загрузку страницы, затем рендер под заголовком.
   ========================================================= */
function renderViewsCounter(article) {
  if (!article || !window.BlogViews) return;

  const postId = article.id || article.slug;
  if (!postId) return;

  const titleEl = document.getElementById("post-title");
  if (!titleEl) return;

  // Удаляем старый бейдж, если ре-рендер
  const existing = document.getElementById("post-views-badge");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "post-views-badge";
  wrapper.innerHTML = window.BlogViews.renderDetailBadge(postId);

  // Размещаем сразу после заголовка статьи
  const titleContainer = titleEl.parentNode;
  if (titleContainer && titleContainer.parentNode) {
    titleContainer.parentNode.insertBefore(wrapper, titleContainer.nextSibling);
  } else {
    titleEl.insertAdjacentElement("afterend", wrapper);
  }

  // Инкрементируем на сервере и обновляем бейдж актуальным значением
  Promise.resolve(window.BlogViews.incrementViews(postId))
    .then(() => window.BlogViews.applyCountsToDom(wrapper))
    .catch(() => {});
}

/* =========================================================
   RANDOM RECENT POSTS (3 articles, exclude current)
   ========================================================= */

function renderRandomPosts(articles, currentSlug) {
  const container = cachedDOMElements.recentPosts;
  if (!container || !Array.isArray(articles)) return;

  // 1. Убираем текущую статью и перемешиваем
  const filtered = articles.filter((article) => article.slug !== currentSlug);

  // 2. Перемешиваем массив (Fisher–Yates)
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  // 3. Берём первые 3
  const selected = filtered.slice(0, 3);

  // 4. Генерируем HTML с DocumentFragment
  const fragment = document.createDocumentFragment();
  
  selected.forEach((article) => {
    const div = document.createElement("div");
    div.className = "widget-post clearfix";
    div.innerHTML = `
      <div class="sx-post-media">
        <a href="/blog/${article.slug}">
          <img
            src="${article.image}"
            alt="${article.imageAlt || article.title}"
            loading="lazy"
          />
        </a>
      </div>
      <div class="sx-post-info">
        <div class="sx-post-header">
          <h6 class="post-title">
            <a href="/blog/${article.slug}">
              ${article.title}
            </a>
          </h6>
        </div>
        <div class="sx-post-meta">
          <ul>
            <li class="post-author">
              ${formatDate(article.date)}
            </li>
          </ul>
        </div>
      </div>
    `;
    fragment.appendChild(div);
  });

  container.textContent = "";
  container.appendChild(fragment);
}

/* =========================================================
   DATE FORMATTER (2026-01-29 → 29 Янв 2026)
   ========================================================= */

function formatDate(dateString) {
  if (!dateString) return "";

  // DD.MM.YYYY
  if (dateString.includes(".")) {
    const [day, month, year] = dateString.split(".");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // ISO fallback
  const date = new Date(dateString);
  if (isNaN(date)) return "";

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   7. IMAGE
   ========================================================= */
function renderImage(article) {
  const imageEl = cachedDOMElements.postImage;

  if (!imageEl || !article.image) return;

  imageEl.src = article.image;
  imageEl.alt = article.imageAlt || article.title || "";
}

/* =========================================================
   8. MAIN CONTENT
   ========================================================= */
function renderContent(article) {
  const container = cachedDOMElements.postContent;
  if (!container || !Array.isArray(article.content)) return;

  container.innerHTML = "";

  article.content.forEach((block) => {
    renderContentBlock(container, block);
  });

  insertMidCta(container);
}

function insertMidCta(container) {
  const raw = container.getAttribute("data-mid-cta");
  if (!raw) return;
  let cta;
  try { cta = JSON.parse(raw); } catch (_) { return; }
  if (!cta || !cta.url || !cta.heading) return;

  const cards = container.querySelectorAll("p");
  if (cards.length < 4) return;

  const wrap = document.createElement("aside");
  wrap.className = "blog-mid-cta";
  wrap.setAttribute("aria-label", "Призыв к действию");

  const h = document.createElement("p");
  h.className = "blog-mid-cta__heading";
  h.textContent = cta.heading;

  const t = document.createElement("p");
  t.className = "blog-mid-cta__text";
  t.textContent = cta.text || "";

  const a = document.createElement("a");
  a.className = "blog-mid-cta__button";
  a.href = cta.url;
  a.textContent = cta.buttonText || "Подробнее";

  wrap.appendChild(h);
  if (cta.text) wrap.appendChild(t);
  wrap.appendChild(a);

  // Вставляем после 3-го абзаца
  const after = cards[2];
  after.parentNode.insertBefore(wrap, after.nextSibling);
}

/* =========================================================
   9. CONTENT BLOCK TYPES
   ========================================================= */
function renderContentBlock(container, block) {
  if (!block || !block.type) return;

  /* ---------- Paragraph ---------- */
  if (block.type === "paragraph") {
    const p = document.createElement("p");
    p.textContent = block.text || "";
    container.appendChild(p);
  }

  /* ---------- List / Checklist ---------- */
  if (block.type === "list") {
    if (block.title) {
      const h4 = document.createElement("h4");
      h4.textContent = block.title;
      container.appendChild(h4);
    }

    let list;

    if (block.style === "check") {
      list = document.createElement("ul");
      list.className = "sx-checklist";
    } else if (block.style === "numbered") {
      list = document.createElement("ul");
      list.className = "sx-numbered-list";
    } else {
      list = document.createElement("ul");
    }

    (block.items || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    container.appendChild(list);
  }

  /* ---------- Disclaimer ---------- */
  if (block.type === "disclaimer") {
    const div = document.createElement("div");
    div.className = "sx-legal-disclaimer";
    div.textContent = block.text || "";
    container.appendChild(div);
  }
}

/* =========================================================
   10. CONCLUSION / QUOTE
   ========================================================= */
function renderConclusion(article) {
  if (!article.conclusion) return;

  const container = cachedDOMElements.postContent;
  if (!container) return;

  const blockquote = document.createElement("blockquote");
  blockquote.className = "author-quote bdr-1 bdr-solid bdr-gray";

  const h4 = document.createElement("h4");
  h4.textContent = article.conclusion;

  const iconLeft = document.createElement("i");
  iconLeft.className = "fa fa-quote-left";

  h4.appendChild(iconLeft);
  blockquote.appendChild(h4);

  if (article.quoteAuthor || article.quoteRole) {
    const authorWrap = document.createElement("div");
    authorWrap.className = "p-t15";

    if (article.quoteAuthor) {
      const strong = document.createElement("strong");
      strong.textContent = article.quoteAuthor;
      authorWrap.appendChild(strong);
    }

    if (article.quoteRole) {
      const span = document.createElement("span");
      span.textContent = article.quoteRole;
      authorWrap.appendChild(span);
    }

    blockquote.appendChild(authorWrap);
  }

  container.appendChild(blockquote);
}

/* =========================================================
   11. INSTAGRAM CARD (with addEventListener instead of onclick)
   ========================================================= */
function renderInstagram(article) {
  const container = cachedDOMElements.instagramContainer;
  if (!container || !article.instagram) return;

  const image = container.querySelector("[data-instagram-image]");
  const text = container.querySelector("[data-instagram-text]");
  const date = container.querySelector("[data-instagram-date]");

  if (image && article.instagram.image) {
    image.src = article.instagram.image;
    image.alt =
      article.instagram.alt || "Instagram пост — " + (article.title || "");
  }

  if (text) text.textContent = article.instagram.text || "";
  if (date) date.textContent = article.instagram.date || "";

  // Удаляем старый обработчик если есть
  const newContainer = container.cloneNode(true);
  container.parentNode.replaceChild(newContainer, container);
  
  // Добавляем новый обработчик (лучше чем onclick)
  newContainer.addEventListener("click", () => {
    window.open(article.instagram.url, "_blank", "noopener");
  });

  newContainer.style.display = "flex";
}

/* =====================================
   Unified Scroll Observer (Progress Bar + Reading Time) - ОПТИМИЗИРОВАНО
===================================== */

function initScrollObserver() {
  const progressBar = cachedDOMElements.progressBar;
  const article = cachedDOMElements.article;
  const readingTimeEl = cachedDOMElements.readingTimeEl;
  const postContent = cachedDOMElements.postContent;

  // Требуется хотя бы один из них
  if (!article || (!progressBar && !readingTimeEl)) return;

  // Для reading time
  let totalMinutes = 0;
  if (readingTimeEl && postContent) {
    const wordsPerMinute = 200;
    const text = postContent.innerText || postContent.textContent;
    const words = text.trim().split(/\s+/).length;
    totalMinutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  // Объединённая функция обновления (вызывается с throttle)
  function updateMetrics() {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;

    // ПЕРЕСЧИТЫВАЕМ на каждый скролл (высота может измениться после загрузки изображений)
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;

    // PROGRESS BAR
    if (progressBar) {
      const articleStart = articleTop - windowHeight * 0.2;
      const articleEnd = articleTop + articleHeight;
      let progress = (scrollTop - articleStart) / (articleEnd - articleStart);
      progress = Math.max(0, Math.min(progress, 1));
      progressBar.style.width = (progress * 100) + "%";
    }

    // READING TIME
    if (readingTimeEl && totalMinutes > 0) {
      let progress = (scrollTop + windowHeight - articleTop) / articleHeight;
      progress = Math.max(0, Math.min(progress, 1));
      
      const remaining = Math.max(1, Math.ceil(totalMinutes * (1 - progress)));

      if (progress < 0.1) {
        readingTimeEl.textContent = totalMinutes + " мин чтения";
      } else {
        readingTimeEl.textContent = totalMinutes + " мин чтения • осталось " + remaining + " мин";
      }
    }
  }

  // ОДИН слушатель со throttle вместо двух
  const throttledUpdate = throttleScroll(updateMetrics);
  window.addEventListener("scroll", throttledUpdate);
}


function renderRelatedPosts(currentArticle, allArticles) {
  const container = cachedDOMElements.relatedPosts;
  if (!container) return;

  if (!currentArticle.tags || currentArticle.tags.length === 0) {
    container.innerHTML = "";
    return;
  }

  const currentTags = currentArticle.tags;
  const currentId = currentArticle.id;

  // ОПТИМИЗИРОВАНО: объединяем фильтр + map + фильтр + sort в один цикл
  const related = [];
  
  for (let i = 0; i < allArticles.length; i++) {
    const article = allArticles[i];
    
    // Пропукаем текущую статью
    if (article.id === currentId) continue;
    
    // Считаем общие теги
    const commonTags = article.tags?.filter(tag => currentTags.includes(tag)) || [];
    const relevance = commonTags.length;
    
    // Пропускаем без релевантности
    if (relevance === 0) continue;
    
    related.push({
      ...article,
      relevance: relevance
    });
  }

  // Сортируем по релевантности
  related.sort((a, b) => b.relevance - a.relevance);
  
  // Берём максимум 4
  const selected = related.slice(0, 4);

  if (selected.length === 0) {
    container.innerHTML = "";
    return;
  }

  // Используем DocumentFragment вместо innerHTML.join()
  const fragment = document.createDocumentFragment();
  
  selected.forEach(article => {
    const a = document.createElement("a");
    a.href = `/blog/${article.slug}`;
    a.className = "related-card";
    a.innerHTML = `
      <div class="related-card-content">
        <div class="related-card-meta">
          ${article.category || "Недвижимость"}
        </div>
        <div class="related-card-title">
          ${article.title}
        </div>
        <div class="related-card-arrow">
          →
        </div>
      </div>
    `;
    fragment.appendChild(a);
  });

  container.textContent = "";
  container.appendChild(fragment);
}
