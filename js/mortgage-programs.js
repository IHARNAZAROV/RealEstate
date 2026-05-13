window.MORTGAGE_PROGRAMS = [
  {
    bankName: "Беларусбанк",
    bankSlug: "belarusbank",
    bankLogo: "ББ",
    programName: "Ипотека Экспресс (вторичный рынок)",
    interestRate: 16.9,
    maxTermYears: 20,
    minDownPaymentPercent: 10,
    description:
      "Кредит на покупку квартиры у физлица на вторичном рынке. Ставка 16.9% (для очередников в их населённом пункте — 15.5%)."
  },

  {
    bankName: "Беларусбанк",
    bankSlug: "belarusbank",
    bankLogo: "ББ",
    programName: "Партнёрская новостройка",
    interestRate: 15.9,
    graceInterestRate: {
      min: 3.75,
      max: 10.25,
      periodMonths: 12
    },
    maxTermYears: 20,
    minDownPaymentPercent: 10,
    description:
      "Кредит на покупку готовой квартиры у застройщика. Базовая ставка 15.9% (для очередников — 13.75%). Первые 12 месяцев действует льготная ставка, затем применяется основная."
  },

  {
    bankName: "Банк БелВЭБ",
    bankSlug: "belveb",
    bankLogo: "ВЭБ",
    programName: "Кредит на приобретение недвижимости",
    interestRate: 16.8,
    maxTermYears: 20,
    minDownPaymentPercent: 10,
    description:
      "Кредит на покупку или строительство жилья. Финансирование до 90% стоимости объекта."
  },

  {
    bankName: "Белгазпромбанк",
    bankSlug: "belgazprombank",
    bankLogo: "БГПБ",
    programName: "Скоро новоселье",
    interestRate: 16.75,
    graceInterestRate: {
      value: 14.75,
      periodMonths: 6
    },
    maxTermYears: 20,
    minDownPaymentPercent: 10,
    description:
      "Кредит на покупку готового или строящегося жилья у партнёров банка. Первые 6 месяцев действует сниженная ставка."
  },

  {
    bankName: "Белинвестбанк",
  bankSlug: "belinvestbank",
  bankLogo: "БИБ",
  programName: "Недвижимость в кредит",
  interestRate: 16.5,
  maxTermYears: 20,
  minDownPaymentPercent: 15,
  description:
    "Кредит на покупку жилья на вторичном рынке и готовых квартир от застройщиков."
  },
{
  bankName: "Белагропромбанк",
  bankSlug: "belagroprombank",
  bankLogo: "БАПБ",
  programName: "Покупка недвижимости на вторичном рынке",
  interestRate: 16.75,
  graceInterestRate: {
    value: 14.5,
    periodMonths: 6,
    interestOnly: true
  },
  maxTermYears: 20,
  minDownPaymentPercent: 10,
  description:
    "Первые 180 дней ставка 14.5% с отсрочкой погашения основного долга, затем 16.75%."
},
{
  bankName: "Белагропромбанк",
  bankSlug: "belagroprombank",
  bankLogo: "БАПБ",
  programName: "Рефинансирование кредита на недвижимость",
  interestRate: 16.75,
  graceInterestRate: {
    value: 14.5,
    periodMonths: 6,
    interestOnly: true
  },
  maxTermYears: 20,
  minDownPaymentPercent: 0,
  description:
    "Рефинансирование ипотечного кредита из другого банка. Первые 180 дней — 14.5%, затем 16.75%."
},
  {
    bankName: "БТА Банк",
    bankSlug: "bta",
    bankLogo: "BTA",
    programName: "Кредит на покупку жилья",
    interestRate: 19.5,
    maxTermYears: 15,
    minDownPaymentPercent: 20,
    description:
      "Базовый жилищный кредит с повышенным первоначальным взносом."
  },

  {
    bankName: "Приорбанк",
    bankSlug: "priorbank",
    bankLogo: "PB",
    programName: "Недвижимость в кредит",
    interestRate: 16,
    graceInterestRate: {
      value: 14,
      periodMonths: 18
    },
    maxTermYears: 20,
    minDownPaymentPercent: 20,
    description:
      "Кредит на покупку квартиры. Первые 18 месяцев ставка 14%, затем 16%."
  },

  {
    bankName: "Приорбанк",
    bankSlug: "priorbank",
    bankLogo: "PB",
    programName: "Недвижимость у партнёров",
    interestRate: 16,
    graceInterestRate: {
      value: 14,
      periodMonths: 18
    },
    maxTermYears: 20,
    minDownPaymentPercent: 15,
    description:
      "Кредит на покупку недвижимости у партнёров банка. Первые 18 месяцев ставка 14%, затем 16%."
  }
];