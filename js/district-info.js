(function () {
  'use strict';

  function getSlug() {
    var m = location.search.match(/[?&]slug=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    m = location.pathname.match(/\/objects?\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    return null;
  }

  function normalizeStreet(str) {
    return str
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9]/g, ' ')
      .trim();
  }

  function addressMatchesDistrict(address, streets) {
    var norm = normalizeStreet(address);
    for (var i = 0; i < streets.length; i++) {
      var s = normalizeStreet(streets[i]);
      if (norm.indexOf(s) !== -1) return true;
    }
    return false;
  }

  function russianPlural(number, forms) {
    var n = Math.abs(parseInt(number, 10));
    if (isNaN(n)) return forms[2];
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return forms[2];
    var mod10 = n % 10;
    if (mod10 === 1) return forms[0];
    if (mod10 >= 2 && mod10 <= 4) return forms[1];
    return forms[2];
  }

  function isWholeNumber(val) {
    return typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val.trim()));
  }

  /** Скрывать карточку показателя, если в данных явно указан числовой ноль. */
  function statValueIsZero(val) {
    if (val === undefined || val === null) return false;
    if (typeof val === 'number' && val === 0) return true;
    if (typeof val === 'string') {
      var t = val.trim();
      if (t === '0') return true;
      if (/^\d+$/.test(t) && parseInt(t, 10) === 0) return true;
    }
    return false;
  }

  function formatStat(key, stats) {
    switch (key) {
      case 'toCenter':
        return stats.toCenter != null && stats.toCenter !== ''
          ? { value: stats.toCenter, label: 'До центра' }
          : null;
      case 'schools':
        if (stats.schools === undefined || stats.schools === null || stats.schools === '') return null;
        if (isWholeNumber(stats.schools)) {
          var sn = parseInt(stats.schools, 10);
          return { value: stats.schools, label: russianPlural(sn, ['школа', 'школы', 'школ']) };
        }
        return { value: stats.schools, label: 'школ' };
      case 'kindergartens':
        if (stats.kindergartens === undefined || stats.kindergartens === null || stats.kindergartens === '') return null;
        if (isWholeNumber(stats.kindergartens)) {
          var kn = parseInt(stats.kindergartens, 10);
          return {
            value: stats.kindergartens,
            label: russianPlural(kn, ['детский сад', 'детских сада', 'детских садов'])
          };
        }
        return { value: stats.kindergartens, label: 'детских садов' };
      case 'clinics':
        if (stats.clinics === undefined || stats.clinics === null || stats.clinics === '') return null;
        if (isWholeNumber(stats.clinics)) {
          var cn = parseInt(stats.clinics, 10);
          return {
            value: stats.clinics,
            label: russianPlural(cn, ['поликлиника', 'поликлиники', 'поликлиник'])
          };
        }
        return { value: stats.clinics, label: 'поликлиник' };
      case 'shops':
        if (stats.shops === undefined || stats.shops === null || stats.shops === '') return null;
        if (isWholeNumber(stats.shops)) {
          var shn = parseInt(stats.shops, 10);
          return { value: stats.shops, label: russianPlural(shn, ['магазин', 'магазина', 'магазинов']) };
        }
        return { value: stats.shops, label: 'магазинов' };
      default:
        return null;
    }
  }

  function renderDistrictBlock(container, district) {
    var stats = district.stats;
    var statKeys = ['toCenter', 'schools', 'kindergartens', 'clinics', 'shops'];

    var statsHtml = statKeys.map(function (k) {
      if (statValueIsZero(stats[k])) return '';
      var s = formatStat(k, stats);
      if (!s) return '';
      return '<div class="district-stat">' +
        '<span class="district-stat__value">' + s.value + '</span>' +
        '<span class="district-stat__label">' + s.label + '</span>' +
        '</div>';
    }).join('');

    var paragraphs = (district.seoText || []).slice(0, 2).map(function (p) {
      return '<p>' + p + '</p>';
    }).join('');

    container.innerHTML =
      '<section class="district-info" aria-label="Информация о районе">' +
        '<div class="district-info__header">' +
          '<span class="district-info__label">Район</span>' +
          '<h2 class="district-info__title">' + district.nameFull + ', ' + district.city + '</h2>' +
        '</div>' +
        '<div class="district-info__stats">' + statsHtml + '</div>' +
        '<div class="district-info__text">' + paragraphs + '</div>' +
        '<a class="district-info__link" href="/raion/' + district.slug + '">' +
          'Все объекты в этом районе <i class="fa fa-arrow-right"></i>' +
        '</a>' +
      '</section>';
  }

  function init() {
    var slug = getSlug();
    if (!slug) return;

    var container = document.querySelector('[data-district-info]');
    if (!container) return;

    Promise.all([
      fetch('/data/objects/' + encodeURIComponent(slug) + '.json').then(function (r) { return r.ok ? r.json() : null; }),
      fetch('/data/districts.json').then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (results) {
      var obj = results[0];
      var districts = results[1];
      if (!obj || !obj.address || !Array.isArray(districts)) return;

      for (var i = 0; i < districts.length; i++) {
        var d = districts[i];
        if (addressMatchesDistrict(obj.address, d.streets || [])) {
          renderDistrictBlock(container, d);
          container.removeAttribute('hidden');
          return;
        }
      }
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
