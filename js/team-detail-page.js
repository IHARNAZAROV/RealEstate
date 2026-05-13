/**
 * TeamDetailPage - Handles team member detail page rendering and SEO
 */

class TeamDetailPage {
  constructor(options = {}) {
    this.teamService = options.teamService || teamService;
    this.baseUrl = options.baseUrl || '/team';
    this.memberSlug = this.extractSlugFromURL();
  }

  /**
   * Extract member slug from URL
   */
  extractSlugFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/team\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Initialize and render page
   */
  async init() {
    if (!this.memberSlug) {
      this.showNotFound();
      return;
    }

    try {
      const member = await this.teamService.getBySlug(this.memberSlug);
      
      if (!member) {
        this.showNotFound();
        return;
      }

      this.member = member;
      
      // Update SEO
      this.updateSEO(member);
      
      // Render content
      this.renderContent(member);
      
      // Load other members
      await this.renderOtherMembers(member.id);
      
      // Setup contact widget
      this.setupContactWidget(member);

    } catch (error) {
      console.error('TeamDetailPage: Error loading member', error);
      this.showError();
    }
  }

  /**
   * Update page SEO metadata
   */
  updateSEO(member) {
    const description = member.shortDescription || 'Профессиональный риэлтер';
    const imageUrl = member.coverImage || member.photo || '/images/placeholder.webp';
    const pageUrl = `${window.location.origin}/team/${member.slug}`;

    // Title
    document.title = `${member.name}, ${member.position} | Риэлтер в Лиде`;
    document.getElementById('pageTitle').textContent = document.title;

    // Meta description
    const metaDescription = `${member.name} — ${member.position}. ${description}. Опыт: ${member.experience}`;
    document.querySelector('meta[name="description"]').content = metaDescription;
    document.getElementById('pageDescription').content = metaDescription;

    // Canonical
    document.getElementById('canonicalLink').href = pageUrl;

    // Open Graph
    document.getElementById('ogTitle').content = `${member.name}, ${member.position}`;
    document.getElementById('ogDescription').content = metaDescription;
    document.getElementById('ogUrl').content = pageUrl;
    document.getElementById('ogImage').content = imageUrl;

    // Twitter
    document.getElementById('twitterTitle').content = `${member.name}, ${member.position}`;
    document.getElementById('twitterDescription').content = metaDescription;
    document.getElementById('twitterImage').content = imageUrl;

    // Inject Schema.org Person markup
    this.injectPersonSchema(member);
  }

