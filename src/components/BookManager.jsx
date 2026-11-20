import { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import {
  Box, Card, Typography, TextField, Button, IconButton,
  Autocomplete, Checkbox, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, LinearProgress, CircularProgress, Menu, MenuItem, Divider
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StarIcon from '@mui/icons-material/Star';
import TuneIcon from '@mui/icons-material/Tune';
import BookCover from './BookCover';
import EditionCoverPickerDialog from './EditionCoverPickerDialog';
import { LanguageCoverBadge, LanguagePill, LanguagePicker } from './LanguageBadge';
import { searchBookCovers, fetchBestBookCover } from '../utils/bookCoverApi';
import {
  normalizeLanguages,
  normalizeLanguageEditions,
  getBookEditions,
  getLanguageMeta,
  isBilingual,
} from '../utils/bookLanguages';
import { PRESET_BOOK_CATEGORIES, normalizeCategories, PRESET_BOOK_TAGS, normalizeTags } from '../utils/bookCategories';

const BookManager = () => {
  const {
    books, addBook, updateBook, updateBookCover, updateBookReview, updateBookLanguages, updateBookEdition, deleteBook,
    assignBookToUnassignedSessions, readingSessions, renameAuthor, renameSeries
  } = useTaskContext();

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('all'); // 'all' | 'bilingual' | 'de' | 'en' | ...
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | '<category>'
  const [tagFilter, setTagFilter] = useState('all'); // 'all' | '<tag>'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'category' | 'rating' | 'title'
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // Unified Add / Edit Modal state
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formSeries, setFormSeries] = useState('');
  const [formSeriesNumber, setFormSeriesNumber] = useState('');
  const [formUniverse, setFormUniverse] = useState('');
  const [formTotalPages, setFormTotalPages] = useState('');
  const [formWordsPerPage, setFormWordsPerPage] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formRating, setFormRating] = useState(null);
  const [formNotes, setFormNotes] = useState('');
  const [formLanguages, setFormLanguages] = useState([]);
  const [formEditions, setFormEditions] = useState({});
  const [formCategories, setFormCategories] = useState([]);
  const [formTags, setFormTags] = useState([]);
  const [formReviewLang, setFormReviewLang] = useState(null);

  // Mandatory cover picker for adding English / 2nd+ language or changing an edition cover
  const [editionCoverPicker, setEditionCoverPicker] = useState(null);
  // { langCode, isNewEdition, initialCoverUrl, source: 'form' | 'completed', bookId?, bookTitle, bookAuthor }

  // Cover & metadata search state inside modal
  const [coverCandidates, setCoverCandidates] = useState([]);
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);
  const [coverSearchDone, setCoverSearchDone] = useState(false);
  const [autoFillNotice, setAutoFillNotice] = useState('');

  // Review & language state inside "Buch abgeschlossen!" modal
  const [completedRating, setCompletedRating] = useState(null);
  const [completedNotes, setCompletedNotes] = useState('');
  const [completedLanguages, setCompletedLanguages] = useState([]);

  // Batch fetch missing covers state
  const [isFetchingAllCovers, setIsFetchingAllCovers] = useState(false);
  const [batchCoverFeedback, setBatchCoverFeedback] = useState(null);

  // Dedicated interactive Cover Search Modal state
  const [coverPickerBook, setCoverPickerBook] = useState(null);
  const [coverPickerLang, setCoverPickerLang] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearched, setPickerSearched] = useState(false);
  const [pickerCustomUrl, setPickerCustomUrl] = useState('');

  // Manage Authors / Series Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageType, setManageType] = useState('author'); // 'author' | 'series'
  const [manageOldName, setManageOldName] = useState('');
  const [manageNewName, setManageNewName] = useState('');

  const [completedBookStats, setCompletedBookStats] = useState(null);

  const uniqueAuthors = useMemo(() => Array.from(new Set(books.map(b => b.author).filter(Boolean))), [books]);
  const uniqueSeries = useMemo(() => Array.from(new Set(books.map(b => b.series).filter(Boolean))), [books]);
  const uniqueUniverses = useMemo(() => Array.from(new Set(books.map(b => b.universe).filter(Boolean))), [books]);
  const availableLanguages = useMemo(() => {
    const set = new Set();
    books.forEach(b => normalizeLanguages(b).forEach(c => set.add(c)));
    return normalizeLanguages(Array.from(set));
  }, [books]);
  const availableCategories = useMemo(() => {
    const set = new Set();
    books.forEach(b => normalizeCategories(b).forEach(c => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);
  const availableTags = useMemo(() => {
    const set = new Set();
    books.forEach(b => normalizeTags(b).forEach(t => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const seriesAuthorMap = useMemo(() => {
    return books.reduce((acc, book) => {
      if (book.series && book.author) acc[book.series] = book.author;
      return acc;
    }, {});
  }, [books]);

  // Differentiated per-language tracking entries so each language edition can be tracked,
  // completed, and rated independently in Active & Completed lists.
  const trackingEntries = useMemo(() => {
    const rows = [];
    books.forEach((book) => {
      const bookCats = normalizeCategories(book);
      if (categoryFilter !== 'all' && !bookCats.includes(categoryFilter)) return;
      const bookTags = normalizeTags(book);
      if (tagFilter !== 'all' && !bookTags.includes(tagFilter)) return;

      const langs = normalizeLanguages(book);
      if (languageFilter === 'bilingual' && !isBilingual(langs)) return;

      const eds = getBookEditions(book);
      if (eds.length >= 2) {
        eds.forEach((ed) => {
          if (languageFilter !== 'all' && languageFilter !== 'bilingual' && ed.code !== languageFilter) return;
          rows.push({
            key: `${book.id}:${ed.code}`,
            book,
            langCode: ed.code,
            langMeta: ed.meta,
            isMultiLang: true,
            coverUrl: ed.coverUrl || book.coverUrl || null,
            completed: !!ed.completed,
            rating: ed.rating ?? null,
            notes: ed.notes || '',
            totalPages: ed.totalPages || book.totalPages || null,
            categories: bookCats,
            tags: bookTags,
          });
        });
      } else {
        const singleEd = eds[0] || null;
        const singleCode = singleEd?.code || null;
        if (languageFilter !== 'all' && languageFilter !== 'bilingual' && singleCode !== languageFilter) return;
        rows.push({
          key: book.id,
          book,
          langCode: singleCode,
          langMeta: singleEd?.meta || null,
          isMultiLang: false,
          coverUrl: singleEd?.coverUrl || book.coverUrl || null,
          completed: singleEd ? !!singleEd.completed : !!book.completed,
          rating: singleEd ? (singleEd.rating ?? null) : (book.rating ?? null),
          notes: singleEd ? (singleEd.notes || '') : (book.notes || ''),
          totalPages: singleEd?.totalPages || book.totalPages || null,
          categories: bookCats,
          tags: bookTags,
        });
      }
    });

    return rows.sort((a, b) => {
      if (sortBy === 'category') {
        const catA = a.categories[0] || 'zzz';
        const catB = b.categories[0] || 'zzz';
        if (catA !== catB) return catA.localeCompare(catB);
      } else if (sortBy === 'rating') {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        if (rA !== rB) return rB - rA;
      } else if (sortBy === 'title') {
        const nameCmp = (a.book.name || '').localeCompare(b.book.name || '');
        if (nameCmp !== 0) return nameCmp;
      } else {
        const seriesA = a.book.series || '';
        const seriesB = b.book.series || '';
        if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
        const authorA = a.book.author || '';
        const authorB = b.book.author || '';
        if (authorA !== authorB) return authorA.localeCompare(authorB);
      }
      const titleCmp = (a.book.name || '').localeCompare(b.book.name || '');
      if (titleCmp !== 0) return titleCmp;
      return (a.langCode || '').localeCompare(b.langCode || '');
    });
  }, [books, languageFilter, categoryFilter, tagFilter, sortBy]);

  const activeEntries = useMemo(() => trackingEntries.filter(e => !e.completed), [trackingEntries]);
  const completedEntries = useMemo(() => trackingEntries.filter(e => e.completed), [trackingEntries]);
  const booksWithoutCover = useMemo(() => books.filter(b => !b.coverUrl), [books]);

  const unassignedSessionsCount = useMemo(
    () => readingSessions.filter(s => !s.bookId || !books.some(b => b.id === s.bookId)).length,
    [readingSessions, books]
  );

  const openAddModal = () => {
    setEditingBookId(null);
    setFormName('');
    setFormAuthor('');
    setFormSeries('');
    setFormSeriesNumber('');
    setFormUniverse('');
    setFormTotalPages('');
    setFormWordsPerPage('');
    setFormCoverUrl('');
    setFormRating(null);
    setFormNotes('');
    setFormLanguages([]);
    setFormEditions({});
    setFormCategories([]);
    setFormTags([]);
    setFormReviewLang(null);
    setCoverCandidates([]);
    setCoverSearchDone(false);
    setAutoFillNotice('');
    setBookModalOpen(true);
  };

  const openEditModal = (book, focusLangCode = null) => {
    const langs = normalizeLanguages(book);
    const normalizedEds = normalizeLanguageEditions(
      langs,
      book.languageEditions || {},
      book.coverUrl || null,
      !!book.completed,
      book.rating || null,
      book.notes || '',
      book.totalPages || null
    );
    setEditingBookId(book.id);
    setFormName(book.name || '');
    setFormAuthor(book.author || '');
    setFormSeries(book.series || '');
    setFormSeriesNumber(book.seriesNumber ? book.seriesNumber.toString() : '');
    setFormUniverse(book.universe || '');
    setFormTotalPages(book.totalPages ? book.totalPages.toString() : '');
    setFormWordsPerPage(book.wordsPerPage ? book.wordsPerPage.toString() : '');
    setFormCoverUrl(book.coverUrl || '');
    setFormRating(book.rating || null);
    setFormNotes(book.notes || '');
    setFormLanguages(langs);
    setFormEditions(normalizedEds);
    setFormCategories(normalizeCategories(book));
    setFormTags(normalizeTags(book));
    setFormReviewLang(focusLangCode && langs.includes(focusLangCode) ? focusLangCode : (langs[0] || null));
    setCoverCandidates([]);
    setCoverSearchDone(false);
    setAutoFillNotice('');
    setBookModalOpen(true);
  };

  const handleSearchCovers = async () => {
    if (!formName.trim()) return;
    setIsSearchingCovers(true);
    setCoverSearchDone(false);
    setAutoFillNotice('');
    const primaryLang = formLanguages[0] || null;
    const results = await searchBookCovers(formName, formAuthor, primaryLang);
    setCoverCandidates(results);
    setIsSearchingCovers(false);
    setCoverSearchDone(true);
  };

  const handlePickSearchCandidate = (cand) => {
    const url = cand.url || '';
    setFormCoverUrl(url);
    if (formLanguages.length > 0 && url) {
      const primaryCode = formLanguages[0];
      setFormEditions((prev) => ({
        ...prev,
        [primaryCode]: {
          ...prev[primaryCode],
          coverUrl: url,
          completed: prev[primaryCode]?.completed ?? false,
        },
      }));
    }
    const filled = ['Cover'];
    if (cand.author && (!formAuthor.trim() || !editingBookId)) {
      setFormAuthor(cand.author);
      filled.push('Autor');
    }
    if (cand.pageCount && (!formTotalPages || !editingBookId)) {
      setFormTotalPages(String(cand.pageCount));
      filled.push(`${cand.pageCount} Seiten`);
    }
    if (Array.isArray(cand.categories) && cand.categories.length > 0 && formCategories.length === 0) {
      const normalized = normalizeCategories(cand.categories);
      if (normalized.length > 0) {
        setFormCategories(normalized);
        filled.push('Kategorie');
      }
    }
    if (Array.isArray(cand.tags) && cand.tags.length > 0 && formTags.length === 0) {
      const normalized = normalizeTags(cand.tags);
      if (normalized.length > 0) {
        setFormTags(normalized);
        filled.push('Tags');
      }
    }
    setAutoFillNotice(`Automatisch übernommen: ${filled.join(', ')}`);
  };

  const runPickerSearch = async (queryText, langCode = coverPickerLang) => {
    const q = (queryText || '').trim();
    if (!q) return;
    setPickerLoading(true);
    setPickerSearched(false);
    const results = await searchBookCovers(q, '', langCode || null);
    setPickerResults(results);
    setPickerLoading(false);
    setPickerSearched(true);
  };

  const openCoverPicker = (book, langCode = null) => {
    const initialQuery = [book.name, book.author].filter(Boolean).join(' ');
    const eds = getBookEditions(book);
    const matchedEd = langCode ? eds.find((e) => e.code === langCode) : null;
    setCoverPickerBook(book);
    setCoverPickerLang(langCode || null);
    setPickerQuery(initialQuery);
    setPickerCustomUrl(matchedEd?.coverUrl || book.coverUrl || '');
    setPickerResults([]);
    setPickerSearched(false);
    runPickerSearch(initialQuery, langCode || null);
  };

  const handleSelectPickedCover = async (url) => {
    if (!coverPickerBook) return;
    await updateBookCover(coverPickerBook.id, url, coverPickerLang || null);
    setCoverPickerBook(null);
    setCoverPickerLang(null);
  };

  const handleFetchMissingCovers = async () => {
    if (isFetchingAllCovers || booksWithoutCover.length === 0) return;
    setIsFetchingAllCovers(true);
    setBatchCoverFeedback(null);
    let foundCount = 0;
    const total = booksWithoutCover.length;
    try {
      for (const book of booksWithoutCover) {
        const primaryLang = normalizeLanguages(book)[0] || null;
        const url = await fetchBestBookCover(book.name, book.author, primaryLang);
        if (url) {
          await updateBookCover(book.id, url);
          foundCount++;
        }
      }
      if (foundCount === total) {
        setBatchCoverFeedback(`Alle ${foundCount} Cover erfolgreich geladen!`);
      } else if (foundCount > 0) {
        setBatchCoverFeedback(`${foundCount} von ${total} Covern geladen. Tippe auf ein fehlendes Cover, um manuell zu suchen.`);
      } else {
        setBatchCoverFeedback(`Keine automatischen Treffer für ${total} ${total === 1 ? 'Buch' : 'Bücher'}. Tippe links auf ein Buchcover, um im Suchmenü manuell zu suchen.`);
      }
    } finally {
      setIsFetchingAllCovers(false);
    }
  };

  const handleSeriesInput = (newValue) => {
    setFormSeries(newValue);
    if (seriesAuthorMap[newValue] && !formAuthor) {
      setFormAuthor(seriesAuthorMap[newValue]);
    }
  };

  // Enforce choosing a cover for English or any 2nd+ language in the modal
  const missingEditionCoverLangs = useMemo(() => {
    return formLanguages.filter((code, idx) => {
      const requiresCover = code === 'en' || idx >= 1;
      if (!requiresCover) return false;
      const edCover = formEditions[code]?.coverUrl || (idx === 0 ? formCoverUrl.trim() : '');
      return !edCover;
    });
  }, [formLanguages, formEditions, formCoverUrl]);

  const handleSaveBook = async () => {
    if (!formName.trim() || missingEditionCoverLangs.length > 0) return;

    let wordsToSave = formWordsPerPage;
    if (!editingBookId && !wordsToSave) {
      const similarBooks = books.filter(b =>
        b.wordsPerPage &&
        ((formAuthor && b.author === formAuthor) || (formSeries && b.series === formSeries))
      );
      if (similarBooks.length > 0) {
        const avg = similarBooks.reduce((acc, b) => acc + parseInt(b.wordsPerPage, 10), 0) / similarBooks.length;
        wordsToSave = Math.round(avg).toString();
      }
    }

    let finalCoverUrl = formCoverUrl.trim() || null;
    if (!editingBookId && !finalCoverUrl) {
      // Automatically try to fetch a cover when creating a new book
      try {
        finalCoverUrl = await fetchBestBookCover(formName, formAuthor, formLanguages[0] || null);
      } catch {
        finalCoverUrl = null;
      }
    }

    const editingBook = editingBookId ? books.find((b) => b.id === editingBookId) : null;
    const primaryCode = formLanguages[0] || null;
    const primaryRating = primaryCode && formEditions[primaryCode]
      ? (formEditions[primaryCode].rating ?? null)
      : formRating;
    const primaryNotes = primaryCode && formEditions[primaryCode]
      ? (formEditions[primaryCode].notes ?? '')
      : formNotes;
    const parsedTotalPages = formTotalPages ? parseInt(formTotalPages, 10) : null;

    const normalizedEditions = normalizeLanguageEditions(
      formLanguages,
      formEditions,
      finalCoverUrl,
      editingBook ? !!editingBook.completed : false,
      primaryRating,
      primaryNotes,
      parsedTotalPages
    );

    if (editingBookId) {
      updateBook(
        editingBookId,
        formName,
        formAuthor,
        formSeries,
        undefined,
        wordsToSave,
        formSeriesNumber,
        formUniverse,
        formTotalPages,
        finalCoverUrl,
        primaryRating,
        primaryNotes,
        formLanguages,
        normalizedEditions,
        formCategories,
        formTags
      );
    } else {
      addBook(
        formName,
        formAuthor,
        formSeries,
        wordsToSave,
        formSeriesNumber,
        formUniverse,
        formTotalPages,
        finalCoverUrl,
        primaryRating,
        primaryNotes,
        formLanguages,
        normalizedEditions,
        formCategories,
        formTags
      );
    }
    setBookModalOpen(false);
  };

  const getSessionsForEntry = (book, langCode = null) => {
    const allBookSessions = readingSessions.filter(s => s.bookId === book.id);
    const langs = normalizeLanguages(book);
    if (langCode && langs.length >= 2) {
      return allBookSessions.filter((s) =>
        s.language ? s.language.toLowerCase() === langCode : langs[0] === langCode
      );
    }
    return allBookSessions;
  };

  const handleToggleCompleted = (entry) => {
    const book = entry.book;
    const isNowCompleted = !entry.completed;

    if (entry.langCode) {
      updateBookEdition(book.id, entry.langCode, { completed: isNowCompleted });
    } else {
      updateBook(
        book.id,
        book.name,
        book.author,
        book.series,
        isNowCompleted,
        book.wordsPerPage,
        book.seriesNumber,
        book.universe,
        book.totalPages
      );
    }

    if (isNowCompleted) {
      setCompletedRating(entry.rating ?? null);
      setCompletedNotes(entry.notes || '');
      setCompletedLanguages(normalizeLanguages(book));
      const sessions = getSessionsForEntry(book, entry.langCode);
      if (sessions.length > 0) {
        const bookSeconds = sessions.reduce((acc, s) => acc + s.timeSpent, 0);
        const bookAmount = sessions.reduce((acc, s) => acc + s.amount, 0);

        const maxEndedOnPage = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));
        const pagesRead = maxEndedOnPage > 0 ? maxEndedOnPage : bookAmount;

        const bookSpeed = bookSeconds > 0 ? bookAmount / (bookSeconds / 3600) : 0;

        const globalSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0);
        const globalAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0);
        const globalSpeed = globalSeconds > 0 ? globalAmount / (globalSeconds / 3600) : 0;

        let precisionStr = '';
        if (globalSpeed > 0 && bookSpeed > 0) {
          const diff = bookSpeed - globalSpeed;
          const percentage = Math.abs(Math.round((diff / globalSpeed) * 100));
          if (diff > 0) {
            precisionStr = `Du warst bei diesem Buch ${percentage}% schneller als dein Durchschnitt!`;
          } else if (diff < 0) {
            precisionStr = `Du warst bei diesem Buch ${percentage}% langsamer als dein Durchschnitt.`;
          } else {
            precisionStr = 'Deine Geschwindigkeit lag exakt im Durchschnitt!';
          }
        }

        const h = Math.floor(bookSeconds / 3600);
        const m = Math.floor((bookSeconds % 3600) / 60);

        setCompletedBookStats({
          id: book.id,
          name: book.name,
          langCode: entry.langCode || null,
          langMeta: entry.langMeta || null,
          coverUrl: entry.coverUrl || null,
          timeStr: `${h}h ${m}m`,
          pages: pagesRead,
          speed: Math.round(bookSpeed),
          precisionStr
        });
      } else {
        setCompletedBookStats({
          id: book.id,
          name: book.name,
          langCode: entry.langCode || null,
          langMeta: entry.langMeta || null,
          coverUrl: entry.coverUrl || null,
          timeStr: null,
          pages: null,
          speed: null,
          precisionStr: ''
        });
      }
    }
  };

  const handleDeleteEntry = (entry) => {
    if (entry.isMultiLang && entry.langCode) {
      const label = entry.langMeta?.label || entry.langCode.toUpperCase();
      if (!window.confirm(`Nur die ${label}-Ausgabe von „${entry.book.name}“ entfernen? Die andere Sprache bleibt erhalten.`)) {
        return;
      }
      const remainingLangs = normalizeLanguages(entry.book).filter((c) => c !== entry.langCode);
      updateBookLanguages(entry.book.id, remainingLangs);
      return;
    }
    deleteBook(entry.book.id);
  };

  const getBookProgressInfo = (book, langCode = null, overrideTotalPages = null) => {
    const sessions = getSessionsForEntry(book, langCode);
    const maxEndedOnPage = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));
    const pagesRead = maxEndedOnPage > 0
      ? maxEndedOnPage
      : sessions.reduce((acc, s) => acc + (s.amount || 0), 0);

    const total = Number(overrideTotalPages || book.totalPages) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((pagesRead / total) * 100)) : null;

    let forecast = null;
    if (total > 0 && sessions.length > 0) {
      if (pagesRead >= total) {
        forecast = 'Fertig gelesen';
      } else {
        const remainingPages = total - pagesRead;
        const globalReadingSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0);
        const globalReadingAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0);
        if (globalReadingSeconds > 0 && globalReadingAmount > 0) {
          const globalSpeed = globalReadingAmount / (globalReadingSeconds / 3600);
          const remainingHours = remainingPages / globalSpeed;
          const h = Math.floor(remainingHours);
          const m = Math.round((remainingHours - h) * 60);
          forecast = h > 0
            ? `Noch ca. ${h}h ${m}m (${remainingPages} S.)`
            : `Noch ca. ${m}m (${remainingPages} S.)`;
        }
      }
    }

    return { pagesRead, total, pct, forecast, sessionCount: sessions.length };
  };

  const handleManageRename = () => {
    if (!manageOldName) return;
    if (manageType === 'author') {
      renameAuthor(manageOldName, manageNewName);
    } else {
      renameSeries(manageOldName, manageNewName);
    }
    setIsManageModalOpen(false);
    setManageOldName('');
    setManageNewName('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header Card */}
      <Card sx={{ p: { xs: 2.25, sm: 3 }, borderRadius: '24px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MenuBookIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.08rem', lineHeight: 1.2 }}>
                Meine Bücher
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeEntries.length} aktiv · {completedEntries.length} abgeschlossen
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            {booksWithoutCover.length > 0 && (
              <Tooltip title={`Fehlende Cover (${booksWithoutCover.length}) automatisch über Google Books & Open Library laden`}>
                <Button
                  startIcon={isFetchingAllCovers ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon fontSize="small" />}
                  variant="outlined"
                  onClick={handleFetchMissingCovers}
                  disabled={isFetchingAllCovers}
                  size="small"
                  sx={{ borderRadius: 9999, borderColor: 'divider', color: 'primary.main', px: 1.75 }}
                >
                  {isFetchingAllCovers ? 'Lade Cover...' : `Cover laden (${booksWithoutCover.length})`}
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Sortieren & nach Kategorie / Tag filtern">
              <IconButton
                size="small"
                onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                sx={{
                  border: '1px solid',
                  borderColor: (sortBy !== 'default' || categoryFilter !== 'all' || tagFilter !== 'all') ? 'primary.main' : 'divider',
                  bgcolor: (sortBy !== 'default' || categoryFilter !== 'all' || tagFilter !== 'all')
                    ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1)
                    : 'transparent',
                  color: (sortBy !== 'default' || categoryFilter !== 'all' || tagFilter !== 'all') ? 'primary.main' : 'text.secondary',
                }}
              >
                <TuneIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={() => setSortMenuAnchor(null)}
              PaperProps={{ sx: { borderRadius: '16px', minWidth: 205, maxHeight: 420 } }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 2, py: 0.65, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}>
                Sortierung
              </Typography>
              {[
                { id: 'default', label: 'Reihe (Standard)' },
                { id: 'category', label: 'Kategorie' },
                { id: 'rating', label: 'Bewertung' },
                { id: 'title', label: 'Titel (A–Z)' },
              ].map((opt) => (
                <MenuItem
                  key={opt.id}
                  selected={sortBy === opt.id}
                  onClick={() => {
                    setSortBy(opt.id);
                    setSortMenuAnchor(null);
                  }}
                  sx={{ fontSize: '0.84rem' }}
                >
                  {opt.label}
                </MenuItem>
              ))}
              {availableCategories.length > 0 && [
                <Divider key="cat-div" sx={{ my: 0.75 }} />,
                <Typography
                  key="cat-head"
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ px: 2, py: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}
                >
                  Kategorie filtern
                </Typography>,
                <MenuItem
                  key="cat-all"
                  selected={categoryFilter === 'all'}
                  onClick={() => {
                    setCategoryFilter('all');
                    setSortMenuAnchor(null);
                  }}
                  sx={{ fontSize: '0.84rem' }}
                >
                  Alle Kategorien
                </MenuItem>,
                ...availableCategories.map((cat) => (
                  <MenuItem
                    key={`cat-${cat}`}
                    selected={categoryFilter === cat}
                    onClick={() => {
                      setCategoryFilter(cat);
                      setSortMenuAnchor(null);
                    }}
                    sx={{ fontSize: '0.84rem' }}
                  >
                    {cat}
                  </MenuItem>
                )),
              ]}
              {availableTags.length > 0 && [
                <Divider key="tag-div" sx={{ my: 0.75 }} />,
                <Typography
                  key="tag-head"
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ px: 2, py: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}
                >
                  Tag filtern
                </Typography>,
                <MenuItem
                  key="tag-all"
                  selected={tagFilter === 'all'}
                  onClick={() => {
                    setTagFilter('all');
                    setSortMenuAnchor(null);
                  }}
                  sx={{ fontSize: '0.84rem' }}
                >
                  Alle Tags
                </MenuItem>,
                ...availableTags.map((t) => (
                  <MenuItem
                    key={`tag-${t}`}
                    selected={tagFilter === t}
                    onClick={() => {
                      setTagFilter(t);
                      setSortMenuAnchor(null);
                    }}
                    sx={{ fontSize: '0.84rem' }}
                  >
                    #{t}
                  </MenuItem>
                )),
              ]}
            </Menu>
            <Button
              startIcon={<SettingsIcon fontSize="small" />}
              variant="outlined"
              onClick={() => setIsManageModalOpen(true)}
              size="small"
              sx={{ borderRadius: 9999, borderColor: 'divider', color: 'text.secondary', px: 1.75 }}
            >
              Autoren/Reihen
            </Button>
            <Button
              startIcon={<AddIcon fontSize="small" />}
              variant="contained"
              onClick={openAddModal}
              size="small"
              sx={{ borderRadius: 9999, px: 2 }}
            >
              Buch hinzufügen
            </Button>
          </Box>
        </Box>

        {(availableLanguages.length > 0 || categoryFilter !== 'all' || tagFilter !== 'all' || sortBy !== 'default') && (
          <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', mb: 2, pb: 0.25, alignItems: 'center' }}>
            {availableLanguages.length > 0 && [
              { id: 'all', label: 'Alle Sprachen' },
              ...availableLanguages.map((code) => {
                const meta = getLanguageMeta(code);
                return { id: code, label: `${meta.flag} ${meta.label}` };
              }),
              ...(availableLanguages.length >= 2 ? [{ id: 'bilingual', label: '✨ Beide / Mehrsprachig' }] : []),
            ].map((opt) => {
              const active = languageFilter === opt.id;
              return (
                <Box
                  key={opt.id}
                  onClick={() => setLanguageFilter(opt.id)}
                  sx={{
                    px: 1.35,
                    py: 0.45,
                    borderRadius: 9999,
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexShrink: 0,
                    fontSize: '0.74rem',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active
                      ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12)
                      : 'background.surfaceVariant',
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
            {categoryFilter !== 'all' && (
              <Box
                onClick={() => setCategoryFilter('all')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1.2,
                  py: 0.45,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.35),
                  color: 'primary.main',
                }}
              >
                <span>{categoryFilter}</span>
                <CloseIcon sx={{ fontSize: 12 }} />
              </Box>
            )}
            {tagFilter !== 'all' && (
              <Box
                onClick={() => setTagFilter('all')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1.2,
                  py: 0.45,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.18 : 0.12),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.secondary.main, 0.35),
                  color: 'secondary.main',
                }}
              >
                <span>#{tagFilter}</span>
                <CloseIcon sx={{ fontSize: 12 }} />
              </Box>
            )}
            {sortBy !== 'default' && (
              <Box
                onClick={() => setSortBy('default')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1.15,
                  py: 0.45,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: 'background.surfaceVariant',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                }}
              >
                <span>
                  Sortiert: {sortBy === 'category' ? 'Kategorie' : sortBy === 'rating' ? 'Bewertung' : 'Titel'}
                </span>
                <CloseIcon sx={{ fontSize: 12 }} />
              </Box>
            )}
          </Box>
        )}

        {batchCoverFeedback && (
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1.25,
              borderRadius: '14px',
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08),
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.25),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.primary" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
              {batchCoverFeedback}
            </Typography>
            <IconButton size="small" onClick={() => setBatchCoverFeedback(null)} sx={{ color: 'text.secondary' }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}

        {/* Active Books List (differentiated per language edition) */}
        {activeEntries.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: '18px',
              bgcolor: 'background.surfaceVariant',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {(languageFilter !== 'all' || categoryFilter !== 'all' || tagFilter !== 'all')
                ? 'Keine aktiven Bücher für diesen Filter.'
                : 'Noch keine aktiven Bücher vorhanden. Füge dein aktuelles Buch hinzu!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {activeEntries.map((entry) => {
              const { book, langCode, langMeta, coverUrl, rating, totalPages, isMultiLang } = entry;
              const info = getBookProgressInfo(book, langCode, totalPages);
              return (
                <Box
                  key={entry.key}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: '18px',
                    bgcolor: 'background.surfaceVariant',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    {/* Book Cover on the left (edition-specific cover & badge) */}
                    <Tooltip title={langMeta ? `Cover für ${langMeta.label} suchen / ändern` : 'Cover suchen / ändern'}>
                      <Box
                        onClick={() => openCoverPicker(book, langCode)}
                        sx={{
                          cursor: 'pointer',
                          flexShrink: 0,
                          position: 'relative',
                          width: 54,
                          height: 80,
                          '&:hover': { opacity: 0.9 },
                        }}
                      >
                        <BookCover
                          coverUrl={coverUrl}
                          title={book.name}
                          width={54}
                          height={80}
                          borderRadius="10px"
                        />
                        {langCode && <LanguageCoverBadge languages={[langCode]} size="sm" />}
                        {rating && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.2,
                              px: 0.55,
                              py: 0.1,
                              borderRadius: 9999,
                              bgcolor: 'rgba(19, 19, 20, 0.86)',
                              color: '#FDD663',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              lineHeight: 1.25,
                              fontVariantNumeric: 'tabular-nums',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                            }}
                          >
                            <StarIcon sx={{ fontSize: 9.5 }} />
                            {rating}
                          </Box>
                        )}
                      </Box>
                    </Tooltip>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '0.98rem', lineHeight: 1.3 }}>
                            {book.name}
                          </Typography>
                          {(book.author || (sortBy === 'category' && entry.categories.length > 0)) && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mt: 0.2 }}>
                              {[
                                book.author,
                                sortBy === 'category' && entry.categories.length > 0 ? entry.categories.join(' · ') : null,
                              ].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                          <Tooltip title={isMultiLang && langMeta ? `${langMeta.label}-Ausgabe abschließen` : 'Buch abschließen'}>
                            <Checkbox
                              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary', opacity: 0.7 }} />}
                              checkedIcon={<CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />}
                              checked={entry.completed}
                              onChange={() => handleToggleCompleted(entry)}
                              sx={{ p: 0.5 }}
                            />
                          </Tooltip>
                          {unassignedSessionsCount > 0 && (
                            <Tooltip title={`Allen ${unassignedSessionsCount} Einträgen ohne Buch dieses Buch zuweisen`}>
                              <IconButton
                                onClick={() => assignBookToUnassignedSessions(book.id)}
                                color="success"
                                size="small"
                              >
                                <LibraryAddCheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton onClick={() => openEditModal(book, langCode)} size="small" sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <Tooltip title={isMultiLang && langMeta ? `${langMeta.label}-Ausgabe entfernen` : 'Buch löschen'}>
                            <IconButton
                              onClick={() => handleDeleteEntry(entry)}
                              size="small"
                              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Metadata Pills */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                        {langCode && <LanguagePill languages={[langCode]} />}
                        {rating && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.3,
                              px: 0.9,
                              py: 0.2,
                              borderRadius: 9999,
                              bgcolor: alpha(theme.palette.warning.main, isDark ? 0.2 : 0.14),
                              color: isDark ? '#FDD663' : '#C25E00',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <StarIcon sx={{ fontSize: 12 }} />
                            {rating}/10
                          </Box>
                        )}
                        {book.series && (
                          <Box
                            sx={{
                              px: 1,
                              py: 0.2,
                              borderRadius: 9999,
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: 'text.secondary',
                            }}
                          >
                            {book.series}{book.seriesNumber ? ` · Band ${book.seriesNumber}` : ''}
                          </Box>
                        )}
                        {book.universe && (
                          <Box
                            sx={{
                              px: 1,
                              py: 0.2,
                              borderRadius: 9999,
                              bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.16 : 0.1),
                              color: 'secondary.main',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {book.universe}
                          </Box>
                        )}
                        {info.forecast && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.4,
                              px: 1,
                              py: 0.2,
                              borderRadius: 9999,
                              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                              color: 'primary.main',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            <ScheduleIcon sx={{ fontSize: 12 }} />
                            {info.forecast}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Book Progress Bar (per language edition) */}
                  {info.total > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
                          {isMultiLang && langMeta ? `Fortschritt (${langMeta.short})` : 'Fortschritt'}
                        </Typography>
                        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.72rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {info.pagesRead} / {info.total} S. · {info.pct}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={info.pct} sx={{ height: 6, borderRadius: 9999 }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Card>

      {/* Completed Books Section (differentiated per language edition) */}
      {completedEntries.length > 0 && (
        <Box>
          <Box
            onClick={() => setExpandedCompleted(!expandedCompleted)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              userSelect: 'none',
              px: 1.75,
              py: 0.75,
              mb: 1.5,
              borderRadius: 9999,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              transition: 'color 0.2s ease',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: expandedCompleted ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              Abgeschlossene Bücher ({completedEntries.length})
            </Typography>
          </Box>

          <Collapse in={expandedCompleted} timeout={220}>
            <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {completedEntries.map((entry) => {
                  const { book, langCode, langMeta, coverUrl, rating, isMultiLang } = entry;
                  return (
                    <Box
                      key={entry.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: '16px',
                        bgcolor: 'background.surfaceVariant',
                        opacity: 0.88,
                      }}
                    >
                      <Tooltip title={langMeta ? `Cover für ${langMeta.label} suchen / ändern` : 'Cover suchen / ändern'}>
                        <Box onClick={() => openCoverPicker(book, langCode)} sx={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                          <BookCover coverUrl={coverUrl} title={book.name} width={38} height={56} borderRadius="8px" />
                          {rating && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 3,
                                right: 3,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.15,
                                px: 0.45,
                                py: 0.05,
                                borderRadius: 9999,
                                bgcolor: 'rgba(19, 19, 20, 0.88)',
                                color: '#FDD663',
                                fontSize: '0.56rem',
                                fontWeight: 700,
                                lineHeight: 1.25,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              <StarIcon sx={{ fontSize: 8.5 }} />
                              {rating}
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={600} sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                            {book.name}
                          </Typography>
                          {langCode && <LanguagePill languages={[langCode]} compact />}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {[
                            book.author,
                            book.series ? `${book.series}${book.seriesNumber ? ` (Bd. ${book.seriesNumber})` : ''}` : null,
                            sortBy === 'category' && entry.categories.length > 0 ? entry.categories.join(' · ') : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      </Box>
                      <Tooltip title={isMultiLang && langMeta ? `${langMeta.label}-Ausgabe wieder öffnen` : 'Buch wieder öffnen'}>
                        <Checkbox
                          icon={<CheckCircleOutlinedIcon />}
                          checkedIcon={<CheckCircleIcon color="success" />}
                          checked={entry.completed}
                          onChange={() => handleToggleCompleted(entry)}
                          sx={{ p: 0.5 }}
                        />
                      </Tooltip>
                      <IconButton onClick={() => openEditModal(book, langCode)} size="small" sx={{ color: 'text.secondary' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title={isMultiLang && langMeta ? `${langMeta.label}-Ausgabe entfernen` : 'Buch löschen'}>
                        <IconButton onClick={() => handleDeleteEntry(entry)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            </Card>
          </Collapse>
        </Box>
      )}

      {/* Add / Edit Book Dialog with Cover Search */}
      <Dialog open={bookModalOpen} onClose={() => setBookModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span>{editingBookId ? 'Buch bearbeiten' : 'Neues Buch hinzufügen'}</span>
          <IconButton size="small" onClick={() => setBookModalOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, pt: '12px !important' }}>
          {/* Cover & Auto-Fill Search Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1.5,
              borderRadius: '16px',
              bgcolor: 'background.surfaceVariant',
            }}
          >
            <BookCover coverUrl={formCoverUrl} title={formName} width={56} height={84} borderRadius="10px" />
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Auto-Fill: Cover, Autor &amp; Seitenzahl suchen
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isSearchingCovers ? <CircularProgress size={14} color="inherit" /> : <ImageSearchIcon fontSize="small" />}
                  onClick={handleSearchCovers}
                  disabled={!formName.trim() || isSearchingCovers}
                  sx={{ borderRadius: 9999 }}
                >
                  {isSearchingCovers ? 'Suche...' : 'Buch & Cover suchen'}
                </Button>
                {formCoverUrl && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setFormCoverUrl('')}
                    sx={{ borderRadius: 9999 }}
                  >
                    Entfernen
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {autoFillNotice && (
            <Typography variant="caption" color="success.main" fontWeight={600}>
              ✓ {autoFillNotice}
            </Typography>
          )}

          {/* Auto-Fill Search Results Strip */}
          {coverCandidates.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Treffer antippen (übernimmt Cover, Autor &amp; Seitenzahl):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5 }}>
                {coverCandidates.map((cand, idx) => {
                  const selected = formCoverUrl === cand.url;
                  return (
                    <Box
                      key={idx}
                      onClick={() => handlePickSearchCandidate(cand)}
                      sx={{
                        cursor: 'pointer',
                        p: 1,
                        width: 108,
                        borderRadius: '14px',
                        border: '2px solid',
                        borderColor: selected ? 'primary.main' : 'transparent',
                        bgcolor: selected ? alpha(theme.palette.primary.main, 0.14) : 'background.surfaceVariant',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 0.5,
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <BookCover coverUrl={cand.url} title={cand.title} width={54} height={80} borderRadius="7px" />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          fontSize: '0.68rem',
                          lineHeight: 1.15,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {cand.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', lineHeight: 1.1 }}>
                        {cand.pageCount ? `${cand.pageCount} S.` : cand.source}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
          {coverSearchDone && coverCandidates.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Kein passender Treffer gefunden. Du kannst auch unten direkt eine Bild-URL einfügen.
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Basisinfos
            </Typography>
            <TextField
              label="Titel *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              size="small"
              fullWidth
              autoFocus
            />
            <Autocomplete
              freeSolo
              options={uniqueAuthors}
              value={formAuthor}
              onInputChange={(e, newValue) => setFormAuthor(newValue)}
              renderInput={(params) => <TextField {...params} label="Autor" size="small" fullWidth />}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField
                label="Gesamtseiten"
                type="number"
                value={formTotalPages}
                onChange={(e) => setFormTotalPages(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Wörter / Seite (Ø)"
                type="number"
                value={formWordsPerPage}
                onChange={(e) => setFormWordsPerPage(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.15 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sprache(n) &amp; Ausgaben
            </Typography>
            <LanguagePicker
              value={formLanguages}
              onToggleLanguage={(code, isActive) => {
                if (isActive) {
                  const nextLangs = formLanguages.filter((c) => c !== code);
                  setFormLanguages(nextLangs);
                  setFormEditions((prev) => {
                    const copy = { ...prev };
                    delete copy[code];
                    return copy;
                  });
                  if (formReviewLang === code) {
                    setFormReviewLang(nextLangs[0] || null);
                  }
                  return;
                }
                // Selecting English or any 2nd+ language -> require choosing a cover (starts as Aktiv / nicht abgeschlossen!)
                if (code === 'en' || formLanguages.length >= 1) {
                  setEditionCoverPicker({
                    source: 'form',
                    langCode: code,
                    isNewEdition: true,
                    initialCoverUrl: formEditions[code]?.coverUrl || '',
                    bookTitle: formName,
                    bookAuthor: formAuthor,
                  });
                } else {
                  const editingBook = editingBookId ? books.find((b) => b.id === editingBookId) : null;
                  const nextLangs = normalizeLanguages([...formLanguages, code]);
                  setFormLanguages(nextLangs);
                  setFormEditions((prev) => ({
                    ...prev,
                    [code]: {
                      coverUrl: formCoverUrl.trim() || null,
                      completed: editingBook ? !!editingBook.completed : false,
                      rating: formRating ?? null,
                      notes: formNotes || '',
                      totalPages: formTotalPages ? parseInt(formTotalPages, 10) : null,
                    },
                  }));
                  setFormReviewLang(code);
                }
              }}
            />

            {/* Per-language Edition Cover, Pages & Completion Status Cards */}
            {formLanguages.length >= 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.25 }}>
                {formLanguages.map((code, idx) => {
                  const meta = getLanguageMeta(code);
                  const ed = formEditions[code] || {
                    coverUrl: idx === 0 ? (formCoverUrl.trim() || null) : null,
                    completed: false,
                    rating: idx === 0 ? formRating : null,
                    notes: idx === 0 ? formNotes : '',
                    totalPages: idx === 0 && formTotalPages ? parseInt(formTotalPages, 10) : null,
                  };
                  const edCover = ed.coverUrl || (idx === 0 ? (formCoverUrl.trim() || null) : null);
                  const needsCover = (code === 'en' || idx >= 1) && !edCover;

                  return (
                    <Box
                      key={code}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1.25,
                        p: 1.15,
                        borderRadius: '14px',
                        bgcolor: 'background.surfaceVariant',
                        border: '1px solid',
                        borderColor: needsCover ? 'warning.main' : 'divider',
                      }}
                    >
                      <BookCover coverUrl={edCover} title={formName} width={38} height={56} borderRadius="7px" />
                      <Box sx={{ flex: 1, minWidth: 100 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.84rem' }}>
                          {meta.flag} {meta.label}
                        </Typography>
                        <Typography variant="caption" color={needsCover ? 'warning.main' : 'text.secondary'} sx={{ display: 'block', fontSize: '0.7rem' }}>
                          {needsCover
                            ? 'Cover erforderlich — bitte auswählen'
                            : (edCover ? 'Cover gewählt' : 'Standard-Cover')}
                        </Typography>
                      </Box>
                      {formLanguages.length >= 2 && (
                        <TextField
                          label="Seiten"
                          type="number"
                          size="small"
                          value={ed.totalPages ?? ''}
                          placeholder={formTotalPages || '—'}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            setFormEditions((prev) => ({
                              ...prev,
                              [code]: {
                                ...ed,
                                coverUrl: edCover,
                                totalPages: val && val > 0 ? val : null,
                              },
                            }));
                          }}
                          sx={{ width: 82 }}
                          inputProps={{ style: { fontSize: '0.78rem', padding: '6px 8px' } }}
                        />
                      )}
                      {(editingBookId || formLanguages.length >= 2) && (
                        <Box
                          onClick={() => {
                            setFormEditions((prev) => ({
                              ...prev,
                              [code]: {
                                ...ed,
                                coverUrl: edCover,
                                completed: !ed.completed,
                              },
                            }));
                          }}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.35,
                            px: 1,
                            py: 0.35,
                            borderRadius: 9999,
                            cursor: 'pointer',
                            userSelect: 'none',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: ed.completed
                              ? alpha(theme.palette.success.main, isDark ? 0.2 : 0.14)
                              : alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                            color: ed.completed ? 'success.main' : 'primary.main',
                          }}
                        >
                          {ed.completed ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <CheckCircleOutlinedIcon sx={{ fontSize: 13 }} />}
                          {ed.completed ? 'Gelesen' : 'Aktiv'}
                        </Box>
                      )}
                      <Button
                        size="small"
                        variant={needsCover ? 'contained' : 'outlined'}
                        color={needsCover ? 'warning' : 'primary'}
                        onClick={() => {
                          setEditionCoverPicker({
                            source: 'form',
                            langCode: code,
                            isNewEdition: false,
                            initialCoverUrl: edCover || '',
                            bookTitle: formName,
                            bookAuthor: formAuthor,
                          });
                        }}
                        sx={{ borderRadius: 9999, px: 1.5, minWidth: 'auto', fontSize: '0.72rem' }}
                      >
                        {edCover ? 'Cover' : 'Cover wählen'}
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reihe, Universum &amp; Kategorie
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
              <Autocomplete
                freeSolo
                options={uniqueSeries}
                value={formSeries}
                onInputChange={(e, newValue) => handleSeriesInput(newValue)}
                renderInput={(params) => <TextField {...params} label="Reihe" size="small" fullWidth />}
              />
              <TextField
                label="Band"
                type="number"
                value={formSeriesNumber}
                onChange={(e) => setFormSeriesNumber(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>
            <Autocomplete
              freeSolo
              options={uniqueUniverses}
              value={formUniverse}
              onInputChange={(e, newValue) => setFormUniverse(newValue)}
              renderInput={(params) => <TextField {...params} label="Universum" size="small" fullWidth />}
            />
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={Array.from(new Set([...PRESET_BOOK_CATEGORIES, ...availableCategories]))}
              value={formCategories}
              onChange={(_, val) => setFormCategories(normalizeCategories(val))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Kategorie / Genre (optional)"
                  placeholder={formCategories.length === 0 ? 'z. B. Romantasy, Fantasy, Thriller...' : ''}
                  size="small"
                  fullWidth
                />
              )}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                options={Array.from(new Set([...PRESET_BOOK_TAGS, ...availableTags]))}
                value={formTags}
                onChange={(_, val) => setFormTags(normalizeTags(val))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags / Elemente (optional)"
                    placeholder={formTags.length === 0 ? 'z. B. Magie, Drachen, Schwertkampf, Moderne...' : ''}
                    size="small"
                    fullWidth
                  />
                )}
              />
              <Box sx={{ display: 'flex', gap: 0.55, overflowX: 'auto', pb: 0.25 }}>
                {PRESET_BOOK_TAGS.slice(0, 12).map((tag) => {
                  const active = formTags.includes(tag);
                  return (
                    <Box
                      key={tag}
                      onClick={() => {
                        setFormTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : normalizeTags([...prev, tag])
                        );
                      }}
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 9999,
                        cursor: 'pointer',
                        userSelect: 'none',
                        flexShrink: 0,
                        fontSize: '0.68rem',
                        fontWeight: active ? 700 : 500,
                        bgcolor: active
                          ? alpha(theme.palette.secondary.main, isDark ? 0.24 : 0.14)
                          : 'background.surfaceVariant',
                        border: '1px solid',
                        borderColor: active ? 'secondary.main' : 'transparent',
                        color: active ? 'secondary.main' : 'text.secondary',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {active ? `✓ ${tag}` : `+ ${tag}`}
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <TextField
              label="Cover Bild-URL (optional)"
              value={formCoverUrl}
              onChange={(e) => setFormCoverUrl(e.target.value)}
              size="small"
              fullWidth
              placeholder="https://..."
            />
          </Box>

          {/* 1-10 Rating & Short Note (separate per language when 2+ languages) */}
          {(() => {
            const activeReviewLang = formLanguages.length >= 2
              ? (formReviewLang && formLanguages.includes(formReviewLang) ? formReviewLang : formLanguages[0])
              : (formLanguages[0] || null);
            const activeReviewMeta = activeReviewLang ? getLanguageMeta(activeReviewLang) : null;
            const currentRating = activeReviewLang && formEditions[activeReviewLang]
              ? (formEditions[activeReviewLang].rating ?? null)
              : formRating;
            const currentNotes = activeReviewLang && formEditions[activeReviewLang]
              ? (formEditions[activeReviewLang].notes ?? '')
              : formNotes;

            const handleSetReviewRating = (nextRating) => {
              if (activeReviewLang) {
                setFormEditions((prev) => ({
                  ...prev,
                  [activeReviewLang]: {
                    ...prev[activeReviewLang],
                    rating: nextRating,
                  },
                }));
                if (activeReviewLang === formLanguages[0]) {
                  setFormRating(nextRating);
                }
              } else {
                setFormRating(nextRating);
              }
            };

            const handleSetReviewNotes = (nextNotes) => {
              if (activeReviewLang) {
                setFormEditions((prev) => ({
                  ...prev,
                  [activeReviewLang]: {
                    ...prev[activeReviewLang],
                    notes: nextNotes,
                  },
                }));
                if (activeReviewLang === formLanguages[0]) {
                  setFormNotes(nextNotes);
                }
              } else {
                setFormNotes(nextNotes);
              }
            };

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bewertung &amp; Notiz{formLanguages.length >= 2 && activeReviewMeta ? ` (${activeReviewMeta.flag} ${activeReviewMeta.short})` : ' (optional)'}
                  </Typography>
                  {currentRating && (
                    <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? '#FDD663' : '#C25E00', fontVariantNumeric: 'tabular-nums' }}>
                      ★ {currentRating} / 10
                    </Typography>
                  )}
                </Box>
                {formLanguages.length >= 2 && (
                  <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                    {formLanguages.map((code) => {
                      const meta = getLanguageMeta(code);
                      const selected = code === activeReviewLang;
                      const edRating = formEditions[code]?.rating;
                      return (
                        <Box
                          key={code}
                          onClick={() => setFormReviewLang(code)}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.4,
                            px: 1.1,
                            py: 0.35,
                            borderRadius: 9999,
                            cursor: 'pointer',
                            userSelect: 'none',
                            fontSize: '0.72rem',
                            fontWeight: selected ? 700 : 500,
                            bgcolor: selected
                              ? alpha(meta.accent, isDark ? 0.24 : 0.16)
                              : 'background.surfaceVariant',
                            border: '1.5px solid',
                            borderColor: selected ? meta.accent : 'transparent',
                            color: selected ? 'text.primary' : 'text.secondary',
                          }}
                        >
                          <span>{meta.flag}</span>
                          <span>{meta.label}</span>
                          {edRating && (
                            <span style={{ color: isDark ? '#FDD663' : '#B45309', fontWeight: 700 }}>
                              ★{edRating}
                            </span>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 0.5 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const active = currentRating === num;
                    const filled = currentRating && num <= currentRating;
                    return (
                      <Box
                        key={num}
                        onClick={() => handleSetReviewRating(active ? null : num)}
                        sx={{
                          py: 0.65,
                          borderRadius: '10px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          bgcolor: filled
                            ? alpha(theme.palette.warning.main, isDark ? 0.28 : 0.2)
                            : 'background.surfaceVariant',
                          color: filled ? (isDark ? '#FDD663' : '#B45309') : 'text.secondary',
                          border: '1px solid',
                          borderColor: active ? 'warning.main' : 'transparent',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {num}
                      </Box>
                    );
                  })}
                </Box>
                <TextField
                  label="Kurzes Fazit oder Lieblingszitat"
                  value={currentNotes}
                  onChange={(e) => handleSetReviewNotes(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Was hat dir besonders gefallen?"
                />
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          {missingEditionCoverLangs.length > 0 ? (
            <Typography variant="caption" color="warning.main" fontWeight={600}>
              Bitte Cover wählen für: {missingEditionCoverLangs.map((c) => getLanguageMeta(c).label).join(', ')}
            </Typography>
          ) : <Box />}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setBookModalOpen(false)} sx={{ borderRadius: 9999 }}>
              Abbrechen
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveBook}
              disabled={!formName.trim() || missingEditionCoverLangs.length > 0}
              startIcon={<SaveIcon />}
              sx={{ borderRadius: 9999, px: 3 }}
            >
              Speichern
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Manage Authors / Series Dialog */}
      <Dialog open={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span>Autoren & Reihen</span>
          <IconButton size="small" onClick={() => setIsManageModalOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
            Korrigiere Schreibfehler bei Autoren oder Reihen. Lass „Neuer Name“ leer, um den Eintrag aus allen Büchern zu entfernen.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.75,
              p: 0.5,
              borderRadius: '14px',
              bgcolor: 'background.surfaceVariant',
            }}
          >
            {[
              { id: 'author', label: 'Autor' },
              { id: 'series', label: 'Reihe' },
            ].map(opt => {
              const active = manageType === opt.id;
              return (
                <Box
                  key={opt.id}
                  onClick={() => {
                    setManageType(opt.id);
                    setManageOldName('');
                  }}
                  sx={{
                    py: 0.85,
                    textAlign: 'center',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? 'background.paper' : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
          <Autocomplete
            options={manageType === 'author' ? uniqueAuthors : uniqueSeries}
            value={manageOldName}
            onChange={(e, newValue) => setManageOldName(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label={manageType === 'author' ? 'Autor auswählen' : 'Reihe auswählen'}
                size="small"
              />
            )}
          />
          <TextField
            label="Neuer Name (leer = entfernen)"
            value={manageNewName}
            onChange={(e) => setManageNewName(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setIsManageModalOpen(false)} sx={{ borderRadius: 9999 }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleManageRename}
            disabled={!manageOldName}
            sx={{ borderRadius: 9999, px: 3 }}
          >
            Anwenden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Completed Stats Dialog */}
      <Dialog open={!!completedBookStats} onClose={() => setCompletedBookStats(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          {completedBookStats?.coverUrl ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <BookCover coverUrl={completedBookStats.coverUrl} title={completedBookStats.name} width={68} height={100} borderRadius="12px" />
            </Box>
          ) : (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.success.main, isDark ? 0.18 : 0.12),
                color: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <AutoAwesomeIcon />
            </Box>
          )}
          <Typography variant="h6" fontWeight={700}>
            Buch abgeschlossen!
          </Typography>
          {completedBookStats && (
            <>
              <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 0.5 }}>
                {completedBookStats.name}
                {completedBookStats.langMeta ? ` · ${completedBookStats.langMeta.flag} ${completedBookStats.langMeta.label}` : ''}
              </Typography>

              {completedBookStats.timeStr && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mt: 2.5 }}>
                  <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'background.surfaceVariant' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {completedBookStats.timeStr}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Lesezeit</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'background.surfaceVariant' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {completedBookStats.pages}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Seiten</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'background.surfaceVariant' }}>
                    <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {completedBookStats.speed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Seiten/h</Typography>
                  </Box>
                </Box>
              )}

              {completedBookStats.precisionStr && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08),
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '0.84rem' }}>
                    {completedBookStats.precisionStr}
                  </Typography>
                </Box>
              )}

              {/* Quick 1-10 Rating & Fazit right on completion (per language) */}
              <Box sx={{ mt: 2.5, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Deine Bewertung{completedBookStats.langMeta ? ` (${completedBookStats.langMeta.flag} ${completedBookStats.langMeta.short})` : ''} (1–10)
                  </Typography>
                  {completedRating && (
                    <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? '#FDD663' : '#C25E00', fontVariantNumeric: 'tabular-nums' }}>
                      ★ {completedRating}/10
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 0.4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const active = completedRating === num;
                    const filled = completedRating && num <= completedRating;
                    return (
                      <Box
                        key={num}
                        onClick={() => setCompletedRating(active ? null : num)}
                        sx={{
                          py: 0.6,
                          borderRadius: '8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          bgcolor: filled
                            ? alpha(theme.palette.warning.main, isDark ? 0.28 : 0.2)
                            : 'background.surfaceVariant',
                          color: filled ? (isDark ? '#FDD663' : '#B45309') : 'text.secondary',
                          border: '1px solid',
                          borderColor: active ? 'warning.main' : 'transparent',
                        }}
                      >
                        {num}
                      </Box>
                    );
                  })}
                </Box>
                <TextField
                  label="Kurzes Fazit / Lieblingszitat (optional)"
                  value={completedNotes}
                  onChange={(e) => setCompletedNotes(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Gelesene Sprache(n)
                  </Typography>
                  <LanguagePicker
                    value={completedLanguages}
                    onToggleLanguage={(code, isActive) => {
                      if (isActive) {
                        setCompletedLanguages(completedLanguages.filter((c) => c !== code));
                        return;
                      }
                      const targetBook = completedBookStats?.id ? books.find((b) => b.id === completedBookStats.id) : null;
                      if (targetBook && (code === 'en' || completedLanguages.length >= 1)) {
                        setEditionCoverPicker({
                          source: 'completed',
                          bookId: targetBook.id,
                          langCode: code,
                          isNewEdition: true,
                          initialCoverUrl: '',
                          bookTitle: targetBook.name || '',
                          bookAuthor: targetBook.author || '',
                        });
                      } else {
                        setCompletedLanguages(normalizeLanguages([...completedLanguages, code]));
                      }
                    }}
                    compact
                    showHint={false}
                  />
                </Box>
              </Box>
            </>
          )}
          <Button
            fullWidth
            variant="contained"
            onClick={async () => {
              if (completedBookStats?.id) {
                if (completedRating !== null || completedNotes.trim()) {
                  await updateBookReview(
                    completedBookStats.id,
                    completedRating,
                    completedNotes,
                    completedBookStats.langCode || null
                  );
                }
                const targetBook = books.find((b) => b.id === completedBookStats.id);
                const existingLangs = normalizeLanguages(targetBook);
                if (JSON.stringify(existingLangs) !== JSON.stringify(normalizeLanguages(completedLanguages))) {
                  await updateBookLanguages(completedBookStats.id, completedLanguages);
                }
              }
              setCompletedBookStats(null);
            }}
            sx={{ mt: 2.5, borderRadius: 9999, py: 1.1 }}
          >
            {(completedRating !== null || completedNotes.trim() || completedLanguages.length > 0) ? 'Speichern & Schließen' : 'Super!'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Interactive Cover Search Menu Dialog */}
      <Dialog
        open={!!coverPickerBook}
        onClose={() => {
          setCoverPickerBook(null);
          setCoverPickerLang(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
              Cover auswählen
            </Typography>
            {coverPickerBook && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {coverPickerBook.name}
                {coverPickerLang ? ` · ${getLanguageMeta(coverPickerLang).flag} ${getLanguageMeta(coverPickerLang).label}` : ''}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              setCoverPickerBook(null);
              setCoverPickerLang(null);
            }}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {/* Editable Search Bar */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              runPickerSearch(pickerQuery, coverPickerLang);
            }}
            sx={{ display: 'flex', gap: 1 }}
          >
            <TextField
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Titel, englischer Titel oder Autor..."
              size="small"
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!pickerQuery.trim() || pickerLoading}
              startIcon={pickerLoading ? <CircularProgress size={14} color="inherit" /> : <ImageSearchIcon fontSize="small" />}
              sx={{ borderRadius: 9999, px: 2.25, flexShrink: 0 }}
            >
              Suchen
            </Button>
          </Box>

          {/* Search Results Grid */}
          {pickerLoading ? (
            <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={28} />
              <Typography variant="caption" color="text.secondary">
                Durchsuche Apple Books, Open Library & Google Books...
              </Typography>
            </Box>
          ) : pickerResults.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.25,
                maxHeight: 360,
                overflowY: 'auto',
                pr: 0.5,
              }}
            >
              {pickerResults.map((item, idx) => {
                const currentCover = coverPickerLang
                  ? (getBookEditions(coverPickerBook).find((e) => e.code === coverPickerLang)?.coverUrl || coverPickerBook?.coverUrl)
                  : coverPickerBook?.coverUrl;
                const isSelected = currentCover === item.url;
                return (
                  <Box
                    key={idx}
                    onClick={() => handleSelectPickedCover(item.url)}
                    sx={{
                      p: 1.25,
                      borderRadius: '16px',
                      bgcolor: 'background.surfaceVariant',
                      border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 0.75,
                      transition: 'border-color 0.15s ease, transform 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <BookCover coverUrl={item.url} title={item.title} width={72} height={106} borderRadius="8px" />
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        lineHeight: 1.2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                      {item.source}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : pickerSearched ? (
            <Box sx={{ p: 3, textAlign: 'center', borderRadius: '16px', bgcolor: 'background.surfaceVariant' }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Keine Treffer für „{pickerQuery}“
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tipp: Probiere einen kürzeren Titel, den englischen Originaltitel oder füge unten direkt eine Bild-URL ein.
              </Typography>
            </Box>
          ) : null}

          {/* Manual URL Fallback */}
          <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
              label="Oder eigene Bild-URL"
              value={pickerCustomUrl}
              onChange={(e) => setPickerCustomUrl(e.target.value)}
              placeholder="https://..."
              size="small"
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={() => handleSelectPickedCover(pickerCustomUrl.trim() || null)}
              disabled={!pickerCustomUrl.trim()}
              sx={{ borderRadius: 9999, flexShrink: 0 }}
            >
              Nutzen
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2.5 }}>
          {coverPickerBook?.coverUrl ? (
            <Button color="error" onClick={() => handleSelectPickedCover(null)} sx={{ borderRadius: 9999 }}>
              Cover entfernen
            </Button>
          ) : <Box />}
          <Button
            onClick={() => {
              setCoverPickerBook(null);
              setCoverPickerLang(null);
            }}
            sx={{ borderRadius: 9999 }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mandatory Cover Picker for English / 2nd+ Language Editions */}
      <EditionCoverPickerDialog
        open={!!editionCoverPicker}
        bookTitle={editionCoverPicker?.bookTitle || ''}
        bookAuthor={editionCoverPicker?.bookAuthor || ''}
        langCode={editionCoverPicker?.langCode || 'en'}
        initialCoverUrl={editionCoverPicker?.initialCoverUrl || ''}
        isNewEdition={!!editionCoverPicker?.isNewEdition}
        onClose={() => setEditionCoverPicker(null)}
        onConfirm={async (pickedUrl) => {
          if (!editionCoverPicker) return;
          const { source, langCode, isNewEdition, bookId } = editionCoverPicker;
          if (source === 'form') {
            const nextLangs = normalizeLanguages([...formLanguages, langCode]);
            setFormLanguages(nextLangs);
            setFormEditions((prev) => ({
              ...prev,
              [langCode]: {
                coverUrl: pickedUrl,
                completed: isNewEdition ? false : !!prev[langCode]?.completed,
                rating: isNewEdition ? null : (prev[langCode]?.rating ?? null),
                notes: isNewEdition ? '' : (prev[langCode]?.notes ?? ''),
                totalPages: isNewEdition ? null : (prev[langCode]?.totalPages ?? null),
              },
            }));
            if (isNewEdition) {
              setFormReviewLang(langCode);
            }
            if (nextLangs[0] === langCode || !formCoverUrl.trim()) {
              setFormCoverUrl(pickedUrl);
            }
          } else if (source === 'completed' && bookId) {
            await updateBookEdition(bookId, langCode, {
              coverUrl: pickedUrl,
              completed: false,
            });
            setCompletedLanguages((prev) => normalizeLanguages([...prev, langCode]));
          }
          setEditionCoverPicker(null);
        }}
      />
    </Box>
  );
};

export default BookManager;
