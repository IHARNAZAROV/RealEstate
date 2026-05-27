/* Защита от повторной инициализации для предотвращения утечек памяти */
if (window.__optimizeInit) {
  console.warn("optimize.js already initialized, skipping...");
} else {
  window.__optimizeInit = true;
  window.__optimizeListeners = [];
}
"use strict";
function initMenuActiveAndUnderline() {
  const e = document.querySelectorAll(".header-nav .navbar-nav li a");
  if (!e.length) return;
  const t = window.location.pathname.replace(/\/$/, "") || "/";
  let n = null;
  function o(e, t, n) {
    e && (e.style.setProperty("--scale", t), e.style.setProperty("--x", n));
  }
  (e.forEach((e) => {
    const o = e.closest("li");
    if (!o) return;
    o.classList.remove("active");
    let s = e.getAttribute("href");
    s &&
      ((s = s.replace(/\/$/, "") || "/"),
      (s === t || ("/" !== s && t.startsWith(s))) &&
        (o.classList.add("active"), (n = e)));
  }),
    n && o(n, 1, "50%"),
    e.forEach((e) => {
      (e.addEventListener("mouseenter", (t) => {
        const s = e.getBoundingClientRect();
        (o(e, 1, t.clientX - s.left + "px"), n && n !== e && o(n, 0, "50%"));
      }),
        e.addEventListener("mouseleave", () => {
          (o(e, 0, "50%"), n && o(n, 1, "50%"));
        }));
    }));
}
function initContactSlide() {
  const e = document.querySelector(".contact-slide-hide"),
    t = e?.querySelector(".contact-slide-content"),
    n = e?.querySelector(".contact-slide-overlay"),
    o = document.querySelector(".contact-slide-show"),
    s = e?.querySelector(".contact_close");
  if (!(e && t && n && o && s)) return;
  let i = 0;
  const r = () => {
    (e.classList.remove("is-open"),
      e.setAttribute("aria-hidden", "true"),
      document.body.classList.remove("is-locked"),
      (document.body.style.top = ""),
      window.scrollTo(0, i),
      u(),
      y());
  };
  (o.addEventListener("click", () => {
    (e.classList.add("is-open"),
      e.setAttribute("aria-hidden", "false"),
      (i = window.scrollY),
      document.body.classList.add("is-locked"),
      (document.body.style.top = `-${i}px`),
      l());
  }),
    s.addEventListener("click", r),
    n.addEventListener("click", r),
    document.addEventListener("keydown", (t) => {
      "Escape" === t.key && e.classList.contains("is-open") && r();
    }));
  let c = [],
    a = null,
    d = null;
  const l = () => {
      ((c = t.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
      )),
        c.length &&
          ((a = c[0]),
          (d = c[c.length - 1]),
          a.focus(),
          document.addEventListener("keydown", m)));
    },
    u = () => {
      (document.removeEventListener("keydown", m), o.focus());
    },
    m = (e) => {
      "Tab" === e.key &&
        (e.shiftKey && document.activeElement === a
          ? (e.preventDefault(), d.focus())
          : e.shiftKey ||
            document.activeElement !== d ||
            (e.preventDefault(), a.focus()));
    };
  let v = 0,
    f = 0,
    h = 0,
    p = !1;
  const y = () => {
    ((t.style.transform = ""), (p = !1));
  };
  (t.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      ((v = t.clientX), (f = t.clientY), (p = !0));
    },
    { passive: !0 },
  ),
    t.addEventListener(
      "touchmove",
      (e) => {
        if (!p) return;
        const n = e.touches[0];
        if (((h = n.clientX), Math.abs(n.clientY - f) > 30)) return y();
        const o = h - v;
        o > 0 && (t.style.transform = `translateX(${o}px)`);
      },
      { passive: !0 },
    ),
    t.addEventListener("touchend", () => {
      (h - v > 80 ? r() : (t.style.transform = ""), y());
    }));
}
function initCounterUp() {
  const e = document.querySelectorAll(".counter");
  if (!e.length) return;
  const t = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    n = new IntersectionObserver(
      (e) => {
        e.forEach((e) => {
          if (!e.isIntersecting) return;
          const o = e.target,
            s = parseInt(o.innerText.replace(/\D/g, ""), 10);
          if (t) return ((o.innerText = s), n.unobserve(o));
          const i = performance.now();
          (requestAnimationFrame(function e(t) {
            const n = Math.min((t - i) / 2e3, 1);
            ((o.innerText = Math.floor(n * s)),
              n < 1 && requestAnimationFrame(e));
          }),
            n.unobserve(o));
        });
      },
      { threshold: 0.5 },
    );
  e.forEach((e) => n.observe(e));
}
function wrapResponsiveIframes() {
  document
    .querySelectorAll('iframe[src*="youtube.com"], iframe[src*="vimeo.com"]')
    .forEach((e) => {
      if (e.parentElement.classList.contains("ratio")) return;
      const t = document.createElement("div");
      ((t.className = "ratio ratio-16x9"),
        e.parentNode.insertBefore(t, e),
        t.appendChild(e));
    });
}
function initScopedClickDelegation() {
  const e = document.querySelector(".faq-1");
  e && e.addEventListener("click", handleAccordion);
  const t = document.querySelector(".header-nav");
  t && t.addEventListener("click", handleSubmenu);
  const n = document.querySelector("#mobile-side-drawer");
  n && n.addEventListener("click", handleMobileDrawer);
}
function handleAccordion(e) {
  const t = e.target.closest(".acod-head");
  if (!t) return;
  const n = t.closest(".faq-1");
  if (!n) return;
  (n.querySelectorAll(".acod-head").forEach((e) => {
    e.classList.remove("acc-actives");
    const t = e.querySelector(".indicator i");
    t && (t.className = "fa fa-plus");
  }),
    t.classList.add("acc-actives"));
  const o = t.querySelector(".indicator i");
  o && (o.className = "fa fa-minus");
}
function initStickyHeader() {
  const e = document.querySelector(".sticky-header");
  if (!e) return;
  const t = document.querySelectorAll(".is-fixed"),
    n = document.createElement("div");
  ((n.style.height = "1px"),
    e.before(n),
    new IntersectionObserver(([n]) => {
      const o = !n.isIntersecting;
      (e.classList.toggle("is-stuck", o),
        t.forEach((e) => e.classList.toggle("color-fill", o)));
    }).observe(n));
}
function handleSubmenu(e) {
  const t = e.target.closest(".submenu-toogle");
  if (!t) return;
  const n = t.parentElement,
    o = n.querySelector(":scope > .sub-menu, :scope > .mega-menu");
  if (!o) return;
  const s = n.classList.toggle("nav-active");
  ((o.style.display = s ? "block" : "none"),
    t.setAttribute("aria-expanded", String(s)),
    e.preventDefault());
}

