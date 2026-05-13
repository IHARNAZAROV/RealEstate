(function () {
  "use strict";

  const API_URL = "https://api.nbrb.by/exrates/rates/431";
  let ratePromise = null;

  function formatApiDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ru-RU");
  }

  function getTodayIsoDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function normalizeRatePayload(payload) {
    const officialRate = Number(payload?.Cur_OfficialRate);
    const scale = Number(payload?.Cur_Scale) || 1;
    const apiDate = payload?.Date ? new Date(payload.Date) : null;

    if (!Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error("API НБРБ вернул некорректный курс USD");
    }

    return {
      ratePerUnit: officialRate / scale,
      dateLabel: formatApiDate(apiDate),
      fetchedOn: getTodayIsoDate(),
    };
  }

  async function fetchUsdRate() {
    if (ratePromise) {
      return ratePromise;
    }

    const requestUrl = `${API_URL}?_=${Date.now()}`;

    ratePromise = fetch(requestUrl, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Не удалось получить курс USD из API НБРБ");
        }

        return res.json();
      })
      .then((payload) => {
        return normalizeRatePayload(payload);
      })
      .catch((error) => {
        ratePromise = null;
        throw error;
      });

    return ratePromise;
  }

  function getLiveBynPriceSync(obj) {
    if (typeof obj?.livePriceBYN === "number" && obj.livePriceBYN > 0) {
      return obj.livePriceBYN;
    }

    if (typeof obj?.priceBYN === "number" && obj.priceBYN > 0) {
      return obj.priceBYN;
    }

    return null;
  }

  async function enrichObjectWithLivePrice(obj) {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    if (typeof obj.priceUSD === "number" && obj.priceUSD > 0) {
      try {
        const rateData = await fetchUsdRate();
        return {
          ...obj,
          livePriceBYN: Math.round(obj.priceUSD * rateData.ratePerUnit),
        };
      } catch (error) {
        console.error(error);
      }
    }

    return {
      ...obj,
      livePriceBYN: getLiveBynPriceSync(obj),
    };
  }

  async function enrichObjectsWithLivePrices(objects) {
    if (!Array.isArray(objects) || objects.length === 0) {
      return objects;
    }

    const hasUsdObjects = objects.some(
      (item) => typeof item?.priceUSD === "number" && item.priceUSD > 0,
    );

    let rateData = null;

    if (hasUsdObjects) {
      try {
        rateData = await fetchUsdRate();
      } catch (error) {
        console.error(error);
      }
    }

    return objects.map((item) => {
      if (!item || typeof item !== "object") {
        return item;
      }

      if (rateData && typeof item.priceUSD === "number" && item.priceUSD > 0) {
        return {
          ...item,
          livePriceBYN: Math.round(item.priceUSD * rateData.ratePerUnit),
        };
      }

      return {
        ...item,
        livePriceBYN: getLiveBynPriceSync(item),
      };
    });
  }

  window.RealterPrice = {
    fetchUsdRate,
    getLiveBynPriceSync,
    enrichObjectWithLivePrice,
    enrichObjectsWithLivePrices,
  };
})();
