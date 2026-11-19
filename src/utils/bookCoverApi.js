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
      return {
        url: normalizeCoverUrl(highRes),
        title: item.trackName || query,
        author: item.artistName || '',
        source: 'Apple Books',
      };
    });
}

async function searchOpenLibrary(query) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i&limit=8`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.docs)) return [];
  return data.docs
    .filter((doc) => doc.cover_i)
    .map((doc) => ({
      url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
      title: doc.title || query,
      author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
      source: 'Open Library',
    }));
}

async function searchGoogleBooks(query) {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.items)) return [];
  return data.items
    .map((item) => {
      const info = item.volumeInfo || {};
      const links = info.imageLinks || {};
      const thumb = links.thumbnail || links.smallThumbnail;
      if (!thumb) return null;
      return {
        url: normalizeCoverUrl(thumb),
        title: info.title || query,
        author: Array.isArray(info.authors) ? info.authors.join(', ') : '',
        source: 'Google Books',
      };
    })
    .filter(Boolean);
}

export async function searchBookCovers(titleOrQuery, author = '') {
  const cleanedTitle = cleanSearchTitle(titleOrQuery);
  const cleanedAuthor = (author || '').trim();
  const fullQuery = [cleanedTitle, cleanedAuthor].filter(Boolean).join(' ').trim();
  if (!fullQuery) return [];

  const settled = await Promise.allSettled([
    searchAppleBooks(fullQuery, 'de'),
    searchOpenLibrary(fullQuery),
    searchGoogleBooks(fullQuery),
  ]);

  let combined = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // If title + author yielded nothing and author was provided, retry with title only
  if (combined.length === 0 && cleanedAuthor && cleanedTitle) {
    const retry = await Promise.allSettled([
      searchAppleBooks(cleanedTitle, 'de'),
      searchAppleBooks(cleanedTitle, 'us'),
      searchOpenLibrary(cleanedTitle),
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

export async function fetchBestBookCover(title, author = '') {
  const candidates = await searchBookCovers(title, author);
  return candidates.length > 0 ? candidates[0].url : null;
}
