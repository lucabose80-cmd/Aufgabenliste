// Fetches book cover images via Google Books API (primary) and Open Library API (fallback).
// Both APIs are free, CORS-friendly, and require no API key.

const normalizeCoverUrl = (url) => {
  if (!url) return null;
  let clean = url.replace(/^http:\/\//i, 'https://');
  // Avoid curled page edge effect on Google Books thumbnails for cleaner cards
  clean = clean.replace(/&edge=curl/gi, '');
  return clean;
};

export async function searchBookCovers(title, author = '') {
  const cleanTitle = (title || '').trim();
  const cleanAuthor = (author || '').trim();
  if (!cleanTitle) return [];

  const results = [];
  const seenUrls = new Set();

  const pushUnique = (url, itemTitle, itemAuthor) => {
    const normalized = normalizeCoverUrl(url);
    if (!normalized || seenUrls.has(normalized)) return;
    seenUrls.add(normalized);
    results.push({
      url: normalized,
      title: itemTitle || cleanTitle,
      author: itemAuthor || cleanAuthor,
    });
  };

  // 1. Google Books API
  try {
    const qParts = [`intitle:${cleanTitle}`];
    if (cleanAuthor) qParts.push(`inauthor:${cleanAuthor}`);
    const query = encodeURIComponent(qParts.join(' '));
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=6&printType=books`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        data.items.forEach((item) => {
          const info = item.volumeInfo || {};
          const links = info.imageLinks || {};
          const thumb = links.thumbnail || links.smallThumbnail;
          if (thumb) {
            pushUnique(thumb, info.title, (info.authors || []).join(', '));
          }
        });
      }
    }

    // Broader fallback query without intitle/inauthor if strict query returned nothing
    if (results.length === 0) {
      const looseQuery = encodeURIComponent([cleanTitle, cleanAuthor].filter(Boolean).join(' '));
      const resLoose = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${looseQuery}&maxResults=6&printType=books`);
      if (resLoose.ok) {
        const dataLoose = await resLoose.json();
        if (Array.isArray(dataLoose.items)) {
          dataLoose.items.forEach((item) => {
            const info = item.volumeInfo || {};
            const links = info.imageLinks || {};
            const thumb = links.thumbnail || links.smallThumbnail;
            if (thumb) {
              pushUnique(thumb, info.title, (info.authors || []).join(', '));
            }
          });
        }
      }
    }
  } catch {
    // Ignore network / CORS errors and fall back to Open Library
  }

  // 2. Open Library API fallback (or supplement if < 3 results)
  if (results.length < 3) {
    try {
      const params = new URLSearchParams({ title: cleanTitle, limit: '6' });
      if (cleanAuthor) params.set('author', cleanAuthor);
      const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.docs)) {
          data.docs.forEach((doc) => {
            if (doc.cover_i) {
              pushUnique(
                `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
                doc.title,
                Array.isArray(doc.author_name) ? doc.author_name.join(', ') : ''
              );
            }
          });
        }
      }
    } catch {
      // Ignore fallback errors
    }
  }

  return results.slice(0, 6);
}

export async function fetchBestBookCover(title, author = '') {
  const candidates = await searchBookCovers(title, author);
  return candidates.length > 0 ? candidates[0].url : null;
}
