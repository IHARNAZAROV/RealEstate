# Team Section - Implementation Guide

## Quick Start

### 1. Basic Setup

Add to your HTML:

```html
<!-- In <head> -->
<link rel="stylesheet" href="/css/team-section.css" data-versioned>

<!-- Main content area -->
<section class="team-section">
    <div class="team-section__container">
        <div class="team-section__header">
            <h2 class="team-section__subtitle">Наша команда</h2>
            <h2 class="team-section__title">Профессиональный коллектив</h2>
            <p class="team-section__description">Опытная команда специалистов готова помочь вам</p>
        </div>
        <div id="team-section"></div>
    </div>
</section>

<!-- Before </body> -->
<script src="/js/services/team-service.js" defer></script>
<script src="/js/team-slider.js" defer></script>
<script src="/js/team-renderer.js" defer></script>
<script src="/js/team-utils.js" defer></script>
<script defer>
    document.addEventListener('DOMContentLoaded', function() {
        const renderer = new TeamRenderer({
            sectionId: 'team-section',
            teamService: teamService
        });
        renderer.render().catch(err => console.error('Team render error:', err));
    });
</script>
```

## Usage Examples

### Example 1: Custom Initialization

```javascript
// Advanced setup with custom options
const renderer = new TeamRenderer({
  sectionId: 'team-section',
  teamService: teamService,
  lazyLoadImages: true,
  imageFallback: '/images/team-placeholder.webp',
  onSliderInit: (slider) => {
    console.log('Slider ready:', slider);
    
    // Custom slider configuration
    slider.autoplayInterval = 8000;  // 8 seconds
  }
});

// Render and handle errors
renderer.render()
  .then(() => console.log('Team section rendered'))
  .catch(err => console.error('Render failed:', err));
```

### Example 2: Load and Display Team Data

```javascript
async function displayTeamStats() {
  try {
    const members = await teamService.getAll();
    const manager = await teamService.getManager();
    
    console.log(`Total members: ${members.length}`);
    console.log(`Manager: ${manager.name}`);
    console.log(`Average rating: ${(members.reduce((sum, m) => sum + m.rating, 0) / members.length).toFixed(1)}`);
    console.log(`Total deals: ${members.reduce((sum, m) => sum + m.deals, 0)}`);
  } catch (err) {
    console.error('Failed to load team data:', err);
  }
}

displayTeamStats();
```

### Example 3: Search Team Members

```javascript
async function searchTeam(query) {
  try {
    const results = await teamService.search(query);
    
    results.forEach(member => {
      console.log(`Found: ${member.name} (${member.position})`);
    });
    
    return results;
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// Search for specialists
searchTeam('квартир');
```

### Example 4: Filter by Specialization

```javascript
async function getSpecialists(specialization) {
  try {
    const members = await teamService.getBySpecialization(specialization);
    
    console.log(`Specialists in "${specialization}":`);
    members.forEach(m => console.log(`- ${m.name}`));
    
    return members;
  } catch (err) {
    console.error('Filter failed:', err);
  }
}

getSpecialists('Коммерческая недвижимость');
```

### Example 5: Custom Team Section

```javascript
// Create custom team section with your own template
class CustomTeamSection {
  constructor() {
    this.teamService = teamService;
    this.container = document.getElementById('custom-team');
  }

  async render() {
    const members = await this.teamService.getAll();
    const manager = await this.teamService.getManager();
    
    let html = '<div class="custom-grid">';
    
    // Add manager
    if (manager) {
      html += this.createManagerCard(manager);
    }
    
    // Add other members
    members
      .filter(m => !m.isManager)
      .forEach(member => {
        html += this.createMemberCard(member);
      });
    
    html += '</div>';
    this.container.innerHTML = html;
  }

  createManagerCard(member) {
    return `
      <div class="manager-card">
        <img src="${member.photo}" alt="${member.name}">
        <h3>${member.name}</h3>
        <p>${member.position}</p>
      </div>
    `;
  }

  createMemberCard(member) {
    return `
      <div class="member-card">
        <img src="${member.photo}" alt="${member.name}">
        <h4>${member.name}</h4>
        <p>${member.position}</p>
      </div>
    `;
  }
}

const customSection = new CustomTeamSection();
customSection.render();
```

### Example 6: Programmatic Slider Control

```javascript
// Get slider reference and control it programmatically
let sliderInstance;

const renderer = new TeamRenderer({
  sectionId: 'team-section',
  teamService: teamService,
  onSliderInit: (slider) => {
    sliderInstance = slider;
    setupCustomControls();
  }
});

function setupCustomControls() {
  // Custom navigation
  document.getElementById('custom-prev-btn')?.addEventListener('click', () => {
    sliderInstance.prev();
  });

  document.getElementById('custom-next-btn')?.addEventListener('click', () => {
    sliderInstance.next();
  });

  // Jump to specific index
  document.getElementById('slider-jump')?.addEventListener('change', (e) => {
    sliderInstance.goToIndex(parseInt(e.target.value));
  });
}

renderer.render();
```

### Example 7: Team Analytics

```javascript
async function getTeamAnalytics() {
  const members = await teamService.getAll();
  
  const analytics = {
    totalMembers: members.length,
    averageRating: (members.reduce((sum, m) => sum + m.rating, 0) / members.length).toFixed(2),
    totalDeals: members.reduce((sum, m) => sum + m.deals, 0),
    topPerformer: members.reduce((top, m) => m.deals > top.deals ? m : top),
    highestRated: members.reduce((top, m) => m.rating > top.rating ? m : top),
    specializations: [...new Set(members.flatMap(m => m.specialization))],
    byExperience: sortTeamMembers(members, 'experience')
  };
  
  return analytics;
}

// Usage
getTeamAnalytics().then(stats => {
  console.table(stats);
});
```

