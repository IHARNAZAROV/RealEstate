/**
 * validate-objects.cjs
 * Проверяет data/objects.json на корректность перед обработкой:
 *   - Обязательные поля у каждого объекта
 *   - Уникальность slug и id
 *   - Корректность цен (числа > 0)
 *   - Наличие хотя бы одной фотографии
 *
 * При ошибке — выводит список проблем и завершается с кодом 1.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'objects.json');

const REQUIRED_FIELDS = ['id', 'slug', 'title', 'type', 'dealType', 'priceUSD', 'images'];

function validate() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch (err) {
    console.error('❌ Не удалось прочитать objects.json:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error('❌ objects.json пуст или не является массивом');
    process.exit(1);
  }

  const errors = [];
  const seenIds = new Map();
  const seenSlugs = new Map();

  data.forEach((obj, i) => {
    const label = obj.slug || obj.id || `объект #${i + 1}`;

    REQUIRED_FIELDS.forEach(field => {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push(`[${label}] отсутствует обязательное поле: "${field}"`);
      }
    });

    if (obj.priceUSD !== undefined && (typeof obj.priceUSD !== 'number' || obj.priceUSD <= 0)) {
      errors.push(`[${label}] некорректная цена priceUSD: ${obj.priceUSD}`);
    }

    if (Array.isArray(obj.images) && obj.images.length === 0) {
      errors.push(`[${label}] массив images пуст — добавьте хотя бы одно фото`);
    }

    if (obj.id) {
      if (seenIds.has(obj.id)) {
        errors.push(`[${label}] дублирующийся id "${obj.id}" (уже есть у "${seenIds.get(obj.id)}")`);
      } else {
        seenIds.set(obj.id, label);
      }
    }

    if (obj.slug) {
      if (seenSlugs.has(obj.slug)) {
        errors.push(`[${label}] дублирующийся slug "${obj.slug}" (уже есть у "${seenSlugs.get(obj.slug)}")`);
      } else {
        seenSlugs.set(obj.slug, label);
      }
    }
  });

  if (errors.length > 0) {
    console.error(`❌ Найдено ${errors.length} ошибок в objects.json:\n`);
    errors.forEach(e => console.error('  •', e));
    console.error('\nИсправьте ошибки и запустите снова.');
    process.exit(1);
  }

  console.log(`✅ Валидация пройдена: ${data.length} объектов без ошибок`);
}

validate();
