/*
 * Service Worker — turko.by
 * Кешируем ТОЛЬКО статику: CSS, JS, шрифты, иконки.
 * JSON данные и изображения — всегда напрямую с сервера, без кеширования.
 */

const CACHE_STATIC = 'sw-static-v4';

/* ─── App Shell: шрифты и иконки, кешируем при установке ─── */
const APP_SHELL = [
  '/fonts/inter/Inter-Regular.woff2',
  '/fonts/inter/Inter-Medium.woff2',
  '/fonts/inter/Inter-SemiBold.woff2',
  '/fonts/inter/Inter-Bold.woff2',
  '/fonts/montserrat/Montserrat-Regular.woff2',
  '/fonts/montserrat/Montserrat-Medium.woff2',
  '/fonts/montserrat/Montserrat-SemiBold.woff2',
  '/fonts/montserrat/Montserrat-Bold.woff2',
  '/fonts/montserrat/Montserrat-ExtraBold.woff2',
  '/css/fontawesome/webfonts/fa-solid-900.woff2',
  '/css/fontawesome/webfonts/fa-regular-400.woff2',
  '/css/fontawesome/webfonts/fa-brands-400.woff2',
  '/images/logo-dark.svg',
  '/images/logo-light.svg',
  '/images/logo-dark.webp',
  '/images/logo-light.webp',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

/* ─── Install ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate: удаляем все старые кеши ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_STATIC).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ─── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  /* Пропускаем напрямую: API, PHP, админка, JSON данные, изображения */
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/adminka_objects/') ||
    url.pathname.endsWith('.php') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/media/')
  ) {
    return;
  }

  /* Cache First: CSS, JS, шрифты, библиотеки */
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/libs/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Cache First: внешние CDN (Bootstrap, FontAwesome и т.д.) */
  if (url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

/* ─── Cache First ─── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}
