import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import {
  Box, Card, Typography, TextField, Button, IconButton,
  Autocomplete, Checkbox, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, LinearProgress, CircularProgress
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
import BookCover from './BookCover';
import { LanguageCoverBadge, LanguagePill, LanguagePicker } from './LanguageBadge';
import { searchBookCovers, fetchBestBookCover } from '../utils/bookCoverApi';
import { normalizeLanguages, getLanguageMeta, isBilingual } from '../utils/bookLanguages';

const BookManager = () => {
  const {
    books, addBook, updateBook, updateBookCover, updateBookReview, updateBookLanguages, deleteBook,
    assignBookToUnassignedSessions, readingSessions, renameAuthor, renameSeries
  } = useTaskContext();

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('all'); // 'all' | 'bilingual' | 'de' | 'en' | ...

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

  const seriesAuthorMap = useMemo(() => {
    return books.reduce((acc, book) => {
      if (book.series && book.author) acc[book.series] = book.author;
      return acc;
    }, {});
  }, [books]);

  const sortedBooks = useMemo(() => {
    return [...books]
      .filter((b) => {
        if (languageFilter === 'all') return true;
        const langs = normalizeLanguages(b);
        if (languageFilter === 'bilingual') return isBilingual(langs);
        return langs.includes(languageFilter);
      })
      .sort((a, b) => {
        const seriesA = a.series || '';
        const seriesB = b.series || '';
        if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
        const authorA = a.author || '';
        const authorB = b.author || '';
        if (authorA !== authorB) return authorA.localeCompare(authorB);
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [books, languageFilter]);

  const activeBooks = useMemo(() => sortedBooks.filter(b => !b.completed), [sortedBooks]);
  const completedBooks = useMemo(() => sortedBooks.filter(b => b.completed), [sortedBooks]);
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
    setCoverCandidates([]);
    setCoverSearchDone(false);
    setAutoFillNotice('');
    setBookModalOpen(true);
  };

  const openEditModal = (book) => {
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
    setFormLanguages(normalizeLanguages(book));
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
    const results = await searchBookCovers(formName, formAuthor);
    setCoverCandidates(results);
    setIsSearchingCovers(false);
    setCoverSearchDone(true);
  };

  const handlePickSearchCandidate = (cand) => {
    setFormCoverUrl(cand.url || '');
    const filled = ['Cover'];
    if (cand.author && (!formAuthor.trim() || !editingBookId)) {
      setFormAuthor(cand.author);
      filled.push('Autor');
    }
    if (cand.pageCount && (!formTotalPages || !editingBookId)) {
      setFormTotalPages(String(cand.pageCount));
      filled.push(`${cand.pageCount} Seiten`);
    }
    setAutoFillNotice(`Automatisch übernommen: ${filled.join(', ')}`);
  };

  const runPickerSearch = async (queryText) => {
    const q = (queryText || '').trim();
    if (!q) return;
    setPickerLoading(true);
    setPickerSearched(false);
    const results = await searchBookCovers(q);
    setPickerResults(results);
    setPickerLoading(false);
    setPickerSearched(true);
  };

  const openCoverPicker = (book) => {
    const initialQuery = [book.name, book.author].filter(Boolean).join(' ');
    setCoverPickerBook(book);
    setPickerQuery(initialQuery);
    setPickerCustomUrl(book.coverUrl || '');
    setPickerResults([]);
    setPickerSearched(false);
    runPickerSearch(initialQuery);
  };

  const handleSelectPickedCover = async (url) => {
    if (!coverPickerBook) return;
    await updateBookCover(coverPickerBook.id, url);
    setCoverPickerBook(null);
  };

  const handleFetchMissingCovers = async () => {
    if (isFetchingAllCovers || booksWithoutCover.length === 0) return;
    setIsFetchingAllCovers(true);
    setBatchCoverFeedback(null);
    let foundCount = 0;
    const total = booksWithoutCover.length;
    try {
      for (const book of booksWithoutCover) {
        const url = await fetchBestBookCover(book.name, book.author);
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

  const handleSaveBook = async () => {
    if (!formName.trim()) return;

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
        finalCoverUrl = await fetchBestBookCover(formName, formAuthor);
      } catch {
        finalCoverUrl = null;
      }
    }

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
        formRating,
        formNotes,
        formLanguages
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
        formRating,
        formNotes,
        formLanguages
      );
    }
    setBookModalOpen(false);
  };

  const handleToggleCompleted = (book) => {
    const isNowCompleted = !book.completed;
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

    if (isNowCompleted) {
      setCompletedRating(book.rating || null);
      setCompletedNotes(book.notes || '');
      setCompletedLanguages(normalizeLanguages(book));
      const sessions = readingSessions.filter(s => s.bookId === book.id);
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
          coverUrl: book.coverUrl || null,
          timeStr: `${h}h ${m}m`,
          pages: pagesRead,
          speed: Math.round(bookSpeed),
          precisionStr
        });
      } else {
        setCompletedBookStats({
          id: book.id,
          name: book.name,
          coverUrl: book.coverUrl || null,
          timeStr: null,
          pages: null,
          speed: null,
          precisionStr: ''
        });
      }
    }
  };

  const getBookProgressInfo = (book) => {
    const sessions = readingSessions.filter(s => s.bookId === book.id);
    const maxEndedOnPage = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));
    const pagesRead = maxEndedOnPage > 0
      ? maxEndedOnPage
      : sessions.reduce((acc, s) => acc + (s.amount || 0), 0);

    const total = Number(book.totalPages) || 0;
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
                {activeBooks.length} aktiv · {completedBooks.length} abgeschlossen
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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

        {availableLanguages.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', mb: 2, pb: 0.25 }}>
            {[
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

        {/* Active Books List */}
        {activeBooks.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: '18px',
              bgcolor: 'background.surfaceVariant',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {languageFilter !== 'all'
                ? 'Keine aktiven Bücher für diesen Sprachfilter.'
                : 'Noch keine aktiven Bücher vorhanden. Füge dein aktuelles Buch hinzu!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {activeBooks.map(book => {
              const info = getBookProgressInfo(book);
              return (
                <Box
                  key={book.id}
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
                    {/* Book Cover on the left (tap to open Cover Search Menu) */}
                    <Tooltip title="Cover suchen / ändern">
                      <Box
                        onClick={() => openCoverPicker(book)}
                        sx={{
                          cursor: 'pointer',
                          flexShrink: 0,
                          position: 'relative',
                          '&:hover': { opacity: 0.88 },
                        }}
                      >
                        <BookCover
                          coverUrl={book.coverUrl}
                          title={book.name}
                          width={54}
                          height={80}
                          borderRadius="10px"
                        />
                        <LanguageCoverBadge languages={book} size="sm" />
                        {book.rating && (
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
                            {book.rating}
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
                          {book.author && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mt: 0.2 }}>
                              {book.author}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                          <Tooltip title="Buch abschließen">
                            <Checkbox
                              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary', opacity: 0.7 }} />}
                              checkedIcon={<CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />}
                              checked={!!book.completed}
                              onChange={() => handleToggleCompleted(book)}
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
                          <IconButton onClick={() => openEditModal(book)} size="small" sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => deleteBook(book.id)}
                            size="small"
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Metadata Pills */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                        <LanguagePill languages={book} />
                        {book.rating && (
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
                            {book.rating}/10
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

                  {/* Book Progress Bar */}
                  {info.total > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
                          Fortschritt
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

      {/* Completed Books Section */}
      {completedBooks.length > 0 && (
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
              Abgeschlossene Bücher ({completedBooks.length})
            </Typography>
          </Box>

          <Collapse in={expandedCompleted} timeout={220}>
            <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {completedBooks.map(book => (
                  <Box
                    key={book.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: '16px',
                      bgcolor: 'background.surfaceVariant',
                      opacity: 0.86,
                    }}
                  >
                    <Tooltip title="Cover suchen / ändern">
                      <Box onClick={() => openCoverPicker(book)} sx={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                        <BookCover coverUrl={book.coverUrl} title={book.name} width={38} height={56} borderRadius="8px" />
                        {book.rating && (
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
                            {book.rating}
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                          {book.name}
                        </Typography>
                        <LanguagePill languages={book} compact />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {[book.author, book.series ? `${book.series}${book.seriesNumber ? ` (Bd. ${book.seriesNumber})` : ''}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </Box>
                    <Tooltip title="Buch wieder öffnen">
                      <Checkbox
                        icon={<CheckCircleOutlinedIcon />}
                        checkedIcon={<CheckCircleIcon color="success" />}
                        checked={!!book.completed}
                        onChange={() => handleToggleCompleted(book)}
                        sx={{ p: 0.5 }}
                      />
                    </Tooltip>
                    <IconButton onClick={() => openEditModal(book)} size="small" sx={{ color: 'text.secondary' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => deleteBook(book.id)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
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
              Sprache(n)
            </Typography>
            <LanguagePicker
              value={formLanguages}
              onChange={setFormLanguages}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reihe, Universum &amp; Cover-URL
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
            <TextField
              label="Cover Bild-URL (optional)"
              value={formCoverUrl}
              onChange={(e) => setFormCoverUrl(e.target.value)}
              size="small"
              fullWidth
              placeholder="https://..."
            />
          </Box>

          {/* 1-10 Rating & Short Note */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bewertung &amp; Notiz (optional)
              </Typography>
              {formRating && (
                <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? '#FDD663' : '#C25E00', fontVariantNumeric: 'tabular-nums' }}>
                  ★ {formRating} / 10
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 0.5 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const active = formRating === num;
                const filled = formRating && num <= formRating;
                return (
                  <Box
                    key={num}
                    onClick={() => setFormRating(active ? null : num)}
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
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              placeholder="Was hat dir besonders gefallen?"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setBookModalOpen(false)} sx={{ borderRadius: 9999 }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveBook}
            disabled={!formName.trim()}
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 9999, px: 3 }}
          >
            Speichern
          </Button>
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

              {/* Quick 1-10 Rating & Fazit right on completion */}
              <Box sx={{ mt: 2.5, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Deine Bewertung (1–10)
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
                    onChange={setCompletedLanguages}
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
                  await updateBookReview(completedBookStats.id, completedRating, completedNotes);
                }
                await updateBookLanguages(completedBookStats.id, completedLanguages);
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
        onClose={() => setCoverPickerBook(null)}
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
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setCoverPickerBook(null)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {/* Editable Search Bar */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              runPickerSearch(pickerQuery);
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
                const isSelected = coverPickerBook?.coverUrl === item.url;
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
          <Button onClick={() => setCoverPickerBook(null)} sx={{ borderRadius: 9999 }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookManager;
