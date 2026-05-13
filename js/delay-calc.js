(function () {
  'use strict';

  var INFLATION_RATE    = 0.06;
  var PRICE_GROWTH      = 0.08;
  var MORTGAGE_RATE     = 0.15;
  var MORTGAGE_YEARS    = 20;
  var RENOV_GROWTH      = 0.12;
  var DEPOSIT_RATE      = 0.10;

  function mortgageMultiplier() {
    var r = MORTGAGE_RATE / 12;
    var n = MORTGAGE_YEARS * 12;
    var factor = Math.pow(1 + r, n);
    return (r * factor / (factor - 1)) * n;
  }

  var MORT_MULT = mortgageMultiplier();

  function calculate(budget, monthlyRent, renovBudget) {
    var priceIncrease   = budget * PRICE_GROWTH;
    var mortgageOverpay = priceIncrease * (MORT_MULT - 1);
    var inflationLoss   = budget * INFLATION_RATE;
    var rentYear        = monthlyRent * 12;
    var renovLoss       = renovBudget * RENOV_GROWTH;
    var depositGain     = budget * DEPOSIT_RATE;

    var totalLoss = priceIncrease + mortgageOverpay + inflationLoss + rentYear + renovLoss;
    var netLoss   = Math.max(0, totalLoss - depositGain);

    return {
      priceIncrease:   priceIncrease,
      mortgageOverpay: mortgageOverpay,
      inflationLoss:   inflationLoss,
      rentYear:        rentYear,
      renovLoss:       renovLoss,
      depositGain:     depositGain,
      totalLoss:       totalLoss,
      netLoss:         netLoss,
      monthlyRent:     monthlyRent
    };
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('ru-BY');
  }

  function animCount(el, target, duration) {
    if (!el) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setBar(id, pct) {
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () { el.style.width = Math.min(pct, 100) + '%'; }, 80);
  }

  function showGroup(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  }

  function setBarAmt(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = fmt(value);
  }

  function render(r, els) {
    var DUR = 700;
    var maxBar = Math.max(
      r.priceIncrease, r.mortgageOverpay,
      r.inflationLoss, r.rentYear, r.renovLoss, r.depositGain
    ) || 1;

    animCount(els.priceVal,    r.priceIncrease,   DUR);
    animCount(els.mortgageVal, r.mortgageOverpay, DUR);
    animCount(els.inflationVal,r.inflationLoss,   DUR);
    animCount(els.rentVal,     r.rentYear,        DUR);
    animCount(els.renovVal,    r.renovLoss,       DUR);
    animCount(els.depositVal,  r.depositGain,     DUR);
    animCount(els.totalVal,    r.totalLoss,       DUR);
    animCount(els.netVal,      r.netLoss,         DUR);
    animCount(els.netVal2,     r.netLoss,         DUR);

    setBar('dcBarPrice',    r.priceIncrease   / maxBar * 100);
    setBar('dcBarMortgage', r.mortgageOverpay / maxBar * 100);
    setBar('dcBarInflation',r.inflationLoss   / maxBar * 100);
    setBar('dcBarRent',     r.rentYear        / maxBar * 100);
    setBar('dcBarRenov',    r.renovLoss       / maxBar * 100);
    setBar('dcBarDeposit',  r.depositGain     / maxBar * 100);

    setBarAmt('dcBarPriceAmt',    r.priceIncrease);
    setBarAmt('dcBarMortgageAmt', r.mortgageOverpay);
    setBarAmt('dcBarInflationAmt',r.inflationLoss);
    setBarAmt('dcBarRentAmt',     r.rentYear);
    setBarAmt('dcBarRenovAmt',    r.renovLoss);
    setBarAmt('dcBarDepositAmt',  r.depositGain);

    showGroup('dcGroupRent',  r.rentYear  > 0);
    showGroup('dcGroupRenov', r.renovLoss > 0);
    showGroup('dcBarRowRent', r.rentYear  > 0);
    showGroup('dcBarRowRenov',r.renovLoss > 0);

    var rentMetricEl = document.getElementById('dcMetricRentVal');
    var rentLbl      = document.getElementById('dcMetricRentLbl');
    var rentWrap     = document.getElementById('dcMetricRent');
    if (r.monthlyRent > 0 && rentMetricEl) {
      var months = Math.round(r.netLoss / r.monthlyRent);
      animCount(rentMetricEl, months, DUR);
      if (rentLbl) rentLbl.textContent = 'месяцев аренды = ваши потери';
      if (rentWrap) rentWrap.style.display = '';
    } else {
      if (rentWrap) rentWrap.style.display = 'none';
    }

    var pctEl = document.getElementById('dcMetricPctVal');
    if (pctEl && r.totalLoss > 0) {
      var pct = Math.round(r.netLoss / (r.totalLoss || 1) * 100);
      animCount(pctEl, pct, DUR);
    }

    var savingEl = document.getElementById('dcMetricSavingVal');
    if (savingEl) {
      var daily = Math.round(r.netLoss / 365);
      animCount(savingEl, daily, DUR);
    }
  }

  function init() {
    var form       = document.getElementById('delayCalcForm');
    var resultsEl  = document.getElementById('delayCalcResults');
    var budgetEl   = document.getElementById('dcBudget');
    var rentEl     = document.getElementById('dcRent');
    var renovEl    = document.getElementById('dcRenov');

    if (!form || !resultsEl || !budgetEl) return;

    var els = {
      priceVal:    document.getElementById('dcPriceVal'),
      mortgageVal: document.getElementById('dcMortgageVal'),
      inflationVal:document.getElementById('dcInflationVal'),
      rentVal:     document.getElementById('dcRentVal'),
      renovVal:    document.getElementById('dcRenovVal'),
      depositVal:  document.getElementById('dcDepositVal'),
      totalVal:    document.getElementById('dcTotalVal'),
      netVal:      document.getElementById('dcNetVal'),
      netVal2:     document.getElementById('dcNetVal2')
    };

    function getNum(el) {
      if (!el) return 0;
      var v = parseFloat(el.value.replace(/\s/g, '').replace(',', '.'));
      return isNaN(v) || v < 0 ? 0 : v;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var budget = getNum(budgetEl);
      if (budget < 1000) {
        budgetEl.classList.add('input-error');
        budgetEl.focus();
        setTimeout(function () { budgetEl.classList.remove('input-error'); }, 1800);
        return;
      }
      var monthlyRent = getNum(rentEl);
      var renovBudget = getNum(renovEl);
      var result = calculate(budget, monthlyRent, renovBudget);
      render(result, els);
      if (!resultsEl.classList.contains('is-visible')) {
        resultsEl.classList.add('is-visible');
        setTimeout(function () {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    });

    [budgetEl, rentEl, renovEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () {
        if (resultsEl.classList.contains('is-visible')) {
          resultsEl.classList.remove('is-visible');
          document.querySelectorAll('.delay-calc__bar-fill').forEach(function (b) {
            b.style.width = '0%';
          });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
