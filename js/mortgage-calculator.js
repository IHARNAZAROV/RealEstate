(function () {
  const STORAGE_KEY = "mortgageCalculatorBank";
  const DEFAULT_BANK_SLUG = "belarusbank";

  function rebuildCustomSelect(selectElement) {
    if (!selectElement || !window.initCustomSelectUI) {
      return;
    }

    if (selectElement.dataset.customReady === "1") {
      const customSelectElement = selectElement.nextElementSibling;

      if (
        customSelectElement &&
        customSelectElement.classList.contains("filter-select-ui")
      ) {
        customSelectElement.remove();
      }

      delete selectElement.dataset.customReady;
      selectElement.classList.remove("is-customized-select");
    }

    window.initCustomSelectUI(selectElement);
  }

  function formatMoney(amount) {
    return Math.round(amount).toLocaleString("ru-RU");
  }

  function calculateAnnuityPayment(loanAmount, annualInterestRate, monthsCount) {
    if (loanAmount <= 0 || monthsCount <= 0) {
      return 0;
    }

    const monthlyInterestRate = annualInterestRate / 100 / 12;

    if (monthlyInterestRate === 0) {
      return loanAmount / monthsCount;
    }

    const coefficient =
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, monthsCount)) /
      (Math.pow(1 + monthlyInterestRate, monthsCount) - 1);

    return loanAmount * coefficient;
  }

  function calculateMortgage({
    propertyPrice,
    downPayment,
    years,
    baseInterestRate,
    graceInterestRate
  }) {
    const loanAmount = Math.max(propertyPrice - downPayment, 0);
    const totalMonths = years * 12;

    if (loanAmount <= 0 || totalMonths <= 0) {
      return {
        loanAmount: 0,
        firstMonthlyPayment: 0,
        secondMonthlyPayment: null,
        totalPayment: 0,
        overpayment: 0
      };
    }

    if (!graceInterestRate) {
      const monthlyPayment = calculateAnnuityPayment(
        loanAmount,
        baseInterestRate,
        totalMonths
      );

      const totalPayment = monthlyPayment * totalMonths;

      return {
        loanAmount,
        firstMonthlyPayment: monthlyPayment,
        secondMonthlyPayment: null,
        totalPayment,
        overpayment: Math.max(totalPayment - loanAmount, 0)
      };
    }

    const graceMonths = Math.min(
      Number(graceInterestRate.periodMonths) || 0,
      totalMonths
    );

    const graceRate =
      typeof graceInterestRate.value === "number"
        ? graceInterestRate.value
        : typeof graceInterestRate.min === "number"
          ? graceInterestRate.min
          : baseInterestRate;

    const remainingMonths = Math.max(totalMonths - graceMonths, 0);

    // Белагропромбанк и другие программы с отсрочкой основного долга
    if (graceInterestRate.interestOnly) {
      const firstMonthlyPayment =
        (loanAmount * (graceRate / 100)) / 12;

      const secondMonthlyPayment =
        remainingMonths > 0
          ? calculateAnnuityPayment(
              loanAmount,
              baseInterestRate,
              remainingMonths
            )
          : null;

      const totalPayment =
        firstMonthlyPayment * graceMonths +
        (secondMonthlyPayment || 0) * remainingMonths;

      return {
        loanAmount,
        firstMonthlyPayment,
        secondMonthlyPayment,
        totalPayment,
        overpayment: Math.max(totalPayment - loanAmount, 0)
      };
    }

    // Обычная льготная ставка, когда кредит продолжает погашаться
    const firstMonthlyPayment = calculateAnnuityPayment(
      loanAmount,
      graceRate,
      totalMonths
    );

    let remainingLoanAmount = loanAmount;
    const monthlyGraceRate = graceRate / 100 / 12;

    for (let monthIndex = 0; monthIndex < graceMonths; monthIndex += 1) {
      const interestPart = remainingLoanAmount * monthlyGraceRate;
      const principalPart = firstMonthlyPayment - interestPart;

      remainingLoanAmount -= principalPart;
      remainingLoanAmount = Math.max(remainingLoanAmount, 0);
    }

    const secondMonthlyPayment =
      remainingMonths > 0
        ? calculateAnnuityPayment(
            remainingLoanAmount,
            baseInterestRate,
            remainingMonths
          )
        : null;

    const totalPayment =
      firstMonthlyPayment * graceMonths +
      (secondMonthlyPayment || 0) * remainingMonths;

    return {
      loanAmount,
      firstMonthlyPayment,
      secondMonthlyPayment,
      totalPayment,
      overpayment: Math.max(totalPayment - loanAmount, 0)
    };
  }

  function getProgramRateLabel(program) {
    if (!program.graceInterestRate) {
      return `${program.interestRate}%`;
    }

    const graceRateLabel =
      typeof program.graceInterestRate.value === "number"
        ? `${program.graceInterestRate.value}%`
        : `${program.graceInterestRate.min}%–${program.graceInterestRate.max}%`;

    return `${graceRateLabel} → ${program.interestRate}%`;
  }

  function buildProgramDescription(program) {
    let description = program.description;

    description += ` Минимальный первоначальный взнос — ${program.minDownPaymentPercent}%.`;
    description += ` Максимальный срок — ${program.maxTermYears} лет.`;

    if (program.graceInterestRate) {
      const graceRateText =
        typeof program.graceInterestRate.value === "number"
          ? `${program.graceInterestRate.value}%`
          : `${program.graceInterestRate.min}%–${program.graceInterestRate.max}%`;

      description += ` Льготная ставка ${graceRateText} действует ${program.graceInterestRate.periodMonths} мес., затем ${program.interestRate}%.`;

      if (program.graceInterestRate.interestOnly) {
        description += " В течение льготного периода погашаются только проценты без уменьшения основного долга.";
      }
    }

    return description;
  }

  window.initMultiBankMortgageCalculator = function (realEstateObject) {
    const calculatorElement = document.querySelector(
      "[data-mortgage-calculator]"
    );

    if (
      !calculatorElement ||
      !Array.isArray(window.MORTGAGE_PROGRAMS) ||
      !window.MORTGAGE_PROGRAMS.length
    ) {
      return;
    }

    const bankSelectElement = calculatorElement.querySelector(
      "[data-mortgage-bank]"
    );
    const titleElement = calculatorElement.querySelector(
      "[data-mortgage-bank-title]"
    );
    const programSelectElement = calculatorElement.querySelector(
      "[data-mortgage-program]"
    );
    const descriptionElement = calculatorElement.querySelector(
      "[data-mortgage-description]"
    );

    const propertyPriceInput = calculatorElement.querySelector(
      "[data-mortgage-price]"
    );
    const downPaymentInput = calculatorElement.querySelector(
      "[data-mortgage-down-payment]"
    );
    const termInput = calculatorElement.querySelector(
      "[data-mortgage-term]"
    );
    const rateInput = calculatorElement.querySelector(
      "[data-mortgage-rate]"
    );

    const loanAmountElement = calculatorElement.querySelector(
      "[data-mortgage-loan]"
    );
    const monthlyPaymentElement = calculatorElement.querySelector(
      "[data-mortgage-payment]"
    );
    const overpaymentElement = calculatorElement.querySelector(
      "[data-mortgage-overpay]"
    );
    const totalPaymentElement = calculatorElement.querySelector(
      "[data-mortgage-total]"
    );

    if (
      !bankSelectElement ||
      !programSelectElement ||
      !propertyPriceInput ||
      !downPaymentInput ||
      !termInput ||
      !rateInput
    ) {
      return;
    }

    const banksBySlug = {};

    window.MORTGAGE_PROGRAMS.forEach((program) => {
      if (!banksBySlug[program.bankSlug]) {
        banksBySlug[program.bankSlug] = {
          bankSlug: program.bankSlug,
          bankName: program.bankName,
          bankLogo: program.bankLogo,
          programs: []
        };
      }

      banksBySlug[program.bankSlug].programs.push(program);
    });

    const banks = Object.values(banksBySlug);

    bankSelectElement.innerHTML = banks
      .map((bank) => {
        return `<option value="${bank.bankSlug}">${bank.bankName}</option>`;
      })
      .join("");

    function getPropertyPrice() {
      if (typeof window.RealterPrice?.getLiveBynPriceSync === "function") {
        const livePrice = window.RealterPrice.getLiveBynPriceSync(
          realEstateObject
        );

        if (typeof livePrice === "number" && livePrice > 0) {
          return livePrice;
        }
      }

      if (
        typeof realEstateObject?.priceBYN === "number" &&
        realEstateObject.priceBYN > 0
      ) {
        return realEstateObject.priceBYN;
      }

      return 90000;
    }

    function renderPrograms(bankSlug) {
      const selectedBank =
        banksBySlug[bankSlug] ||
        banksBySlug[DEFAULT_BANK_SLUG] ||
        banks[0];

      programSelectElement.innerHTML = selectedBank.programs
        .map((program, index) => {
          return `
            <option value="${index}">
              ${program.programName} · ${getProgramRateLabel(program)}
            </option>
          `;
        })
        .join("");

      rebuildCustomSelect(programSelectElement);

      if (titleElement) {
        titleElement.textContent = `Ипотечный калькулятор — ${selectedBank.bankName}`;
      }
    }

    function getSelectedProgram() {
      const selectedBank = banksBySlug[bankSelectElement.value] || banks[0];
      const selectedProgramIndex = Number(programSelectElement.value) || 0;

      return (
        selectedBank.programs[selectedProgramIndex] ||
        selectedBank.programs[0]
      );
    }

    function updateCalculator() {
      const selectedProgram = getSelectedProgram();

      if (!selectedProgram) {
        return;
      }

      const propertyPrice = Math.max(
        Number(propertyPriceInput.value) || 0,
        0
      );

      const minimumDownPayment = Math.round(
        propertyPrice * (selectedProgram.minDownPaymentPercent / 100)
      );

      downPaymentInput.min = String(minimumDownPayment);

      if (
        !downPaymentInput.value ||
        Number(downPaymentInput.value) < minimumDownPayment
      ) {
        downPaymentInput.value = String(minimumDownPayment);
      }

      const downPayment = Math.min(
        Math.max(Number(downPaymentInput.value) || 0, 0),
        propertyPrice
      );

      termInput.max = String(selectedProgram.maxTermYears);

      if (
        !termInput.value ||
        Number(termInput.value) > selectedProgram.maxTermYears
      ) {
        termInput.value = String(selectedProgram.maxTermYears);
      }

      if (Number(termInput.value) < 1) {
        termInput.value = "1";
      }

      rateInput.value = String(selectedProgram.interestRate);

      const calculationResult = calculateMortgage({
        propertyPrice,
        downPayment,
        years: Number(termInput.value),
        baseInterestRate: Number(selectedProgram.interestRate),
        graceInterestRate: selectedProgram.graceInterestRate || null
      });

      if (descriptionElement) {
        descriptionElement.textContent =
          buildProgramDescription(selectedProgram);
      }

      if (loanAmountElement) {
        loanAmountElement.textContent = formatMoney(
          calculationResult.loanAmount
        );
      }

      if (monthlyPaymentElement) {
        if (calculationResult.secondMonthlyPayment) {
          monthlyPaymentElement.textContent =
            `${formatMoney(calculationResult.firstMonthlyPayment)} → ${formatMoney(calculationResult.secondMonthlyPayment)}`;
        } else {
          monthlyPaymentElement.textContent = formatMoney(
            calculationResult.firstMonthlyPayment
          );
        }
      }

      if (overpaymentElement) {
        overpaymentElement.textContent = formatMoney(
          calculationResult.overpayment
        );
      }

      if (totalPaymentElement) {
        totalPaymentElement.textContent = formatMoney(
          calculationResult.totalPayment
        );
      }
    }

    propertyPriceInput.value = String(getPropertyPrice());

    bankSelectElement.addEventListener("change", () => {
      renderPrograms(bankSelectElement.value);
      programSelectElement.value = "0";

      localStorage.setItem(STORAGE_KEY, bankSelectElement.value);

      updateCalculator();
    });

    programSelectElement.addEventListener("change", updateCalculator);

    [
      propertyPriceInput,
      downPaymentInput,
      termInput,
      rateInput
    ].forEach((inputElement) => {
      inputElement.addEventListener("input", updateCalculator);
      inputElement.addEventListener("change", updateCalculator);
    });

    const savedBankSlug = localStorage.getItem(STORAGE_KEY);

    const initialBankSlug = banksBySlug[savedBankSlug]
      ? savedBankSlug
      : DEFAULT_BANK_SLUG;

    bankSelectElement.value = banksBySlug[initialBankSlug]
      ? initialBankSlug
      : banks[0].bankSlug;

    renderPrograms(bankSelectElement.value);

    programSelectElement.value = "0";

    rebuildCustomSelect(bankSelectElement);
    rebuildCustomSelect(programSelectElement);

    updateCalculator();
  };
})();