function handleMobileDrawer(e) {
  if (
    document.getElementById("mnav") &&
    document.getElementById("mnavOverlay")
  )
    return;
  const t = e.target.closest("#mobile-side-drawer");
  if (!t) return;
  const n = t.getAttribute("data-target");
  if (!n) return;
  const o = document.querySelector(n);
  o &&
    (o.classList.toggle("is-open"), t.classList.toggle("is-active"), e.preventDefault());
}
function initServiceCardsAnimation() {
  const e = document.querySelectorAll(".number-block-three");
  if (!e.length) return;
  const t = new IntersectionObserver(
    (e) => {
      e.forEach((e) => {
        e.isIntersecting &&
          (e.target.classList.add("is-visible"), t.unobserve(e.target));
      });
    },
    { threshold: 0.15 },
  );
  e.forEach((e) => t.observe(e));
}
(document.addEventListener("DOMContentLoaded", function () {
  (document.body.classList.add("loaded"),
    initMenuActiveAndUnderline(),
    initContactSlide(),
    initCounterUp(),
    wrapResponsiveIframes(),
    initScopedClickDelegation(),
    initStickyHeader(),
    initServiceCardsAnimation());
  
  const aboutHome3 = document.querySelector(".about-home-3");
  if (aboutHome3) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        entry.isIntersecting && (aboutHome3.classList.add("is-visible"), observer.disconnect());
      },
      { threshold: 0.3 },
    );
    observer.observe(aboutHome3);
  }
}),
  window.SITE_VERSION &&
    (function () {
      const e = (e, t) => {
        const n = e.getAttribute(t);
        if (!n) return;
        try {
          const o = new URL(n, window.location.origin);
          if (o.searchParams.has("v")) return;
          o.searchParams.set("v", window.SITE_VERSION);
          const r = o.origin === window.location.origin ? `${o.pathname}${o.search}${o.hash}` : o.toString();
          e.setAttribute(t, r);
        } catch {
          n.includes("?v=") || e.setAttribute(t, `${n}${n.includes("?") ? "&" : "?"}v=${window.SITE_VERSION}`);
        }
      };
      document.querySelectorAll("link[data-versioned]").forEach((t) => e(t, "href"));
      document.querySelectorAll("script[data-versioned]").forEach((t) => e(t, "src"));
    })(),
  (function () {
    function e(e) {
      const t = e.querySelector(".modal-dialog");
      if (!t) return;
      e.style.display = "block";
      const n = t.getBoundingClientRect().height,
        o = window.innerHeight;
      t.style.marginTop = Math.max(0, (o - n) / 2) + "px";
    }
    (document.addEventListener("shown.bs.modal", (t) => {
      t.target.classList.contains("modal") && e(t.target);
    }),
      /* Предотвращение утечек памяти: сохраняем обработчик */
      (window.__optimizeListeners = window.__optimizeListeners || {}),
      window.__optimizeListeners.modalResize && window.removeEventListener("resize", window.__optimizeListeners.modalResize),
      (window.__optimizeListeners.modalResize = () => {
        const t = document.querySelector(".modal.show");
        t && e(t);
      }),
      window.addEventListener("resize", window.__optimizeListeners.modalResize));
  })(),
  document.querySelectorAll(".service-hover-card").forEach((e) => {
    const t = e.querySelector(".service-bg img");
    let n = null,
      o = !1;
    (e.addEventListener("mouseenter", () => {
      ((n = e.getBoundingClientRect()), setTimeout(() => (o = !0), 300));
    }),
      e.addEventListener("mousemove", (e) => {
        if (!o || !n) return;
        const s = 10 * ((e.clientX - n.left) / n.width - 0.5),
          i = 10 * ((e.clientY - n.top) / n.height - 0.5);
        t.style.transform = `translate(${s}px, ${i}px)`;
      }),
      e.addEventListener("mouseleave", () => {
        ((o = !1), (t.style.transform = "translate(0,0)"));
      }));
  }),
  (function () {
    const e = document.getElementById("mobile-side-drawer"),
      t = document.getElementById("mnav"),
      n = document.getElementById("mnavOverlay"),
      o = t ? t.querySelectorAll("a[data-path]") : [];
    if (!e || !t || !n) return;
    const s = () => {
      (t.classList.remove("is-open"),
        n.classList.remove("is-open"),
        e.classList.remove("is-active"),
        (document.body.style.overflow = ""));
    };
    (e.addEventListener("click", (o) => {
      (o.preventDefault(),
        t.classList.contains("is-open")
          ? s()
          : (t.classList.add("is-open"),
            n.classList.add("is-open"),
            e.classList.add("is-active"),
            (document.body.style.overflow = "hidden")));
    }),
      n.addEventListener("click", s),
      document.addEventListener("keydown", (e) => {
        "Escape" === e.key && t.classList.contains("is-open") && s();
      }));
    ((() => {
      const e = location.pathname.replace(/\/$/, "") || "/";
      o.forEach((t) => {
        const n = t.dataset.path;
        t.classList.toggle("is-active", n === e);
      });
    })(),
      o.forEach((e) => {
        e.addEventListener("click", s);
      }));
    let i = 0,
      r = 0,
      c = !1;
    (t.addEventListener(
      "touchstart",
      (e) => {
        ((i = e.touches[0].clientX), (c = !0));
      },
      { passive: !0 },
    ),
      t.addEventListener(
        "touchmove",
        (e) => {
          if (!c) return;
          r = e.touches[0].clientX;
          const n = r - i;
          n < 0 || (t.style.transform = `translateX(${n}px)`);
        },
        { passive: !0 },
      ),
      t.addEventListener("touchend", () => {
        if (!c) return;
        c = !1;
        const e = r - i;
        ((t.style.transform = ""), e > 80 && s());
      }),
      (window.__optimizeListeners = window.__optimizeListeners || {}),
      window.__optimizeListeners.mobileResize && window.removeEventListener("resize", window.__optimizeListeners.mobileResize),
      (window.__optimizeListeners.mobileResize = () => {
        window.innerWidth > 991 && s();
      }),
      window.addEventListener("resize", window.__optimizeListeners.mobileResize));
  })(),
  (function () {
    const steps = document.querySelectorAll(".turko-step"),
      stepLines = document.querySelectorAll(".turko-step-line"),
      titleEl = document.getElementById("turkoStepTitle"),
      textEl = document.getElementById("turkoStepText"),
      counterEl = document.getElementById("turkoStepCounter"),
      nextBtn = document.getElementById("turkoNextStep"),
      cardEl = document.getElementById("turkoCard"),
      stackContainer = document.querySelector(".turko-stack-image"),
      imageLayers = stackContainer ? stackContainer.querySelectorAll(".image-layer") : [];
    
    if (!steps.length || 2 !== imageLayers.length) return;
    
    const stepsData = [
      {
        title: "Подбор недвижимости",
        text: "Анализируем рынок Лиды и района, подбираем только реальные варианты.",
        image: "images/steps/st1.webp",
      },
      {
        title: "Организация показов",
        text: "Согласовываем показы и сопровождаем клиентов.",
        image: "images/steps/st2.webp",
      },
      {
        title: "Юридическая сделка",
        text: "Проверка документов и безопасность сделки.",
        image: "images/steps/st3.webp",
      },
      {
        title: "Передача ключей",
        text: "Контроль расчётов и финальная передача объекта.",
        image: "images/steps/st4.webp",
      },
    ];
    
    let currentStep = 0,
      currentLayerIdx = 0;
    let prevActiveStep = null,
      prevActiveLine = null;
    
    function updateStep(newStep) {
      if (newStep === currentStep || !stepsData[newStep]) return;
      
      // Оптимизация: удаляем класс только у предыдущего активного элемента
      if (prevActiveStep !== null && steps[prevActiveStep]) {
        steps[prevActiveStep].classList.remove("active");
      }
      steps[newStep].classList.add("active");
      prevActiveStep = newStep;
      
      // Обновляем активные линии
      stepLines.forEach((line, idx) => {
        line.classList.toggle("active", idx < newStep);
      });
      
      // Обновляем контент с анимацией
      cardEl.classList.add("fade");
      setTimeout(() => {
        titleEl.textContent = stepsData[newStep].title;
        textEl.textContent = stepsData[newStep].text;
        counterEl.textContent = `${newStep + 1} / ${stepsData.length}`;
        cardEl.classList.remove("fade");
      }, 200);
      
      // Переключаем фоновые изображения
      const nextLayerIdx = 1 - currentLayerIdx;
      imageLayers[nextLayerIdx].style.backgroundImage = `url(${stepsData[newStep].image})`;
      imageLayers[nextLayerIdx].classList.add("active");
      imageLayers[currentLayerIdx].classList.remove("active");
      currentLayerIdx = nextLayerIdx;
      
      currentStep = newStep;
    }
    
    // Инициализация
    stepsData.forEach((step) => {
      new Image().src = step.image;
    });
    
    imageLayers[0].style.backgroundImage = `url(${stepsData[0].image})`;
    imageLayers[0].classList.add("active");
    imageLayers[1].classList.remove("active");
    
    titleEl.textContent = stepsData[0].title;
    textEl.textContent = stepsData[0].text;
    counterEl.textContent = `1 / ${stepsData.length}`;
    
    steps[0].classList.add("active");
    prevActiveStep = 0;
    
    steps.forEach((step, idx) => {
      step.addEventListener("click", () => updateStep(idx));
    });
    
    nextBtn && nextBtn.addEventListener("click", () => {
      updateStep((currentStep + 1) % stepsData.length);
    });
  })(),
  (function () {
    const e = document.querySelector(".turko-step.active"),
      t = document.querySelector(".turko-steps-nav");
    e &&
      t &&
      window.innerWidth <= 768 &&
      e.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
  })(),
  (function () {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const DEBOUNCE_DELAY = 300;
    const INIT_DELAY = 200;
    
    // Кеширование DOM элементов
    let cachedElements = {
      svg: null,
      diagram: null,
      center: null,
      hcards: {}
    };
    
    // Debounce таймер
    let resizeTimer = null;
    
    function getCachedElement(id) {
      if (!cachedElements[id]) {
        cachedElements[id] = document.getElementById(id);
      }
      return cachedElements[id];
    }
    
    function getCachedHcard(id) {
      if (!cachedElements.hcards[id]) {
        cachedElements.hcards[id] = document.getElementById(id);
      }
      return cachedElements.hcards[id];
    }
    
    function initializeCache() {
      cachedElements.svg = document.getElementById("hubLinesSvg");
      cachedElements.diagram = document.getElementById("hubDiagram");
      cachedElements.center = document.getElementById("hubCenter");
    }
    
    function renderDiagram() {
      if (!cachedElements.svg || !cachedElements.diagram || !cachedElements.center) {
        initializeCache();
        if (!cachedElements.svg || !cachedElements.diagram || !cachedElements.center) {
          return;
        }
      }
      
      var diagramRect = cachedElements.diagram.getBoundingClientRect(),
        centerRect = cachedElements.center.getBoundingClientRect(),
        centerX = centerRect.left - diagramRect.left + centerRect.width / 2,
        centerY = centerRect.top - diagramRect.top + centerRect.height / 2;
      
      cachedElements.svg.innerHTML = "";
      
      var centerHalfWidth = centerRect.width / 2,
        centerHalfHeight = centerRect.height / 2,
        animDuration = 150,
        dashGap = 40,
        positions = {
          left: { x: centerX - centerHalfWidth, y: centerY },
          right: { x: centerX + centerHalfWidth, y: centerY },
          top: { x: centerX, y: centerY - centerHalfHeight },
          bottom: { x: centerX, y: centerY + centerHalfHeight },
        },
        animOffsets = {
          "hcard-0": 0,
          "hcard-1": 0.34,
          "hcard-2": 0.67,
          "hcard-3": 0.17,
          "hcard-4": 0.51,
          "hcard-5": 0.84,
          "hcard-top": 0.1,
          "hcard-bottom": 0.6,
        },
        bgGroup = document.createElementNS(SVG_NS, "g"),
        lineGroup = document.createElementNS(SVG_NS, "g"),
        dotGroup = document.createElementNS(SVG_NS, "g");
      
      cachedElements.svg.appendChild(bgGroup);
      cachedElements.svg.appendChild(lineGroup);
      cachedElements.svg.appendChild(dotGroup);
      
      function formatNum(n) { return (+n).toFixed(2); }
      
      function createPath(d, width, opacity) {
        var path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#155945");
        path.setAttribute("stroke-width", width || "1.5");
        path.setAttribute("stroke-linejoin", "miter");
        path.setAttribute("stroke-linecap", "round");
        if (opacity !== undefined) path.setAttribute("stroke-opacity", opacity);
        return path;
      }
      
      function createCircle(x, y, r, opacity) {
        var circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", formatNum(x));
        circle.setAttribute("cy", formatNum(y));
        circle.setAttribute("r", r || 3.5);
        circle.setAttribute("fill", "#155945");
        circle.setAttribute("fill-opacity", opacity !== undefined ? opacity : 0.5);
        return circle;
      }
      
      function animatePath(path, offset) {
        var length = path.getTotalLength();
        if (length < 1) return;
        var fullLength = length + dashGap,
          duration = fullLength / animDuration,
          dashStart = -offset * fullLength,
          dashEnd = -(1 + offset) * fullLength,
          visibleDash = Math.max(0, length - dashGap);
        
        path.setAttribute("stroke-dasharray", formatNum(dashGap) + " " + formatNum(visibleDash));
        path.setAttribute("stroke-dashoffset", formatNum(dashStart));
        
        var anim = document.createElementNS(SVG_NS, "animate");
        anim.setAttribute("attributeName", "stroke-dashoffset");
        anim.setAttribute("from", formatNum(dashStart));
        anim.setAttribute("to", formatNum(dashEnd));
        anim.setAttribute("dur", formatNum(duration) + "s");
        anim.setAttribute("begin", "0s");
        anim.setAttribute("repeatCount", "indefinite");
        anim.setAttribute("calcMode", "linear");
        path.appendChild(anim);
      }
      
      function drawSideConnections(side, cardIds) {
        var pos = positions[side],
          cards = cardIds
            .map(function(id) {
              var el = getCachedHcard(id);
              if (!el) return null;
              var rect = el.getBoundingClientRect();
              return {
                id: id,
                x: "left" === side ? rect.right - diagramRect.left : rect.left - diagramRect.left,
                y: rect.top - diagramRect.top + rect.height / 2,
              };
            })
            .filter(Boolean);
        
        if (!cards.length) return;
        
        var midX = (pos.x + cards[0].x) / 2;
        cards.forEach(function(card) {
          var pathData = Math.abs(card.y - centerY) < 1
            ? "M " + formatNum(pos.x) + "," + formatNum(centerY) + " H " + formatNum(card.x)
            : "M " + formatNum(pos.x) + "," + formatNum(centerY) + 
              " H " + formatNum(midX) + " V " + formatNum(card.y) + " H " + formatNum(card.x);
          
          var bgPath = createPath(pathData, "1.5", "0.14");
          var animPath = createPath(pathData, "2.8");
          
          bgGroup.appendChild(bgPath);
          lineGroup.appendChild(animPath);
          animatePath(animPath, animOffsets[card.id] || 0);
          dotGroup.appendChild(createCircle(card.x, card.y, 3.5, 0.5));
        });
        
        dotGroup.appendChild(createCircle(midX, centerY, 4.5, 0.6));
        dotGroup.appendChild(createCircle(pos.x, centerY, 4, 0.55));
      }
      
      function drawTopBottomConnection(position, cardId) {
        var pos = positions[position],
          card = getCachedHcard(cardId);
        
        if (!card) return;
        
        var cardRect = card.getBoundingClientRect(),
          cardX = cardRect.left - diagramRect.left + cardRect.width / 2,
          cardY = "top" === position ? cardRect.bottom - diagramRect.top : cardRect.top - diagramRect.top,
          pathData = "M " + formatNum(pos.x) + "," + formatNum(pos.y) + " V " + formatNum(cardY);
        
        var bgPath = createPath(pathData, "1.5", "0.14");
        var animPath = createPath(pathData, "2.8");
        
        bgGroup.appendChild(bgPath);
        lineGroup.appendChild(animPath);
        animatePath(animPath, animOffsets[cardId] || 0);
        
        dotGroup.appendChild(createCircle(pos.x, pos.y, 4, 0.55));
        dotGroup.appendChild(createCircle(cardX, cardY, 3.5, 0.5));
      }
      
      drawSideConnections("left", ["hcard-0", "hcard-1", "hcard-2"]);
      drawSideConnections("right", ["hcard-3", "hcard-4", "hcard-5"]);
      drawTopBottomConnection("top", "hcard-top");
      drawTopBottomConnection("bottom", "hcard-bottom");
    }
    
    function debouncedResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderDiagram, DEBOUNCE_DELAY);
    }
    
    if ("loading" === document.readyState) {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(function() {
          initializeCache();
          renderDiagram();
        }, INIT_DELAY);
      });
    } else {
      setTimeout(function() {
        initializeCache();
        renderDiagram();
      }, INIT_DELAY);
    }
    
    (window.__optimizeListeners = window.__optimizeListeners || {}),
    window.__optimizeListeners.diagramResize && window.removeEventListener("resize", window.__optimizeListeners.diagramResize),
    (window.__optimizeListeners.diagramResize = debouncedResize),
    window.addEventListener("resize", window.__optimizeListeners.diagramResize);
  })());


/* Speculation Rules: prefetch + prerender same-origin pages for instant View Transitions */
(function () {
  try {
    if (!('HTMLScriptElement' in window) || !HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
    if (document.querySelector('script[type="speculationrules"][data-turko]')) return;
    var rules = {
      prefetch: [{
        source: "document",
        where: { and: [
          { href_matches: "/*" },
          { not: { selector_matches: "a[download], a[target=_blank], a[rel~=external], .no-prerender a, a.no-prerender" } }
        ]},
        eagerness: "eager"
      }],
      prerender: [{
        source: "document",
        where: { and: [
          { href_matches: "/*" },
          { not: { selector_matches: "a[download], a[target=_blank], a[rel~=external], .no-prerender a, a.no-prerender" } }
        ]},
        eagerness: "moderate"
      }]
    };
    var s = document.createElement('script');
    s.type = 'speculationrules';
    s.dataset.turko = '1';
    s.textContent = JSON.stringify(rules);
    (document.head || document.documentElement).appendChild(s);
  } catch (e) { /* no-op */ }
})();
