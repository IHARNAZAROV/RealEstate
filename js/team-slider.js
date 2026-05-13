/**
 * TeamSlider - Vertical carousel slider for team members
 * Provides smooth vertical animations, autoplay, and responsive behavior
 */

class TeamSlider {
  constructor(options = {}) {
    this.container = options.container;
    this.itemsPerView = options.itemsPerView || 4; // 2x2 grid
    this.autoplayInterval = options.autoplayInterval || 5000;
    this.animationDuration = options.animationDuration || 600;
    
    this.items = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.autoplayTimer = null;
    this.isHovered = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    
    this.init();
  }

  /**
   * Initialize slider
   */
  init() {
    if (!this.container) return;
    
    this.viewport = this.container.querySelector('.team-slider__viewport');
    this.controls = this.container.querySelector('.team-slider__controls');
    this.nextButton = this.controls?.querySelector('[data-action="next"]');
    this.prevButton = this.controls?.querySelector('[data-action="prev"]');
    this.progressBar = this.container.querySelector('.team-slider__progress');
    
    this.items = Array.from(this.viewport.querySelectorAll('.team-slider__item'));
    
    // Initialize viewport position
    if (this.viewport) {
      this.viewport.style.transform = 'translateY(0)';
      this.viewport.style.transitionDuration = `${this.animationDuration}ms`;
    }
    
    this.setupEventListeners();
    this.startAutoplay();
    this.updateProgressBar();
    this.setupResponsiveness();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Button controls
    this.nextButton?.addEventListener('click', () => this.next());
    this.prevButton?.addEventListener('click', () => this.prev());
    
    // Hover to pause autoplay
    this.container?.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.stopAutoplay();
    });
    
    this.container?.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.startAutoplay();
    });
    
    // Touch/swipe support
    this.viewport?.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
    this.viewport?.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
    this.viewport?.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Window resize with debounce
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Move to next set of items
   */
  next() {
    if (this.isAnimating) return;
    
    const nextIndex = (this.currentIndex + 1) % Math.ceil(this.items.length / this.itemsPerView);
    this.goToIndex(nextIndex);
  }

  /**
   * Move to previous set of items
   */
  prev() {
    if (this.isAnimating) return;
    
    const totalRows = Math.ceil(this.items.length / this.itemsPerView);
    const prevIndex = (this.currentIndex - 1 + totalRows) % totalRows;
    this.goToIndex(prevIndex);
  }

  /**
   * Go to specific index
   */
  goToIndex(index) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const totalRows = Math.ceil(this.items.length / this.itemsPerView);
    
    if (index < 0 || index >= totalRows) return;
    
    this.currentIndex = index;
    
    // Calculate the height of one row (two items vertically)
    const itemHeight = this.viewport.clientHeight / 2; // Since it's 2x2, one row = 50% height
    const translateY = -(this.currentIndex * itemHeight);
    
    // Animate viewport by translating
    this.viewport.style.transform = `translateY(${translateY}px)`;
    
    // Update button states
    this.updateButtonStates();
    this.updateProgressBar();
    
    // Reset animation flag
    setTimeout(() => {
      this.isAnimating = false;
    }, this.animationDuration);
  }

  /**
   * Update button disabled states
   */
  updateButtonStates() {
    const totalRows = Math.ceil(this.items.length / this.itemsPerView);
    
    if (this.prevButton) {
      this.prevButton.disabled = this.currentIndex === 0;
    }
    
    if (this.nextButton) {
      this.nextButton.disabled = this.currentIndex >= totalRows - 1;
    }
  }

  /**
   * Update progress bar animation
   */
  updateProgressBar() {
    if (!this.progressBar) return;
    
    const totalRows = Math.ceil(this.items.length / this.itemsPerView);
    const progress = ((this.currentIndex + 1) / totalRows) * 100;
    
    this.progressBar.style.width = progress + '%';
  }

  /**
   * Start autoplay
   */
  startAutoplay() {
    if (this.autoplayTimer) return;
    
    this.autoplayTimer = setInterval(() => {
      if (!this.isHovered && !this.isAnimating) {
        this.next();
      }
    }, this.autoplayInterval);
  }

  /**
   * Stop autoplay
   */
  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
    this.stopAutoplay();
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    // Prevent default pull-to-refresh on iOS
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    
    // Detect swipe direction (vertical preferred)
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isVerticalSwipe) {
      if (deltaY < -50) {
        this.next(); // Swipe up = next
      } else if (deltaY > 50) {
        this.prev(); // Swipe down = prev
      }
    }
    
    if (!this.isHovered) {
      this.startAutoplay();
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    if (document.activeElement !== document.body) return;
    
    if (e.key === 'ArrowDown') {
      this.next();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      this.prev();
      e.preventDefault();
    }
  }

  /**
   * Handle window resize with debounce
   */
  handleResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.updateButtonStates();
    }, 250);
  }

  /**
   * Setup responsive behavior
   */
  setupResponsiveness() {
    const updateGridLayout = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        // Mobile: 1 column
        this.viewport.style.gridTemplateColumns = '1fr';
        this.viewport.style.gridTemplateRows = 'repeat(2, 1fr)';
      } else if (width < 1024) {
        // Tablet: 1 column
        this.viewport.style.gridTemplateColumns = '1fr';
        this.viewport.style.gridTemplateRows = 'repeat(2, 1fr)';
      } else {
        // Desktop: 2 columns
        this.viewport.style.gridTemplateColumns = 'repeat(2, 1fr)';
        this.viewport.style.gridTemplateRows = 'repeat(2, 1fr)';
      }
    };
    
    updateGridLayout();
    window.addEventListener('resize', updateGridLayout);
  }

  /**
   * Destroy slider and cleanup
   */
  destroy() {
    this.stopAutoplay();
    document.removeEventListener('keydown', (e) => this.handleKeydown(e));
  }
}

/**
 * Inject animation keyframes
 */
function injectSliderAnimations() {
  if (!document.querySelector('#team-slider-animations')) {
    const style = document.createElement('style');
    style.id = 'team-slider-animations';
    style.textContent = `
      @keyframes slideInFromBottom {
        from {
          opacity: 0;
          transform: translateY(40px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideOutToTop {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-40px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectSliderAnimations();
  });
} else {
  injectSliderAnimations();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamSlider;
}
