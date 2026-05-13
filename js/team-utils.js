/**
 * Team Section - Additional Utilities
 * Helper functions and utilities for team section management
 */

// ============================================================
// IMAGE UTILITIES
// ============================================================

/**
 * Generate responsive image srcset
 */
function generateImageSrcSet(imagePath, sizes = [320, 640, 1024, 1280]) {
  return sizes
    .map(size => `${imagePath}?w=${size} ${size}w`)
    .join(', ');
}

/**
 * Generate image with WebP fallback
 */
function getImageWithWebPFallback(path) {
  const webpPath = path.replace(/\.(jpg|png)$/, '.webp');
  return {
    webp: webpPath,
    fallback: path
  };
}

/**
 * Preload images
 */
function preloadImages(imageUrls) {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

// ============================================================
// ANIMATION UTILITIES
// ============================================================

/**
 * Debounce function for resize events
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request animation frame wrapper
 */
function requestNextFrame(callback) {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 1000 / 60);
}

// ============================================================
// ACCESSIBILITY UTILITIES
// ============================================================

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Announce to screen readers
 */
function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    announcement.remove();
  }, 1000);
}

/**
 * Focus management
 */
class FocusTrap {
  constructor(element) {
    this.element = element;
    this.focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    this.firstElement = this.focusableElements[0];
    this.lastElement = this.focusableElements[this.focusableElements.length - 1];
  }

  init() {
    this.element.addEventListener('keydown', (e) => this.handleTab(e));
    this.firstElement?.focus();
  }

  handleTab(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === this.firstElement) {
        e.preventDefault();
        this.lastElement?.focus();
      }
    } else {
      if (document.activeElement === this.lastElement) {
        e.preventDefault();
        this.firstElement?.focus();
      }
    }
  }
}

// ============================================================
// PERFORMANCE UTILITIES
// ============================================================

/**
 * Measure performance
 */
class PerformanceMonitor {
  constructor(label) {
    this.label = label;
    this.startTime = performance.now();
  }

  end() {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    console.log(`${this.label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  mark(name) {
    performance.mark(`${this.label}-${name}`);
  }

  measure(name) {
    performance.measure(
      `${this.label}-${name}`,
      `${this.label}-start`,
      `${this.label}-end`
    );
  }
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

// ============================================================
// DATA UTILITIES
// ============================================================

/**
 * Local storage wrapper with JSON support
 */
class StorageManager {
  constructor(prefix = 'team_') {
    this.prefix = prefix;
  }

  set(key, value, ttl = null) {
    const data = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(data));
  }

  get(key) {
    const item = localStorage.getItem(this.prefix + key);
    if (!item) return null;

    const data = JSON.parse(item);
    
    // Check if expired
    if (data.ttl && Date.now() - data.timestamp > data.ttl) {
      localStorage.removeItem(this.prefix + key);
      return null;
    }

    return data.value;
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }
}

// ============================================================
// URL UTILITIES
// ============================================================

/**
 * Parse URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params);
}

/**
 * Update URL without page reload
 */
function updateUrl(path, replaceHistory = false) {
  if (replaceHistory) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
}

/**
 * Generate slug from text
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Share URL to social media
 */
function shareToSocial(platform, url, text = '', options = {}) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
    email: `mailto:?subject=${encodedText}&body=${encodedUrl}`
  };

  const shareUrl = shareUrls[platform];
  if (shareUrl) {
    if (platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }
}

// ============================================================
// DOM UTILITIES
// ============================================================

/**
 * Safe DOM query with fallback
 */
function safeQuery(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (e) {
    console.error(`Invalid selector: ${selector}`);
    return null;
  }
}

/**
 * Delegate event handler
 */
function delegate(parent, selector, event, handler) {
  parent.addEventListener(event, (e) => {
    const delegateTarget = e.target.closest(selector);
    if (delegateTarget) {
      handler.call(delegateTarget, e);
    }
  });
}

/**
 * Remove element with fade out
 */
function fadeOut(element, duration = 300) {
  return new Promise(resolve => {
    element.style.transition = `opacity ${duration}ms ease-out`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.remove();
      resolve();
    }, duration);
  });
}

/**
 * Add element with fade in
 */
function fadeIn(element, duration = 300) {
  return new Promise(resolve => {
    element.style.opacity = '0';
    document.body.appendChild(element);
    requestAnimationFrame(() => {
      element.style.transition = `opacity ${duration}ms ease-in`;
      element.style.opacity = '1';
      setTimeout(resolve, duration);
    });
  });
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate email
 */
function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Validate phone number
 */
function isValidPhone(phone) {
  const pattern = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return pattern.test(phone);
}

/**
 * Validate URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================
// TEAM-SPECIFIC UTILITIES
// ============================================================

/**
 * Format team member card
 */
function formatTeamMemberCard(member) {
  return {
    id: member.id,
    name: member.name || 'Unknown',
    position: member.position || 'Team Member',
    photo: member.photo || '/images/placeholder.webp',
    shortDescription: member.shortDescription || '',
    rating: member.rating || 0,
    deals: member.deals || 0,
    specialization: member.specialization || [],
    isManager: member.isManager || false
  };
}

/**
 * Get team member initials
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

/**
 * Get team member avatar with fallback
 */
function getTeamMemberAvatar(member) {
  if (member.photo) {
    return member.photo;
  }

  // Generate placeholder with initials
  const initials = getInitials(member.name);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  const colorIndex = member.id.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return `data:image/svg+xml;charset=utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="${bgColor}" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="80" fill="white" font-family="Arial">${initials}</text></svg>`;
}

/**
 * Group team members by specialization
 */
function groupTeamBySpecialization(members) {
  const grouped = {};
  
  members.forEach(member => {
    (member.specialization || []).forEach(spec => {
      if (!grouped[spec]) {
        grouped[spec] = [];
      }
      grouped[spec].push(member);
    });
  });

  return grouped;
}

/**
 * Sort team members by metric
 */
function sortTeamMembers(members, sortBy = 'rating') {
  const sortMap = {
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    deals: (a, b) => (b.deals || 0) - (a.deals || 0),
    experience: (a, b) => {
      const parseYears = (exp) => {
        const match = exp.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return parseYears(b.experience) - parseYears(a.experience);
    },
    name: (a, b) => a.name.localeCompare(b.name)
  };

  return [...members].sort(sortMap[sortBy] || sortMap.rating);
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateImageSrcSet,
    getImageWithWebPFallback,
    preloadImages,
    debounce,
    throttle,
    requestNextFrame,
    prefersReducedMotion,
    announceToScreenReader,
    FocusTrap,
    PerformanceMonitor,
    isInViewport,
    StorageManager,
    getUrlParams,
    updateUrl,
    generateSlug,
    shareToSocial,
    safeQuery,
    delegate,
    fadeOut,
    fadeIn,
    isValidEmail,
    isValidPhone,
    isValidUrl,
    formatTeamMemberCard,
    getInitials,
    getTeamMemberAvatar,
    groupTeamBySpecialization,
    sortTeamMembers
  };
}