### Example 8: Detail Page Navigation

```javascript
// Navigate to team member detail page
function viewTeamMember(slug) {
  window.location.href = `/team/${slug}`;
}

// Or with history API
function viewTeamMemberSPA(slug) {
  history.pushState({ member: slug }, '', `/team/${slug}`);
  // Trigger detail page rendering
  new TeamDetailPage().init();
}

// Example usage
viewTeamMember('olga-turko');
```

### Example 9: Team Filter Component

```javascript
class TeamFilter {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.teamService = teamService;
    this.init();
  }

  async init() {
    const members = await this.teamService.getAll();
    const specializations = [...new Set(members.flatMap(m => m.specialization))];
    
    this.render(specializations);
    this.attachListeners(members);
  }

  render(specializations) {
    this.container.innerHTML = `
      <div class="filter-controls">
        <label>Фильтр по специализации:</label>
        <select id="spec-filter">
          <option value="">Все специалисты</option>
          ${specializations.map(spec => `<option value="${spec}">${spec}</option>`).join('')}
        </select>
      </div>
      <div id="filtered-members"></div>
    `;
  }

  attachListeners(allMembers) {
    const select = this.container.querySelector('#spec-filter');
    select.addEventListener('change', async (e) => {
      const spec = e.target.value;
      let members = allMembers;
      
      if (spec) {
        members = await this.teamService.getBySpecialization(spec);
      }
      
      this.displayMembers(members);
    });
  }

  displayMembers(members) {
    const html = members
      .map(m => `<div class="member-item">${m.name} - ${m.position}</div>`)
      .join('');
    
    document.getElementById('filtered-members').innerHTML = html;
  }
}

// Initialize filter
const filter = new TeamFilter('team-filter-container');
```

### Example 10: Team Member Card Component

```javascript
class TeamMemberCard {
  constructor(member) {
    this.member = member;
  }

  render() {
    const { photo, name, position, shortDescription, rating, deals } = this.member;
    
    return `
      <div class="team-member-card">
        <div class="card-image">
          <img src="${photo}" alt="${name}">
        </div>
        <div class="card-content">
          <h3>${name}</h3>
          <p class="position">${position}</p>
          ${shortDescription ? `<p class="description">${shortDescription}</p>` : ''}
          
          <div class="stats">
            ${rating ? `<span class="rating">★ ${rating}</span>` : ''}
            ${deals ? `<span class="deals">${deals} сделок</span>` : ''}
          </div>
          
          <a href="/team/${this.member.slug}" class="btn">Подробнее</a>
        </div>
      </div>
    `;
  }
}

// Usage
const member = await teamService.getBySlug('olga-turko');
const card = new TeamMemberCard(member);
document.querySelector('#container').innerHTML = card.render();
```

## Performance Tips

### 1. Preload Images
```javascript
// Preload team member photos
const preloadTeamImages = async () => {
  const members = await teamService.getAll();
  preloadImages([
    members[0]?.photo,
    members[0]?.coverImage
  ].filter(Boolean));
};

preloadTeamImages();
```

### 2. Lazy Load List
```javascript
// Lazy load only visible members
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMemberData(entry.target.dataset.memberId);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('[data-member-id]').forEach(el => {
  observer.observe(el);
});
```

### 3. Cache Team Data
```javascript
const storage = new StorageManager('team_');

async function getCachedTeamData() {
  let data = storage.get('all-members');
  
  if (!data) {
    data = await teamService.getAll();
    storage.set('all-members', data, 3600000); // 1 hour TTL
  }
  
  return data;
}
```

## Accessibility Tips

### 1. Focus Management
```javascript
const focusTrap = new FocusTrap(document.querySelector('.team-modal'));
focusTrap.init();
```

### 2. Screen Reader Announcements
```javascript
function onTeamMemberChange(memberName) {
  announceToScreenReader(`Профиль ${memberName} загружен`);
}
```

### 3. Reduced Motion Support
```javascript
if (prefersReducedMotion()) {
  document.documentElement.style.setProperty('--team-transition', 'none');
}
```

## Troubleshooting

### Issue: Images not loading
```javascript
// Verify image paths
const members = await teamService.getAll();
members.forEach(m => {
  console.log(`${m.name}: ${m.photo}`);
});
```

### Issue: Slider not animating
```javascript
// Check CSS is loaded
const style = document.querySelector('link[href*="team-section.css"]');
console.log('CSS loaded:', !!style);
```

### Issue: Detail page not found
```javascript
// Check slug format
const slug = window.location.pathname.match(/\/team\/([^\/]+)/)?.[1];
console.log('Current slug:', slug);
```

## Best Practices

1. **Always handle errors**: Use try-catch in async functions
2. **Use semantic HTML**: Maintain accessibility
3. **Optimize images**: Use WebP with fallbacks
4. **Cache when possible**: Use StorageManager for repeated requests
5. **Debounce events**: Use debounce for resize/scroll
6. **Test on mobile**: Ensure touch gestures work
7. **Monitor performance**: Use PerformanceMonitor for tracking
8. **Keep data fresh**: Use appropriate cache TTLs

---

For more information, see [TEAM_SECTION_README.md](./TEAM_SECTION_README.md)
