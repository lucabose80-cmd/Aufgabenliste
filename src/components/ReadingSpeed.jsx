import { useState, useEffect, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format } from 'date-fns';
import {
  Box, Card, Typography, TextField, Button, IconButton,
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ReadingAnalytics from './ReadingAnalytics';
import BookManager from './BookManager';
import BookUniverseMap from './BookUniverseMap';
import BookCover from './BookCover';
import { LanguagePill } from './LanguageBadge';
import {
  PRIMARY_LANGUAGES,
  normalizeLanguages,
  getBookEditions,
  getLanguageMeta,
  getSessionLanguage,
  formatLanguagesCompact,
  getPrimaryActiveLanguage,
  getBookCoverForLanguage,
  isBookFullyCompleted,
} from '../utils/bookLanguages';
import TimerIcon from '@mui/icons-material/Timer';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PublicIcon from '@mui/icons-material/Public';
import BarChartIcon from '@mui/icons-material/BarChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { syncNativeTimer, syncNativeBooks, requestNativeNotificationPermission } from '../utils/nativeBridge';

const SUB_TABS = [
  { id: 0, label: 'Timer', icon: TimerIcon },
  { id: 1, label: 'Bücher', icon: MenuBookIcon },
  { id: 2, label: 'Map', icon: PublicIcon },
  { id: 3, label: 'Statistik', icon: BarChartIcon },
];

const ReadingSpeed = () => {
  const {
    readingSessions, saveReadingSession, deleteReadingSession, updateReadingSession,
    timerRunning, setTimerRunning, timerSeconds, setTimerSeconds,
    books, pendingWidgetFinish, clearPendingWidgetFinish,
    widgetSelectedBookId, setWidgetSelectedBookId
  } = useTaskContext();

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [amount, setAmount] = useState('');
  const [endedOnPage, setEndedOnPage] = useState('');
  const [selectedBookId, setSelectedBookId] = useState(widgetSelectedBookId || '');
  const [sessionLanguage, setSessionLanguage] = useState('');
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionTime, setSessionTime] = useState(format(new Date(), 'HH:mm'));
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('30');
  const [activeTab, setActiveTab] = useState(0);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const [editingSession, setEditingSession] = useState(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAmount, setEditAmount] = useState('');
  const [editEndedOnPage, setEditEndedOnPage] = useState('');
  const [editBookId, setEditBookId] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editDate, setEditDate] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');

  const getSessionsForBookEdition = (bookId, langCode = null) => {
    if (!bookId) return [];
    const book = books.find((b) => b.id === bookId);
    const allBookSessions = readingSessions.filter(s => s.bookId === bookId);
    const langs = normalizeLanguages(book);
    if (langs.length >= 2) {
      const targetLang = (langCode || getPrimaryActiveLanguage(book) || langs[0] || '').toLowerCase();
      if (targetLang) {
        return allBookSessions.filter((s) =>
          s.language ? s.language.toLowerCase() === targetLang : langs[0] === targetLang
        );
      }
    }
    return allBookSessions;
  };

  const getBookLastPage = (bookId, langCode = null) => {
    if (!bookId) return 0;
    const sessions = getSessionsForBookEdition(bookId, langCode);
    if (sessions.length === 0) return 0;
    const maxEndedOnPage = Math.max(...sessions.map(s => s.endedOnPage || 0));
    if (maxEndedOnPage > 0) return maxEndedOnPage;
    return sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
  };

  const resolveDefaultBookLang = (bookId) => {
    const book = books.find(b => b.id === bookId);
    return getPrimaryActiveLanguage(book) || '';
  };

  // Sync book selection made on Android widget into ReadingSpeed
  useEffect(() => {
    if (widgetSelectedBookId && !selectedBookId) {
      setSelectedBookId(widgetSelectedBookId);
    }
  }, [widgetSelectedBookId]);

  // Automatically open Save Session modal when user tapped "Beenden" on Widget or Lockscreen
  useEffect(() => {
    if (pendingWidgetFinish) {
      setActiveTab(0);
      setIsManualEntry(false);
      if (pendingWidgetFinish.bookId) {
        const defLang = resolveDefaultBookLang(pendingWidgetFinish.bookId);
        setSelectedBookId(pendingWidgetFinish.bookId);
        setSessionLanguage(defLang);
        const lastPage = getBookLastPage(pendingWidgetFinish.bookId, defLang);
        setEndedOnPage(lastPage > 0 ? lastPage.toString() : '');
      }
      setSessionDate(format(new Date(), 'yyyy-MM-dd'));
      setSessionTime(format(new Date(), 'HH:mm'));
      setSaveDialogOpen(true);
      clearPendingWidgetFinish();
    }
  }, [pendingWidgetFinish]);

  const selectedBook = useMemo(
    () => books.find(b => b.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const effectiveSelectedLang = useMemo(() => {
    if (!selectedBook) return sessionLanguage || null;
    const langs = normalizeLanguages(selectedBook);
    if (langs.length >= 2) {
      if (sessionLanguage && langs.includes(sessionLanguage)) return sessionLanguage;
      return getPrimaryActiveLanguage(selectedBook) || langs[0] || null;
    }
    return langs[0] || sessionLanguage || null;
  }, [selectedBook, sessionLanguage]);

  const timerBookOptions = useMemo(() => {
    const opts = [];
    books.forEach((b) => {
      const eds = getBookEditions(b);
      if (eds.length >= 2) {
        eds.forEach((ed) => {
          const isCurrent = b.id === selectedBookId && ed.code === effectiveSelectedLang;
          if (!ed.completed || isCurrent) {
            opts.push({
              key: `${b.id}::${ed.code}`,
              bookId: b.id,
              langCode: ed.code,
              label: `${b.name} (${ed.meta.flag} ${ed.meta.short})`,
            });
          }
        });
      } else {
        const isCurrent = b.id === selectedBookId;
        if (!isBookFullyCompleted(b) || isCurrent) {
          const ed = eds[0] || null;
          opts.push({
            key: b.id,
            bookId: b.id,
            langCode: ed?.code || null,
            label: ed ? `${b.name} (${ed.meta.flag} ${ed.meta.short})` : b.name,
          });
        }
      }
    });
    return opts;
  }, [books, selectedBookId, effectiveSelectedLang]);

  const selectedTimerKey = useMemo(() => {
    if (!selectedBookId || !selectedBook) return '';
    const eds = getBookEditions(selectedBook);
    if (eds.length >= 2 && effectiveSelectedLang) {
      return `${selectedBookId}::${effectiveSelectedLang}`;
    }
    return selectedBookId;
  }, [selectedBookId, selectedBook, effectiveSelectedLang]);

  const selectedBookProgress = useMemo(() => {
    if (!selectedBook) return null;
    const lastPage = getBookLastPage(selectedBook.id, effectiveSelectedLang);
    const matchedEd = effectiveSelectedLang
      ? getBookEditions(selectedBook).find((e) => e.code === effectiveSelectedLang)
      : null;
    const total = Number(matchedEd?.totalPages || selectedBook.totalPages) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((lastPage / total) * 100)) : null;
    return { lastPage, total, pct };
  }, [selectedBook, effectiveSelectedLang, readingSessions]);

  const handleStartTimer = () => {
    requestNativeNotificationPermission();
    setTimerRunning(true);
    syncNativeTimer(true, timerSeconds, selectedBookId);
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
    syncNativeTimer(false, timerSeconds, selectedBookId);
  };

  const handleStopTimer = () => {
    if (timerRunning) {
      handlePauseTimer();
    } else {
      syncNativeTimer(false, timerSeconds, selectedBookId);
    }
    setIsManualEntry(false);
    setSessionLanguage(effectiveSelectedLang || resolveDefaultBookLang(selectedBookId));
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
    setSessionTime(format(new Date(), 'HH:mm'));
    setSaveDialogOpen(true);
  };

  const handleOpenManualEntry = () => {
    setIsManualEntry(true);
    setManualMinutes('30');
    setAmount('');
    const lang = effectiveSelectedLang || resolveDefaultBookLang(selectedBookId);
    setEndedOnPage(selectedBookId ? (getBookLastPage(selectedBookId, lang) || '').toString() : '');
    setSessionLanguage(lang);
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
    setSessionTime(format(new Date(), 'HH:mm'));
    setSaveDialogOpen(true);
  };

  const handleBookSelect = (rawKey) => {
    if (!rawKey) {
      setSelectedBookId('');
      setWidgetSelectedBookId('');
      syncNativeBooks(books, '');
      setSessionLanguage('');
      setEndedOnPage('');
      return;
    }
    const [bookId, explicitLang] = rawKey.includes('::') ? rawKey.split('::') : [rawKey, null];
    const resolvedLang = explicitLang || resolveDefaultBookLang(bookId);
    setSelectedBookId(bookId);
    setWidgetSelectedBookId(bookId);
    syncNativeBooks(books, bookId);
    setSessionLanguage(resolvedLang);
    const lastPage = getBookLastPage(bookId, resolvedLang);
    setEndedOnPage(lastPage > 0 ? lastPage.toString() : '');
  };

  const handleAmountChange = (val) => {
    setAmount(val);
    if (selectedBookId) {
      const prevPage = getBookLastPage(selectedBookId, sessionLanguage || effectiveSelectedLang);
      const parsed = parseFloat(val);
      if (prevPage > 0 && !isNaN(parsed) && parsed > 0) {
        setEndedOnPage(Math.round(prevPage + parsed).toString());
      }
    }
  };

  const handleEndedOnPageChange = (val) => {
    setEndedOnPage(val);
    if (selectedBookId) {
      const prevPage = getBookLastPage(selectedBookId, sessionLanguage || effectiveSelectedLang);
      const parsedEnd = parseInt(val, 10);
      if (prevPage > 0 && !isNaN(parsedEnd) && parsedEnd > prevPage) {
        setAmount((parsedEnd - prevPage).toString());
      }
    }
  };

  const handleSaveInfo = () => {
    const effectiveSeconds = isManualEntry
      ? Math.max(60, (parseInt(manualMinutes, 10) || 0) * 60)
      : timerSeconds;

    const finalDate = sessionDate;
    let overrideCreatedAt = null;
    const isToday = sessionDate === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) {
      overrideCreatedAt = `${sessionDate}T${sessionTime || '12:00'}:00.000Z`;
    }

    const parsedAmount = parseFloat(amount) || 0;
    const timeInHours = effectiveSeconds / 3600;
    const pagesPerHour = timeInHours > 0 ? parsedAmount / timeInHours : 0;
    const effectiveLanguage = sessionLanguage || resolveDefaultBookLang(selectedBookId) || null;

    let forecast = null;
    if (selectedBookId) {
      const book = books.find(b => b.id === selectedBookId);
      const matchedEd = book && effectiveLanguage
        ? getBookEditions(book).find((e) => e.code === effectiveLanguage)
        : null;
      const editionTotalPages = Number(matchedEd?.totalPages || book?.totalPages) || 0;
      if (book && editionTotalPages > 0) {
        const sessions = getSessionsForBookEdition(book.id, effectiveLanguage);
        let pagesRead;
        const maxEndedOnPage = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));

        const currentEndedOnPage = parseInt(endedOnPage, 10);
        if (currentEndedOnPage && currentEndedOnPage > maxEndedOnPage) {
          pagesRead = currentEndedOnPage;
        } else if (maxEndedOnPage > 0) {
          pagesRead = maxEndedOnPage + parsedAmount;
        } else {
          pagesRead = sessions.reduce((acc, s) => acc + s.amount, 0) + parsedAmount;
        }

        if (pagesRead < editionTotalPages) {
          const remainingPages = editionTotalPages - pagesRead;
          const globalReadingSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0) + effectiveSeconds;
          const globalReadingAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0) + parsedAmount;
          const globalSpeed = globalReadingSeconds > 0 ? globalReadingAmount / (globalReadingSeconds / 3600) : 0;

          if (globalSpeed > 0) {
            const remainingHours = remainingPages / globalSpeed;
            const h = Math.floor(remainingHours);
            const m = Math.round((remainingHours - h) * 60);
            forecast = `Noch ca. ${h}h ${m}m (${remainingPages} Seiten verbleibend)`;
          }
        } else {
          forecast = 'Du hast das Buch scheinbar beendet!';
        }
      }
    }

    const langMeta = effectiveLanguage ? getLanguageMeta(effectiveLanguage) : null;
    setSummaryData({
      timeStr: formatTime(effectiveSeconds),
      amount: parsedAmount,
      endedOnPage,
      pagesPerHour: Math.round(pagesPerHour),
      forecast,
      bookName: selectedBook
        ? (langMeta && normalizeLanguages(selectedBook).length >= 2
          ? `${selectedBook.name} (${langMeta.flag} ${langMeta.short})`
          : selectedBook.name)
        : null,
    });
    setSummaryModalOpen(true);

    saveReadingSession(effectiveSeconds, amount, endedOnPage, selectedBookId, finalDate, overrideCreatedAt, effectiveLanguage);
    if (!isManualEntry) {
      setTimerSeconds(0);
      syncNativeTimer(false, 0);
    }
    setSaveDialogOpen(false);
    setIsManualEntry(false);
    setAmount('');
    setEndedOnPage('');
    setSelectedBookId('');
    setSessionLanguage('');
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDiscardTimer = () => {
    if (!isManualEntry) {
      setTimerSeconds(0);
      syncNativeTimer(false, 0);
    }
    setSaveDialogOpen(false);
    setIsManualEntry(false);
    setAmount('');
    setEndedOnPage('');
    setSessionLanguage('');
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h === '00') return `${m}:${s}`;
    return `${h}:${m}:${s}`;
  };

  const handleEditClick = (session) => {
    const book = session.bookId ? books.find(b => b.id === session.bookId) : null;
    setEditingSession(session);
    setEditMinutes(Math.round(session.timeSpent / 60));
    setEditAmount(session.amount);
    setEditEndedOnPage(session.endedOnPage || '');
    setEditBookId(session.bookId || '');
    setEditLanguage(getSessionLanguage(session, book) || '');
    setEditDate(session.date ? session.date.slice(0, 10) : '');
  };

  const handleSaveEdit = () => {
    if (!editingSession) return;
    updateReadingSession(
      editingSession.id,
      (parseInt(editMinutes, 10) || 0) * 60,
      parseFloat(editAmount) || 0,
      editEndedOnPage,
      editBookId,
      editDate,
      editLanguage || null
    );
    setEditingSession(null);
  };

  const recentSessions = useMemo(() => {
    return [...readingSessions]
      .filter(s => {
        if (sessionFilter === 'active') {
          const book = books.find(b => b.id === s.bookId);
          return book && !book.completed;
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        if (b.createdAt && a.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      })
      .slice(0, 12);
  }, [readingSessions, sessionFilter, books]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10, maxWidth: 880, mx: 'auto' }}>
      {!isOnline && (
        <Box
          sx={{
            px: 2.25,
            py: 1.25,
            bgcolor: alpha(theme.palette.warning.main, isDark ? 0.14 : 0.1),
            color: 'warning.main',
            border: '1px solid',
            borderColor: alpha(theme.palette.warning.main, 0.35),
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <CloudOffIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>
            Offline-Modus aktiv — Lesezeiten werden lokal gespeichert und später synchronisiert.
          </Typography>
        </Box>
      )}

      {/* Google One Segmented Pill Sub-Navigation */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 0.75,
          p: 0.65,
          bgcolor: 'background.paper',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map(({ id, label, icon: IconComp }) => {
          const isActive = activeTab === id;
          return (
            <Box
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              aria-selected={isActive}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 0.35, sm: 0.85 },
                py: { xs: 1, sm: 1.1 },
                px: 1,
                borderRadius: '14px',
                cursor: 'pointer',
                userSelect: 'none',
                bgcolor: isActive
                  ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12)
                  : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                transition: 'background-color 0.2s ease, color 0.2s ease',
                '&:hover': {
                  bgcolor: isActive
                    ? alpha(theme.palette.primary.main, isDark ? 0.24 : 0.16)
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  color: isActive ? 'primary.main' : 'text.primary',
                },
              }}
            >
              <IconComp sx={{ fontSize: { xs: 19, sm: 18 } }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: { xs: '0.7rem', sm: '0.84rem' },
                  lineHeight: 1.1,
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {activeTab === 0 ? (
        <>
          {/* Focused Timer Hero Card */}
          <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '24px' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 2, sm: 2.5 },
              }}
            >
              {/* Book Selector Pill + Live Progress */}
              {books.length > 0 && (
                <Box sx={{ width: '100%', maxWidth: 360, mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
                  <Select
                    value={selectedTimerKey}
                    onChange={(e) => handleBookSelect(e.target.value)}
                    size="small"
                    displayEmpty
                    disabled={timerRunning}
                    fullWidth
                    sx={{
                      bgcolor: 'background.surfaceVariant',
                      borderRadius: 9999,
                      px: 0.75,
                      fontWeight: 500,
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    }}
                  >
                    <MenuItem value="">Aktuelles Buch wählen...</MenuItem>
                    {timerBookOptions.map(opt => (
                      <MenuItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>

                  {selectedBook && selectedBookProgress && (
                    <Box
                      sx={{
                        width: '100%',
                        p: 1.5,
                        borderRadius: '18px',
                        bgcolor: 'background.surfaceVariant',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.75,
                      }}
                    >
                      <BookCover
                        coverUrl={getBookCoverForLanguage(selectedBook, effectiveSelectedLang)}
                        title={selectedBook.name}
                        width={52}
                        height={76}
                        borderRadius="10px"
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                          >
                            {selectedBook.name}
                          </Typography>
                          <LanguagePill languages={effectiveSelectedLang ? [effectiveSelectedLang] : selectedBook} compact />
                        </Box>
                        {selectedBook.author && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.75 }}
                          >
                            {selectedBook.author}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: selectedBookProgress.pct !== null ? 0.5 : 0 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.72rem' }}>
                            {selectedBookProgress.lastPage > 0
                              ? `Zuletzt S. ${selectedBookProgress.lastPage}`
                              : 'Noch keine Seiten'}
                          </Typography>
                          {selectedBookProgress.total > 0 && (
                            <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>
                              {selectedBookProgress.lastPage}/{selectedBookProgress.total} · {selectedBookProgress.pct}%
                            </Typography>
                          )}
                        </Box>
                        {selectedBookProgress.pct !== null && (
                          <LinearProgress
                            variant="determinate"
                            value={selectedBookProgress.pct}
                            sx={{ height: 5, borderRadius: 9999 }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* Timer Status Pill */}
              {(timerRunning || timerSeconds > 0) && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.35,
                    mb: 1,
                    borderRadius: 9999,
                    bgcolor: timerRunning
                      ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12)
                      : alpha(theme.palette.warning.main, isDark ? 0.18 : 0.12),
                    color: timerRunning ? 'primary.main' : 'warning.main',
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: 'currentColor',
                    }}
                  />
                  <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>
                    {timerRunning ? 'Lese-Session läuft' : 'Pausiert'}
                  </Typography>
                </Box>
              )}

              {/* Big Tabular Timer Display */}
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Plus Jakarta Sans", monospace',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '3.75rem', sm: '4.5rem' },
                  lineHeight: 1.1,
                  color: timerRunning ? 'primary.main' : 'text.primary',
                  transition: 'color 0.25s ease',
                  my: 1,
                }}
              >
                {formatTime(timerSeconds)}
              </Typography>

              {/* Controls */}
              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                {timerRunning ? (
                  <>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handlePauseTimer}
                      startIcon={<PauseIcon />}
                      size="large"
                      sx={{ borderRadius: 9999, px: 3.5, py: 1.25 }}
                    >
                      Pausieren
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleStopTimer}
                      startIcon={<StopIcon />}
                      size="large"
                      sx={{ borderRadius: 9999, px: 3.5, py: 1.25 }}
                    >
                      Beenden & Speichern
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleStartTimer}
                      startIcon={<PlayArrowIcon />}
                      size="large"
                      sx={{ borderRadius: 9999, px: 4.5, py: 1.25 }}
                    >
                      {timerSeconds === 0 ? 'Session starten' : 'Fortsetzen'}
                    </Button>
                    {timerSeconds > 0 && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleStopTimer}
                        startIcon={<StopIcon />}
                        size="large"
                        sx={{ borderRadius: 9999, px: 3.5, py: 1.25 }}
                      >
                        Beenden & Speichern
                      </Button>
                    )}
                  </>
                )}
              </Box>

              {!timerRunning && timerSeconds === 0 && (
                <Button
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleOpenManualEntry}
                  sx={{
                    mt: 2.5,
                    borderRadius: 9999,
                    color: 'text.secondary',
                    px: 2,
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  Session manuell nachtragen
                </Button>
              )}
            </Box>
          </Card>

          {/* Recent Reading Sessions */}
          {recentSessions.length > 0 && (
            <Card sx={{ p: { xs: 2.25, sm: 3 }, borderRadius: '24px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
                  Letzte Lese-Einträge
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 0.4,
                    borderRadius: 9999,
                    bgcolor: 'background.surfaceVariant',
                    gap: 0.4,
                  }}
                >
                  {[
                    { value: 'all', label: 'Alle' },
                    { value: 'active', label: 'Aktive Bücher' },
                  ].map(opt => {
                    const active = sessionFilter === opt.value;
                    return (
                      <Box
                        key={opt.value}
                        onClick={() => setSessionFilter(opt.value)}
                        sx={{
                          px: 1.5,
                          py: 0.45,
                          borderRadius: 9999,
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          fontWeight: active ? 600 : 500,
                          bgcolor: active ? 'background.paper' : 'transparent',
                          color: active ? 'text.primary' : 'text.secondary',
                          boxShadow: active ? (isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.label}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {recentSessions.map(session => {
                  const book = session.bookId ? books.find(b => b.id === session.bookId) : null;
                  const speed = session.timeSpent > 0 && session.amount > 0
                    ? Math.round(session.amount / (session.timeSpent / 3600))
                    : null;

                  return (
                    <Box
                      key={session.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: '18px',
                        bgcolor: 'background.surfaceVariant',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(session.timeSpent)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            · {session.amount} Seiten
                          </Typography>
                          {speed && (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.35,
                                px: 0.9,
                                py: 0.15,
                                borderRadius: 9999,
                                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                                color: 'primary.main',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              <SpeedIcon sx={{ fontSize: 12 }} />
                              {speed} S/h
                            </Box>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                          {book && (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.4,
                                px: 1,
                                py: 0.2,
                                borderRadius: 9999,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                color: 'text.primary',
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                maxWidth: '100%',
                              }}
                            >
                              <MenuBookIcon sx={{ fontSize: 12, color: 'primary.main', flexShrink: 0 }} />
                              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {book.name}
                              </Box>
                            </Box>
                          )}
                          {(() => {
                            const sLang = getSessionLanguage(session, book);
                            return sLang ? <LanguagePill languages={[sLang]} compact /> : null;
                          })()}
                          {session.endedOnPage && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                              S. {session.endedOnPage}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>
                            {format(new Date(session.date), 'dd.MM.yyyy')}
                          </Typography>
                        </Box>

                        {session._hasPendingWrites && (
                          <Typography
                            variant="caption"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'warning.main', mt: 0.5, fontWeight: 600 }}
                          >
                            <CloudOffIcon fontSize="inherit" /> Lokal gespeichert (Wartet auf Sync)
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => handleEditClick(session)} sx={{ color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => deleteReadingSession(session.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Card>
          )}
        </>
      ) : activeTab === 1 ? (
        <BookManager />
      ) : activeTab === 2 ? (
        <BookUniverseMap />
      ) : (
        <ReadingAnalytics />
      )}

      {/* Save Session Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span>{isManualEntry ? 'Session nachtragen' : 'Lese-Session speichern'}</span>
          <IconButton size="small" onClick={() => setSaveDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {!isManualEntry ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '14px',
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Gemessene Zeit
              </Typography>
              <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(timerSeconds)}
              </Typography>
            </Box>
          ) : (
            <TextField
              label="Lesezeit (Minuten)"
              type="number"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              size="small"
              fullWidth
            />
          )}

          {books.length > 0 && (
            <Select
              value={selectedTimerKey}
              onChange={(e) => handleBookSelect(e.target.value)}
              size="small"
              displayEmpty
              fullWidth
            >
              <MenuItem value="">Kein Buch zugeordnet</MenuItem>
              {timerBookOptions.map(opt => (
                <MenuItem key={opt.key} value={opt.key}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}

          {/* Session language picker (highlighted for bilingual books, optional otherwise) */}
          {(() => {
            const bookLangs = normalizeLanguages(selectedBook);
            const choices = bookLangs.length >= 2
              ? bookLangs.map((c) => getLanguageMeta(c))
              : PRIMARY_LANGUAGES;
            if (bookLangs.length === 1) return null;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {bookLangs.length >= 2 ? 'Sprache dieser Session:' : 'Sprache (optional):'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {choices.map((lang) => {
                    const active = sessionLanguage === lang.code;
                    return (
                      <Box
                        key={lang.code}
                        onClick={() => {
                          const nextLang = active ? '' : lang.code;
                          setSessionLanguage(nextLang);
                          if (selectedBookId && !amount) {
                            const lp = getBookLastPage(selectedBookId, nextLang || null);
                            setEndedOnPage(lp > 0 ? lp.toString() : '');
                          }
                        }}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.45,
                          px: 1.25,
                          py: 0.4,
                          borderRadius: 9999,
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.76rem',
                          fontWeight: active ? 700 : 500,
                          bgcolor: active
                            ? alpha(lang.accent, isDark ? 0.24 : 0.16)
                            : 'background.surfaceVariant',
                          color: active ? 'text.primary' : 'text.secondary',
                          border: '1.5px solid',
                          borderColor: active ? lang.accent : 'transparent',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })()}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="Gelesene Seiten"
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="z.B. 15"
              size="small"
              fullWidth
            />
            <TextField
              label="Beendet auf S."
              type="number"
              value={endedOnPage}
              onChange={(e) => handleEndedOnPageChange(e.target.value)}
              placeholder="Optional"
              size="small"
              fullWidth
            />
          </Box>

          <TextField
            label="Datum"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2.5 }}>
          <Button color="error" onClick={handleDiscardTimer} sx={{ borderRadius: 9999 }}>
            Verwerfen
          </Button>
          <Button variant="contained" onClick={handleSaveInfo} startIcon={<SaveIcon />} sx={{ borderRadius: 9999, px: 3 }}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onClose={() => setEditingSession(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span>Eintrag bearbeiten</span>
          <IconButton size="small" onClick={() => setEditingSession(null)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="Minuten"
              type="number"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Seiten"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              size="small"
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="Beendet auf S."
              type="number"
              value={editEndedOnPage}
              onChange={(e) => setEditEndedOnPage(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Datum"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          {books.length > 0 && (
            <Select
              value={editBookId}
              onChange={(e) => {
                const nextId = e.target.value;
                setEditBookId(nextId);
                const defLang = resolveDefaultBookLang(nextId);
                if (defLang) setEditLanguage(defLang);
              }}
              size="small"
              displayEmpty
              fullWidth
            >
              <MenuItem value="">Kein Buch</MenuItem>
              {books.filter(b => !b.completed || b.id === editBookId).map(b => {
                const langText = formatLanguagesCompact(b);
                return (
                  <MenuItem key={b.id} value={b.id}>
                    {langText ? `${b.name} (${langText})` : b.name}
                  </MenuItem>
                );
              })}
            </Select>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Sprache:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {PRIMARY_LANGUAGES.map((lang) => {
                const active = editLanguage === lang.code;
                return (
                  <Box
                    key={lang.code}
                    onClick={() => setEditLanguage(active ? '' : lang.code)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.45,
                      px: 1.25,
                      py: 0.4,
                      borderRadius: 9999,
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '0.76rem',
                      fontWeight: active ? 700 : 500,
                      bgcolor: active
                        ? alpha(lang.accent, isDark ? 0.24 : 0.16)
                        : 'background.surfaceVariant',
                      color: active ? 'text.primary' : 'text.secondary',
                      border: '1.5px solid',
                      borderColor: active ? lang.accent : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditingSession(null)} sx={{ borderRadius: 9999 }}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} startIcon={<SaveIcon />} sx={{ borderRadius: 9999, px: 3 }}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Saved Summary Dialog */}
      <Dialog open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
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
          <Typography variant="h6" fontWeight={700}>
            Session gespeichert
          </Typography>
          {summaryData && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {summaryData.amount} Seiten in {summaryData.timeStr}
                {summaryData.bookName ? ` · ${summaryData.bookName}` : ''}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: summaryData.endedOnPage ? '1fr 1fr' : '1fr',
                  gap: 1.5,
                  mt: 2.5,
                }}
              >
                <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'background.surfaceVariant' }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {summaryData.pagesPerHour}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Seiten / h
                  </Typography>
                </Box>
                {summaryData.endedOnPage && (
                  <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'background.surfaceVariant' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {summaryData.endedOnPage}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      Seite erreicht
                    </Typography>
                  </Box>
                )}
              </Box>

              {summaryData.forecast && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.75,
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08),
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Prognose
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 0.35 }}>
                    {summaryData.forecast}
                  </Typography>
                </Box>
              )}
            </>
          )}
          <Button
            fullWidth
            variant="contained"
            onClick={() => setSummaryModalOpen(false)}
            sx={{ mt: 3, borderRadius: 9999, py: 1.1 }}
          >
            Klasse!
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReadingSpeed;
