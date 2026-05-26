/**
 * Agency Legal Block Component
 * Manages agency identification and legal disclaimers
 * Vanilla JS, no dependencies
 */

(function agencyLegalBlock() {
  'use strict';

  // Agency data
  const AGENCY_DATA = {
    name: 'Агентство недвижимости «ГермесГрупп»',
    unp: '193776843',
    license: '02240/487',
    licenseDate: '07.08.2024',
    insurance: {
      series: 'БР',
      number: '0004927',
      from: '10.08.2025',
      to: '09.08.2026',
    },
  };

  const AGENT_DATA = {
    name: 'Ольга Турко',
    role: 'Риэлтер',
    certificate: '1931',
    certificateDate: '29.02.2024',
  };

  // Template for agency legal block (object pages)
  const AGENCY_LEGAL_TEMPLATE = `
    <div class="agency-legal-block" data-agency-legal>
      <p><strong>${AGENCY_DATA.name}</strong></p>
      <p>УНП ${AGENCY_DATA.unp}</p>
      <p>Лицензия: ${AGENCY_DATA.license} от ${AGENCY_DATA.licenseDate}</p>
      <p>Страховой полис Серия ${AGENCY_DATA.insurance.series} № ${AGENCY_DATA.insurance.number}, с ${AGENCY_DATA.insurance.from} по ${AGENCY_DATA.insurance.to}</p>
      
      <div class="agency-legal-disclaimer">
        <p>Информация на сайте не является публичной офертой. Актуальность объекта уточняйте у специалиста.</p>
      </div>
    </div>
  `;

  // Template for agent info block (object pages sidebar)
  const AGENT_INFO_TEMPLATE = `
    <div class="widget_address" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
      <div style="font-size: 13px; line-height: 1.6; color: #666;">
        <div style="font-weight: 600; margin-bottom: 8px;">Агентство недвижимости</div>
        <p style="margin: 0 0 6px;"><strong>${AGENCY_DATA.name}</strong></p>
        <p style="margin: 0 0 6px;">УНП ${AGENCY_DATA.unp}</p>
        <p style="margin: 0 0 6px;">Лицензия: ${AGENCY_DATA.license} от ${AGENCY_DATA.licenseDate}</p>
        <p style="margin: 0;">Страховой полис Серия ${AGENCY_DATA.insurance.series} № ${AGENCY_DATA.insurance.number}, с ${AGENCY_DATA.insurance.from} по ${AGENCY_DATA.insurance.to}</p>
      </div>
    </div>
  `;

  // Template for footer legal block
  const FOOTER_LEGAL_TEMPLATE = `
    <div class="footer-legal-block" data-footer-legal>
      <div class="footer-legal-block__item">
        <strong>${AGENCY_DATA.name}</strong>
      </div>
      <div class="footer-legal-block__item">
        УНП ${AGENCY_DATA.unp}
      </div>
      <div class="footer-legal-block__item">
        Лицензия: ${AGENCY_DATA.license} от ${AGENCY_DATA.licenseDate}
      </div>
      <div class="footer-legal-block__item">
        Страховой полис Серия ${AGENCY_DATA.insurance.series} № ${AGENCY_DATA.insurance.number}, 
        с ${AGENCY_DATA.insurance.from} по ${AGENCY_DATA.insurance.to}
      </div>
      <div class="footer-legal-block__divider"></div>
      <div class="footer-legal-block__item">
        Информация на сайте не является публичной офертой.
      </div>
      <div class="footer-legal-block__item">
        Свидетельство об аттестации риэлтера № ${AGENT_DATA.certificate} от ${AGENT_DATA.certificateDate}
      </div>
    </div>
  `;

  /**
   * Add agency legal block to object pages
   * Inserts before footer or at end of content
   */
  function addAgencyLegalBlock(container) {
    if (!container) return;

    // Check if already exists
    if (container.querySelector('[data-agency-legal]')) {
      return;
    }

    // Try to find footer
    let insertPoint = container.querySelector('footer');
    
    if (!insertPoint) {
      // Find last main content div
      insertPoint = container.querySelector('.object-faq') ||
                    container.querySelector('[data-district-info]') ||
                    container.querySelector('.section-full') ||
                    container;
    }

    if (insertPoint && insertPoint.parentNode) {
      insertPoint.parentNode.insertBefore(
        createElementFromHTML(AGENCY_LEGAL_TEMPLATE),
        insertPoint
      );
    }
  }

  /**
   * Add agent info block to object sidebar footer
   */
  function addAgentInfoBlock(container) {
    if (!container) return;

    // Check if already exists
    if (container.querySelector('[data-agent-info]')) {
      return;
    }

    // Look for sidebar footer where address is
    const sidebarFooter = container.querySelector('[data-sidebar-footer]');

    if (sidebarFooter) {
      // Add agency info to sidebar footer with data-agent-info marker
      const agencyInfoHtml = `
        <div data-agent-info style="font-size: 13px; line-height: 1.6; color: #666; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
          <div style="font-weight: 600; margin-bottom: 8px;">Агентство недвижимости</div>
          <p style="margin: 0 0 6px;"><strong>${AGENCY_DATA.name}</strong></p>
          <p style="margin: 0 0 6px;">УНП ${AGENCY_DATA.unp}</p>
          <p style="margin: 0 0 6px;">Лицензия: ${AGENCY_DATA.license} от ${AGENCY_DATA.licenseDate}</p>
          <p style="margin: 0;">Страховой полис Серия ${AGENCY_DATA.insurance.series} № ${AGENCY_DATA.insurance.number}, с ${AGENCY_DATA.insurance.from} по ${AGENCY_DATA.insurance.to}</p>
        </div>
      `;
      sidebarFooter.insertAdjacentHTML('beforeend', agencyInfoHtml);
    }
  }

  /**
   * Update footer with agency legal info
   */
  function updateFooterLegalBlock() {
    const footers = document.querySelectorAll('.site-footer, footer');

    footers.forEach(footer => {
      // Check if already exists
      if (footer.querySelector('[data-footer-legal]')) {
        return;
      }

      // Find the call-to-action or appropriate section
      const callToAction = footer.querySelector('.call-to-action-wrap');
      const footerContent = footer.querySelector('.footer-bottom');

      if (callToAction) {
        // Insert in call-to-action section if found
        const legalDiv = callToAction.querySelector('.footer-legal-info');
        if (!legalDiv) {
          callToAction.insertAdjacentHTML('beforeend', FOOTER_LEGAL_TEMPLATE);
        }
      } else if (footerContent) {
        // Insert in footer-bottom otherwise
        footerContent.insertAdjacentHTML('beforeend', FOOTER_LEGAL_TEMPLATE);
      } else {
        // Fallback: append to footer
        footer.insertAdjacentHTML('beforeend', FOOTER_LEGAL_TEMPLATE);
      }
    });
  }

  /**
   * Helper: Create element from HTML string
   */
  function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstElementChild;
  }

  /**
   * Initialize all components
   */
  function init() {
    // Update footer on all pages
    updateFooterLegalBlock();

    // Observe for dynamic page changes
    observePageChanges();
  }

  /**
   * Observe for dynamic page changes (SPA navigation)
   */
  function observePageChanges() {
    if (!window.MutationObserver) {
      return;
    }

    let timeoutId = null;

    const observer = new MutationObserver(function handleMutations() {
      // Debounce to avoid multiple rapid updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        init();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  /**
   * Public API
   */
  window.AgencyLegal = {
    init: init,
    addLegalBlock: addAgencyLegalBlock,
    addAgentInfo: addAgentInfoBlock,
    updateFooter: updateFooterLegalBlock,
    data: AGENCY_DATA,
    agent: AGENT_DATA,
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    setTimeout(init, 100);
  }
})();
