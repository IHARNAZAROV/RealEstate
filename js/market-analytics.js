(function () {
  const CITY = "Лида";
  const ROOMS = [1, 2, 3, 4];
  const PERIOD_MONTHS = { 30: 1, 90: 3, 180: 6 };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "BYN",
      maximumFractionDigits: 0
    }).format(value || 0);

  const formatNumber = (value, digits = 0) =>
    new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value || 0);

  const avg = (list, getter) => {
    const values = list
      .map(getter)
      .map(Number)
      .filter((v) => Number.isFinite(v) && v > 0);
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  const setHidden = (selector, hidden) => {
    const el = document.querySelector(selector);
    if (el) el.hidden = Boolean(hidden);
  };

  const getPrice = (obj) => {
    if (typeof window.RealterPrice?.getLiveBynPriceSync === "function") {
      const live = window.RealterPrice.getLiveBynPriceSync(obj);
      if (Number.isFinite(live) && live > 0) return live;
    }
    return Number(obj?.priceBYN) || 0;
  };

  const avgSqm = (objects) => {
    const bySqm = objects
      .map((obj) => {
        const price = getPrice(obj);
        const area = Number(obj.areaTotal);
        if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) return null;
        return price / area;
      })
      .filter((v) => Number.isFinite(v) && v > 0);
    return bySqm.length ? bySqm.reduce((a, b) => a + b, 0) / bySqm.length : 0;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const buildMonthlyGroups = (objects) => {
    const map = new Map();
    objects.forEach((obj) => {
      const d = parseDate(obj.publishedAt);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(obj);
    });

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        key,
        label: new Date(`${key}-01`).toLocaleDateString("ru-RU", {
          month: "short",
          year: "numeric"
        }),
        value
      }));
  };

  const trendFromSeries = (values) => {
    if (values.length < 2) {
      return {
        text: "Недостаточно данных",
        details: "Добавьте больше объектов для сравнения динамики."
      };
    }

    const prev = values[values.length - 2];
    const curr = values[values.length - 1];
    const delta = prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    if (Math.abs(delta) < 0.5) {
      return {
        text: "→ Стабильно",
        details: "Изменения менее 0.5% к прошлому периоду."
      };
    }
    if (delta > 0) {
      return {
        text: `↗ Рост ${formatNumber(delta, 1)}%`,
        details: "Средняя стоимость квартир растёт."
      };
    }

    return {
      text: `↘ Снижение ${formatNumber(Math.abs(delta), 1)}%`,
      details: "Средняя стоимость квартир снижается."
    };
  };

  const roomPalette = {
    1: { border: "#0059ff", bg: "rgba(0, 89, 255, 0.15)" },
    2: { border: "#00a779", bg: "rgba(0, 167, 121, 0.15)" },
    3: { border: "#ff7a00", bg: "rgba(255, 122, 0, 0.15)" },
    4: { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" }
  };

  let chart;
  let roomSeries = [];

  const sliceByPeriod = (series, periodDays) => {
    const months = PERIOD_MONTHS[periodDays] || 3;
    return series.slice(-months);
  };

  const renderByPeriod = (periodDays) => {
    const scoped = sliceByPeriod(roomSeries, periodDays);
    const labels = scoped.map((m) => m.label);
    const datasets = [];
    const trendSamples = labels.map(() => []);

    ROOMS.forEach((room) => {
      const roomObjects = scoped.map((month, i) => {
        const values = month.value.filter((obj) => Number(obj.rooms) === room);
        const avgPrice = values.length ? avg(values, (obj) => getPrice(obj)) : null;
        if (Number.isFinite(avgPrice)) trendSamples[i].push(avgPrice);
        return avgPrice;
      });

      if (roomObjects.some((v) => Number.isFinite(v))) {
        const color = roomPalette[room];
        datasets.push({
          label: `${room}-комнатные`,
          data: roomObjects,
          borderColor: color.border,
          backgroundColor: color.bg,
          fill: false,
          spanGaps: true,
          tension: 0.35
        });
      }
    });

    const trend = trendFromSeries(
      trendSamples
        .map((row) => (row.length ? row.reduce((a, b) => a + b, 0) / row.length : null))
        .filter((v) => Number.isFinite(v))
    );

    setText("#market-trend", trend.text);
    setText("#market-trend-details", `${trend.details} Период: ${periodDays} дней.`);

    const showChart = datasets.length >= 2;
    setHidden(".market-analytics__chart-wrap", !showChart);
    if (!showChart) return;

    const canvas = document.getElementById("market-price-chart");
    if (!canvas || typeof window.Chart === "undefined") return;

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 1000, easing: "easeOutQuart" },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
            }
          },
          legend: { position: "bottom" }
        },
        scales: {
          y: { ticks: { callback: (v) => formatCurrency(v) } }
        }
      }
    });
  };

  const bindPeriodButtons = () => {
    const buttons = Array.from(document.querySelectorAll(".market-period-btn"));
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        renderByPeriod(Number(btn.dataset.period) || 90);
      });
    });
  };

  const init = async () => {
    try {
      const response = await fetch("/data/objects-list.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load objects");

      let objects = await response.json();
      if (typeof window.RealterPrice?.enrichObjectsWithLivePrices === "function") {
        objects = await window.RealterPrice.enrichObjectsWithLivePrices(objects);
      }

      const flats = objects.filter(
        (obj) =>
          obj &&
          obj.dealType === "Продажа" &&
          obj.type === "Квартира" &&
          obj.city &&
          obj.city.includes(CITY)
      );

      setText("#avg-apartment-price", formatCurrency(avg(flats, (obj) => getPrice(obj))));
      setText("#avg-apartment-sqm", `Средняя цена за м² (${CITY}): ${formatCurrency(avgSqm(flats))}`);

      ROOMS.forEach((room) => {
        const roomObjects = flats.filter((obj) => Number(obj.rooms) === room);
        const visible = roomObjects.length >= 3;
        setHidden(`[data-kind="room-${room}"]`, !visible);
        if (!visible) return;
        setText(`#avg-room-${room}-price`, formatCurrency(avg(roomObjects, (obj) => getPrice(obj))));
        setText(`#avg-room-${room}-sqm`, `Средняя цена за м²: ${formatCurrency(avgSqm(roomObjects))}`);
      });

      roomSeries = buildMonthlyGroups(flats);
      bindPeriodButtons();
      renderByPeriod(90);
    } catch (err) {
      setText("#market-trend", "Данные временно недоступны");
      setText("#market-trend-details", "Не удалось загрузить статистику квартир.");
      setHidden(".market-analytics__chart-wrap", true);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
