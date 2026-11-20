import { inferCategoriesFromApi, inferTagsFromApi } from './bookCategories';

// Fetches book cover images via Apple Books (iTunes Search API, country=de),
// Open Library Search API, and Google Books API in parallel.
// All three APIs are free, CORS-friendly, and require no API key.

const normalizeCoverUrl = (url) => {
  if (!url) return null;
  let clean = url.replace(/^http:\/\//i, 'https://');
  clean = clean.replace(/&edge=curl/gi, '');
  return clean;
};

const cleanSearchTitle = (raw) => {
  return (raw || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

async function searchAppleBooks(query, country = 'de') {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=ebook&country=${country}&limit=8`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.results)) return [];
  return data.results
    .filter((item) => item.artworkUrl100 || item.artworkUrl60)
    .map((item) => {
      const rawUrl = item.artworkUrl100 || item.artworkUrl60;
      const highRes = rawUrl.replace(/100x100bb|60x60bb/gi, '400x600bb');
      const rawGenres = Array.isArray(item.genres) ? item.genres : [];
      const description = item.description || '';
      return {
        url: normalizeCoverUrl(highRes),
        title: item.trackName || query,
        author: item.artistName || '',
        pageCount: null,
        rawGenres,
        description,
        categories: inferCategoriesFromApi(rawGenres, description),
        tags: inferTagsFromApi(rawGenres, description),
        source: 'Apple Books',
      };
    });
}

async function searchOpenLibrary(query, requireCover = true) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i,number_of_pages_median,subject&limit=8`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.docs)) return [];
  return data.docs
    .filter((doc) => !requireCover || doc.cover_i)
    .map((doc) => {
      const rawSubjects = Array.isArray(doc.subject) ? doc.subject.slice(0, 25) : [];
      return {
        url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        title: doc.title || query,
        author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
        pageCount: Number(doc.number_of_pages_median) > 0 ? Number(doc.number_of_pages_median) : null,
        rawGenres: rawSubjects,
        description: '',
        categories: inferCategoriesFromApi(rawSubjects),
        tags: inferTagsFromApi(rawSubjects),
        source: 'Open Library',
      };
    });
}

async function searchGoogleBooks(query, langCode = null, requireCover = true) {
  const langParam = langCode ? `&langRestrict=${encodeURIComponent(langCode)}` : '';
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books${langParam}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.items)) return [];
  return data.items
    .map((item) => {
      const info = item.volumeInfo || {};
      const links = info.imageLinks || {};
      const thumb = links.thumbnail || links.smallThumbnail;
      if (requireCover && !thumb) return null;
      const rawGenres = Array.isArray(info.categories) ? info.categories : [];
      const description = info.description || '';
      return {
        url: thumb ? normalizeCoverUrl(thumb) : null,
        title: info.title || query,
        author: Array.isArray(info.authors) ? info.authors.join(', ') : '',
        pageCount: Number(info.pageCount) > 0 ? Number(info.pageCount) : null,
        rawGenres,
        description,
        categories: inferCategoriesFromApi(rawGenres, description),
        tags: inferTagsFromApi(rawGenres, description),
        source: 'Google Books',
      };
    })
    .filter(Boolean);
}

const LANG_TO_APPLE_COUNTRY = {
  de: 'de',
  en: 'us',
  fr: 'fr',
  es: 'es',
  it: 'it',
  ja: 'jp',
};

