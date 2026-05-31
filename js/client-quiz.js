(function () {
  const modal = document.getElementById("clientQuizModal");
  const openButton = document.querySelector("[data-client-quiz-open]");
  const closeButtons = Array.from(document.querySelectorAll("[data-client-quiz-close]"));
  const form = document.getElementById("clientQuizForm");

  if (!modal || !openButton || !form) return;

  const progressLabel = form.querySelector("[data-client-quiz-progress-label]");
  const progressFill = form.querySelector("[data-client-quiz-progress-fill]");
  const stepTitle = form.querySelector("[data-client-quiz-step-title]");
  const stepHint = form.querySelector("[data-client-quiz-step-hint]");
  const choicesContainer = form.querySelector("[data-client-quiz-choices]");
  const backButton = form.querySelector("[data-client-quiz-back]");
  const nextButton = form.querySelector("[data-client-quiz-next]");
  const feedback = form.querySelector("[data-client-quiz-feedback]");

  const goalStep = {
    key: "goal",
    title: "Шаг 1. Цель обращения",
    hint: "Что для вас сейчас актуальнее?",
    type: "single",
    options: ["Купить недвижимость", "Продать недвижимость", "Продать и купить одновременно", "Нужна консультация"],
  };

  const branchFlows = {
    buy: [
      {
        key: "buy_type",
        title: "Шаг 2. Что ищете?",
        hint: "Выберите подходящий формат недвижимости.",
        type: "single",
        options: ["Квартира", "Дом", "Участок", "Коммерческая недвижимость"],
      },
      {
        key: "buy_budget",
        title: "Шаг 3. Бюджет покупки",
        hint: "Чтобы сразу предложить подходящие варианты.",
        type: "single",
        options: ["До $30 000", "$30 000–$60 000", "$60 000–$100 000", "Свыше $100 000"],
      },
      {
        key: "buy_timeline",
        title: "Шаг 4. Сроки покупки",
        hint: "Когда хотите выйти на сделку?",
        type: "single",
        options: ["Срочно (до 1 месяца)", "1–3 месяца", "3–6 месяцев", "Пока присматриваюсь"],
      },
      {
        key: "buy_district",
        title: "Шаг 5. Локация",
        hint: "Где рассматриваете объекты?",
        type: "single",
        options: ["Центр", "Северный", "Южный", "Пригород / район"],
      },
    ],
    sale: [
      {
        key: "sale_object",
        title: "Шаг 2. Что продаёте?",
        hint: "Выберите тип вашего объекта.",
        type: "single",
        options: ["Квартира", "Дом", "Участок", "Коммерческая недвижимость"],
      },
      {
        key: "sale_status",
        title: "Шаг 3. Готовность к продаже",
        hint: "На каком этапе вы сейчас?",
        type: "single",
        options: ["Нужно оценить стоимость", "Готов(а) к показам", "Уже пробовали продавать", "Есть покупатель, нужна сделка"],
      },
      {
        key: "sale_timeline",
        title: "Шаг 4. Желаемый срок продажи",
        hint: "Как быстро хотите продать?",
        type: "single",
        options: ["Максимально быстро", "В течение 1–2 месяцев", "До полугода", "Без спешки"],
      },
      {
        key: "sale_offer",
        title: "Шаг 5. Что важно получить?",
        hint: "Подберём формат сопровождения под вашу цель.",
        type: "multi",
        options: ["Точную рыночную оценку", "Маркетинг и показы", "Юридическое сопровождение", "Продажу с последующей покупкой"],
      },
    ],
    exchange: [
      {
        key: "exchange_format",
        title: "Шаг 2. Формат обмена",
        hint: "Какой сценарий для вас ближе?",
        type: "single",
        options: ["Продать и купить в Лиде", "Переезд в другой город", "Обмен на дом", "Нужен оптимальный вариант"],
      },
      {
        key: "exchange_object",
        title: "Шаг 3. Что продаёте сейчас?",
        hint: "Определим стартовую стратегию.",
        type: "single",
        options: ["1-комнатная квартира", "2-комнатная квартира", "3+ комнат", "Дом / участок"],
      },
      {
        key: "exchange_timeline",
        title: "Шаг 4. Сроки обмена",
        hint: "Когда хотите завершить обе сделки?",
        type: "single",
        options: ["До 2 месяцев", "2–4 месяца", "До полугода", "Пока планирую"],
      },
      {
        key: "exchange_priority",
        title: "Шаг 5. Главный приоритет",
        hint: "Что важнее всего в вашем кейсе?",
        type: "single",
        options: ["Сделать всё в один цикл", "Минимизировать доплату", "Максимально безопасно", "Получить лучшее предложение"],
      },
    ],
    consult: [
      {
        key: "consult_topic",
        title: "Шаг 2. По какой теме нужна консультация?",
        hint: "Можно выбрать несколько пунктов.",
        type: "multi",
        options: ["Покупка недвижимости", "Продажа недвижимости", "Обмен / переезд", "Проверка документов"],
      },
      {
        key: "consult_stage",
        title: "Шаг 3. На каком вы этапе?",
        hint: "Это поможет дать предметные рекомендации.",
        type: "single",
        options: ["Только начинаю", "Уже ищу варианты", "Есть объект/покупатель", "Сделка почти согласована"],
      },
      {
        key: "consult_time",
        title: "Шаг 4. Когда удобно обсудить?",
        hint: "Выберите удобный горизонт контакта.",
        type: "single",
        options: ["Сегодня", "В ближайшие 2–3 дня", "На следующей неделе", "Напишу, когда буду готов(а)"],
      },
      {
        key: "consult_offer",
        title: "Шаг 5. Какой формат нужен?",
        hint: "Подберём самый полезный формат созвона.",
        type: "single",
        options: ["Короткая консультация 15 минут", "Подробный разбор ситуации", "Пошаговый план действий", "Сопровождение под ключ"],
      },
    ],
  };

  const contactStep = {
    key: "contact",
    title: "Шаг 6. Контакты",
    hint: "Оставьте телефон — мы подготовим персональный план и свяжемся с вами.",
    type: "contact",
  };

  const goalMap = {
    "Купить недвижимость": "buy",
    "Продать недвижимость": "sale",
    "Продать и купить одновременно": "exchange",
    "Нужна консультация": "consult",
  };

  const state = {
    stepIndex: 0,
    answers: {},
  };

  let closeTimer = null;

  function getSteps() {
    const branch = goalMap[state.answers.goal] || "buy";
    return [goalStep, ...branchFlows[branch], contactStep];
  }

  function resetFeedback() {
    feedback.textContent = "";
    feedback.classList.remove("is-error", "is-success");
  }

  function setFeedback(text, type) {
    feedback.textContent = text;
    feedback.classList.remove("is-error", "is-success");
    if (type) feedback.classList.add(type === "error" ? "is-error" : "is-success");
  }

  function toggleChoiceState() {
    const choices = choicesContainer.querySelectorAll(".client-quiz__choice");
    choices.forEach((item) => {
      const input = item.querySelector("input");
      item.classList.toggle("is-selected", Boolean(input && input.checked));
    });
  }

  function updateProgress() {
    const steps = getSteps();
    const current = state.stepIndex + 1;
    const total = steps.length;
    const percent = (current / total) * 100;
    progressLabel.textContent = `Шаг ${current} из ${total}`;
    progressFill.style.width = `${percent}%`;
  }

  function renderChoices(step) {
    choicesContainer.innerHTML = "";

    if (step.type === "contact") {
      choicesContainer.innerHTML = `
        <div class="client-quiz__contact-grid">
          <div class="client-quiz__field">
            <label for="clientQuizName">Имя</label>
            <input id="clientQuizName" name="name" type="text" placeholder="Как к вам обращаться" value="${state.answers.name || ""}">
          </div>
          <div class="client-quiz__field">
            <label for="clientQuizPhone">Телефон *</label>
            <input id="clientQuizPhone" name="phone" type="tel" placeholder="+375 ..." value="${state.answers.phone || ""}" required>
          </div>
          <div class="client-quiz__field">
            <label for="clientQuizComment">Комментарий</label>
            <textarea id="clientQuizComment" name="comment" placeholder="Например: нужна квартира с ремонтом в центре">${state.answers.comment || ""}</textarea>
          </div>
        </div>
      `;
      return;
    }

    const selected = state.answers[step.key];

    step.options.forEach((option) => {
      const isChecked = step.type === "multi"
        ? Array.isArray(selected) && selected.includes(option)
        : selected === option;

      const wrapper = document.createElement("label");
      wrapper.className = `client-quiz__choice${isChecked ? " is-selected" : ""}`;

      wrapper.innerHTML = `
        <input
          type="${step.type === "multi" ? "checkbox" : "radio"}"
          name="quiz-${step.key}"
          value="${option}"
          ${isChecked ? "checked" : ""}
        />
        <span>${option}</span>
      `;

      choicesContainer.appendChild(wrapper);
    });
  }

  function renderStep() {
    const steps = getSteps();
    const step = steps[state.stepIndex];

    stepTitle.textContent = step.title;
    stepHint.textContent = step.hint;

    backButton.disabled = state.stepIndex === 0;
    nextButton.textContent = state.stepIndex === steps.length - 1 ? "Отправить" : "Далее";

    updateProgress();
    renderChoices(step);
    resetFeedback();
  }

  function collectStepData() {
    const step = getSteps()[state.stepIndex];

    if (step.type === "contact") {
      const nameInput = form.querySelector("#clientQuizName");
      const phoneInput = form.querySelector("#clientQuizPhone");
      const commentInput = form.querySelector("#clientQuizComment");

      state.answers.name = (nameInput && nameInput.value.trim()) || "";
      state.answers.phone = (phoneInput && phoneInput.value.trim()) || "";
      state.answers.comment = (commentInput && commentInput.value.trim()) || "";

      if (state.answers.phone.length < 7) {
        setFeedback("Укажите корректный телефон, пожалуйста.", "error");
        return false;
      }

      return true;
    }

    const checked = Array.from(choicesContainer.querySelectorAll("input:checked")).map((item) => item.value);

    if (!checked.length) {
      setFeedback("Выберите хотя бы один вариант, чтобы продолжить.", "error");
      return false;
    }

    state.answers[step.key] = step.type === "multi" ? checked : checked[0];

    if (step.key === "goal") {
      Object.keys(state.answers).forEach((key) => {
        if (!["goal", "name", "phone", "comment"].includes(key) && !getSteps().some((flowStep) => flowStep.key === key)) {
          delete state.answers[key];
        }
      });
    }

    return true;
  }

  function getPayload() {
    const payload = {
      source: "homepage-client-quiz",
      createdAt: new Date().toISOString(),
      goal: state.answers.goal || "",
      name: state.answers.name || "",
      phone: state.answers.phone || "",
      comment: state.answers.comment || "",
    };

    getSteps().forEach((step) => {
      if (["goal", "contact"].includes(step.key)) return;
      payload[step.key] = state.answers[step.key] || "";
    });

    return payload;
  }

  async function submitQuiz() {
    nextButton.disabled = true;
    nextButton.textContent = "Отправляем...";

    try {
      const response = await fetch("/api/client-quiz.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getPayload()),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result || result.ok !== true) {
        throw new Error("REQUEST_FAILED");
      }

      setFeedback("Спасибо! Получили ваши ответы и скоро свяжемся с вами.", "success");
      nextButton.textContent = "Готово";
      setTimeout(closeModal, 900);
    } catch (error) {
      setFeedback("Не удалось отправить квиз. Попробуйте чуть позже.", "error");
      nextButton.disabled = false;
      nextButton.textContent = "Отправить";
    }
  }

  function openModal() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
    });

    document.body.style.overflow = "hidden";
    state.stepIndex = 0;
    state.answers = {};
    renderStep();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    nextButton.disabled = false;
    nextButton.textContent = "Далее";

    closeTimer = setTimeout(() => {
      modal.hidden = true;
    }, 220);
  }

  openButton.addEventListener("click", openModal);

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  backButton.addEventListener("click", function () {
    if (state.stepIndex === 0) return;
    state.stepIndex -= 1;
    renderStep();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!collectStepData()) return;

    if (state.stepIndex < getSteps().length - 1) {
      state.stepIndex += 1;
      renderStep();
      return;
    }

    submitQuiz();
  });

  choicesContainer.addEventListener("change", toggleChoiceState);
})();
