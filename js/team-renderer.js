/**
 * TeamRenderer - Renders team section HTML and manages team data display
 */

class TeamRenderer {
  constructor(options = {}) {
    this.sectionId = options.sectionId || 'team-section';
    this.teamService = options.teamService;
    this.onSliderInit = options.onSliderInit;
    this.lazyLoadImages = options.lazyLoadImages !== false;
    this.imageFallback = options.imageFallback || '/images/placeholder.webp';
  }

  /**
   * Initialize and render team section
   */
  async render() {
    try {
      const section = document.getElementById(this.sectionId);
      if (!section) {
        console.warn(`TeamRenderer: Section with id "${this.sectionId}" not found`);
        return;
      }

      // Show loading state
      this.showLoadingState(section);

      // Load data
      const [manager, sliderMembers] = await Promise.all([
        this.teamService.getManager(),
        this.teamService.getSliderMembers()
      ]);

      if (!manager) {
        this.showEmptyState(section);
        return;
      }

      // Render manager card
      const managerHtml = this.renderManagerCard(manager);
      
      // Render slider
      const sliderHtml = this.renderSlider(sliderMembers);

      // Update section
      section.innerHTML = `
        <div class="team-wrapper">
          <div class="team-manager">
            ${managerHtml}
          </div>
          <div class="team-slider-section">
            <div class="team-slider__header">
              <h3 class="team-slider__title">Наша команда</h3>
            </div>
            ${sliderHtml}
          </div>
        </div>
      `;

      // Setup lazy loading
      if (this.lazyLoadImages) {
        this.setupLazyLoading(section);
      }

      // Initialize slider
      this.initializeSlider(section);

      // Dispatch custom event
      section.dispatchEvent(new CustomEvent('teamRendered', {
        detail: { manager, sliderMembers }
      }));

    } catch (error) {
      console.error('TeamRenderer: Error rendering team section', error);
      this.showErrorState(section);
    }
  }

