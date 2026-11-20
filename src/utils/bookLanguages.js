// Shared language definitions & helpers for books and reading sessions.
// Primary focus: German (de) and English (en), with optional support for additional languages.

export const PRIMARY_LANGUAGES = [
  { code: 'de', short: 'DE', label: 'Deutsch', flag: '🇩🇪', accent: '#F5B041' },
  { code: 'en', short: 'EN', label: 'Englisch', flag: '🇬🇧', accent: '#5E97F6' },
];

export const EXTRA_LANGUAGES = [
  { code: 'fr', short: 'FR', label: 'Französisch', flag: '🇫🇷', accent: '#A78BFA' },
  { code: 'es', short: 'ES', label: 'Spanisch', flag: '🇪🇸', accent: '#F87171' },
  { code: 'it', short: 'IT', label: 'Italienisch', flag: '🇮🇹', accent: '#34D399' },
  { code: 'ja', short: 'JP', label: 'Japanisch', flag: '🇯🇵', accent: '#F472B6' },
];

export const ALL_KNOWN_LANGUAGES = [...PRIMARY_LANGUAGES, ...EXTRA_LANGUAGES];

const KNOWN_ORDER = ALL_KNOWN_LANGUAGES.map((l) => l.code);

export const getLanguageMeta = (code) => {
  const normalized = String(code || '').trim().toLowerCase();
  const known = ALL_KNOWN_LANGUAGES.find((l) => l.code === normalized);
  if (known) return known;
  const short = normalized.slice(0, 3).toUpperCase() || '?';
  return {
    code: normalized,
    short,
    label: short,
    flag: '🌐',
    accent: '#9AA0A6',
  };
};

export const normalizeLanguages = (input) => {
  let raw = [];
  if (Array.isArray(input)) {
    raw = input;
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.languages)) {
      raw = input.languages;
    } else if (typeof input.language === 'string' && input.language.trim()) {
      raw = [input.language];
    }
  } else if (typeof input === 'string' && input.trim()) {
    raw = [input];
  }

  const seen = new Set();
  const cleaned = [];
  for (const item of raw) {
    const code = String(item || '').trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    cleaned.push(code);
  }

  // Canonical sort: DE -> EN -> other known -> custom alphabetical
  return cleaned.sort((a, b) => {
    const idxA = KNOWN_ORDER.indexOf(a);
    const idxB = KNOWN_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
};

export const toggleLanguageInList = (list, code) => {
  const normalized = normalizeLanguages(list);
  const target = String(code || '').trim().toLowerCase();
  if (!target) return normalized;
  if (normalized.includes(target)) {
    return normalized.filter((c) => c !== target);
  }
  return normalizeLanguages([...normalized, target]);
};

export const isBilingual = (langs) => normalizeLanguages(langs).length >= 2;

export const getSessionLanguage = (session, book) => {
  if (session?.language) {
    return String(session.language).trim().toLowerCase();
  }
  const bookLangs = normalizeLanguages(book);
  if (bookLangs.length === 1) return bookLangs[0];
  return null;
};

export const formatLanguagesCompact = (langs) => {
  const list = normalizeLanguages(langs);
  if (list.length === 0) return '';
  if (list.length === 1) {
    const meta = getLanguageMeta(list[0]);
    return `${meta.flag} ${meta.short}`;
  }
  return list.map((c) => getLanguageMeta(c).flag).join('·');
};

export const formatLanguagesText = (langs) => {
  const list = normalizeLanguages(langs);
  if (list.length === 0) return '';
  if (list.length === 1) {
    const meta = getLanguageMeta(list[0]);
    return `${meta.flag} ${meta.label}`;
  }
  if (list.length === 2 && list.includes('de') && list.includes('en')) {
    return '🇩🇪·🇬🇧 Deutsch & Englisch';
  }
  return list.map((c) => {
    const m = getLanguageMeta(c);
    return `${m.flag} ${m.short}`;
  }).join(' · ');
};

const parseRatingValue = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 1 && n <= 10 ? n : null;
};

const parsePagesValue = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 ? n : null;
};

/**
 * Normalizes a book's per-language edition map so every language in `languages`
 * has `{ coverUrl, completed, rating, notes, totalPages }` with no undefined Firestore values.
 */
