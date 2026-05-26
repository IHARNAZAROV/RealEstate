/* =====================================================
   HOUSING AFFORDABILITY INDEX
   ===================================================== */
(function () {
  'use strict';

  let data = [];
  let chart = null;
  let inflationMode = false;

  /* ---- Utility ---- */
  function fmt(n, decimals) {
    return Number(n).toLocaleString('ru-RU', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  }

  function fmtBYN(n) {
    return fmt(Math.round(n)) + '\u00a0BYN';
  }

  /* ---- Count-up animation ---- */
  function countUp(el, target, duration, decimals, suffix) {
    if (!el) return;
    const start = performance.now();
    const from = parseFloat(el.dataset.from || 0);
    el.dataset.from = target;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = from + (target - from) * ease;
      el.textContent = fmt(value, decimals) + (suffix || '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- Affordability helpers ---- */
  function getStatusLabel(status) {
    const map = {
      improving: 'Доступность растёт',
      stable:    'Стабильный рынок',
      declining: 'Снижение доступности'
    };
    return map[status] || status;
  }

  function getStatusIcon(status) {
    const map = { improving: '↑', stable: '→', declining: '↓' };
    return map[status] || '—';
  }

  /* ---- Apply inflation adjustment ---- */
  function getDisplayData() {
    if (!inflationMode) return data;
    return data.map(d => ({
      ...d,
      averageSalary: Math.round(d.averageSalary / d.cumulativeInflation),
      averageApartmentPrice: Math.round(d.averageApartmentPrice / d.cumulativeInflation),
      pricePerSqm: Math.round(d.pricePerSqm / d.cumulativeInflation)
    }));
  }

  /* ---- Build insight text dynamically ---- */
  function buildInsight(d) {
    const latest = d[d.length - 1];
    const prev = d[d.length - 3];
    const priceDelta = ((latest.averageApartmentPrice - prev.averageApartmentPrice) / prev.averageApartmentPrice * 100).toFixed(0);
    const salaryDelta = ((latest.averageSalary - prev.averageSalary) / prev.averageSalary * 100).toFixed(0);
    const yrs = latest.yearsToSaveRealistic.toFixed(1);
    const priceGrowsFaster = priceDelta > salaryDelta;

    if (priceGrowsFaster) {
      return `Несмотря на рост зарплат в Беларуси (<strong>+${salaryDelta}% за 2 года</strong>), стоимость жилья растёт быстрее доходов населения (<strong>+${priceDelta}% за 2 года</strong>). В 2026 году среднестатистическому жителю Беларуси требуется откладывать 35% дохода на протяжении <strong>${yrs} лет</strong>, чтобы накопить на квартиру. Это один из ключевых индикаторов состояния рынка недвижимости.`;
    } else {
      return `Рост зарплат в Беларуси (<strong>+${salaryDelta}% за 2 года</strong>) в последние годы опережает рост стоимости жилья (<strong>+${priceDelta}% за 2 года</strong>), что постепенно повышает доступность недвижимости. Тем не менее, в 2026 году для накопления на квартиру при откладывании 35% дохода потребуется <strong>${yrs} лет</strong>.`;
    }
  }

  /* ---- Render chart ---- */
  function renderChart() {
    const ctx = document.getElementById('haiChart');
    if (!ctx) return;

    const d = getDisplayData();
    const years = d.map(r => r.year.toString());
    const salaries = d.map(r => r.averageSalary);
    const prices = d.map(r => r.averageApartmentPrice / 1000);
    const index = d.map(r => r.yearsToSaveRealistic);

    const cfg = {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Средняя зарплата (BYN)',
            data: salaries,
            yAxisID: 'ySalary',
            borderColor: '#3dd6b0',
            backgroundColor: 'rgba(61,214,176,0.08)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#3dd6b0',
            pointBorderColor: '#0a1628',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Стоимость квартиры (тыс. BYN)',
            data: prices,
            yAxisID: 'yPrice',
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255,107,107,0.06)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ff6b6b',
            pointBorderColor: '#0a1628',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Лет накоплений (35% дохода)',
            data: index,
            yAxisID: 'yIndex',
            borderColor: '#5b9ef7',
            backgroundColor: 'rgba(91,158,247,0.06)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#5b9ef7',
            pointBorderColor: '#0a1628',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: false,
            borderDash: [6, 3],
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeInOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(35,37,45,0.94)',
            borderColor: 'rgba(21,89,69,0.3)',
            borderWidth: 1,
            padding: 16,
            titleColor: '#ffffff',
            titleFont: { size: 14, weight: '700' },
            bodyColor: 'rgba(255,255,255,0.75)',
            bodyFont: { size: 13 },
            bodySpacing: 6,
            callbacks: {
              title: (items) => items[0].label + ' год',
              label: (item) => {
                const raw = data[item.dataIndex];
                if (item.datasetIndex === 0) return ' Средняя зарплата: ' + fmt(raw.averageSalary) + ' BYN';
                if (item.datasetIndex === 1) return ' Стоимость квартиры: ' + fmt(raw.averageApartmentPrice) + ' BYN';
                if (item.datasetIndex === 2) return ' Нужно копить: ' + raw.yearsToSaveRealistic.toFixed(1) + ' лет';
                return '';
              },
              afterBody: (items) => {
                const raw = data[items[0].dataIndex];
                const statusLabel = getStatusLabel(raw.affordabilityStatus);
                return ['', ' ' + getStatusIcon(raw.affordabilityStatus) + ' ' + statusLabel];
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(21,89,69,0.07)',
              drawBorder: false
            },
            ticks: {
              color: '#787878',
              font: { size: 12, weight: '500' }
            }
          },
          ySalary: {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(21,89,69,0.07)',
              drawBorder: false
            },
            ticks: {
              color: '#155945',
              font: { size: 11 },
              callback: (v) => fmt(v) + ' BYN'
            }
          },
          yPrice: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            ticks: {
              color: '#c0392b',
              font: { size: 11 },
              callback: (v) => v + 'k BYN'
            }
          },
          yIndex: {
            type: 'linear',
            position: 'right',
            display: false,
            grid: { display: false }
          }
        }
      }
    };

    if (chart) {
      chart.data.datasets[0].data = salaries;
      chart.data.datasets[1].data = prices;
      chart.data.datasets[2].data = index;
      chart.update('active');
    } else {
      chart = new Chart(ctx, cfg);
    }
  }

  /* ---- Render stats row ---- */
  function renderStats() {
    const latest = data[data.length - 1];
    const prev = data[data.length - 2];

    const salaryEl  = document.getElementById('haiStatSalary');
    const priceEl   = document.getElementById('haiStatPrice');
    const indexEl   = document.getElementById('haiStatIndex');

    if (salaryEl) countUp(salaryEl, latest.averageSalary, 1200, 0);
    if (priceEl)  countUp(priceEl, latest.averageApartmentPrice, 1200, 0);
    if (indexEl)  countUp(indexEl, latest.yearsToSaveRealistic, 1200, 1);

    const salaryDelta = ((latest.averageSalary - prev.averageSalary) / prev.averageSalary * 100).toFixed(1);
    const priceDelta  = ((latest.averageApartmentPrice - prev.averageApartmentPrice) / prev.averageApartmentPrice * 100).toFixed(1);
    const indexDelta  = (latest.yearsToSaveRealistic - prev.yearsToSaveRealistic).toFixed(2);

    const sd = document.getElementById('haiDeltaSalary');
    const pd = document.getElementById('haiDeltaPrice');
    const id = document.getElementById('haiDeltaIndex');

    if (sd) {
      sd.textContent = '+' + salaryDelta + '% к 2025';
      sd.className = 'hai-stat-card__delta hai-stat-card__delta--up';
    }
    if (pd) {
      pd.textContent = '+' + priceDelta + '% к 2025';
      pd.className = 'hai-stat-card__delta hai-stat-card__delta--down';
    }
    if (id) {
      const sign = indexDelta >= 0 ? '+' : '';
      id.textContent = sign + indexDelta + ' лет к 2025';
      id.className = 'hai-stat-card__delta ' + (indexDelta > 0.05 ? 'hai-stat-card__delta--down' : indexDelta < -0.05 ? 'hai-stat-card__delta--up' : 'hai-stat-card__delta--flat');
    }

    const highlightYrs = document.getElementById('haiHighlightYrs');
    if (highlightYrs) countUp(highlightYrs, latest.yearsToSaveRealistic, 1400, 1);
  }

  /* ---- Render timeline cards ---- */
  const TIMELINE_YEARS = [2020, 2022, 2024, 2026];

  function renderTimeline() {
    const container = document.getElementById('haiTimeline');
    if (!container) return;

    const cards = TIMELINE_YEARS.map(yr => {
      const row = data.find(d => d.year === yr);
      if (!row) return '';
      const prevRow = data.find(d => d.year === yr - 2) || row;
      const indexChange = (row.yearsToSaveRealistic - prevRow.yearsToSaveRealistic).toFixed(1);
      const sign = indexChange > 0 ? '+' : '';
      const isLatest = yr === 2026;
      const badgeClass = row.affordabilityStatus === 'improving' ? 'green' : row.affordabilityStatus === 'declining' ? 'red' : 'yellow';

      return `
        <div class="hai-tcard ${isLatest ? 'hai-tcard--active' : ''}" role="article">
          <div class="hai-tcard__year">${row.year}</div>
          <div class="hai-tcard__row">
            <span class="hai-tcard__key">Зарплата</span>
            <span class="hai-tcard__val">${fmt(row.averageSalary)}\u00a0BYN</span>
          </div>
          <div class="hai-tcard__row">
            <span class="hai-tcard__key">Квартира</span>
            <span class="hai-tcard__val">${fmt(row.averageApartmentPrice)}\u00a0BYN</span>
          </div>
          <div class="hai-tcard__row">
            <span class="hai-tcard__key">Индекс</span>
            <span class="hai-tcard__val">${row.yearsToSaveRealistic.toFixed(1)} лет</span>
          </div>
          <div class="hai-tcard__row">
            <span class="hai-tcard__key">Изм. за 2 года</span>
            <span class="hai-tcard__val">${sign}${indexChange} лет</span>
          </div>
          <span class="hai-tcard__badge hai-tcard__badge--${badgeClass}">
            ${getStatusIcon(row.affordabilityStatus)} ${getStatusLabel(row.affordabilityStatus)}
          </span>
        </div>`;
    });

    container.innerHTML = cards.join('');
  }

  /* ---- Render insight ---- */
  function renderInsight() {
    const el = document.getElementById('haiInsightText');
    if (el) el.innerHTML = buildInsight(data);
  }

  /* ---- Toggle handler ---- */
  function initToggle() {
    const btns = document.querySelectorAll('.hai-toggle__btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        inflationMode = btn.dataset.mode === 'real';
        renderChart();
      });
    });
  }

  /* ---- Intersection Observer for reveal + trigger ---- */
  function initReveal() {
    const elements = document.querySelectorAll('.hai-reveal');
    if (!elements.length) return;

    let statsTriggered = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hai-visible');
          if (!statsTriggered && entry.target.closest('.hai-section')) {
            statsTriggered = true;
            renderStats();
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  /* ---- Init ---- */
  function init() {
    const section = document.querySelector('.hai-section');
    if (!section) return;

    fetch('/data/housing-affordability.json')
      .then(r => r.json())
      .then(json => {
        data = json;
        renderChart();
        renderTimeline();
        renderInsight();
        initToggle();
        initReveal();
      })
      .catch(() => {
        console.warn('[HAI] Failed to load housing-affordability.json');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
