(() => {
  const section = document.querySelector('.team-section');
  if (!section) return;

  const managerRoot = section.querySelector('.manager-card');
  const track = section.querySelector('.agents-slider__track');
  const pagination = section.querySelector('.agents-slider__pagination');
  const prevBtn = section.querySelector('.team-nav--prev');
  const nextBtn = section.querySelector('.team-nav--next');
  const sliderRegion = section.querySelector('.agents-slider');

  const chunkSize = () => (window.innerWidth <= 700 ? 1 : 2);
  const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420'%3E%3Crect width='100%25' height='100%25' fill='%23e8ecea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23687a75' font-family='Arial' font-size='24'%3EФото недоступно%3C/text%3E%3C/svg%3E";
  let slides = [];
  let current = 0;
  let autoplayId = null;
  let rawTeam = [];
  let resizeTimer = null;
  const AUTOPLAY_MS = 4500;
  const TEAM_JSON_CANDIDATES = ['/data/team.json'];

  const loadTeamData = async () => {
    const inlineDataEl = document.getElementById('team-data');
    if (inlineDataEl) {
      try {
        const inlinePayload = JSON.parse(inlineDataEl.textContent || '[]');
        if (Array.isArray(inlinePayload) && inlinePayload.length > 0) {
          return inlinePayload;
        }
      } catch (error) {
        console.error('[team-section] failed to parse inline #team-data JSON', error);
      }
    }

    let lastError = null;
    for (const url of TEAM_JSON_CANDIDATES) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length === 0) {
          throw new Error(`${url} -> invalid payload`);
        }
        return payload;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Team data is unavailable');
  };

  const safe = (v) => String(v ?? '').replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));

  const cardTemplate = (agent, manager = false) => `
    <div class="card-media">
      <img src="${safe(agent.photo)}" alt="${safe(agent.name)} — ${safe(agent.position || agent.specialization)}" loading="lazy" decoding="async">
    </div>
    <div class="card-body">
      ${manager ? '<span class="card-label">РУКОВОДИТЕЛЬ</span>' : ''}
      <h3 class="card-name">${safe(agent.name)}</h3>
      <p class="card-role">${safe(agent.specialization || agent.position)}</p>
      ${manager ? `<p class="card-description">${safe(agent.description || '')}</p>` : ''}
      <div class="card-stats">
        <div><span class="stat-label">Опыт</span><span class="stat-value">${safe(agent.experience)} лет</span></div>
        <div><span class="stat-label">Сделки</span><span class="stat-value">${safe(agent.deals)}</span></div>
        <div><span class="stat-label">Город</span><span class="stat-value">${safe(agent.city)}</span></div>
      </div>
      ${agent.phone ? `<a href="tel:${safe(agent.phone.replace(/\s/g,''))}" class="card-phone" aria-label="Позвонить ${safe(agent.name)}"><svg class="card-phone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.62 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>${safe(agent.phone)}</a>` : ''}
      <a href="/team-detail.html?slug=${safe(agent.slug || agent.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/(^-|-$)/g,''))}" class="card-link" aria-label="Подробнее о ${safe(agent.name)}">Подробнее <span aria-hidden="true">→</span></a>
    </div>`;

  const buildSlides = (agents) => {
    const size = chunkSize();
    if (!agents.length) return [];

    const normalizedAgents = [...agents];
    if (size > 1 && normalizedAgents.length % size !== 0) {
      const missing = size - (normalizedAgents.length % size);
      for (let i = 0; i < missing; i += 1) {
        normalizedAgents.push(agents[i % agents.length]);
      }
    }

    const grouped = [];
    for (let i = 0; i < normalizedAgents.length; i += size) {
      grouped.push(normalizedAgents.slice(i, i + size));
    }
    return grouped;
  };

  const render = () => {
    sliderRegion.classList.toggle('is-empty', slides.length === 0);
    track.innerHTML = slides.map(group => `
      <article class="team-slide">${group.map(agent => `<article class="agent-card">${cardTemplate(agent)}</article>`).join('')}</article>
    `).join('');
    pagination.innerHTML = slides.map((_, i) => `<button class="team-dot ${i===current?'is-active':''}" aria-label="Перейти к слайду ${i+1}" data-index="${i}"></button>`).join('');
    update();
  };

  const update = () => {
    if (!slides.length) return;
    current = (current + slides.length) % slides.length;
    track.style.transform = `translate3d(-${current * 100}%,0,0)`;
    pagination.querySelectorAll('.team-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  };

  const next = () => { current += 1; update(); };
  const prev = () => { current -= 1; update(); };
  const startAutoplay = () => {
    clearInterval(autoplayId);
    autoplayId = setInterval(next, AUTOPLAY_MS);
  };

  loadTeamData()
    .then(data => {
      rawTeam = data;
      const manager = rawTeam.find((p) => p.isManager) || rawTeam[0];
      const agents = rawTeam.filter((p) => !p.isManager);
      managerRoot.innerHTML = cardTemplate(manager, true);
      slides = buildSlides(agents);
      render();
      startAutoplay();
    })
    .catch((error) => {
      console.error('[team-section] failed to load team.json', error);
      managerRoot.innerHTML = '<div class="card-body"><p>Не удалось загрузить данные команды.</p></div>';
    });

  nextBtn.addEventListener('click', () => { next(); startAutoplay(); });
  prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });

  pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('.team-dot');
    if (!btn) return;
    current = Number(btn.dataset.index);
    update();
    startAutoplay();
  });

  sliderRegion.addEventListener('mouseenter', () => clearInterval(autoplayId));
  sliderRegion.addEventListener('mouseleave', startAutoplay);

  sliderRegion.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); startAutoplay(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); startAutoplay(); }
  });

  let x0 = null;
  sliderRegion.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  sliderRegion.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const delta = e.changedTouches[0].clientX - x0;
    if (Math.abs(delta) > 40) delta < 0 ? next() : prev();
    x0 = null;
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!rawTeam.length) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      slides = buildSlides(rawTeam.filter((p) => !p.isManager));
      current = 0;
      render();
      startAutoplay();
    }, 120);
  });

  track.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    image.src = FALLBACK_IMAGE;
    image.alt = `${image.alt}. Фото временно недоступно`;
  }, true);
})();