export async function searchBookCovers(titleOrQuery, author = '', langCode = null) {
  const cleanedTitle = cleanSearchTitle(titleOrQuery);
  const cleanedAuthor = (author || '').trim();
  const fullQuery = [cleanedTitle, cleanedAuthor].filter(Boolean).join(' ').trim();
  if (!fullQuery) return [];

  const normalizedLang = langCode ? String(langCode).trim().toLowerCase() : null;
  const appleCountry = (normalizedLang && LANG_TO_APPLE_COUNTRY[normalizedLang]) || 'de';

  const queries = [
    searchAppleBooks(fullQuery, appleCountry),
    searchOpenLibrary(fullQuery, true),
    searchGoogleBooks(fullQuery, normalizedLang, true),
  ];

  if (normalizedLang === 'en') {
    queries.push(searchAppleBooks(fullQuery, 'gb'));
  }

  const settled = await Promise.allSettled(queries);

  let combined = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // If title + author yielded nothing, retry with title only
  if (combined.length === 0 && cleanedTitle) {
    const retry = await Promise.allSettled([
      searchAppleBooks(cleanedTitle, appleCountry),
      searchAppleBooks(cleanedTitle, appleCountry === 'us' ? 'de' : 'us'),
      searchOpenLibrary(cleanedTitle, true),
      searchGoogleBooks(cleanedTitle, null, true),
    ]);
    combined = retry.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  }

  const results = [];
  const seen = new Set();
  for (const item of combined) {
    if (!item?.url || seen.has(item.url)) continue;
    seen.add(item.url);
    results.push(item);
  }

  return results.slice(0, 12);
}

export async function fetchBestBookCover(title, author = '', langCode = null) {
  const candidates = await searchBookCovers(title, author, langCode);
  return candidates.length > 0 ? candidates[0].url : null;
}

const tokenizeWords = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

const isRelevantMatch = (item, titleWords, authorWords) => {
  const itemTitle = String(item?.title || '').toLowerCase();
  const itemAuthor = String(item?.author || '').toLowerCase();
  const titleHits = titleWords.filter((w) => itemTitle.includes(w)).length;
  const authorHit = authorWords.length > 0 && authorWords.some((w) => itemAuthor.includes(w));
  if (titleWords.length === 0) return authorHit;
  const needed = titleWords.length === 1 ? 1 : Math.max(1, Math.ceil(titleWords.length * 0.45));
  return titleHits >= needed || (titleHits >= 1 && authorHit);
};

/**
 * Fetches and combines genre + thematic tag signals across Open Library (subjects),
 * Apple Books (genres + blurb), and Google Books (categories + description).
 */
export async function fetchBookGenresAndTags(title, author = '', langCode = null) {
  const cleanedTitle = cleanSearchTitle(title);
  const cleanedAuthor = (author || '').trim();
  const fullQuery = [cleanedTitle, cleanedAuthor].filter(Boolean).join(' ').trim();
  if (!fullQuery) return { categories: [], tags: [] };

  const normalizedLang = langCode ? String(langCode).trim().toLowerCase() : null;
  const appleCountry = (normalizedLang && LANG_TO_APPLE_COUNTRY[normalizedLang]) || 'de';

  const settled = await Promise.allSettled([
    searchOpenLibrary(fullQuery, false),
    searchAppleBooks(fullQuery, appleCountry),
    searchGoogleBooks(fullQuery, normalizedLang, false),
  ]);

  let items = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // If title + author returned nothing useful, retry with title only
  if (items.length === 0 && cleanedTitle && cleanedAuthor) {
    const retry = await Promise.allSettled([
      searchOpenLibrary(cleanedTitle, false),
      searchAppleBooks(cleanedTitle, appleCountry === 'de' ? 'us' : 'de'),
      searchGoogleBooks(cleanedTitle, null, false),
    ]);
    items = retry.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  }

  if (items.length === 0) return { categories: [], tags: [] };

  const titleWords = tokenizeWords(cleanedTitle);
  const authorWords = tokenizeWords(cleanedAuthor);
  const relevant = items.filter((it) => isRelevantMatch(it, titleWords, authorWords));
  const pool = (relevant.length > 0 ? relevant : items).slice(0, 6);

  const mergedTags = [];
  const mergedDescriptions = [];
  pool.forEach((it) => {
    if (Array.isArray(it.rawGenres)) mergedTags.push(...it.rawGenres);
    if (it.description) mergedDescriptions.push(it.description);
  });

  const desc = mergedDescriptions.join(' ');
  return {
    categories: inferCategoriesFromApi(mergedTags, desc),
    tags: inferTagsFromApi(mergedTags, desc),
  };
}

export async function fetchBookCategories(title, author = '', langCode = null) {
  const { categories } = await fetchBookGenresAndTags(title, author, langCode);
  return categories;
}
