/**
 * update-all.cjs
 * Запускает все обслуживающие скрипты в правильном порядке:
 *   1. backup-objects.cjs          — резервная копия objects.json
 *   2. validate-objects.cjs        — проверка данных перед обработкой
 *   3. split-objects.cjs           — разбивает objects.json на отдельные файлы
 *   4. update-meta-descriptions.cjs — обновляет мета-описания
 *   5. update-prices-byn.cjs       — пересчитывает цены BYN по курсу НБРБ
 *   6. generate-sitemap.cjs        — генерирует sitemap.xml
 *
 * Использование: node scripts/update-all.cjs
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'backup-objects.cjs',
  'validate-objects.cjs',
  'split-objects.cjs',
  'update-meta-descriptions.cjs',
  'update-prices-byn.cjs',
  'generate-sitemap.cjs',
];

console.log('=== Запуск обновления ===\n');

for (const script of scripts) {
  console.log(`▶ ${script}...`);
  try {
    execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
    console.log(`✓ ${script} выполнен\n`);
  } catch (err) {
    console.error(`\n✗ Ошибка в ${script}. Остановка.`);
    process.exit(1);
  }
}

console.log('=== Всё готово ===');
