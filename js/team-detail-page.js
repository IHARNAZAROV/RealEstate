(() => {
  'use strict';

  /* ── Helpers ── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const safe = (v = '') => String(v).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const slugify = (v = '') => v.toString().toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Read slug from URL ── */
  const parseSlug = () => {
    const q = new URLSearchParams(location.search).get('slug');
    if (q) return decodeURIComponent(q).trim();
    const m = location.pathname.match(/\/team\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]).trim() : '';
  };

  /* ── Fetch team data ── */
  const normalise = p => Array.isArray(p) ? p : (p && Array.isArray(p.team) ? p.team : []);

  const fetchTeam = async () => {
    const r = await fetch('/data/team.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status}`);
    return normalise(await r.json());
  };

  /* ── Reveal on scroll ── */
  const initReveal = () => {
    const nodes = document.querySelectorAll('.td-reveal');
    if (!('IntersectionObserver' in window) || prefersReduced) {
      nodes.forEach(n => n.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    nodes.forEach(n => io.observe(n));
  };

  /* ── Animated counters ── */
  const initCounters = () => {
    document.querySelectorAll('[data-count]').forEach(el => {
      if (prefersReduced) { el.textContent = el.dataset.count; return; }
      const end = Number(el.dataset.count) || 0;
      const steps = 40;
      let i = 0;
      const tick = () => {
        i++;
        el.textContent = Math.round((end / steps) * i);
        if (i < steps) requestAnimationFrame(tick);
        else el.textContent = end;
      };
      requestAnimationFrame(tick);
    });
  };

  /* ── Animate skill bars ── */
  const animateBars = () => {
    document.querySelectorAll('.td-skill-bar[data-pct]').forEach(bar => {
      const pct = parseInt(bar.dataset.pct, 10) || 0;
      if (prefersReduced) { bar.style.width = pct + '%'; return; }
      requestAnimationFrame(() => { bar.style.width = pct + '%'; });
    });
  };

  /* ── Build skills from member data ── */
  const buildSkills = m => {
    const base = [
      { name: 'Сопровождение сделок',    pct: Math.min(98, 70 + (m.experience || 0) * 2) },
      { name: 'Работа с клиентами',       pct: Math.min(97, 72 + Math.round((m.deals || 0) / 20)) },
      { name: 'Юридическая грамотность',  pct: Math.min(95, 68 + (m.experience || 0) * 2) },
    ];
    return base;
  };

  /* ── Meta & breadcrumb update ── */
  const updateMeta = (m, slug) => {
    const canonical = `${location.origin}/team/${slug}`;
    const title = `${m.name} — ${m.position} | ГермесГрупп`;
    const desc = m.description || `${m.name} — риэлтер агентства недвижимости ГермесГрупп. Опыт ${m.experience || 0} лет, более ${m.deals || 0} сделок.`;

    document.title = title;
    const set = (id, attr, val) => { const el = $(id); if (el) el[attr] = val; };
    set('#pageTitle',          'textContent', title);
    set('#pageDescription',    'content', desc);
    set('#ogTitle',            'content', title);
    set('#ogDescription',      'content', desc);
    set('#ogImage',            'content', m.photo || '');
    set('#twitterTitle',       'content', title);
    set('#twitterDescription', 'content', desc);
    set('#twitterImage',       'content', m.photo || '');
    set('#canonicalLink',      'href', canonical);
    set('#ogUrl',              'content', canonical);
    set('#breadcrumbName',     'textContent', m.name);
    
    /* Page intro section */
    set('#pageIntroEyebrow',     'textContent', 'Наша команда');
    set('#pageIntroTitle',       'textContent', m.name);
    set('#pageIntroDescription', 'textContent', m.position);

    /* Schema.org Person */
    const sc = document.createElement('script');
    sc.type = 'application/ld+json';
    sc.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['Person', 'RealEstateAgent'],
      name: m.name,
      jobTitle: m.position,
      image: m.photo,
      telephone: m.phone || '',
      email: m.email || '',
      address: { '@type': 'PostalAddress', addressLocality: m.city || 'Лида' },
      url: canonical,
      description: desc,
    });
    document.head.appendChild(sc);
  };

  /* ── Render social icons for the photo card ── */
  const renderSocials = m => {
    const links = [];
    if (m.telegram)   links.push({ href: m.telegram,   icon: 'fa-brands fa-telegram',         label: 'Telegram' });
    if (m.viber)      links.push({ href: m.viber,       icon: 'fa-brands fa-viber',            label: 'Viber' });
    if (m.instagram)  links.push({ href: m.instagram,   icon: 'fa-brands fa-square-instagram', label: 'Instagram' });
    if (m.whatsapp)   links.push({ href: m.whatsapp,    icon: 'fa-brands fa-whatsapp',         label: 'WhatsApp' });
    if (m.tiktok)     links.push({ href: m.tiktok,      icon: 'fa-brands fa-tiktok',           label: 'TikTok' });

    /* Default fallbacks for manager */
    if (!links.length && m.isManager) {
      links.push(
        { href: 'https://t.me/TurkoOlga',                         icon: 'fa-brands fa-telegram',         label: 'Telegram' },
        { href: 'viber://chat?number=%2B375291809516',             icon: 'fa-brands fa-viber',            label: 'Viber' },
        { href: 'https://www.instagram.com/rielter_olga_lida',    icon: 'fa-brands fa-square-instagram', label: 'Instagram' },
        { href: 'https://www.tiktok.com/@rieltor_olga_lida',      icon: 'fa-brands fa-tiktok',           label: 'TikTok' },
      );
    }

    if (!links.length) return '';
    return links.map(l =>
      `<a href="${safe(l.href)}" target="_blank" rel="noopener noreferrer" aria-label="${safe(l.label)}">
        <i class="${safe(l.icon)}" aria-hidden="true"></i>
      </a>`
    ).join('');
  };

  /* ── Render info boxes (2×2 grid) ── */
  const renderInfoBoxes = m => {
    const email     = m.email    || (m.isManager ? 'olgaturko1975@gmail.com' : '—');
    const phone     = m.phone    || (m.isManager ? '+375 29 180 95 16'       : '—');
    const location  = m.city    ? `г. ${m.city}`                              : '—';
    const exp       = m.experience ? `${m.experience}+ лет`                   : '—';

    return `
      <div class="td-info-box">
        <div class="td-info-box-label">Email</div>
        <div class="td-info-box-value">${safe(email)}</div>
      </div>
      <div class="td-info-box">
        <div class="td-info-box-label">Телефон</div>
        <div class="td-info-box-value">${safe(phone)}</div>
      </div>
      <div class="td-info-box">
        <div class="td-info-box-label">Город</div>
        <div class="td-info-box-value">${safe(location)}</div>
      </div>
      <div class="td-info-box">
        <div class="td-info-box-label">Опыт</div>
        <div class="td-info-box-value">${safe(exp)}</div>
      </div>`;
  };



  const renderAchievements = m => {
    const years = m.experience || 0;
    const deals = m.deals || 0;
    const area = m.city || 'регионе';
    const items = [
      { icon: 'fa-solid fa-circle-half-stroke', text: `Экспертный подход и персональная стратегия под вашу задачу.` },
      { icon: 'fa-solid fa-building', text: `Проведено ${deals}+ сделок с прозрачным сопровождением на всех этапах.` },
      { icon: 'fa-solid fa-house', text: `Глубокая экспертиза в ${area} и практический опыт ${years}+ лет.` },
    ];
    return `<div class="td-achievements">${items.map(it => `<div class="td-achievement td-reveal"><i class="${safe(it.icon)}" aria-hidden="true"></i><span>${safe(it.text)}</span></div>`).join('')}</div>`;
  };

  /* ── Render skill bars ── */
  const renderSkillBars = skills => skills.map(s => `
    <div class="td-skill-item td-reveal">
      <div class="td-skill-header">
        <span class="td-skill-name">${safe(s.name)}</span>
        <span class="td-skill-pct">${s.pct}%</span>
      </div>
      <div class="td-skill-track">
        <div class="td-skill-bar" data-pct="${s.pct}"></div>
      </div>
    </div>`).join('');

  /* ── Main render ── */
  const render = (m, slug) => {
    /* Hide skeleton */
    const skel = $('#heroSkeleton');
    if (skel) skel.hidden = true;

    /* --- Hero --- */
    const heroWrap = $('#heroContent');
    const contactHref = m.phone
      ? `tel:${m.phone.replace(/\s/g, '')}`
      : (m.isManager ? 'tel:+375291809516' : '#ctaSection');

    const photoInner = m.photo
      ? `<img src="${safe(m.photo)}" alt="${safe(m.name)}" loading="eager" fetchpriority="high" />`
      : `<div class="td-photo-placeholder"><i class="fa-solid fa-user" aria-hidden="true"></i></div>`;

    const socials = renderSocials(m);
    const desc = m.description ||
      `Профессиональный риэлтер с ${m.experience || 0}-летним опытом работы. Специализация: ${m.specialization || 'сделки с недвижимостью'}. Провёл(а) более ${m.deals || 0} успешных сделок.`;

    heroWrap.innerHTML = `
      <div class="td-hero">
        <div class="td-photo-card td-reveal">
          <div class="td-photo-wrap">${photoInner}</div>
          ${socials ? `<div class="td-photo-socials">${socials}</div>` : ''}
        </div>
        <div class="td-info-panel td-reveal">
          <h1 class="td-info-heading">ПРИВЕТ! Я ${safe(m.name)}<br>${safe(m.position || 'Риэлтер')}</h1>
          <p class="td-info-role">${safe(m.specialization || m.position || 'Специалист по недвижимости')}</p>
          <p class="td-info-desc">${safe(desc)}</p>
          <div class="td-info-boxes">${renderInfoBoxes(m)}</div>
          ${renderAchievements(m)}
          <a class="td-contact-btn" href="${safe(contactHref)}"><i class="fa-solid fa-phone" aria-hidden="true"></i>Связаться со мной</a>
        </div>
      </div>`;
    heroWrap.hidden = false;

    /* --- Experiences --- */
    const expSection = $('#experiencesSection');
    if (expSection) {
      const skills = buildSkills(m);
      $('#skillBars').innerHTML = renderSkillBars(skills);
      $('#expDesc').textContent = `Многолетний опыт на рынке недвижимости позволяет решать задачи любой сложности — от первичного подбора до юридического сопровождения сделки. Работаю честно, прозрачно и в интересах клиента.`;
      expSection.hidden = false;
    }

    /* --- Stats --- */
    const statsSection = $('#statsSection');
    if (statsSection && (m.deals || m.experience)) {
      const items = [
        { label: 'Сделок завершено',    value: m.deals      || 0 },
        { label: 'Лет опыта',           value: m.experience || 0 },
        { label: 'Довольных клиентов',  value: m.clients    || Math.round((m.deals || 0) * 0.92) },
        { label: 'Объектов продано',    value: m.sold       || Math.round((m.deals || 0) * 0.7) },
      ];
      $('#statsGrid').innerHTML = items.map(it => `
        <div class="td-stat-card td-reveal">
          <span class="td-stat-number" data-count="${it.value}">0</span>
          <span class="td-stat-label">${safe(it.label)}</span>
        </div>`).join('');
      statsSection.hidden = false;
    }

    /* --- CTA --- */
    const ctaSection = $('#ctaSection');
    if (ctaSection) ctaSection.hidden = false;

    updateMeta(m, slug);
    initReveal();
    initCounters();

    /* Bars animate after a short delay so transition is visible */
    setTimeout(animateBars, 300);

    /* CTA form handler */
    const form = $('#ctaForm');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const msg = $('#ctaFormMsg');
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          const payload = {
            name:    form.name.value.trim(),
            phone:   form.phone.value.trim(),
            comment: (form.comment?.value || '').trim(),
            source:  `team-detail:${slug}`,
          };
          const res = await fetch('/api/client-quiz.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            msg.textContent = 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.';
            msg.className = 'td-form-msg td-form-msg--ok';
            form.reset();
          } else {
            throw new Error('server');
          }
        } catch {
          msg.textContent = 'Не удалось отправить. Позвоните нам: +375 29 180 95 16';
          msg.className = 'td-form-msg td-form-msg--err';
        } finally {
          msg.hidden = false;
          btn.disabled = false;
        }
      });
    }
  };

  /* ── Not-found fallback ── */
  const showFallback = () => {
    const skel = $('#heroSkeleton');
    if (skel) skel.hidden = true;
    const hero = $('#heroContent');
    if (hero) {
      hero.innerHTML = `
        <div class="td-not-found">
          <h1>Специалист не найден</h1>
          <p>Проверьте ссылку или вернитесь на главную страницу.</p>
          <a class="td-contact-btn" href="/">На главную</a>
        </div>`;
      hero.hidden = false;
    }
  };

  /* ── Bootstrap ── */
  (async () => {
    try {
      const slug = parseSlug();
      const team = await fetchTeam();
      const withSlugs = team.map(m => ({ ...m, slug: m.slug || slugify(m.name) }));

      let member = withSlugs.find(m => m.slug.toLowerCase() === slug.toLowerCase());
      if (!member) member = withSlugs.find(m => m.isManager) || withSlugs[0] || null;
      if (!member) return showFallback();

      render(member, member.slug);
    } catch (err) {
      console.error('[team-detail]', err);
      showFallback();
    }
  })();
})();
