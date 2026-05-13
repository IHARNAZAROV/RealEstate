/**
 * backup-objects.cjs
 * Создаёт резервную копию data/objects.json в папке backups/
 * с именем вида: objects_2026-04-07_14-30-00.json
 *
 * Хранит последние 3 копии, старые удаляет автоматически.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'data', 'objects.json');
const BACKUP_DIR = path.join(ROOT, 'backups');
const MAX_BACKUPS = 3;

function pad(n) {
  return String(n).padStart(2, '0');
}

function getTimestamp() {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${date}_${time}`;
}

try {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Файл не найден: ${SOURCE}`);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupName = `objects_${getTimestamp()}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(SOURCE, backupPath);
  console.log(`✅ Резервная копия создана: backups/${backupName}`);

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('objects_') && f.endsWith('.json'))
    .sort();

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(0, files.length - MAX_BACKUPS);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`🗑  Удалена старая копия: backups/${f}`);
    });
  }
} catch (err) {
  console.error('❌ Ошибка резервного копирования:', err.message);
  process.exit(1);
}