  /**
   * Render manager card HTML
   */
  renderManagerCard(manager) {
    const socials = manager.socials || {};
    const socialsHtml = this.renderSocials(socials);

    return `
      <div class="team-card--large" data-member-id="${manager.id}">
        <div class="team-card__image-wrapper">
          <img 
            src="${this.getImageSrc(manager.coverImage || manager.photo)}"
            alt="${manager.name}, ${manager.position}"
            class="team-card__image"
            ${this.lazyLoadImages ? 'loading="lazy"' : ''}
            width="600"
            height="600"
          />
          <div class="team-card__overlay">
            <div class="team-card__content">
              <h3 class="team-card__name">${this.escapeHtml(manager.name)}</h3>
              <p class="team-card__position">${this.escapeHtml(manager.position)}</p>
              
              ${socialsHtml ? `
                <div class="team-card__socials" role="list">
                  ${socialsHtml}
                </div>
              ` : ''}
              
              <a href="/team/${manager.slug}" class="team-card__cta" aria-label="Подробнее о ${manager.name}">
                Подробнее
                <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render vertical carousel slider
   */
  renderSlider(members) {
    if (!members || members.length === 0) {
      return `
        <div class="team-slider">
          <div class="team-slider__empty">
            <i class="fas fa-users team-slider__empty-icon"></i>
            <p class="team-slider__empty-text">Нет доступных членов команды</p>
          </div>
        </div>
      `;
    }

    const itemsHtml = members
      .slice(0, 12) // Limit to 12 items for performance
      .map(member => this.renderSliderItem(member))
      .join('');

    return `
      <div class="team-slider" data-slider-container>
        <div class="team-slider__container">
          <div class="team-slider__viewport">
            ${itemsHtml}
          </div>
          <div class="team-slider__progress"></div>
        </div>
        
        <div class="team-slider__controls">
          <button 
            class="team-slider__button" 
            data-action="prev" 
            aria-label="Предыдущая группа членов команды"
            title="Предыдущая"
          >
            <i class="fas fa-chevron-up"></i>
          </button>
          <button 
            class="team-slider__button" 
            data-action="next" 
            aria-label="Следующая группа членов команды"
            title="Следующая"
          >
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render individual slider item
   */
  renderSliderItem(member) {
    const specializationList = (member.specialization || [])
      .slice(0, 1)
      .map(s => this.escapeHtml(s))
      .join(', ');

    return `
      <div class="team-slider__item" data-member-id="${member.id}">
        <div class="team-card--slider">
          <div class="team-slider__image-wrapper">
            <img 
              src="${this.getImageSrc(member.photo)}"
              alt="${member.name}, ${member.position}"
              class="team-slider__image"
              ${this.lazyLoadImages ? 'loading="lazy"' : ''}
              width="400"
              height="300"
            />
            <div class="team-slider__image-overlay"></div>
          </div>
          
          <div class="team-slider__content">
            <div>
              <h4 class="team-slider__name">${this.escapeHtml(member.name)}</h4>
              ${member.position ? `
                <p class="team-slider__position">${this.escapeHtml(member.position)}</p>
              ` : ''}
              ${member.shortDescription ? `
                <p class="team-slider__description">${this.escapeHtml(member.shortDescription)}</p>
              ` : ''}
            </div>
            
            <a 
              href="/team/${member.slug}" 
              class="team-slider__link"
              aria-label="Подробнее о ${member.name}"
            >
              Подробнее
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
    `;
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
            href="${value}" 
            class="team-card__social-link" 
            title="${label}"
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Перейти на ${label}"
            role="listitem"
          >
            <i class="${icon}"></i>
          </a>
        `;
      });

    return validSocials.join('');
  }

  /**
   * Initialize slider with TeamSlider class
   */
  initializeSlider(section) {
    const sliderContainer = section.querySelector('[data-slider-container]');
    if (!sliderContainer) return;

    const slider = new TeamSlider({
      container: sliderContainer,
      itemsPerView: 4,
      autoplayInterval: 6000,
      animationDuration: 600
    });

    if (this.onSliderInit) {
      this.onSliderInit(slider);
    }

    return slider;
  }

  /**
   * Setup lazy loading for images
   */
  setupLazyLoading(section) {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src') || img.getAttribute('src');
            
            if (!img.src && src) {
              img.src = src;
            }
            
            img.addEventListener('load', () => {
              img.classList.add('loaded');
            });
            
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px'
      });

      section.querySelectorAll('img').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Get image source with fallback
   */
  getImageSrc(src) {
    return src && src !== '#' ? src : this.imageFallback;
  }

  /**
   * Escape HTML to prevent XSS
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
   * Show loading state
   */
  showLoadingState(section) {
    section.innerHTML = `
      <div class="team-wrapper">
        <div class="team-manager">
          <div class="team-card--large">
            <div class="team-slider__item skeleton-card" style="height: 100%; min-height: 600px;"></div>
          </div>
        </div>
        <div class="team-slider-section">
          <div class="team-slider__header">
            <h3 class="team-slider__title">Наша команда</h3>
          </div>
          <div class="team-slider" data-slider-container>
            <div class="team-slider__container">
              <div class="team-slider__viewport">
                ${Array(4).fill(0).map(() => `
                  <div class="team-slider__item skeleton-card"></div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showErrorState(section) {
    section.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--color-text-light); margin-bottom: 1rem;"></i>
        <p style="color: var(--color-text-light); margin: 0;">
          Ошибка при загрузке информации о команде
        </p>
        <button 
          onclick="location.reload()" 
          class="site-button" 
          style="margin-top: 1rem;"
        >
          Перезагрузить
        </button>
      </div>
    `;
  }

  /**
   * Show empty state
   */
  showEmptyState(section) {
    section.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <i class="fas fa-users" style="font-size: 3rem; color: var(--color-text-light); margin-bottom: 1rem;"></i>
        <p style="color: var(--color-text-light); margin: 0;">
          Информация о команде отсутствует
        </p>
      </div>
    `;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamRenderer;
}
