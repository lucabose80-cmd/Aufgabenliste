// Unobtrusive background book categories / genres for quiet sorting & filtering.

export const PRESET_BOOK_CATEGORIES = [
  'Romantasy',
  'Fantasy',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Krimi',
  'Dystopie',
  'Historisch',
  'Horror',
  'Klassiker',
  'Sachbuch',
  'Biografie',
  'Manga / Graphic Novel',
];

export const normalizeCategories = (input) => {
  let raw = [];
  if (Array.isArray(input)) {
    raw = input;
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.categories)) {
      raw = input.categories;
    } else if (typeof input.category === 'string' && input.category.trim()) {
      raw = [input.category];
    }
  } else if (typeof input === 'string' && input.trim()) {
    raw = [input];
  }

  const seen = new Set();
  const result = [];
  for (const item of raw) {
    const clean = String(item || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Match preset casing if applicable
    const preset = PRESET_BOOK_CATEGORIES.find((p) => p.toLowerCase() === key);
    result.push(preset || clean);
  }
  return result;
};

/**
 * Quietly maps raw API genre strings (from Google Books / Apple Books)
 * to our clean German categories for optional background auto-fill.
 */
export const inferCategoriesFromApi = (rawGenres = []) => {
  const joined = (Array.isArray(rawGenres) ? rawGenres : [rawGenres])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!joined) return [];

  const found = [];
  const hasFantasy = /fantasy|magic|fae|dragon/.test(joined);
  const hasRomance = /romance|love|liebesroman/.test(joined);

  if (/romantasy/.test(joined) || (hasFantasy && hasRomance)) {
    found.push('Romantasy');
  } else {
    if (hasFantasy) found.push('Fantasy');
    if (hasRomance) found.push('Romance');
  }

  if (/sci-fi|science fiction|scifi/.test(joined)) found.push('Sci-Fi');
  if (/dystop/.test(joined)) found.push('Dystopie');
  if (/thriller|suspense/.test(joined)) found.push('Thriller');
  if (/crime|mystery|detective|krimi/.test(joined)) found.push('Krimi');
  if (/histor/.test(joined)) found.push('Historisch');
  if (/horror|gothic/.test(joined)) found.push('Horror');
  if (/classic|klassik/.test(joined)) found.push('Klassiker');
  if (/biograph|memoir|autobiograph/.test(joined)) found.push('Biografie');
  if (/manga|graphic novel|comic/.test(joined)) found.push('Manga / Graphic Novel');
  if (/non-?fiction|sachbuch|self-help|psychology|business|history|science/.test(joined) && found.length === 0) {
    found.push('Sachbuch');
  }

  return normalizeCategories(found);
};
