(function () {
  'use strict';

  // =====================================================================
  //  TEMPLATE — описывает структуру JSON объекта недвижимости.
  //  Все ключи и порядок — как в data/objects.json.
  //  Значения по умолчанию: null для скаляров, [] для массивов,
  //  вложенный объект — для location.
  // =====================================================================
  var TEMPLATE = {
    id: null,
    slug: null,
    title: null,
    type: null,
    dealType: 'Продажа',
    city: null,
    address: null,
    priceBYN: null,
    priceUSD: null,
    cardDescription: null,

    rooms: null,
    roomsSeparate: null,

    areaPlot: null,
    areaTotal: null,
    areaLiving: null,
    areaKitchen: null,
    areaSNB: null,

    floor: null,
    floorsTotal: null,
    yearBuilt: null,
    readinessPercent: null,

    houseMaterial: null,
    roofMaterial: null,
    houseType: null,
    layout: null,
    renovation: null,
    bathroom: null,
    balcony: null,

    heating: null,
    gas: null,
    sewerage: null,
    electricity: null,
    water: null,

    bathhouse: null,
    garage: null,

    location: { lat: null, lng: null },

    landStatus: null,
    ownership: null,
    saleTerms: null,
    recommended: null,

    infrastructure: [],
    additionalBuildings: [],
    description: null,
    features: [],
    images: [],

    publishedAt: null,
    contractNumber: null,
    livePriceBYN: null
  };

  // =====================================================================
  //  CLEAN — очистка входного текста.
  // =====================================================================
  function cleanText(raw) {
    if (raw == null) return '';
    var t = String(raw);
    // удалить HTML-теги
    t = t.replace(/<[^>]*>/g, ' ');
    // нормализовать переносы
    t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // схлопнуть двойные+ переносы в один
    t = t.replace(/\n{2,}/g, '\n');
    // нормализовать пробелы (без затрагивания \n)
    t = t.split('\n').map(function (line) {
      return line.replace(/[ \t\u00A0]+/g, ' ').trim();
    }).join('\n');
    return t.trim();
  }

  // =====================================================================
  //  HELPERS
  // =====================================================================
  function toNumber(s) {
    if (s == null) return null;
    var n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function firstMatch(text, re) {
    var m = text.match(re);
    return m ? m[1] : null;
  }

  function has(text, re) {
    return re.test(text);
  }

  // транслитерация для slug
  function transliterate(str) {
    var map = {
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
      к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
      х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
    };
    return str.toLowerCase().split('').map(function (ch) {
      if (map[ch] != null) return map[ch];
      if (/[a-z0-9]/.test(ch)) return ch;
      if (/\s|[-_/]/.test(ch)) return '-';
      return '';
    }).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  // =====================================================================
  //  PARSERS — каждое правило возвращает значение или null.
  // =====================================================================
  function parseTitle(text) {
    // ищем первую строку, которая ВЫГЛЯДИТ как заголовок объекта
    // (начинается с "Дом", "Квартира", "N-комнатная", "Коттедж" и т.п.).
    // Если первая контентная строка не похожа на заголовок — возвращаем null,
    // чтобы потом сработал buildTitle().
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (KNOWN_HEADERS_RE && KNOWN_HEADERS_RE.test(line)) continue;
      if (/^(описание|параметры\s*объекта|местоположение|инфраструктура|примечание)\s*:?\s*$/i.test(line)) continue;
      if (/:\s*$/.test(line)) continue;
      // должно начинаться с типа объекта или "N-комнатная"
      if (/^(дом|квартира|коттедж|таунхаус|участок|\d+[\-\s]*комнатн)/i.test(line) && line.length <= 140) {
        return line;
      }
      // первая «контентная» строка — не похожа на title, прекращаем
      return null;
    }
    return null;
  }

  function parseType(text) {
    if (/квартир/i.test(text)) return 'Квартира';
    if (/(?:^|[^а-яё])дом(?:[^а-яё]|$)|коттедж/i.test(text)) return 'Дом';
    if (/участок|земельн/i.test(text)) return 'Участок';
    return null;
  }

  function parseDealType(text) {
    if (/аренд|снять|сдаётся|сдается/i.test(text)) return 'Аренда';
    if (/продаж|продаётся|продается|купить/i.test(text)) return 'Продажа';
    return null;
  }

  function parseCity(text) {
    // явный город "г. <Имя>" имеет приоритет над названием района
    var m = text.match(/(?:^|[^а-яё])г\.?\s*([А-ЯЁ][а-яё\-]+)/);
    if (m) return m[1];
    if (/(?:^|[^а-яё])лида(?:[^а-яё]|$)/i.test(text)) return 'Лида';
    if (/лидск(?:ий|ого)\s+район/i.test(text)) return 'Лидский район';
    return null;
  }

  function parseAddress(text) {
    var patterns = [
      /(?:^|[^а-яё])(д\.\s*[А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)/,
      /(деревн[яе]\s+[А-ЯЁ][а-яё\-]+)/i,
      /(ул\.\s*[А-ЯЁ][а-яё\.\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?(?:[,\s]*д\.?\s*\d+[а-яА-Я]?)?(?:[,\s]*корпус\s*\d+)?)/i,
      /(улица\s+[А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)/i,
      /(пер\.\s*[А-ЯЁ][а-яё\-]+)/i,
      /(пр-?т\.?\s*[А-ЯЁ][а-яё\-]+)/i,
      /(южный\s+городок(?:[,\s]*д\.?\s*\d+)?)/i,
      /(северный\s+городок(?:[,\s]*ул\.?\s*[А-ЯЁ][а-яё\-]+)?)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) return m[1].replace(/\s+/g, ' ').trim();
    }
    return null;
  }

  function parsePriceUSD(text) {
    var m = text.match(/(\d[\d\s]{2,})\s*(?:USD|\$|у\.?\s*е\.?|долл)/i);
    return m ? toNumber(m[1]) : null;
  }

  function parsePriceBYN(text) {
    var m = text.match(/(\d[\d\s]{2,})\s*(?:BYN|бел\.?\s*руб|бел\.?\s*р\.?|руб\.?(?!\.)|byn)/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseAreaTotal(text) {
    var m = text.match(/общ(?:ая|\.)?\s*(?:площад[ьи][а-яё]*\s*)?[^0-9\n]{0,15}(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i);
    if (m) return toNumber(m[1]);
    m = text.match(/площад[ьи]\s*общ[а-яё]*[^0-9\n]{0,10}(\d+(?:[.,]\d+)?)/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseAreaLiving(text) {
    var m = text.match(/жил(?:ая|\.)?\s*(?:площад[ьи][а-яё]*\s*)?[^0-9\n]{0,15}(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)?/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseAreaKitchen(text) {
    var m = text.match(/кухн[ияеюй]+[^0-9\n]{0,15}(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)?/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseAreaPlot(text) {
    var m = text.match(/(\d+(?:[.,]\d+)?)\s*сот(?:ок|ки|ка|\.)/i);
    if (m) return toNumber(m[1]);
    m = text.match(/участ[а-яё]*[^0-9\n]{0,15}(\d+(?:[.,]\d+)?)/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseAreaSNB(text) {
    var m = text.match(/(?:по\s*)?СНБ[^0-9\n]{0,15}(\d+(?:[.,]\d+)?)/i);
    return m ? toNumber(m[1]) : null;
  }

  function parseFloor(text) {
    var m = text.match(/на\s*(\d+)[\-\s]*(?:м\s*)?этаж/i);
    if (m) return parseInt(m[1], 10);
    return null;
  }

  function parseFloorsTotal(text) {
    var m = text.match(/(\d+)[\-\s]*этажн[а-яё]+\s*дом/i);
    if (m) return parseInt(m[1], 10);
    m = text.match(/этажност[ьи][^0-9\n]{0,10}(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseYearBuilt(text) {
    var m = text.match(/(\d{4})\s*год[ау]?\s*постройк/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseReadinessPercent(text) {
    var m = text.match(/готовност[ьи][^0-9\n]{0,15}(\d{1,3})\s*%?/i);
    if (m) return parseInt(m[1], 10);
    m = text.match(/(\d{1,3})\s*%\s*готовност/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseRooms(text) {
    var m = text.match(/(\d+)[\-\s]*комнатн/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseRoomsSeparate(text) {
    var m = text.match(/(\d+)\s*раздельн[а-яё]*\s*комнат/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseHouseMaterial(text) {
    if (/бревенчат/i.test(text)) return 'Бревенчатый';
    if (/кирпичн[а-яё]*\s*дом|стены\s*кирпич/i.test(text)) return 'Кирпичный';
    if (/каркасн/i.test(text)) return 'Каркасный';
    if (/блочн[а-яё]*\s*дом|газосиликат/i.test(text)) return 'Блочный';
    if (/брусов/i.test(text)) return 'Брусовой';
    return null;
  }

  function parseRoofMaterial(text) {
    if (/шифер/i.test(text)) return 'Шифер';
    if (/металлочерепиц/i.test(text)) return 'Металлочерепица';
    if (/профнастил/i.test(text)) return 'Профнастил';
    if (/ондулин/i.test(text)) return 'Ондулин';
    if (/мягк[а-яё]*\s*кровл/i.test(text)) return 'Мягкая кровля';
    return null;
  }

  function parseHouseType(text) {
    if (/панельн[а-яё]*\s*(?:дом|здан)/i.test(text)) return 'Панельный';
    if (/кирпичн[а-яё]*\s*(?:дом|здан)/i.test(text)) return 'Кирпичный';
    if (/блочн[а-яё]*\s*(?:дом|здан)/i.test(text)) return 'Блочный';
    if (/монолитн/i.test(text)) return 'Монолитный';
    return null;
  }

  function parseHeating(text) {
    if (/печн[а-яё]*\s*отопл|отоплен[а-яё]*\s*печн/i.test(text)) return 'Печное';
    if (/газов[а-яё]*\s*отопл|отоплен[а-яё]*\s*газов|на\s*газу/i.test(text)) return 'На газу';
    if (/электрическ[а-яё]*\s*отопл/i.test(text)) return 'Электрическое';
    if (/центральн[а-яё]*\s*отопл/i.test(text)) return 'Центральное';
    return null;
  }

  function parseGas(text) {
    if (/баллон/i.test(text)) return 'Баллон';
    if (/магистральн[а-яё]*\s*газ|центральн[а-яё]*\s*газ|газ\s*есть|подключ[а-яё]*\s*газ/i.test(text)) return 'Есть';
    if (/без\s*газа|нет\s*газа/i.test(text)) return 'Нет';
    return null;
  }

  function parseSewerage(text) {
    if (/центральн[а-яё]*\s*канализ/i.test(text)) return 'Центральная';
    if (/местн[а-яё]*\s*канализ|септик/i.test(text)) return 'Местная';
    if (/с\/у\s*на\s*улиц|туалет\s*на\s*улиц/i.test(text)) return 'С/у на улице';
    return null;
  }

  function parseElectricity(text) {
    if (/электричеств[а-яё]*\s*есть|есть\s*электр|электр[а-яё]*\s*есть|подключ[а-яё]*\s*электр/i.test(text)) return 'Есть';
    if (/без\s*электр|нет\s*электр/i.test(text)) return 'Нет';
    return null;
  }

  function parseWater(text) {
    if (/центральн[а-яё]*\s*водопров/i.test(text)) return 'Центральный водопровод';
    if (/колодец/i.test(text)) return 'Колодец';
    if (/скважин/i.test(text)) return 'Скважина';
    return null;
  }

  function parseBathhouse(text) {
    if (/баня|сауна/i.test(text)) return 'Есть';
    return null;
  }

  function parseGarage(text) {
    if (/гараж/i.test(text)) return 'Есть';
    return null;
  }

  function parseBalcony(text) {
    if (/лоджи/i.test(text)) return 'Лоджия';
    if (/балкон/i.test(text)) return 'Балкон';
    return null;
  }

  function parseRenovation(text) {
    if (/дизайнерск[а-яё]*\s*ремонт|евроремонт/i.test(text)) return 'Отличный';
    if (/отличн[а-яё]*\s*ремонт/i.test(text)) return 'Отличный';
    if (/хорош[а-яё]*\s*ремонт/i.test(text)) return 'Хороший';
    if (/требует\s*ремонт/i.test(text)) return 'Требует ремонта';
    return null;
  }

  function parseBathroom(text) {
    if (/совмещ[а-яё]*\s*санузел|совмещ[а-яё]*\s*с\/у/i.test(text)) return 'Совмещенный';
    if (/раздельн[а-яё]*\s*санузел|раздельн[а-яё]*\s*с\/у/i.test(text)) return 'Раздельный';
    return null;
  }

  function parseLandStatus(text) {
    if (/пожизненн[а-яё]*\s*наследуем/i.test(text)) return 'Пожизненно наследуемое владение';
    if (/частн[а-яё]*\s*собственност/i.test(text)) return 'Частная собственность';
    if (/арен[а-яё]*\s*земл/i.test(text)) return 'Аренда земли';
    return null;
  }

  function parseOwnership(text) {
    if (/частн[а-яё]*\s*собственност/i.test(text)) return 'Частная';
    return null;
  }

  function parseSaleTerms(text) {
    if (/чист[а-яё]*\s*продаж/i.test(text)) return 'Чистая продажа';
    if (/обмен/i.test(text)) return 'Возможен обмен';
    return null;
  }

  function parseLocation(text) {
    // "Координаты\n53.884503, 25.280047" или "Координаты: 53.884503, 25.280047"
    var m = text.match(/координаты[\s:]*\n?\s*(-?\d+\.\d+)\s*[,;\s]+\s*(-?\d+\.\d+)/i);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    var m2 = text.match(/(?:location|coords?)[^0-9\-]*(-?\d+\.\d+)[\s,;]+(-?\d+\.\d+)/i);
    if (m2) return { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) };
    var m3 = text.match(/lat[^0-9\-]*(-?\d+\.\d+)[\s\S]{0,40}?lng[^0-9\-]*(-?\d+\.\d+)/i);
    if (m3) return { lat: parseFloat(m3[1]), lng: parseFloat(m3[2]) };
    return null;
  }

  // массивы из маркированных строк
  function parseListBy(text, keywords) {
    var lines = text.split('\n');
    var collecting = false;
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lower = line.toLowerCase();
      var startsSection = keywords.some(function (kw) {
        return lower.indexOf(kw) === 0 || lower.indexOf(kw + ':') !== -1;
      });
      if (startsSection) {
        collecting = true;
        // если на той же строке после двоеточия идёт перечень
        var tail = line.split(':')[1];
        if (tail) {
          tail.split(/[,;]/).forEach(function (p) {
            var v = p.trim();
            if (v) items.push(v);
          });
        }
        continue;
      }
      if (collecting) {
        var m = line.match(/^[\-•–*]\s*(.+)/);
        if (m) {
          items.push(m[1].trim());
        } else if (line === '') {
          collecting = false;
        } else if (!/[:]\s*$/.test(line) && items.length > 0) {
          // строка без маркера после списка — стоп
          collecting = false;
        }
      }
    }
    return items;
  }

  function parseFeatures(text) {
    var items = parseListBy(text, ['особенности', 'features', 'преимущества']);
    return items;
  }

  function parseInfrastructure(text) {
    // 1) Если есть структурный блок "Инфраструктура" — берём всё до следующей секции.
    var section = extractSection(text, ['инфраструктура', 'рядом', 'окружение']);
    if (section) {
      var items = section.split('\n')
        .map(function (l) { return l.replace(/^[\-•–*]\s*/, '').trim(); })
        .filter(function (l) { return l && l.length < 120; });
      if (items.length) return dedupe(items);
    }
    // 2) старый bullet-парсер
    var bullets = parseListBy(text, ['инфраструктура', 'рядом', 'окружение']);
    if (bullets.length) return dedupe(bullets);
    // 3) fallback — собираем по ключевым словам
    var bag = [];
    var KW = [
      ['сад(?:[^а-яё]|$)', 'Сад'],
      ['огород', 'Огород'],
      ['рядом\\s*лес', 'Рядом лес'],
      ['водоем|водоём|озер|река', 'Водоем'],
      ['хозпостро', 'Хозпостройки'],
      ['остановк', 'Остановка общественного транспорта рядом'],
      ['школ', 'Школа рядом'],
      ['детск[а-яё]*\\s*сад', 'Детский сад рядом'],
      ['поликлиник', 'Поликлиника рядом'],
      ['магазин', 'Магазины рядом']
    ];
    for (var i = 0; i < KW.length; i++) {
      if (new RegExp(KW[i][0], 'i').test(text) && bag.indexOf(KW[i][1]) === -1) {
        bag.push(KW[i][1]);
      }
    }
    return bag;
  }

  function dedupe(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  // Извлекает содержимое секции (между заголовком и следующей пустой строкой
  // ИЛИ следующим известным заголовком).
  function extractSection(text, headings) {
    var lines = text.split('\n');
    var collecting = false;
    var collected = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var lower = line.toLowerCase();
      if (!collecting) {
        var isHeader = headings.some(function (h) {
          return lower === h || lower === h + ':' || lower.indexOf(h + ':') === 0;
        });
        if (isHeader) {
          collecting = true;
          // если значение в той же строке после ":"
          var idx = line.indexOf(':');
          if (idx !== -1) {
            var tail = line.slice(idx + 1).trim();
            if (tail) collected.push(tail);
          }
        }
        continue;
      }
      // мы внутри секции
      if (line === '') continue;
      // если строка похожа на следующий заголовок секции — стоп
      if (KNOWN_HEADERS_RE.test(line)) break;
      collected.push(line);
    }
    return collected.join('\n');
  }

  // Заголовки структурированных секций — используются для определения границ.
  var KNOWN_HEADERS_RE = /^(?:параметры\s*объекта|тип\s*объекта|площад[ьи]\s*(?:участка|общая|жилая|кухни)|уровней\s*в\s*доме|год\s*постройки|материал\s*(?:стен|крыши)|отопление|газ|канализация|электроснабжение|вода|баня|гараж|балкон|тип\s*дома|ремонт|санузел|статус\s*земли|условия\s*продажи|номер\s*договора|инфраструктура|примечание|описание|местоположение|область|район|населенн[а-яё]*\s*пункт|улица|координаты|особенности|комнат[а-яё]*|раздельных\s*комнат|этаж[а-яё]*|этажност[а-яё]*|цена\s*(?:byn|usd))[\s:]*$/i;

  function parseAdditionalBuildings(text) {
    return parseListBy(text, ['дополнительные постройки', 'постройки', 'хозпостройки']);
  }

  function parseImages(text) {
    var matches = text.match(/\/images\/objects\/[a-z0-9_\-\.\/]+\.(?:webp|jpg|jpeg|png)/gi);
    if (!matches) return [];
    var seen = {};
    var out = [];
    matches.forEach(function (u) {
      if (!seen[u]) { seen[u] = 1; out.push(u); }
    });
    return out;
  }

  function parsePublishedAt(text) {
    // 1) явная метка "Опубликовано" / "Дата публикации"
    var m = text.match(/(?:опубликовано|дата\s*публикации)[\s:]*?(\d{4}-\d{2}-\d{2})/i);
    if (m) return m[1];
    var m1 = text.match(/(?:опубликовано|дата\s*публикации)[\s:]*?(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/i);
    if (m1) return m1[3] + '-' + ('0' + m1[2]).slice(-2) + '-' + ('0' + m1[1]).slice(-2);
    // 2) дата из номера договора → "Договор № X от DD.MM.YYYY"
    var m2 = text.match(/договор[\s\S]{0,40}?от\s+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/i);
    if (m2) return m2[3] + '-' + ('0' + m2[2]).slice(-2) + '-' + ('0' + m2[1]).slice(-2);
    return null;
  }

  function parseContractNumber(text) {
    var m = text.match(/(Договор\s*№\s*[\d\/\-]+(?:\s+от\s+\d{1,2}[.\/]\d{1,2}[.\/]\d{4})?)/i);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
    // формат "Номер договора\n92/4 от 24.04.2026"
    m = text.match(/номер\s*договора[\s:]*\n?\s*(\d+\/\d+(?:\s+от\s+\d{1,2}[.\/]\d{1,2}[.\/]\d{4})?)/i);
    if (m) return 'Договор № ' + m[1].replace(/\s+/g, ' ').trim();
    return null;
  }

  function parseRecommended(text) {
    if (/рекоменд(?:ован|уем|ованный)/i.test(text)) return true;
    return null;
  }

  function parseDescription(text) {
    // если есть структурный блок "Описание" / "Примечание" — берём только его
    var section = extractSection(text, ['описание', 'примечание']);
    if (section && section.length > 20) return section;
    return text || null;
  }

  function parseCardDescription(text) {
    // первое короткое предложение после заголовка, в идеале содержащее площадь
    var paragraphs = text.split('\n').filter(Boolean);
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].trim();
      // пропускаем заголовки секций
      if (KNOWN_HEADERS_RE.test(p)) continue;
      if (/^(описание|параметры\s*объекта|местоположение|инфраструктура|примечание)\s*:?\s*$/i.test(p)) continue;
      if (p.length > 30 && p.length < 240 && /площад|кварт|дом|участ|сот|м²/i.test(p)) {
        return p;
      }
    }
    return null;
  }

  function buildSlug(title, type, city, address) {
    var parts = [];
    if (type) parts.push(type);
    if (city) parts.push(city);
    if (address) parts.push(address);
    if (!parts.length && title) parts.push(title);
    if (!parts.length) return null;
    return transliterate(parts.join(' '));
  }

  function buildTitle(data) {
    if (!data.type && !data.city && !data.address) return null;
    var parts = [];
    if (data.rooms) parts.push(data.rooms + '-комнатная');
    if (data.type) parts.push(data.type === 'Квартира' ? 'квартира' : data.type);
    if (data.city) {
      if (/район/i.test(data.city)) parts.push('в ' + data.city);
      else parts.push('в г. ' + data.city);
    }
    if (data.address) {
      var a = data.address;
      if (/^ул\./i.test(a)) parts.push('на ' + a.replace(/^ул\./i, 'улице'));
      else if (/^улица/i.test(a)) parts.push('на ' + a);
      else if (/^д\./i.test(a) || /^деревн[яе]/i.test(a)) parts.push(a);
      else parts.push(a);
    }
    var t = parts.join(' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // =====================================================================
  //  LABELED FIELDS — структурный извлекатель пар "Label\nValue"
  //  и "Label: Value". Используется для блока "Параметры объекта".
  // =====================================================================
  var LABEL_MAP = {
    'тип объекта':            { key: 'type', map: function (v) { return v; } },
    'тип дома':               { key: 'houseType', map: function (v) { return v; } },
    'площадь участка':        { key: 'areaPlot', map: toNumber },
    'площадь общая':          { key: 'areaTotal', map: toNumber },
    'площадь жилая':          { key: 'areaLiving', map: toNumber },
    'площадь кухни':          { key: 'areaKitchen', map: toNumber },
    'площадь по снб':         { key: 'areaSNB', map: toNumber },
    'комнат':                 { key: 'rooms', map: function (v) { return parseInt(v, 10) || null; } },
    'комнаты':                { key: 'rooms', map: function (v) { return parseInt(v, 10) || null; } },
    'раздельных комнат':      { key: 'roomsSeparate', map: function (v) { return parseInt(v, 10) || null; } },
    'этаж':                   { key: 'floor', map: function (v) { return parseInt(v, 10) || null; } },
    'этажность':              { key: 'floorsTotal', map: function (v) { return parseInt(v, 10) || null; } },
    'уровней в доме':         { key: 'floorsTotal', map: function (v) { return parseInt(v, 10) || null; } },
    'год постройки':          { key: 'yearBuilt', map: function (v) { return parseInt(v, 10) || null; } },
    'процент готовности':     { key: 'readinessPercent', map: function (v) { return parseInt(v, 10); } },
    'материал стен':          { key: 'houseMaterial', map: function (v) { return v; } },
    'материал крыши':         { key: 'roofMaterial', map: function (v) { return v; } },
    'отопление':              { key: 'heating', map: function (v) { return v; } },
    'газ':                    { key: 'gas', map: function (v) { return v; } },
    'канализация':            { key: 'sewerage', map: function (v) { return v; } },
    'электроснабжение':       { key: 'electricity', map: function (v) { return v; } },
    'вода':                   { key: 'water', map: function (v) { return v; } },
    'баня':                   { key: 'bathhouse', map: function (v) { return v; } },
    'гараж':                  { key: 'garage', map: function (v) { return v; } },
    'балкон':                 { key: 'balcony', map: function (v) { return v; } },
    'санузел':                { key: 'bathroom', map: function (v) { return v; } },
    'ремонт':                 { key: 'renovation', map: function (v) { return v; } },
    'статус земли':           { key: 'landStatus', map: function (v) { return v; } },
    'условия продажи':        { key: 'saleTerms', map: function (v) { return v; } },
    'номер договора':         { key: 'contractNumber', map: function (v) {
                                  if (!v) return null;
                                  return /договор/i.test(v) ? v : 'Договор № ' + v;
                                } },
    'цена byn':               { key: 'priceBYN', map: toNumber },
    'цена usd':               { key: 'priceUSD', map: toNumber },
    'населенный пункт':       { key: 'city', map: function (v) {
                                  return v.replace(/^г\.\s*/i, '').trim();
                                } },
    // 'район' намеренно не маппится в city — приоритет за "Населённый пункт".
    'улица':                  { key: 'address', map: function (v) {
                                  // "Л.Чайкиной ул." → "ул. Л.Чайкиной"
                                  var s = v.trim();
                                  s = s.replace(/\s*ул\.?\s*$/i, '');
                                  if (!/^ул\./i.test(s)) s = 'ул. ' + s;
                                  return s;
                                } },
    'координаты':             { key: 'location', map: function (v) {
                                  var m = v.match(/(-?\d+\.\d+)\s*[,;\s]+\s*(-?\d+\.\d+)/);
                                  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
                                } }
    // 'описание' / 'примечание' намеренно не здесь — они многострочные,
    // их обрабатывает parseDescription через extractSection.
  };

  // Вытаскивает значения по схеме "Label\nValue" / "Label: Value".
  // Возвращает объект { ключ_шаблона: значение, ... }.
  function parseLabeledFields(text) {
    var lines = text.split('\n');
    var result = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // вариант 1: "Label: value" в одной строке
      var inlineMatch = line.match(/^([А-ЯЁа-яё][а-яёА-ЯЁ\s]+?)\s*:\s*(.+)$/);
      if (inlineMatch) {
        var labelInline = inlineMatch[1].trim().toLowerCase();
        var valueInline = inlineMatch[2].trim();
        if (LABEL_MAP[labelInline]) {
          assignLabeled(result, labelInline, valueInline);
          continue;
        }
      }

      // вариант 2: "Label" на одной строке, значение на следующей
      var labelKey = line.toLowerCase().replace(/[:\s]+$/, '');
      if (LABEL_MAP[labelKey]) {
        var nextValue = '';
        for (var j = i + 1; j < lines.length; j++) {
          var nl = lines[j].trim();
          if (!nl) continue;
          // если следующая строка — тоже заголовок, оставляем пустым
          if (LABEL_MAP[nl.toLowerCase().replace(/[:\s]+$/, '')] || KNOWN_HEADERS_RE.test(nl)) break;
          nextValue = nl;
          i = j;
          break;
        }
        if (nextValue) assignLabeled(result, labelKey, nextValue);
      }
    }
    return result;
  }

  function assignLabeled(target, labelKey, rawValue) {
    var spec = LABEL_MAP[labelKey];
    if (!spec) return;
    var mapped;
    try { mapped = spec.map(rawValue); }
    catch (e) { mapped = null; }
    if (mapped == null || mapped === '') return;
    // не перетираем уже заданное непустое значение (чтобы "Район" не затёр "Населённый пункт")
    if (target[spec.key] != null && target[spec.key] !== '' && spec.key === 'city') return;
    target[spec.key] = mapped;
  }

  // =====================================================================
  //  PARSERS MAP
  // =====================================================================
  var PARSERS = {
    title: parseTitle,
    type: parseType,
    dealType: parseDealType,
    city: parseCity,
    address: parseAddress,
    priceBYN: parsePriceBYN,
    priceUSD: parsePriceUSD,
    cardDescription: parseCardDescription,

    rooms: parseRooms,
    roomsSeparate: parseRoomsSeparate,

    areaPlot: parseAreaPlot,
    areaTotal: parseAreaTotal,
    areaLiving: parseAreaLiving,
    areaKitchen: parseAreaKitchen,
    areaSNB: parseAreaSNB,

    floor: parseFloor,
    floorsTotal: parseFloorsTotal,
    yearBuilt: parseYearBuilt,
    readinessPercent: parseReadinessPercent,

    houseMaterial: parseHouseMaterial,
    roofMaterial: parseRoofMaterial,
    houseType: parseHouseType,
    renovation: parseRenovation,
    bathroom: parseBathroom,
    balcony: parseBalcony,

    heating: parseHeating,
    gas: parseGas,
    sewerage: parseSewerage,
    electricity: parseElectricity,
    water: parseWater,

    bathhouse: parseBathhouse,
    garage: parseGarage,

    location: parseLocation,

    landStatus: parseLandStatus,
    ownership: parseOwnership,
    saleTerms: parseSaleTerms,
    recommended: parseRecommended,

    infrastructure: parseInfrastructure,
    additionalBuildings: parseAdditionalBuildings,
    description: parseDescription,
    features: parseFeatures,
    images: parseImages,

    publishedAt: parsePublishedAt,
    contractNumber: parseContractNumber
  };

  // =====================================================================
  //  parseObjectFromText — прогоняет текст через все парсеры.
  //
  //  Приоритеты (более высокий перетирает более низкий):
  //    1) структурные пары "Label\nValue" / "Label: Value" (LABEL_MAP)
  //    2) свободно-текстовые регулярки (PARSERS) — заполняют недостающее
  // =====================================================================
  function parseObjectFromText(text) {
    var data = {};

    // 1) структурные значения
    var labeled = parseLabeledFields(text);
    Object.keys(labeled).forEach(function (k) {
      var v = labeled[k];
      if (v !== undefined && v !== null && v !== '') data[k] = v;
    });

    // 2) регекс-парсеры — только для пустых полей
    Object.keys(PARSERS).forEach(function (key) {
      if (data[key] != null && !(Array.isArray(data[key]) && data[key].length === 0)) return;
      try {
        var v = PARSERS[key](text);
        if (v !== undefined && v !== null && !(typeof v === 'string' && v === '')) {
          if (!Array.isArray(v) || v.length > 0) data[key] = v;
        }
      } catch (e) {
        // молча пропускаем ошибки отдельного парсера
      }
    });

    // 3) производные поля
    if (!data.title) {
      data.title = buildTitle(data);
    }
    if (!data.slug) {
      data.slug = buildSlug(data.title, data.type, data.city, data.address);
    }

    return data;
  }

  // =====================================================================
  //  mapTemplate(data, template) — рекурсивно применяет данные к шаблону.
  //  Бонус: вынесено в отдельную чистую функцию.
  // =====================================================================
  function mapTemplate(data, template) {
    var result = {};
    Object.keys(template).forEach(function (key) {
      var def = template[key];
      var value = data ? data[key] : undefined;

      if (Array.isArray(def)) {
        result[key] = Array.isArray(value) ? value : [];
      } else if (def !== null && typeof def === 'object') {
        result[key] = mapTemplate(value || {}, def);
      } else {
        result[key] = (value === undefined || value === '') ? def : value;
      }
    });
    return result;
  }

  // =====================================================================
  //  generateJSON — единый высокоуровневый pipeline.
  // =====================================================================
  function generateJSON(rawText) {
    var cleaned = cleanText(rawText);
    var parsed = parseObjectFromText(cleaned);
    var mapped = mapTemplate(parsed, TEMPLATE);
    return JSON.stringify(mapped, null, 2);
  }

  // =====================================================================
  //  UI
  // =====================================================================
  function showToast(el) {
    if (!el) return;
    el.hidden = false;
    // запускаем анимацию на следующий кадр, чтобы сработала transition
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { el.hidden = true; }, 220);
    }, 1600);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  function init() {
    var input = document.getElementById('jgInput');
    var output = document.getElementById('jgOutput');
    var btnGenerate = document.getElementById('jgGenerate');
    var btnCopy = document.getElementById('jgCopy');
    var btnClear = document.getElementById('jgClear');
    var inputError = document.getElementById('jgInputError');
    var toast = document.getElementById('jgToast');

    if (!input || !output || !btnGenerate) return;

    function clearError() {
      input.classList.remove('is-error');
      if (inputError) inputError.hidden = true;
    }

    function showError() {
      input.classList.add('is-error');
      if (inputError) inputError.hidden = false;
      input.focus();
    }

    input.addEventListener('input', clearError);

    btnGenerate.addEventListener('click', function () {
      var raw = input.value;
      if (!raw || !raw.trim()) {
        showError();
        return;
      }
      clearError();
      var json = generateJSON(raw);
      output.value = json;
      // авто-скролл output вверх
      output.scrollTop = 0;
    });

    btnCopy.addEventListener('click', function () {
      if (!output.value) return;
      copyToClipboard(output.value).then(function () {
        showToast(toast);
      }, function () {
        // если копирование провалилось — выделяем содержимое
        output.focus();
        output.select();
      });
    });

    if (btnClear) {
      btnClear.addEventListener('click', function () {
        input.value = '';
        output.value = '';
        clearError();
        input.focus();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // экспорт для тестирования из консоли
  window.JsonGenerator = {
    TEMPLATE: TEMPLATE,
    cleanText: cleanText,
    parseObjectFromText: parseObjectFromText,
    mapTemplate: mapTemplate,
    generateJSON: generateJSON
  };
})();
