/**
 * update-prices-byn.cjs
 * Обновляет поле priceBYN в data/objects.json и data/objects-list.json
 * по актуальному курсу USD→BYN с API Национального банка Беларуси.
 *
 * API: https://api.nbrb.by/exrates/rates/431
 * Запуск: node scripts/update-prices-byn.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NBRB_URL = 'https://api.nbrb.by/exrates/rates/431';
const OBJECTS_FILE = path.join(ROOT, 'data', 'objects.json');
const LIST_FILE = path.join(ROOT, 'data', 'objects-list.json');

async function fetchRate() {
  const res = await fetch(NBRB_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} от API НБРБ`);
  const data = await res.json();
  const rate = Number(data?.Cur_OfficialRate);
  const scale = Number(data?.Cur_Scale) || 1;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('API НБРБ вернул некорректный курс');
  return rate / scale;
}

function recalcPrices(items, ratePerUnit) {
  let updated = 0;
  items.forEach(obj => {
    if (typeof obj.priceUSD === 'number' && obj.priceUSD > 0) {
      const newBYN = Math.round(obj.priceUSD * ratePerUnit);
      if (obj.priceBYN !== newBYN) {
        obj.priceBYN = newBYN;
        updated++;
      }
    }
  });
  return updated;
}

async function run() {
  let rate;
  try {
    rate = await fetchRate();
  } catch (err) {
    console.error('❌ Не удалось получить курс НБРБ:', err.message);
    process.exit(1);
  }

  const rateFormatted = rate.toFixed(4);
  console.log(`   Курс USD: 1 USD = ${rateFormatted} BYN`);

  let totalUpdated = 0;

  for (const filePath of [OBJECTS_FILE, LIST_FILE]) {
    const fileName = path.basename(filePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠ Файл не найден, пропускаю: ${fileName}`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const items = Array.isArray(data) ? data : [];
      const updated = recalcPrices(items, rate);
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
      console.log(`   ${fileName}: пересчитано ${updated} из ${items.length} объектов`);
      totalUpdated += updated;
    } catch (err) {
      console.error(`❌ Ошибка обработки ${fileName}:`, err.message);
      process.exit(1);
    }
  }

  console.log(`✅ Цены BYN обновлены (курс ${rateFormatted}, изменено ${totalUpdated} записей)`);
}

run();
