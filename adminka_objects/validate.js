function validateObject(obj, index) {
  const errors = [];

  if (!obj.id || typeof obj.id !== "string") {
    errors.push(`Объект #${index + 1}: отсутствует id`);
  }

  if (!obj.slug || typeof obj.slug !== "string") {
    errors.push(`Объект ${obj.id}: отсутствует slug`);
  }

  if (!obj.title || typeof obj.title !== "string") {
    errors.push(`Объект ${obj.slug}: отсутствует title`);
  }

  if (typeof obj.priceBYN !== "number" || obj.priceBYN <= 0) {
    errors.push(`Объект ${obj.slug}: некорректная цена`);
  }

  if (obj.status) {
    if (!["sold"].includes(obj.status.type)) {
      errors.push(`Объект ${obj.slug}: неизвестный status.type`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(obj.status.date)) {
      errors.push(`Объект ${obj.slug}: некорректная дата продажи`);
    }
  }

  return errors;
}

function validateJSON(objects) {
  let allErrors = [];

  objects.forEach((obj, i) => {
    allErrors = allErrors.concat(validateObject(obj, i));
  });

  return allErrors;
}
