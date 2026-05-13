# Team Section Documentation

Premium team section for real estate agency website. Modern, responsive, production-ready implementation with vanilla JavaScript.

## 📁 Project Structure

```
realter/
├── data/
│   └── team.json                 # Team members data
├── css/
│   └── team-section.css         # Team section styles
├── js/
│   ├── services/
│   │   └── team-service.js      # Data loading service
│   ├── team-slider.js           # Vertical carousel slider
│   ├── team-renderer.js         # Main component renderer
│   └── team-detail-page.js      # Detail page handler
├── index.html                    # Homepage (modified)
└── team-detail.html             # Detail page template
```

## 🚀 Features

### Main Team Section (Homepage)
- **Left Card**: Large manager profile card with overlay
- **Right Slider**: Vertical 2x2 carousel with smooth animations
- **Auto-play**: Configurable autoplay with pause on hover
- **Touch Support**: Swipe gestures for mobile (up/down)
- **Keyboard Nav**: Arrow keys support
- **Lazy Loading**: Image lazy loading with IntersectionObserver
- **Skeleton Loading**: Loading state placeholder
- **Responsive**: Fully adaptive from mobile to desktop

### Team Detail Page (/team/:slug)
- **Dynamic Content**: Loads member data from team.json
- **Rich Profile**: Photo, stats, specialization, contact info
- **SEO Ready**: Schema.org markup (Person, BreadcrumbList)
- **Social Links**: All social media integrated
- **Other Members**: Suggestions of other team members
- **CTA Section**: Call-to-action for contact

## 📋 Data Structure (team.json)

```json
{
  "id": "olga-turko",
  "slug": "olga-turko",
  "name": "Ольга Турко",
  "position": "Руководитель филиала",
  "city": "Лида",
  "phone": "+375 29 180-95-16",
  "email": "olgaturko1975@gmail.com",
  "photo": "images/team/olga-turko.webp",
  "coverImage": "images/team/olga-turko-cover.webp",
  "shortDescription": "Brief description",
  "fullDescription": "Full detailed description",
  "experience": "12 лет",
  "specialization": ["Продажа квартир", "Покупка жилья"],
  "socials": {
    "instagram": "https://...",
    "telegram": "https://...",
    "viber": "viber://chat?number=%2B..."
  },
  "isManager": true,
  "rating": 4.9,
  "deals": 248
}
```

## 🔧 Installation & Setup

### 1. Include CSS in `<head>`
```html
<link rel="stylesheet" href="/css/team-section.css" data-versioned>
```

### 2. Include Scripts before `</body>`
```html
<!-- Team Section Scripts -->
<script src="/js/services/team-service.js" defer></script>
<script src="/js/team-slider.js" defer></script>
<script src="/js/team-renderer.js" defer></script>
<script defer>
    document.addEventListener('DOMContentLoaded', function() {
        const sectionElement = document.getElementById('team-section');
        if (sectionElement) {
            const renderer = new TeamRenderer({
                sectionId: 'team-section',
                teamService: teamService,
                lazyLoadImages: true
            });
            renderer.render().catch(err => {
                console.error('Failed to render team section:', err);
            });
        }
    });
</script>
```

### 3. Add HTML Container
```html
<section class="team-section">
    <div class="team-section__container">
        <div class="team-section__header">
            <h2 class="team-section__subtitle">Наша команда</h2>
            <h2 class="team-section__title">Профессиональный коллектив</h2>
            <p class="team-section__description">Team description</p>
        </div>
        <div id="team-section"></div>
    </div>
</section>
```

## 📱 Responsive Breakpoints

- **Desktop (1024px+)**: 2-column grid, full features
- **Tablet (768px-1023px)**: 1-column grid, optimized layout
- **Mobile (< 768px)**: Single column, touch-friendly, full height controls

## 🎨 CSS Variables

```css
:root {
  --team-card-bg: var(--color-white);
  --team-card-shadow: 0 4px 24px rgba(21, 89, 69, 0.08);
  --team-card-shadow-hover: 0 12px 48px rgba(21, 89, 69, 0.15);
  --team-overlay-bg: rgba(21, 89, 69, 0.85);
  --team-transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  --team-transition-slow: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 🛠️ API Reference

### TeamService

```javascript
// Load all members
const members = await teamService.getAll();

