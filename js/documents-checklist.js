(function () {
  const STORAGE_KEYS = {
    dealType: "dealType",
    purchase: "documentsChecklist_purchase",
    sale: "documentsChecklist_sale",
    exchange: "documentsChecklist_exchange"
  };

  const DEAL_LABELS = {
    purchase: "Покупка",
    sale: "Продажа",
    exchange: "Обмен"
  };

  const DEAL_DOCUMENTS = {
    purchase: [
      {
        name: "Паспорт покупателя",
        hint: "Подтверждает личность и используется для проверки данных в договоре."
      },
      {
        name: "Свидетельство о браке или разводе",
        hint: "Нужно для подтверждения семейного статуса при оформлении сделки."
      },
      {
        name: "Нотариальное согласие супруга",
        hint: "Требуется, если имущество приобретается в браке и действует режим совместной собственности."
      },
      {
        name: "Справка о доходах",
        hint: "Помогает подтвердить платёжеспособность при покупке с кредитом."
      },
      {
        name: "Кредитное решение банка или подтверждение наличия средств",
        hint: "Подтверждает источник финансирования и готовность выйти на сделку."
      },
      {
        name: "Предварительный договор или задаток",
        hint: "Фиксирует ключевые условия и серьёзность намерений сторон."
      },
      {
        name: "УНП (учётный номер плательщика)",
        hint: "Для сделок в Беларуси используется УНП физлица (или личный номер из паспорта по требованию стороны/банка)."
      },
      {
        name: "Реквизиты для расчёта",
        hint: "Нужны для безопасного и корректного перечисления денежных средств."
      }
    ],
    sale: [
      {
        name: "Паспорт собственника",
        hint: "Основной документ, подтверждающий личность продавца."
      },
      {
        name: "Документ, подтверждающий право собственности",
        hint: "Подтверждает законное право распоряжаться объектом."
      },
      {
        name: "Технический паспорт объекта",
        hint: "Содержит технические характеристики и планировку недвижимости."
      },
      {
        name: "Выписка о зарегистрированных лицах",
        hint: "Показывает, кто зарегистрирован в объекте на момент сделки."
      },
      {
        name: "Справка об отсутствии задолженности по коммунальным платежам",
        hint: "Подтверждает отсутствие коммунальных долгов перед покупателем."
      },
      {
        name: "Свидетельство о браке или нотариальное согласие супруга",
        hint: "Нужно для соблюдения семейно-правовых требований при продаже."
      },
      {
        name: "Документы-основания приобретения недвижимости",
        hint: "Подтверждают историю возникновения права собственности."
      },
      {
        name: "Доверенность, если продажу проводит представитель",
        hint: "Подтверждает полномочия представителя действовать от имени собственника."
      }
    ],
    exchange: [
      {
        name: "Паспорт обеих сторон",
        hint: "Подтверждает личности всех участников сделки обмена."
      },
      {
        name: "Документы на оба объекта недвижимости",
        hint: "Подтверждают права сторон на обмениваемые объекты."
      },
      {
        name: "Технические паспорта обоих объектов",
        hint: "Нужны для сверки площади, характеристик и состояния объектов."
      },
      {
        name: "Выписки о зарегистрированных лицах",
        hint: "Показывают актуальный состав зарегистрированных в каждом объекте."
      },
      {
        name: "Согласие супругов обеих сторон",
        hint: "Требуется, если объекты относятся к совместной собственности супругов."
      },
      {
        name: "Документы-основания собственности",
        hint: "Подтверждают юридическую чистоту происхождения права."
      },
      {
        name: "Справки об отсутствии задолженности",
        hint: "Подтверждают отсутствие долгов по обязательным платежам."
      },
      {
        name: "Предварительное соглашение об обмене",
        hint: "Фиксирует условия обмена до подписания основного договора."
      }
    ]
  };

  function init() {
    const section = document.querySelector(".documents-checklist");
    const modalElement = document.querySelector("#documentsChecklistModal");
    const modalOpenButton = document.querySelector("[data-documents-checklist-open]");
    const modalCloseButtons = document.querySelectorAll("[data-documents-checklist-close]");

    if (!section) {
      return;
    }

    const dealTypeSelect = section.querySelector("#dealTypeSelect");
    const listElement = section.querySelector("#documentsChecklistList");
    const progressTextElement = section.querySelector(".documents-checklist__progress-text");
    const progressBarElement = section.querySelector(".documents-checklist__progress-bar");
    const progressFillElement = section.querySelector(".documents-checklist__progress-fill");
    const telegramButton = section.querySelector(".documents-checklist__telegram-btn");
    const consultationButton = section.querySelector(".documents-checklist__cta-btn");

    if (
      !dealTypeSelect ||
      !listElement ||
      !progressTextElement ||
      !progressBarElement ||
      !progressFillElement ||
      !telegramButton ||
      !consultationButton
    ) {
      return;
    }

    setupModal();

    const checkedByDealType = {
      purchase: loadCheckedIndexes(STORAGE_KEYS.purchase),
      sale: loadCheckedIndexes(STORAGE_KEYS.sale),
      exchange: loadCheckedIndexes(STORAGE_KEYS.exchange)
    };

    const savedDealType = localStorage.getItem(STORAGE_KEYS.dealType);

    if (savedDealType && DEAL_DOCUMENTS[savedDealType]) {
      dealTypeSelect.value = savedDealType;
      renderDocuments(savedDealType);
    } else {
      renderDocuments("");
    }

    dealTypeSelect.addEventListener("change", function () {
      const dealType = dealTypeSelect.value;

      if (dealType) {
        localStorage.setItem(STORAGE_KEYS.dealType, dealType);
      } else {
        localStorage.removeItem(STORAGE_KEYS.dealType);
      }

      renderDocuments(dealType);
    });

    telegramButton.addEventListener("click", function () {
      const dealType = dealTypeSelect.value;
      const documents = DEAL_DOCUMENTS[dealType] || [];

      if (!dealType || !documents.length) {
        return;
      }

      const checkedIndexes = checkedByDealType[dealType] || [];
      const preparedDocuments = documents.filter(function (_, index) {
        return checkedIndexes.includes(index);
      }).map(function (documentItem) {
        return documentItem.name;
      });
      const missingDocuments = documents.filter(function (_, index) {
        return !checkedIndexes.includes(index);
      }).map(function (documentItem) {
        return documentItem.name;
      });

      const preparedList = preparedDocuments.length
        ? preparedDocuments.map(function (doc) {
            return "• " + doc;
          }).join("\n")
        : "• Пока ничего не отмечено";

      const missingList = missingDocuments.length
        ? missingDocuments.map(function (doc) {
            return "• " + doc;
          }).join("\n")
        : "• Все документы собраны";

      const message = [
        "Тип сделки: " + DEAL_LABELS[dealType],
        "",
        "✅ Уже подготовлено:",
        "",
        preparedList,
        "",
        "⬜ Осталось собрать:",
        "",
        missingList
      ].join("\n");

      const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(window.location.href) + "&text=" + encodeURIComponent(message);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    });

    function renderDocuments(dealType) {
      const documents = DEAL_DOCUMENTS[dealType] || [];
      const checkedIndexes = checkedByDealType[dealType] || [];

      listElement.innerHTML = "";

      if (!dealType || !documents.length) {
        const emptyState = document.createElement("p");
        emptyState.className = "documents-checklist__empty";
        emptyState.textContent = "Выберите тип сделки, чтобы увидеть чеклист документов.";
        listElement.appendChild(emptyState);
        telegramButton.disabled = true;
        toggleConsultationButton(false);
        updateProgress(0, 8);
        progressBarElement.setAttribute("aria-valuenow", "0");
        return;
      }

      documents.forEach(function (documentItem, index) {
        const itemElement = document.createElement("div");
        itemElement.className = "documents-checklist__item";

        const labelElement = document.createElement("label");
        labelElement.className = "documents-checklist__checkbox";

        const inputElement = document.createElement("input");
        inputElement.type = "checkbox";
        inputElement.className = "documents-checklist__checkbox-input";
        inputElement.checked = checkedIndexes.includes(index);

        const markElement = document.createElement("span");
        markElement.className = "documents-checklist__checkbox-mark";

        const textElement = document.createElement("span");
        textElement.className = "documents-checklist__checkbox-text";
        textElement.textContent = documentItem.name;

        const hintWrapperElement = document.createElement("span");
        hintWrapperElement.className = "documents-checklist__doc-hint";

        const hintButtonElement = document.createElement("button");
        hintButtonElement.type = "button";
        hintButtonElement.className = "documents-checklist__doc-hint-btn";
        hintButtonElement.setAttribute("aria-label", "Описание документа");
        hintButtonElement.textContent = "i";

        const tooltipElement = document.createElement("span");
        tooltipElement.className = "documents-checklist__tooltip";
        tooltipElement.textContent = documentItem.hint;

        hintButtonElement.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
        });

        inputElement.addEventListener("change", function () {
          const currentCheckedIndexes = checkedByDealType[dealType] || [];

          if (inputElement.checked) {
            if (!currentCheckedIndexes.includes(index)) {
              currentCheckedIndexes.push(index);
            }
          } else {
            const checkedIndexPosition = currentCheckedIndexes.indexOf(index);

            if (checkedIndexPosition !== -1) {
              currentCheckedIndexes.splice(checkedIndexPosition, 1);
            }
          }

          currentCheckedIndexes.sort(function (a, b) {
            return a - b;
          });

          checkedByDealType[dealType] = currentCheckedIndexes;
          saveCheckedIndexes(dealType, currentCheckedIndexes);
          updateProgress(currentCheckedIndexes.length, documents.length);
          toggleConsultationButton(currentCheckedIndexes.length === documents.length);
          progressBarElement.setAttribute("aria-valuenow", String(currentCheckedIndexes.length));
        });

        hintWrapperElement.appendChild(hintButtonElement);
        hintWrapperElement.appendChild(tooltipElement);
        labelElement.appendChild(inputElement);
        labelElement.appendChild(markElement);
        labelElement.appendChild(textElement);
        labelElement.appendChild(hintWrapperElement);
        itemElement.appendChild(labelElement);
        listElement.appendChild(itemElement);
      });

      telegramButton.disabled = false;
      updateProgress(checkedIndexes.length, documents.length);
      toggleConsultationButton(checkedIndexes.length === documents.length);
      progressBarElement.setAttribute("aria-valuenow", String(checkedIndexes.length));
      progressBarElement.setAttribute("aria-valuemax", String(documents.length));
    }

    function updateProgress(checkedCount, totalCount) {
      const safeTotalCount = totalCount || 0;
      const progressPercent = safeTotalCount ? (checkedCount / safeTotalCount) * 100 : 0;

      progressTextElement.textContent = "Собрано: " + checkedCount + " из " + safeTotalCount + " документов";
      progressFillElement.style.width = progressPercent + "%";
      progressFillElement.classList.toggle("is-complete", safeTotalCount > 0 && checkedCount === safeTotalCount);
    }

    function toggleConsultationButton(isVisible) {
      consultationButton.classList.toggle("is-visible", isVisible);
      consultationButton.setAttribute("aria-hidden", isVisible ? "false" : "true");
      consultationButton.tabIndex = isVisible ? 0 : -1;
    }

    function loadCheckedIndexes(storageKey) {
      const rawStorageValue = localStorage.getItem(storageKey);

      if (!rawStorageValue) {
        return [];
      }

      try {
        const parsedValue = JSON.parse(rawStorageValue);

        if (!Array.isArray(parsedValue)) {
          return [];
        }

        return parsedValue.filter(function (value) {
          return Number.isInteger(value);
        });
      } catch (error) {
        return [];
      }
    }

    function saveCheckedIndexes(dealType, checkedIndexes) {
      const storageKey = STORAGE_KEYS[dealType];

      if (!storageKey) {
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(checkedIndexes));
    }

    function setupModal() {
      if (!modalElement || !modalOpenButton || !modalCloseButtons.length) {
        return;
      }

      modalOpenButton.addEventListener("click", function () {
        modalElement.hidden = false;
        document.body.style.overflow = "hidden";
      });

      modalCloseButtons.forEach(function (closeButton) {
        closeButton.addEventListener("click", function () {
          closeModal();
        });
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modalElement.hidden) {
          closeModal();
        }
      });
    }

    function closeModal() {
      modalElement.hidden = true;
      document.body.style.overflow = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
