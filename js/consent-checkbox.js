/**
 * Consent Checkbox Manager
 * Adds GDPR/personal data processing consent to all forms
 * Vanilla JS, no dependencies
 */

(function consentCheckboxManager() {
  'use strict';

  const FORM_SELECTORS = [
    '#viewing-booking-form',         // Object detail booking
    'form[data-api-endpoint]',       // Contact widget form
    '.contact-form',                 // Contact page form
    'form[name="contact"]',          // Generic contact form
    'form[name="booking"]',          // Generic booking form
    'form[data-type="inquiry"]',     // Inquiry form
  ];

  const CONSENT_TEMPLATE = `
    <div class="consent-group" data-consent-field>
      <div class="consent-checkbox">
        <input 
          type="checkbox" 
          id="consent-{ID}" 
          name="consent_data_processing" 
          required 
          aria-describedby="consent-help-{ID}"
        />
        <div class="consent-checkbox__box"></div>
        <svg class="consent-checkbox__checkmark" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polyline points="2 6 6 10 14 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <label for="consent-{ID}" class="consent-label">
        Нажимая кнопку, вы соглашаетесь с 
        <a href="/Privacy#data-processing" target="_blank" rel="noopener noreferrer">обработкой персональных данных</a>
        и 
        <a href="/Privacy" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</a>.
      </label>
      <span id="consent-help-{ID}" class="sr-only">Это поле обязательно</span>
    </div>
  `;

  // Generate unique ID
  function generateId() {
    return 'consent-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Find all forms
  function findAllForms() {
    const forms = new Set();
    
    FORM_SELECTORS.forEach(selector => {
      try {
        const foundForms = document.querySelectorAll(selector);
        foundForms.forEach(form => {
          if (form && form.tagName === 'FORM') {
            forms.add(form);
          }
        });
      } catch (e) {
        console.debug('Selector error:', selector, e.message);
      }
    });

    // Also find forms by looking for submit buttons with specific classes
    document.querySelectorAll('[data-submit-form]').forEach(btn => {
      const form = btn.closest('form');
      if (form) forms.add(form);
    });

    return Array.from(forms);
  }

  // Check if form already has consent field
  function hasConsentField(form) {
    return form.querySelector('[data-consent-field]') !== null;
  }

  // Add consent field to form
  function addConsentFieldToForm(form) {
    if (hasConsentField(form)) {
      return;
    }

    const id = generateId();
    const consentHtml = CONSENT_TEMPLATE.replace(/{ID}/g, id);
    
    // Find submit button to insert before it
    const submitBtn = form.querySelector('[type="submit"], [data-submit-form]');
    
    if (submitBtn) {
      submitBtn.insertAdjacentHTML('beforebegin', consentHtml);
    } else {
      // If no submit button, append at end
      form.insertAdjacentHTML('beforeend', consentHtml);
    }

    // Attach validation listener
    attachValidationListener(form, id);
  }

  // Validate consent on form submission
  function attachValidationListener(form, checkboxId) {
    const checkbox = form.querySelector(`#${checkboxId}`);
    
    if (!checkbox) return;

    // Handle form submission
    form.addEventListener('submit', function handleSubmit(e) {
      // Don't prevent default here - let the form validate normally
      // HTML5 validation will handle required attribute
      
      if (!checkbox.checked) {
        e.preventDefault();
        
        // Add error state
        const consentGroup = checkbox.closest('[data-consent-field]');
        if (consentGroup) {
          consentGroup.classList.add('error');
          
          // Remove error state on change
          checkbox.addEventListener('change', function removeError() {
            consentGroup.classList.remove('error');
            this.removeEventListener('change', removeError);
          }, { once: true });
        }

        // Focus on checkbox
        checkbox.focus();
        
        return false;
      }
    }, false);

    // Handle checkbox change
    checkbox.addEventListener('change', function handleChange() {
      const consentGroup = this.closest('[data-consent-field]');
      if (consentGroup) {
        consentGroup.classList.remove('error');
      }
    });
  }

  // Initialize
  function init() {
    const forms = findAllForms();
    
    if (forms.length === 0) {
      // Retry after short delay if forms not found
      setTimeout(init, 500);
      return;
    }

    forms.forEach(form => {
      addConsentFieldToForm(form);
    });

    // Watch for dynamically added forms
    observeNewForms();
  }

  // Observe for new forms added to DOM
  function observeNewForms() {
    if (!window.MutationObserver) {
      return;
    }

    const observer = new MutationObserver(function handleMutations(mutations) {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            // Check if node is a form
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'FORM') {
                addConsentFieldToForm(node);
              }
              // Also check children
              const childForms = node.querySelectorAll?.('form');
              if (childForms) {
                childForms.forEach(form => {
                  addConsentFieldToForm(form);
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API for external use
  window.ConsentCheckbox = {
    addToForm: addConsentFieldToForm,
    findForms: findAllForms,
    init: init,
  };
})();
