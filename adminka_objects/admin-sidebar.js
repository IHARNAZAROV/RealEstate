(function () {
  'use strict';

  var ITEMS = [
    {
      href: '/adminka_objects/index.html',
      title: 'Объекты',
      sub: 'Недвижимость',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
    },
    {
      href: '/adminka_objects/tasks.html',
      title: 'Задачи',
      sub: 'To-do и доски',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    },
    {
      href: '/adminka_objects/direct.html',
      title: 'Яндекс Директ',
      sub: 'Реклама и аналитика',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
    },
    {
      href: '/adminka_objects/blog-stats.html',
      title: 'Статистика блога',
      sub: 'Просмотры статей',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
    },
    {
      href: '/adminka_objects/json-generator.html',
      title: 'Генератор JSON',
      sub: 'Объект из текста',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    }
  ];

  var ARROW_SVG = '<svg class="pa-tab__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  function getCurrentPath() {
    var p = (window.location.pathname || '').toLowerCase();
    if (p === '/adminka_objects/' || p === '/adminka_objects') {
      p = '/adminka_objects/index.html';
    }
    return p;
  }

  function renderItem(item, currentPath) {
    var isActive = item.href.toLowerCase() === currentPath;
    return ''
      + '<a href="' + item.href + '"' + (isActive ? ' class="active"' : '') + '>'
      +   '<span class="pa-tab__icon">' + item.icon + '</span>'
      +   '<span class="pa-tab__text">'
      +     '<span class="pa-tab__title">' + item.title + '</span>'
      +     '<span class="pa-tab__sub">' + item.sub + '</span>'
      +   '</span>'
      +   ARROW_SVG
      + '</a>';
  }

  function render(host) {
    var currentPath = getCurrentPath();
    var nav = ITEMS.map(function (it) { return renderItem(it, currentPath); }).join('');
    host.innerHTML = ''
      + '<div class="admin-sidebar__header">'
      +   '<h2>Control Center</h2>'
      +   '<p>Premium Admin</p>'
      + '</div>'
      + '<nav class="admin-nav">' + nav + '</nav>';
  }

  function init() {
    var hosts = document.querySelectorAll('[data-admin-sidebar]');
    for (var i = 0; i < hosts.length; i++) render(hosts[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