// Get manager
const manager = await teamService.getManager();

// Get non-manager members
const sliderMembers = await teamService.getSliderMembers();

// Get by slug
const member = await teamService.getBySlug('olga-turko');

// Get by ID
const member = await teamService.getId('olga-turko');

// Search
const results = await teamService.search('квартир');

// Get by specialization
const members = await teamService.getBySpecialization('Продажа квартир');

// Sort by rating
const members = await teamService.getByRating();

// Sort by deals
const members = await teamService.getByDeals();

// Sort by experience
const members = await teamService.getByExperience();
```

### TeamSlider

```javascript
const slider = new TeamSlider({
  container: document.querySelector('[data-slider-container]'),
  itemsPerView: 4,           // Items per view
  autoplayInterval: 6000,    // Autoplay delay
  animationDuration: 600     // Animation duration
});

// Methods
slider.next();
slider.prev();
slider.goToIndex(2);
slider.startAutoplay();
slider.stopAutoplay();
slider.destroy();
```

### TeamRenderer

```javascript
const renderer = new TeamRenderer({
  sectionId: 'team-section',
  teamService: teamService,
  lazyLoadImages: true,
  imageFallback: '/images/placeholder.webp'
});

// Methods
await renderer.render();
```

## ⌨️ Keyboard Shortcuts

- **Arrow Up**: Previous group
- **Arrow Down**: Next group
- **Tab**: Focus navigation

## 🖱️ Touch Gestures

- **Swipe Up**: Next group
- **Swipe Down**: Previous group

## 📊 Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest (iOS 12+)
- Mobile browsers: Latest

## ⚡ Performance Optimizations

1. **Lazy Loading**: Images load on-demand with IntersectionObserver
2. **GPU Acceleration**: transform3d for animations
3. **Debounced Resize**: Window resize handled efficiently
4. **CSS Containment**: Performance optimization for animations
5. **Skeleton Loading**: Shows placeholder while loading
6. **Preload Hero Image**: Uses fetchpriority attribute

## 🎯 SEO Features

### Homepage
- Semantic HTML structure
- ARIA labels and roles
- Meta descriptions
- Open Graph markup
- Twitter Cards

### Detail Page
- Dynamic title and meta
- Person schema.org
- BreadcrumbList schema
- Canonical URL
- OpenGraph tags

## ♿ Accessibility

- ✅ WCAG 2.1 Level AA compliant
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ ARIA labels and descriptions
- ✅ Color contrast (4.5:1+)
- ✅ Reduced motion support

## 🔒 Security

- ✅ XSS prevention with HTML escaping
- ✅ HTTPS ready
- ✅ CORS support
- ✅ No external dependencies (vanilla JS)

## 🐛 Debugging

Enable console logging:
```javascript
const renderer = new TeamRenderer({
  sectionId: 'team-section',
  teamService: teamService,
  onSliderInit: (slider) => {
    console.log('Slider initialized:', slider);
  }
});
```

## 🚨 Common Issues

### Images not loading
- Check image paths in team.json
- Verify image files exist
- Check browser console for errors

### Slider not animating
- Verify CSS is loaded
- Check JavaScript console for errors
- Ensure images are loaded

### Detail page showing 404
- Check URL format: /team/:slug
- Verify slug matches team.json
- Clear browser cache

## 📝 Customization

### Change slider speed
```javascript
new TeamSlider({
  autoplayInterval: 8000,      // 8 seconds
  animationDuration: 800       // 800ms animation
});
```

### Change number of items per row
```javascript
new TeamSlider({
  itemsPerView: 6  // 3x2 grid instead of 2x2
});
```

### Custom styling
Override CSS variables in your stylesheet:
```css
:root {
  --team-card-bg: #f5f5f5;
  --team-card-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 📄 License

Copyright © 2026 Ольга Турко. All rights reserved.

## 👥 Support

For questions or issues, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-13  
**Status**: Production Ready
