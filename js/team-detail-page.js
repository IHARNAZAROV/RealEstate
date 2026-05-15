(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const parseSlug = () => {
    const q = new URLSearchParams(location.search).get('slug');
    if (q) return q;
    const m = location.pathname.match(/\/team\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  };
  const slugify = (v = '') => v.toString().toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '');
  const safe = (v = '') => String(v).replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TEAM_ENDPOINTS = ['/data/team.json', '/team.json', './team.json'];
  const normalizeTeamPayload = (payload) => Array.isArray(payload) ? payload : (payload && Array.isArray(payload.team) ? payload.team : []);
  const getTeam = async () => {
    if (typeof teamService !== 'undefined' && teamService?.getAll) {
      try {
        const serviceData = await teamService.getAll();
        const normalizedServiceData = normalizeTeamPayload(serviceData);
        if (normalizedServiceData.length) return normalizedServiceData;
      } catch (_) {}
    }
    let lastError = null;
    for (const url of TEAM_ENDPOINTS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        const payload = await res.json();
        const normalized = normalizeTeamPayload(payload);
        if (normalized.length) return normalized;
      } catch (e) { lastError = e; }
    }
    throw lastError || new Error('Team JSON unavailable');
  };

  const animateReveal = () => {
    const nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || prefersReduced) return nodes.forEach((n) => n.classList.add('show'));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } }), { threshold: .15 });
    nodes.forEach((n) => io.observe(n));
  };

  const render = (m) => {
    $('#heroSkeleton').hidden = true;
    const hero = $('#heroContent');
    hero.hidden = false;
    hero.innerHTML = `<div class="hero-photo reveal"><img loading="eager" fetchpriority="high" src="${safe(m.photo)}" alt="${safe(m.name)}"></div>
    <article class="hero-card reveal"><h1>${safe(m.name)}</h1><p>${safe(m.position || 'Риэлтер')} · ${safe(m.city || 'Лида')}</p><p>${safe(m.description || '')}</p>
    <div class="hero-actions"><a class="btn-team btn-main" href="tel:${safe(m.phone || '')}">Позвонить</a><a class="btn-team btn-ghost" href="${safe(m.telegram || '#')}" target="_blank" rel="noopener">Telegram</a><a class="btn-team btn-ghost" href="${safe(m.whatsapp || '#')}" target="_blank" rel="noopener">WhatsApp</a><a class="btn-team btn-main" href="#cta-form">Оставить заявку</a></div></article>`;

    const about = [
      ['Опыт работы', `${m.experience || 0} лет`],['Специализация', m.specialization || '—'],['Направления деятельности', (m.directions || []).join(', ') || 'Покупка, продажа, обмен'],['Достижения', (m.achievements || []).join(', ') || '—'],['Сертификаты/награды', (m.certificates || []).join(', ') || '—'],['Личный подход', m.approach || 'Прозрачная коммуникация и сопровождение на каждом этапе.']
    ];
    $('#aboutContent').innerHTML = `<div class="about-grid">${about.map(([k,v])=>`<section class="about-item reveal"><h3>${k}</h3><p>${safe(v)}</p></section>`).join('')}</div>`;

    const stats = m.stats || { deals: m.deals || 0, years: m.experience || 0, activeObjects: (m.objects || []).length, happyClients: m.clients || 0 };
    $('#statsGrid').innerHTML = [['Сделок',stats.deals],['Опыт лет',stats.years],['Объектов в продаже',stats.activeObjects],['Довольных клиентов',stats.happyClients]].map(([t,v])=>`<article class="stat-card reveal"><p>${t}</p><strong data-counter="${Number(v)||0}">0</strong></article>`).join('');

    const objects = (m.objects || []).slice(0, 6);
    $('#objectsGrid').innerHTML = objects.length ? objects.map((o)=>`<article class="object-card reveal"><img loading="lazy" src="${safe(o.image || '/images/placeholder.webp')}" alt="${safe(o.title || 'Объект')}"/><h3>${safe(o.title || '')}</h3><p>${safe(o.price || '')}</p></article>`).join('') : '<p>Скоро здесь появятся объекты специалиста.</p>';

    $('#ctaContent').innerHTML = `<div class="cta-box reveal"><h2>Свяжитесь с риэлтером</h2><p>Оставьте заявку — перезвоним в удобное время.</p><form id="cta-form" class="cta-form"><input aria-label="Ваше имя" placeholder="Ваше имя" required><input aria-label="Телефон" placeholder="Телефон" required><textarea aria-label="Комментарий" placeholder="Комментарий"></textarea><button class="btn-team btn-main" type="submit">Отправить</button></form></div>`;

    document.title = `${m.name} — ${m.position} | ГермесГрупп`;
    $('#pageTitle').textContent = document.title;
    const d = `${m.name} — ${m.description || 'Риэлтер агентства недвижимости'}`;
    $('#pageDescription').content = d; $('#ogDescription').content = d; $('#twitterDescription').content = d;
    $('#ogTitle').content = document.title; $('#twitterTitle').content = document.title;
    $('#ogImage').content = m.photo || ''; $('#twitterImage').content = m.photo || '';
    const canonical = `${location.origin}/team/${m.slug || slugify(m.name)}`;
    $('#canonicalLink').href = canonical; $('#ogUrl').content = canonical;

    const crumbs = $('#breadcrumbsList');
    crumbs.innerHTML = `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Главная</span></a><meta itemprop="position" content="1"></li><li aria-hidden="true">→</li><li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">${safe(m.name)}</span><meta itemprop="position" content="2"></li>`;

    const personSchema = {"@context":"https://schema.org","@type":["Person","RealEstateAgent"],name:m.name,jobTitle:m.position,image:m.photo,telephone:m.phone,email:m.email,address:{"@type":"PostalAddress",addressLocality:m.city},url:canonical,description:m.description};
    const sc = document.createElement('script'); sc.type = 'application/ld+json'; sc.textContent = JSON.stringify(personSchema); document.head.appendChild(sc);
    const bsc = document.createElement('script'); bsc.type = 'application/ld+json'; bsc.textContent = JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem",position:1,name:"Главная",item:`${location.origin}/`},{"@type":"ListItem",position:2,name:m.name,item:canonical}]}); document.head.appendChild(bsc);

    animateReveal(); initCounters();
  };

  const initCounters = () => {
    document.querySelectorAll('[data-counter]').forEach((el) => {
      const end = Number(el.dataset.counter);
      let t = 0; const steps = 30; const step = () => { t += 1; el.textContent = Math.round((end / steps) * t); if (t < steps) requestAnimationFrame(step); };
      step();
    });
  };

  const fallback = () => { $('#heroSkeleton').hidden = true; $('#heroContent').hidden = false; $('#heroContent').innerHTML = '<article class="hero-card"><h1>Специалист не найден</h1><p>Проверьте ссылку или вернитесь на главную.</p><a class="btn-team btn-main" href="/">На главную</a></article>'; };

  (async () => {
    try {
      const slug = parseSlug();
      const team = await getTeam();
      const normalized = team.map((m) => ({ ...m, slug: m.slug || slugify(m.name) }));
      const decodedSlug = decodeURIComponent(slug || '').trim().toLowerCase();
      const member = normalized.find((m) => (m.slug || '').toLowerCase() === decodedSlug);
      if (!member) return fallback();
      render(member);
    } catch (e) { console.error(e); fallback(); }
  })();
})();
