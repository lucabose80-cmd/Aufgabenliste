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
 * Quietly maps raw API genre/subject strings (from Open Library, Google Books & Apple Books)
 * plus an optional blurb/description to our clean German categories for background auto-fill.
 */
export const inferCategoriesFromApi = (rawGenres = [], description = '') => {
  const tagText = (Array.isArray(rawGenres) ? rawGenres : [rawGenres])
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();

  const descText = String(description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!tagText && !descText) return [];

  const combined = `${tagText} ${descText}`;
  const found = [];

  // 1. Direct & combined Fantasy / Romance / Romantasy detection
  const directRomantasy = /romantasy|romantic fantasy|fantasy romance|paranormal romance|dark fantasy romance/.test(combined);
  const tagHasFantasy = /\bfantasy\b|high fantasy|epic fantasy|urban fantasy|dark fantasy|magic|magie|fae\b|faerie|dragon|drache|witch|hexe|vampire|vampir|shifter|werewolf|sorcer|wizard|zauber|mytholog/.test(tagText);
  const descHasFantasy = /\bfantasy\b|\bfae\b|\bfaerie\b|\bdragon|\bdrachen|\bmagie\b|\bmagic\b|\bmagisch|\bkingdom\b|\bkönigreich\b|\bhigh lord\b|\bshadow power|\bwyvern\b|\bgriffin\b|\bsorcer|\bwitch\b|\bhexe\b|\bvampir|\bcurse\b|\bfluch\b|\belfen\b|\belven\b|\bdämon|\bdemon\b|\brealm\b|\bprophec/.test(descText);

  const tagHasRomance = /\bromance\b|love stor|liebesroman|new adult|contemporary romance|dark romance|enemies to lovers|fated mates|slow burn|erotica/.test(tagText);
  const descHasStrongRomance = /romantasy|enemies to lovers|friends to lovers|fated mates|slow burn|forbidden love|verbotene liebe|liebesgeschichte|liebesroman|leidenschaft|seduction|soulmate|seelenverwandt|passionate romance|dark romance|new adult/.test(descText);

  const hasFantasy = tagHasFantasy || descHasFantasy;
  const hasRomance = tagHasRomance || descHasStrongRomance;

  if (directRomantasy || (hasFantasy && hasRomance)) {
    found.push('Romantasy');
  } else {
    if (tagHasFantasy) found.push('Fantasy');
    if (tagHasRomance) found.push('Romance');
  }

  // 2. Other structured genre matches (prioritize tags, fall back to strong description terms)
  if (/sci-?fi|science fiction|space opera|cyberpunk|weltraum|time travel|zeitreise|extraterrestrial/.test(tagText) ||
      (/science fiction|space opera|cyberpunk|raumschiff|galaxis|interstellar/.test(descText) && !hasFantasy)) {
    found.push('Sci-Fi');
  }
  if (/dystop|post-?apocal|postapokal|totalitarian/.test(combined)) {
    found.push('Dystopie');
  }
  if (/thriller|suspense|psychothriller|espionage/.test(tagText) || /psychothriller|thriller/.test(descText)) {
    found.push('Thriller');
  }
  if (/\bcrime\b|\bmystery\b|detective|\bkrimi\b|murder investigation|police procedural|whodunit/.test(tagText) ||
      /\bkrimi\b|kommissar|ermittler|detektiv|mordfall/.test(descText)) {
    found.push('Krimi');
  }
  if (/historical fiction|historisch|world war|weltkrieg|regency|victorian|medieval fiction|mittelalter/.test(tagText)) {
    found.push('Historisch');
  }
  if (/\bhorror\b|gothic fiction|ghost stor|haunted house|supernatural horror|grusel/.test(tagText) || /\bhorror\b/.test(descText)) {
    found.push('Horror');
  }
  if (/\bclassic|\bklassik|weltliteratur/.test(tagText)) {
    found.push('Klassiker');
  }
  if (/biograph|memoir|autobiograph/.test(tagText)) {
    found.push('Biografie');
  }
  if (/\bmanga\b|graphic novel|\bcomic\b|\bmanhwa\b|\bwebtoon\b/.test(tagText)) {
    found.push('Manga / Graphic Novel');
  }

  // Fallback to description Fantasy/Romance only if tags yielded nothing
  if (found.length === 0) {
    if (descHasFantasy) found.push('Fantasy');
    else if (descHasStrongRomance) found.push('Romance');
  }

  if (found.length === 0 && /non-?fiction|sachbuch|self-help|ratgeber|psychology|psychologie|business|wirtschaft|finance|finanzen|philosophy|philosophie|popular science|wissenschaft|\bhistory\b/.test(tagText)) {
    found.push('Sachbuch');
  }

  return normalizeCategories(found).slice(0, 2);
};