export const normalizeLanguageEditions = (
  languages,
  rawEditions = {},
  fallbackCoverUrl = null,
  fallbackCompleted = false,
  fallbackRating = null,
  fallbackNotes = '',
  fallbackTotalPages = null
) => {
  const langs = normalizeLanguages(languages);
  const result = {};
  langs.forEach((code, idx) => {
    const existing = rawEditions && typeof rawEditions === 'object' ? rawEditions[code] : null;
    result[code] = {
      coverUrl: existing && existing.coverUrl !== undefined
        ? (existing.coverUrl || null)
        : (idx === 0 ? (fallbackCoverUrl || null) : null),
      completed: existing && existing.completed !== undefined
        ? !!existing.completed
        : (idx === 0 ? !!fallbackCompleted : false),
      rating: existing && existing.rating !== undefined
        ? parseRatingValue(existing.rating)
        : (idx === 0 ? parseRatingValue(fallbackRating) : null),
      notes: existing && existing.notes !== undefined
        ? String(existing.notes || '').trim()
        : (idx === 0 ? String(fallbackNotes || '').trim() : ''),
      totalPages: existing && existing.totalPages !== undefined
        ? parsePagesValue(existing.totalPages)
        : (idx === 0 ? parsePagesValue(fallbackTotalPages) : null),
    };
  });
  return result;
};

/**
 * Returns an ordered array of per-language editions for a book:
 * [{ code, coverUrl, completed, rating, notes, totalPages, meta }]
 */
export const getBookEditions = (book) => {
  if (!book) return [];
  const langs = normalizeLanguages(book);
  if (langs.length === 0) return [];
  const rawMap = book.languageEditions || {};
  return langs.map((code, idx) => {
    const existing = rawMap[code];
    return {
      code,
      coverUrl: existing && existing.coverUrl !== undefined
        ? (existing.coverUrl || null)
        : (idx === 0 ? (book.coverUrl || null) : null),
      completed: existing && existing.completed !== undefined
        ? !!existing.completed
        : (idx === 0 ? !!book.completed : false),
      rating: existing && existing.rating !== undefined
        ? parseRatingValue(existing.rating)
        : (idx === 0 ? parseRatingValue(book.rating) : null),
      notes: existing && existing.notes !== undefined
        ? String(existing.notes || '').trim()
        : (idx === 0 ? String(book.notes || '').trim() : ''),
      totalPages: existing && existing.totalPages !== undefined
        ? parsePagesValue(existing.totalPages)
        : (parsePagesValue(book.totalPages) || null),
      meta: getLanguageMeta(code),
    };
  });
};

export const computeBookCompletedFromEditions = (languages, languageEditions, fallbackCompleted = false) => {
  const langs = normalizeLanguages(languages);
  if (langs.length === 0) return !!fallbackCompleted;
  return langs.every((code) => {
    const ed = languageEditions?.[code];
    return ed && ed.completed !== undefined ? !!ed.completed : !!fallbackCompleted;
  });
};

export const isBookFullyCompleted = (book) => {
  if (!book) return false;
  const editions = getBookEditions(book);
  if (editions.length === 0) return !!book.completed;
  return editions.every((ed) => ed.completed);
};

/**
 * Returns the first uncompleted language code on a multi-language book, or the only language on a single-language book.
 */
export const getPrimaryActiveLanguage = (book) => {
  const editions = getBookEditions(book);
  if (editions.length === 0) return null;
  if (editions.length === 1) return editions[0].code;
  const activeEd = editions.find((ed) => !ed.completed);
  return activeEd ? activeEd.code : null;
};

export const getBookCoverForLanguage = (book, langCode = null) => {
  if (!book) return null;
  const editions = getBookEditions(book);
  if (langCode) {
    const found = editions.find((ed) => ed.code === langCode);
    if (found?.coverUrl) return found.coverUrl;
  }
  const activeEd = editions.find((ed) => !ed.completed && ed.coverUrl);
  if (activeEd) return activeEd.coverUrl;
  const firstWithCover = editions.find((ed) => ed.coverUrl);
  if (firstWithCover) return firstWithCover.coverUrl;
  return book.coverUrl || null;
};

