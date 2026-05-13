/**
 * update-meta-descriptions.cjs
 * Добавляет поле metaDescription в каждый объект в data/objects-list.json,
 * если оно ещё не задано. Обрезает до 160 символов.
 *
 * Запуск: node scripts/update-meta-descriptions.cjs
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'objects-list.json');

try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  data.forEach(obj => {
    if (!obj.metaDescription) {
      const source = obj.cardDescription || obj.description || '';

      const metaDesc = source
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 160);

      obj.metaDescription = metaDesc.endsWith('.') ? metaDesc : metaDesc + '.';
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Обновлено ${data.length} объектов. Meta-descriptions добавлены.`);
} catch (err) {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
}