// Thematic / trope / setting tags (e.g. Magie, Drachen, Schwertkampf, Moderne)
export const PRESET_BOOK_TAGS = [
  'Magie',
  'Drachen',
  'Schwertkampf',
  'Moderne',
  'Fae',
  'Akademie',
  'Mittelalter',
  'Enemies to Lovers',
  'Slow Burn',
  'Found Family',
  'Royals',
  'Krieg & Politik',
  'Götter & Mythologie',
  'Hexen',
  'Vampire',
  'Dark',
  'Zeitreise',
  'Weltraum',
];

export const normalizeTags = (input) => {
  let raw = [];
  if (Array.isArray(input)) {
    raw = input;
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.tags)) {
      raw = input.tags;
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
    const preset = PRESET_BOOK_TAGS.find((p) => p.toLowerCase() === key);
    result.push(preset || clean);
  }
  return result;
};

/**
 * Optionally infers clear thematic tags (Drachen, Magie, Schwertkampf, Fae, Moderne, etc.)
 * from API subjects & descriptions. Users can always add/remove any tags manually.
 */
export const inferTagsFromApi = (rawGenres = [], description = '') => {
  const tagText = (Array.isArray(rawGenres) ? rawGenres : [rawGenres])
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();

  const descText = String(description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const combined = `${tagText} ${descText}`.trim();
  if (!combined) return [];

  const found = [];
  if (/\bdragon|\bdrache|\bwyvern/.test(combined)) found.push('Drachen');
  if (/\bmagic\b|\bmagie\b|\bmagisch|\bsorcer|\bwizard|\bzauber|\bspell\b/.test(combined)) found.push('Magie');
  if (/\bsword|\bschwert|\bblade\b|\bklinge|\bknight|\britter\b|\bwarrior|\bkrieger|\bassassin/.test(combined)) found.push('Schwertkampf');
  if (/\bfae\b|\bfaerie|\bfairy\b|\bfairyland|\bhigh lord/.test(combined)) found.push('Fae');
  if (/academy|akademie|magic school|boarding school|war college|university|internat/.test(combined)) found.push('Akademie');
  if (/contemporary|urban fantasy|modern day|\bmodern\b|gegenwart|21st century|new york|london/.test(tagText)) found.push('Moderne');
  if (/medieval|mittelalter|middle ages|knights|feudal/.test(combined)) found.push('Mittelalter');
  if (/enemies to lovers/.test(combined)) found.push('Enemies to Lovers');
  if (/slow burn/.test(combined)) found.push('Slow Burn');
  if (/found family/.test(combined)) found.push('Found Family');
  if (/\broyal|\bprincess|\bprince\b|\bprinz|\bkönig|\bqueen\b|\bthrone\b|\bthron\b|\bcourt\b/.test(tagText)) found.push('Royals');
  if (/\bwar\b|\bkrieg\b|political intrigue|rebellion|uprising|empire/.test(tagText)) found.push('Krieg & Politik');
  if (/mytholog|\bgods\b|\bgött|olymp|demigod|halbgott/.test(combined)) found.push('Götter & Mythologie');
  if (/\bwitch|\bhexe|\bcoven\b/.test(combined)) found.push('Hexen');
  if (/\bvampire|\bvampir/.test(combined)) found.push('Vampire');
  if (/dark fantasy|dark romance|grimdark/.test(combined)) found.push('Dark');
  if (/time travel|zeitreise/.test(combined)) found.push('Zeitreise');
  if (/space opera|outer space|spaceship|raumschiff|galaxis|interstellar/.test(combined)) found.push('Weltraum');

  return normalizeTags(found).slice(0, 4);
};
