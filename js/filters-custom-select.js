"use strict";

(function initFiltersCustomSelect() {
  const selectObservers = new WeakMap();
  const trackedSelects = new Set();

  function closeAll(except) {
    document.querySelectorAll(".filter-select-ui.is-open").forEach((ui) => {
      if (ui !== except) {
        ui.classList.remove("is-open");
        ui.querySelector(".filter-select-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  }

  function disconnectSelectObserver(select) {
    const observer = selectObservers.get(select);
    if (observer) {
      observer.disconnect();
      selectObservers.delete(select);
    }

    trackedSelects.delete(select);
  }

  function cleanupDetachedSelects() {
    trackedSelects.forEach((select) => {
      if (!select.isConnected) {
        disconnectSelectObserver(select);
      }
    });
  }

  function bindCustomSelect(select) {
    if (select.dataset.customReady === "1") return;

    const ui = document.createElement("div");
    ui.className = "filter-select-ui";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "filter-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const triggerText = document.createElement("span");
    triggerText.className = "filter-select-trigger-text";

    const menu = document.createElement("div");
    menu.className = "filter-select-menu";
    menu.setAttribute("role", "listbox");

    ui.appendChild(trigger);
    trigger.appendChild(triggerText);
    ui.appendChild(menu);

    select.classList.add("is-customized-select");
    select.dataset.customReady = "1";
    select.insertAdjacentElement("afterend", ui);

    function refreshUi() {
      const current = select.options[select.selectedIndex];
      triggerText.textContent = current ? current.textContent : "";

      menu.querySelectorAll(".filter-select-option").forEach((optionButton) => {
        optionButton.classList.toggle("is-selected", optionButton.dataset.value === select.value);
      });

      ui.classList.toggle("is-disabled", select.disabled);
      ui.classList.toggle("is-active", select.classList.contains("is-active"));
      trigger.disabled = select.disabled;
    }

    trigger.addEventListener("click", () => {
      if (select.disabled) return;

      const shouldOpen = !ui.classList.contains("is-open");
      closeAll(ui);
      ui.classList.toggle("is-open", shouldOpen);
      trigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    });

    select.addEventListener("change", refreshUi);

    const stateObserver = new MutationObserver(() => {
      refreshUi();
    });

    stateObserver.observe(select, {
      attributes: true,
      attributeFilter: ["disabled", "class"]
    });

    selectObservers.set(select, stateObserver);
    trackedSelects.add(select);

    menu.innerHTML = "";
    Array.from(select.options).forEach((nativeOption) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "filter-select-option";
      optionButton.textContent = nativeOption.textContent;
      optionButton.dataset.value = nativeOption.value;
      optionButton.disabled = nativeOption.disabled;

      optionButton.addEventListener("click", () => {
        if (select.disabled || optionButton.disabled) return;

        select.value = optionButton.dataset.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        refreshUi();

        ui.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      });

      menu.appendChild(optionButton);
    });

    refreshUi();
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".filter-select-ui")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  const cleanupObserver = new MutationObserver(() => {
    cleanupDetachedSelects();
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".objects-filters select").forEach(bindCustomSelect);

    if (document.body) {
      cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    cleanupObserver.disconnect();
    trackedSelects.forEach((select) => disconnectSelectObserver(select));
  });
})();