  /**
   * Inject Person schema.org markup
   */
  injectPersonSchema(member) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": member.name,
      "jobTitle": member.position,
      "image": member.coverImage || member.photo,
      "email": member.email,
      "telephone": member.phone,
      "knowsAbout": member.specialization || [],
      "worksFor": {
        "@type": "Organization",
        "name": "ГермесГрупп",
        "url": "https://turko.by"
      },
      "url": `https://turko.by/team/${member.slug}`,
      "areaServed": {
        "@type": "City",
        "name": member.city || "Лида"
      }
    };

    if (member.rating) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": member.rating,
        "bestRating": "5",
        "worstRating": "1"
      };
    }

    if (member.deals) {
      schema.knowsAbout = [
        ...schema.knowsAbout,
        `Успешно завершено ${member.deals} сделок`
      ];
    }

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaScript);
  }

  /**
   * Inject BreadcrumbList schema.org markup
   */
  injectBreadcrumbSchema(member) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Главная",
          "item": "https://turko.by/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Команда",
          "item": "https://turko.by/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": member.name,
          "item": `https://turko.by/team/${member.slug}`
        }
      ]
    };

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaScript);
  }

  /**
   * Render main content
   */
  renderContent(member) {
    // Update hero section
    document.getElementById('team-hero-name').textContent = member.name;
    document.getElementById('team-hero-position').textContent = member.position;
    document.getElementById('breadcrumb-name').textContent = member.name;

    // Build main content HTML
    const html = `
      <div class="row">
        <!-- Left: Photo and Stats -->
        <div class="col-lg-5 col-md-6 m-b30">
          <div style="position: sticky; top: 2rem;">
            <div style="overflow: hidden; border-radius: 8px; margin-bottom: 2rem;">
              <img 
                src="${this.escapeAttr(member.photo)}"
                alt="${this.escapeHtml(member.name)}"
                style="width: 100%; height: auto; display: block;"
                loading="eager"
              />
            </div>

            <!-- Stats -->
            <div style="background: var(--color-bg-light); padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
              ${member.rating ? `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border);">
                  <p style="color: var(--color-text-light); margin: 0 0 0.5rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">Рейтинг</p>
                  <div style="font-size: 1.5rem; color: var(--color-primary); font-weight: 700;">
                    ★ ${member.rating}
                  </div>
                </div>
              ` : ''}

              ${member.deals ? `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border);">
                  <p style="color: var(--color-text-light); margin: 0 0 0.5rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">Завершено сделок</p>
                  <div style="font-size: 1.5rem; color: var(--color-primary); font-weight: 700;">
                    ${member.deals}
                  </div>
                </div>
              ` : ''}

              ${member.experience ? `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border);">
                  <p style="color: var(--color-text-light); margin: 0 0 0.5rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">Опыт</p>
                  <div style="font-size: 1.5rem; color: var(--color-primary); font-weight: 700;">
                    ${this.escapeHtml(member.experience)}
                  </div>
                </div>
              ` : ''}

              ${member.city ? `
                <div>
                  <p style="color: var(--color-text-light); margin: 0 0 0.5rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">Город</p>
                  <div style="font-size: 1rem; color: var(--color-text-main); font-weight: 600;">
                    ${this.escapeHtml(member.city)}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Contact Info -->
            <div style="background: var(--color-white); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--color-border);">
              ${member.phone ? `
                <a href="tel:${member.phone}" class="site-button-link" style="display: block; margin-bottom: 1rem;">
                  <i class="fas fa-phone"></i> ${this.escapeHtml(member.phone)}
                </a>
              ` : ''}
              
              ${member.email ? `
                <a href="mailto:${member.email}" class="site-button-link" style="display: block;">
                  <i class="fas fa-envelope"></i> ${this.escapeHtml(member.email)}
                </a>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Right: Details -->
        <div class="col-lg-7 col-md-6">
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.75rem; margin-bottom: 1rem;">О специалисте</h2>
            <p style="font-size: 1rem; line-height: 1.8; color: var(--color-text-light);">
              ${this.escapeHtml(member.fullDescription || member.shortDescription)}
            </p>
          </div>

          ${member.specialization && member.specialization.length ? `
            <div style="margin-bottom: 2rem;">
              <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Специализация</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${member.specialization
                  .map(spec => `
                    <li style="padding: 0.75rem 0; border-bottom: 1px solid var(--color-border); display: flex; align-items: center;">
                      <i class="fas fa-check" style="color: var(--color-primary); margin-right: 1rem; flex-shrink: 0;"></i>
                      <span>${this.escapeHtml(spec)}</span>
                    </li>
                  `)
                  .join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Socials -->
          ${this.renderSocials(member.socials || {})}
        </div>
      </div>
    `;

    // Hide loading, show content
    document.getElementById('team-member-loading').style.display = 'none';
    document.getElementById('team-member-content').innerHTML = html;
    document.getElementById('team-member-content').style.display = 'block';

    // Setup CTA buttons
    this.setupCTAButtons(member);

    // Setup breadcrumb schema
    this.injectBreadcrumbSchema(member);
  }

  /**
   * Render social links
   */
  renderSocials(socials) {
    const socialIcons = {
      instagram: 'fab fa-instagram',
      telegram: 'fab fa-telegram',
      viber: 'fab fa-viber',
      whatsapp: 'fab fa-whatsapp',
      linkedin: 'fab fa-linkedin',
      facebook: 'fab fa-facebook',
      twitter: 'fab fa-twitter',
      youtube: 'fab fa-youtube',
      pinterest: 'fab fa-pinterest',
      vk: 'fab fa-vk',
      tiktok: 'fab fa-tiktok'
    };

    const validSocials = Object.entries(socials)
      .filter(([key, value]) => value && value !== '#' && value !== '')
      .map(([key, value]) => {
        const icon = socialIcons[key] || 'fas fa-link';
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        
        return `
          <a 
            href="${this.escapeAttr(value)}" 
            class="site-button-link" 
            title="${label}"
            target="_blank" 
            rel="noopener noreferrer"
            style="display: inline-block; margin-right: 1rem; margin-bottom: 1rem;"
          >
            <i class="${icon}"></i> ${label}
          </a>
        `;
      });

    return validSocials.length ? `
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Связь</h3>
        <div>${validSocials.join('')}</div>
      </div>
    ` : '';
  }

  /**
   * Setup CTA buttons
   */
  setupCTAButtons(member) {
    const container = document.getElementById('team-member-cta-buttons');
    
    const buttons = [];
    
    if (member.phone) {
      buttons.push(`
        <a href="tel:${member.phone}" class="site-button" style="background: rgba(255,255,255,0.15); border: 2px solid var(--color-white); color: var(--color-white);">
          <i class="fas fa-phone"></i> Позвонить
        </a>
      `);
    }

    if (member.email) {
      buttons.push(`
        <a href="mailto:${member.email}" class="site-button" style="background: rgba(255,255,255,0.15); border: 2px solid var(--color-white); color: var(--color-white);">
          <i class="fas fa-envelope"></i> Написать письмо
        </a>
      `);
    }

    if (member.socials?.telegram) {
      buttons.push(`
        <a href="${member.socials.telegram}" class="site-button" target="_blank" rel="noopener noreferrer" style="background: rgba(255,255,255,0.15); border: 2px solid var(--color-white); color: var(--color-white);">
          <i class="fab fa-telegram"></i> Telegram
        </a>
      `);
    }

    container.innerHTML = buttons.join('') || `
      <p style="opacity: 0.85;">Контактная информация недоступна</p>
    `;
  }

  /**
   * Render other team members
   */
  async renderOtherMembers(currentMemberId) {
    try {
      const allMembers = await this.teamService.getAll();
      const otherMembers = allMembers
        .filter(m => m.id !== currentMemberId && m.isManager !== true)
        .slice(0, 6);

      if (otherMembers.length === 0) {
        document.getElementById('other-team-section').style.display = 'none';
        return;
      }

      const html = otherMembers
        .map(member => `
          <div class="col-lg-4 col-md-6 col-sm-6 m-b30">
            <div class="team-card--large" style="height: 400px;">
              <div class="team-card__image-wrapper">
                <img 
                  src="${this.escapeAttr(member.photo)}"
                  alt="${this.escapeHtml(member.name)}"
                  class="team-card__image"
                  loading="lazy"
                  width="400"
                  height="400"
                />
                <div class="team-card__overlay">
                  <div class="team-card__content">
                    <h3 class="team-card__name">${this.escapeHtml(member.name)}</h3>
                    <p class="team-card__position">${this.escapeHtml(member.position)}</p>
                    <a href="/team/${member.slug}" class="team-card__cta">
                      Подробнее
                      <i class="fas fa-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `)
        .join('');

      document.getElementById('other-team-members').innerHTML = html;
    } catch (error) {
      console.error('Error loading other members:', error);
      document.getElementById('other-team-section').style.display = 'none';
    }
  }

  /**
   * Setup contact widget with member data
   */
  setupContactWidget(member) {
    const qrLink = member.socials?.telegram || 'https://t.me/TurkoOlga';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrLink)}`;
    
    document.getElementById('cw-qr-image').src = qrUrl;

    const actionsContainer = document.getElementById('cw-actions-container');
    const actions = [];

    const socialMap = {
      telegram: { label: 'Telegram', icon: '➤', class: 'cw__action--telegram' },
      whatsapp: { label: 'WhatsApp', icon: '✆', class: 'cw__action--whatsapp' },
      viber: { label: 'Viber', icon: '◉', class: 'cw__action--viber' }
    };

    for (const [key, data] of Object.entries(socialMap)) {
      if (member.socials?.[key]) {
        actions.push(`
          <a class="cw__action ${data.class}" href="${member.socials[key]}" target="_blank" rel="noopener noreferrer">
            <span class="cw__action-icon" aria-hidden="true">${data.icon}</span>
            <span class="cw__action-label">${data.label}</span>
          </a>
        `);
      }
    }

    actionsContainer.innerHTML = actions.join('') || '<p style="text-align: center; opacity: 0.7;">Контакты недоступны</p>';

    const phoneLink = document.getElementById('cw-phone-link');
    if (member.phone) {
      phoneLink.href = `tel:${member.phone}`;
      phoneLink.querySelector('.cw__phone-number').textContent = member.phone;
    } else {
      phoneLink.style.display = 'none';
    }
  }

  /**
   * Show 404 page
   */
  showNotFound() {
    document.getElementById('team-member-loading').innerHTML = `
      <div style="text-align: center; padding: 5rem 0;">
        <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: var(--color-text-light); margin-bottom: 1rem;"></i>
        <h2 style="color: var(--color-text-main); margin-bottom: 1rem;">Специалист не найден</h2>
        <p style="color: var(--color-text-light); margin-bottom: 2rem;">
          Извините, информация о данном специалисте недоступна.
        </p>
        <a href="/" class="site-button">Вернуться на главную</a>
      </div>
    `;
  }

  /**
   * Show error page
   */
  showError() {
    document.getElementById('team-member-loading').innerHTML = `
      <div style="text-align: center; padding: 5rem 0;">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--color-text-light); margin-bottom: 1rem;"></i>
        <h2 style="color: var(--color-text-main); margin-bottom: 1rem;">Ошибка загрузки</h2>
        <p style="color: var(--color-text-light); margin-bottom: 2rem;">
          Произошла ошибка при загрузке информации о специалисте.
        </p>
        <button onclick="location.reload()" class="site-button">Попробовать снова</button>
      </div>
    `;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Escape HTML attribute
   */
  escapeAttr(text) {
    return this.escapeHtml(text).replace(/"/g, '&quot;');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = new TeamDetailPage({
      teamService: teamService
    });
    page.init();
  });
} else {
  const page = new TeamDetailPage({
    teamService: teamService
  });
  page.init();
}
