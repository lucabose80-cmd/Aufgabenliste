import { useMemo, useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import {
  Box, Card, Typography, Collapse, LinearProgress, Dialog, DialogContent,
  IconButton, TextField, Button, Menu, MenuItem, Autocomplete, Divider
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MapIcon from '@mui/icons-material/Map';
import StarIcon from '@mui/icons-material/Star';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import { ReactFlow, Handle, Position, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BookCover from './BookCover';
import EditionCoverPickerDialog from './EditionCoverPickerDialog';
import { LanguageCoverBadge, LanguagePill, LanguagePicker } from './LanguageBadge';
import {
  normalizeLanguages,
  getLanguageMeta,
  getBookEditions,
  isBilingual,
  isBookFullyCompleted,
} from '../utils/bookLanguages';
import { PRESET_BOOK_CATEGORIES, normalizeCategories, PRESET_BOOK_TAGS, normalizeTags } from '../utils/bookCategories';

/**
 * Builds visual edition descriptors for a single book or a grouped stack of separate books.
 * Respects user-selected `frontLanguage` if set; otherwise orders active (uncompleted)
 * editions in FRONT, then DE first.
 */
const buildVisualEditionsForGroup = (groupBooks) => {
  const entries = [];
  groupBooks.forEach((book) => {
    const bookEds = getBookEditions(book);
    if (bookEds.length > 0) {
      bookEds.forEach((ed) => {
        entries.push({
          key: `${book.id}:${ed.code}`,
          bookId: book.id,
          book,
          langCode: ed.code,
          coverUrl: ed.coverUrl || book.coverUrl || null,
          completed: !!ed.completed,
          rating: ed.rating ?? null,
          notes: ed.notes || '',
          totalPages: ed.totalPages || book.totalPages || null,
          meta: ed.meta,
        });
      });
    } else {
      entries.push({
        key: `${book.id}:default`,
        bookId: book.id,
        book,
        langCode: null,
        coverUrl: book.coverUrl || null,
        completed: !!book.completed,
        rating: book.rating ?? null,
        notes: book.notes || '',
        totalPages: book.totalPages || null,
        meta: null,
      });
    }
  });

  const preferredFront = groupBooks.find((b) => b.frontLanguage)?.frontLanguage || null;

  return entries.sort((a, b) => {
    if (preferredFront) {
      const aFront = a.langCode === preferredFront;
      const bFront = b.langCode === preferredFront;
      if (aFront !== bFront) return aFront ? -1 : 1;
    }
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.langCode === 'de' && b.langCode !== 'de') return -1;
    if (b.langCode === 'de' && a.langCode !== 'de') return 1;
    return 0;
  });
};

/**
 * Groups books in a series shelf so two separate editions of the exact same band
 * (same seriesNumber, distinct non-empty languages like DE + EN) automatically stack
 * into one unified dual-edition tile. Single books with multiple languages (['de', 'en'])
 * and per-language `languageEditions` also produce multi-cover stacked ShelfItems.
 */
const buildShelfItems = (bookList, allowEditionStacking = false) => {
  const makeItem = (groupBooks) => {
    const visualEditions = buildVisualEditionsForGroup(groupBooks);
    const combinedLangs = normalizeLanguages(groupBooks.flatMap((b) => normalizeLanguages(b)));
    const combinedCategories = normalizeCategories(groupBooks.flatMap((b) => normalizeCategories(b)));
    const combinedTags = normalizeTags(groupBooks.flatMap((b) => normalizeTags(b)));
    const primaryBook = visualEditions[0]?.book || groupBooks[0];
    const doneEditions = visualEditions.filter((e) => e.completed).length;
    const totalEditions = visualEditions.length;
    const fullyCompleted = totalEditions > 0
      ? doneEditions === totalEditions
      : groupBooks.every((b) => isBookFullyCompleted(b));
    // Show the front edition's rating on the front cover (or fallback if single-book legacy)
    const frontRating = visualEditions[0]?.rating ?? (visualEditions.length === 1 ? (primaryBook.rating || null) : null);
    const num = primaryBook.seriesNumber ? parseInt(primaryBook.seriesNumber, 10) : null;

    return {
      key: groupBooks.length > 1 ? `stack-${groupBooks.map((b) => b.id).join('-')}` : primaryBook.id,
      primaryBook,
      editions: groupBooks,
      visualEditions,
      languages: combinedLangs,
      categories: combinedCategories,
      tags: combinedTags,
      bilingual: isBilingual(combinedLangs) || visualEditions.length >= 2,
      completed: fullyCompleted,
      doneEditions,
      totalEditions,
      partiallyCompleted: doneEditions > 0 && doneEditions < totalEditions,
      rating: frontRating,
      seriesNumber: num,
    };
  };

  if (!allowEditionStacking) {
    return bookList.map((book) => makeItem([book]));
  }

  const items = [];
  const usedIds = new Set();

  for (let i = 0; i < bookList.length; i++) {
    const book = bookList[i];
    if (usedIds.has(book.id)) continue;

    const bookLangs = normalizeLanguages(book);
    const num = book.seriesNumber ? parseInt(book.seriesNumber, 10) : null;

    if (num && bookLangs.length > 0) {
      const group = [book];
      const groupLangSet = new Set(bookLangs);
      usedIds.add(book.id);

      for (let j = i + 1; j < bookList.length; j++) {
        const candidate = bookList[j];
        if (usedIds.has(candidate.id)) continue;
        const candNum = candidate.seriesNumber ? parseInt(candidate.seriesNumber, 10) : null;
        const candLangs = normalizeLanguages(candidate);
        if (
          candNum === num &&
          candLangs.length > 0 &&
          candLangs.every((l) => !groupLangSet.has(l))
        ) {
          group.push(candidate);
          candLangs.forEach((l) => groupLangSet.add(l));
          usedIds.add(candidate.id);
        }
      }

      items.push(makeItem(group));
    } else {
      usedIds.add(book.id);
      items.push(makeItem([book]));
    }
  }

  return items;
};

// --- 2D ReactFlow Custom Nodes (optional 2D-Map mode) ---
const UniverseNode = ({ data }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        minWidth: 210,
        borderRadius: '20px',
        border: '1.5px solid',
        borderColor: 'primary.main',
        bgcolor: isDark ? '#1E2532' : '#E8F0FE',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(26,115,232,0.12)',
        textAlign: 'center',
      }}
    >
      <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <PublicIcon fontSize="small" /> {data.label}
      </Typography>
      <Handle type="source" position={Position.Right} style={{ background: theme.palette.primary.main, border: 'none', width: 9, height: 9 }} />
    </Box>
  );
};

const SeriesNode = ({ data }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        px: 2.25,
        py: 1.5,
        minWidth: 200,
        borderRadius: '18px',
        border: '1.5px solid',
        borderColor: alpha(theme.palette.secondary.main, 0.6),
        bgcolor: 'background.paper',
        boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: theme.palette.secondary.main, border: 'none', width: 8, height: 8 }} />
      <Typography variant="subtitle2" sx={{ color: 'secondary.main', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
        <CollectionsBookmarkIcon sx={{ fontSize: 16 }} /> {data.label}
      </Typography>
      <Handle type="source" position={Position.Right} style={{ background: theme.palette.secondary.main, border: 'none', width: 8, height: 8 }} />
    </Box>
  );
};

const BookNode = ({ data }) => {
  const { item } = data;
  const book = item.primaryBook;
  const frontEd = item.visualEditions[0] || { coverUrl: book.coverUrl, meta: null };
  const backEd = item.visualEditions.length > 1 ? item.visualEditions[1] : null;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Prominent offset back card for bilingual / dual-edition books */}
      {item.bilingual && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'translate(9px, -8px)',
            borderRadius: '16px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(245, 176, 65, 0.28) 0%, rgba(94, 151, 246, 0.34) 100%)'
              : 'linear-gradient(135deg, rgba(245, 176, 65, 0.32) 0%, rgba(94, 151, 246, 0.3) 100%)',
            border: '1.5px solid',
            borderColor: isDark ? 'rgba(138, 180, 248, 0.5)' : 'rgba(26, 115, 232, 0.38)',
            boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.45)' : '0 3px 10px rgba(0,0,0,0.1)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          p: 1.25,
          width: 262,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          border: '1.5px solid',
          borderColor: item.bilingual
            ? alpha(theme.palette.primary.main, isDark ? 0.55 : 0.42)
            : (item.completed ? alpha(theme.palette.success.main, 0.4) : 'divider'),
          boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.5)' : '0 3px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ background: item.completed ? theme.palette.success.main : theme.palette.primary.main, border: 'none', width: 8, height: 8 }} />
        <Box sx={{ position: 'relative', flexShrink: 0, width: backEd ? 52 : 38, height: 58 }}>
          {backEd && (
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                left: 14,
                transform: 'rotate(5deg)',
                transformOrigin: 'bottom left',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            >
              <BookCover
                coverUrl={backEd.coverUrl}
                title={book.name}
                width={36}
                height={52}
                borderRadius="7px"
                sx={{
                  borderWidth: '1.5px',
                  borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)',
                }}
              />
            </Box>
          )}
          <Box sx={{ position: 'relative', zIndex: 1, mt: backEd ? 0.5 : 0.25 }}>
            <BookCover
              coverUrl={frontEd.coverUrl}
              title={book.name}
              width={36}
              height={54}
              borderRadius="7px"
              sx={backEd ? { boxShadow: '4px 4px 12px rgba(0,0,0,0.55)' } : {}}
            />
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.45 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, color: item.completed ? 'text.secondary' : 'text.primary' }}>
            {book.name}
          </Typography>
          {item.languages.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <LanguagePill languages={item.languages} compact />
              {item.partiallyCompleted && (
                <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'warning.main' }}>
                  {item.doneEditions}/{item.totalEditions} ✓
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {item.completed && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />}
      </Box>
    </Box>
  );
};

const nodeTypes = {
  universeNode: UniverseNode,
  seriesNode: SeriesNode,
  bookNode: BookNode,
};

// --- Cover-First Shelf Tile (dramatic, unmistakable stacked dual covers for bilingual books) ---
const CoverShelfTile = ({ item, onSelect, isDark }) => {
  const book = item.primaryBook;
  const frontEd = item.visualEditions[0] || { coverUrl: book.coverUrl, completed: item.completed, meta: null };
  const backEd = item.visualEditions.length > 1 ? item.visualEditions[1] : null;
  const isStacked = !!backEd;

  return (
    <Box
      onClick={() => onSelect(item)}
      sx={{
        width: isStacked ? 122 : 96,
        flexShrink: 0,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.85,
        transition: 'transform 0.16s ease',
        '&:hover': { transform: 'translateY(-4px)' },
        '&:active': { transform: 'scale(0.97)' },
      }}
    >
      {/* Fixed-height 154px cover stage so single and stacked tiles share the exact same shelf baseline */}
      <Box sx={{ position: 'relative', width: isStacked ? 122 : 96, height: 154 }}>
        {/* Back Book Cover (clearly staggered 24px right & 12px higher with gentle fan tilt) */}
        {isStacked && (
          <Box
            sx={{
              position: 'absolute',
              top: 2,
              left: 24,
              width: 90,
              height: 136,
              borderRadius: '12px',
              transform: 'rotate(4deg)',
              transformOrigin: 'bottom left',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {backEd.coverUrl ? (
              <BookCover
                coverUrl={backEd.coverUrl}
                title={book.name}
                width={90}
                height={136}
                borderRadius="12px"
                sx={{
                  border: '1.5px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(31, 31, 31, 0.2)',
                  boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.18)',
                  filter: backEd.completed && !frontEd.completed ? 'brightness(0.86)' : 'brightness(0.95)',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 90,
                  height: 136,
                  borderRadius: '12px',
                  background: isDark
                    ? 'linear-gradient(155deg, rgba(245, 176, 65, 0.36) 0%, rgba(94, 151, 246, 0.44) 100%)'
                    : 'linear-gradient(155deg, rgba(245, 176, 65, 0.44) 0%, rgba(94, 151, 246, 0.4) 100%)',
                  border: '1.5px solid',
                  borderColor: isDark ? 'rgba(138, 180, 248, 0.5)' : 'rgba(26, 115, 232, 0.38)',
                  boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.55)' : '0 4px 12px rgba(0,0,0,0.14)',
                }}
              />
            )}

            {/* Peeking corner badge on the back book showing its language flag (and check if done) */}
            {backEd.meta && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.2,
                  px: 0.55,
                  py: 0.1,
                  borderRadius: 9999,
                  bgcolor: 'rgba(19, 19, 20, 0.88)',
                  backdropFilter: 'blur(6px)',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  border: '1px solid',
                  borderColor: backEd.completed ? 'rgba(129, 201, 149, 0.7)' : 'rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                }}
              >
                <span>{backEd.meta.flag}</span>
                {backEd.completed && <CheckCircleIcon sx={{ fontSize: 10, color: 'success.main' }} />}
              </Box>
            )}
          </Box>
        )}

        {/* Front Book Cover (casts crisp depth shadow onto back cover so layering pops!) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            zIndex: 2,
            width: isStacked ? 92 : 96,
            height: isStacked ? 138 : 142,
          }}
        >
          <BookCover
            coverUrl={frontEd.coverUrl}
            title={book.name}
            width={isStacked ? 92 : 96}
            height={isStacked ? 138 : 142}
            borderRadius="12px"
            sx={{
              opacity: item.completed ? 0.85 : 1,
              ...(isStacked ? {
                border: '1.5px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.85)',
                boxShadow: isDark
                  ? '8px 6px 20px rgba(0, 0, 0, 0.78), 0 2px 8px rgba(0, 0, 0, 0.5)'
                  : '8px 6px 18px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.14)',
              } : {}),
            }}
          />

          {/* Subtle Band badge in top-left corner */}
          {item.seriesNumber && (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                left: 6,
                px: 0.75,
                py: 0.15,
                borderRadius: 9999,
                bgcolor: isDark ? 'rgba(19, 19, 20, 0.84)' : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(6px)',
                color: 'text.primary',
                fontSize: '0.64rem',
                fontWeight: 700,
                lineHeight: 1.3,
                boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
              }}
            >
              #{item.seriesNumber}
            </Box>
          )}

          {/* Completion status in top-right: full green check ONLY when all languages done; partial pill otherwise */}
          {item.completed ? (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: isDark ? '#131314' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
            </Box>
          ) : item.partiallyCompleted ? (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                px: 0.65,
                py: 0.12,
                borderRadius: 9999,
                bgcolor: 'rgba(19, 19, 20, 0.86)',
                backdropFilter: 'blur(6px)',
                color: '#8AB4F8',
                border: '1px solid rgba(138, 180, 248, 0.5)',
                fontSize: '0.6rem',
                fontWeight: 700,
                lineHeight: 1.25,
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              {item.doneEditions}/{item.totalEditions} ✓
            </Box>
          ) : null}

          {/* Language badge in bottom-left corner */}
          <LanguageCoverBadge languages={item.languages} />

          {/* Subtle gold rating badge in bottom-right corner */}
          {item.rating && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 6,
                right: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                px: 0.7,
                py: 0.15,
                borderRadius: 9999,
                bgcolor: 'rgba(19, 19, 20, 0.84)',
                backdropFilter: 'blur(6px)',
                color: '#FDD663',
                fontSize: '0.64rem',
                fontWeight: 700,
                lineHeight: 1.3,
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              <StarIcon sx={{ fontSize: 11 }} />
              {item.rating}
            </Box>
          )}
        </Box>
      </Box>

      <Typography
        variant="caption"
        fontWeight={600}
        sx={{
          fontSize: '0.76rem',
          lineHeight: 1.25,
          width: isStacked ? 104 : 96,
          color: item.completed ? 'text.secondary' : 'text.primary',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          px: 0.25,
        }}
      >
        {book.name}
      </Typography>
    </Box>
  );
};

const BookUniverseMap = () => {
  const {
    books, readingSessions, updateBookReview, updateBookLanguages,
    updateBookEdition, updateBook, updateBookCategories, updateBookTags, updateBookFrontLanguage
  } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [viewMode, setViewMode] = useState('explorer'); // 'explorer' | '2d'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'uni:<name>' | 'series' | 'standalone'
  const [languageFilter, setLanguageFilter] = useState('all'); // 'all' | 'bilingual' | 'de' | 'en' | ...
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | '<categoryName>'
  const [tagFilter, setTagFilter] = useState('all'); // 'all' | '<tagName>'
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedEditionIds, setSelectedEditionIds] = useState([]);
  const [activeVisualKey, setActiveVisualKey] = useState(null);
  const [detailRating, setDetailRating] = useState(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  // Mandatory Cover Picker when adding English / 2nd language or changing an edition cover
  const [coverPickerState, setCoverPickerState] = useState(null);
  // { book, langCode, isNewEdition, initialCoverUrl }

  const selectedBookGroup = useMemo(
    () => selectedEditionIds.map((id) => books.find((b) => b.id === id)).filter(Boolean),
    [books, selectedEditionIds]
  );

  const modalVisualEditions = useMemo(
    () => buildVisualEditionsForGroup(selectedBookGroup),
    [selectedBookGroup]
  );

  const activeVisualEdition = useMemo(
    () => modalVisualEditions.find((e) => e.key === activeVisualKey) || modalVisualEditions[0] || null,
    [modalVisualEditions, activeVisualKey]
  );

  const selectedBook = activeVisualEdition?.book || selectedBookGroup[0] || null;

  const openItemModal = (item) => {
    if (!item) {
      setSelectedEditionIds([]);
      setActiveVisualKey(null);
      return;
    }
    const ids = item.editions.map((b) => b.id);
    const firstVisual = item.visualEditions[0];
    setSelectedEditionIds(ids);
    setActiveVisualKey(firstVisual?.key || null);
    setDetailRating(firstVisual?.rating ?? null);
    setDetailNotes(firstVisual?.notes || '');
    setReviewSaved(false);
  };

  const switchVisualEditionInModal = (ed) => {
    setActiveVisualKey(ed.key);
    setDetailRating(ed.rating ?? null);
    setDetailNotes(ed.notes || '');
    setReviewSaved(false);
  };

  const toggleNode = (key) => {
    setCollapsedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Detect which languages, categories & tags are actually in use across all books
  const availableLanguages = useMemo(() => {
    const langSet = new Set();
    books.forEach((b) => normalizeLanguages(b).forEach((c) => langSet.add(c)));
    return normalizeLanguages(Array.from(langSet));
  }, [books]);

  const availableCategories = useMemo(() => {
    const catSet = new Set();
    books.forEach((b) => normalizeCategories(b).forEach((c) => catSet.add(c)));
    return Array.from(catSet).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const availableTags = useMemo(() => {
    const tagSet = new Set();
    books.forEach((b) => normalizeTags(b).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const hierarchy = useMemo(() => {
    const data = {
      universes: {},
      standaloneSeries: {},
      standaloneBooks: []
    };

    const sortedBooks = [...books].sort((a, b) => {
      const numA = parseInt(a.seriesNumber, 10);
      const numB = parseInt(b.seriesNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.name || '').localeCompare(b.name || '');
    });

    sortedBooks.forEach(book => {
      const uni = book.universe ? book.universe.trim() : null;
      const ser = book.series ? book.series.trim() : null;

      if (uni) {
        if (!data.universes[uni]) {
          data.universes[uni] = { series: {}, standaloneBooks: [] };
        }
        if (ser) {
          if (!data.universes[uni].series[ser]) data.universes[uni].series[ser] = [];
          data.universes[uni].series[ser].push(book);
        } else {
          data.universes[uni].standaloneBooks.push(book);
        }
      } else if (ser) {
        if (!data.standaloneSeries[ser]) data.standaloneSeries[ser] = [];
        data.standaloneSeries[ser].push(book);
      } else {
        data.standaloneBooks.push(book);
      }
    });

    // Apply languageFilter, categoryFilter, and tagFilter cleanly
    const matchesFilters = (item) => {
      if (languageFilter === 'bilingual' && !item.bilingual) return false;
      if (languageFilter !== 'all' && languageFilter !== 'bilingual' && !item.languages.includes(languageFilter)) return false;
      if (categoryFilter !== 'all' && !item.categories.includes(categoryFilter)) return false;
      if (tagFilter !== 'all' && !item.tags.includes(tagFilter)) return false;
      return true;
    };

    const filtered = {
      universes: {},
      standaloneSeries: {},
      standaloneBooks: buildShelfItems(data.standaloneBooks, false).filter(matchesFilters),
    };

    Object.entries(data.universes).forEach(([uniName, uniData]) => {
      const seriesMap = {};
      Object.entries(uniData.series).forEach(([serName, list]) => {
        const items = buildShelfItems(list, true).filter(matchesFilters);
        if (items.length > 0) seriesMap[serName] = items;
      });
      const soloItems = buildShelfItems(uniData.standaloneBooks, false).filter(matchesFilters);
      if (Object.keys(seriesMap).length > 0 || soloItems.length > 0) {
        filtered.universes[uniName] = { series: seriesMap, standaloneBooks: soloItems };
      }
    });

    Object.entries(data.standaloneSeries).forEach(([serName, list]) => {
      const items = buildShelfItems(list, true).filter(matchesFilters);
      if (items.length > 0) filtered.standaloneSeries[serName] = items;
    });

    return filtered;
  }, [books, languageFilter, categoryFilter, tagFilter]);

  const universeNames = useMemo(() => Object.keys(hierarchy.universes).sort((a, b) => a.localeCompare(b)), [hierarchy]);
  const standaloneSeriesNames = useMemo(() => Object.keys(hierarchy.standaloneSeries).sort((a, b) => a.localeCompare(b)), [hierarchy]);

  // Compute reading stats for the selected book / active language edition (plus combined time if multi-edition)
  const selectedBookStats = useMemo(() => {
    if (!selectedBook) return null;
    const allBookSessions = readingSessions.filter(s => s.bookId === selectedBook.id);
    const activeLang = activeVisualEdition?.langCode || null;
    const bookLangs = normalizeLanguages(selectedBook);

    const sessions = (bookLangs.length >= 2 && activeLang)
      ? allBookSessions.filter((s) => (s.language ? s.language.toLowerCase() === activeLang : bookLangs[0] === activeLang))
      : allBookSessions;

    const totalSec = sessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);
    const maxEnded = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));
    const pagesRead = maxEnded > 0 ? maxEnded : sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
    const total = Number(activeVisualEdition?.totalPages || selectedBook.totalPages) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((pagesRead / total) * 100)) : null;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const timeStr = totalSec > 0 ? (h > 0 ? `${h}h ${m}m` : `${m}m`) : null;

    let combinedTimeStr = null;
    if (modalVisualEditions.length > 1) {
      const allIds = new Set(selectedBookGroup.map((b) => b.id));
      const allSec = readingSessions
        .filter((s) => s.bookId && allIds.has(s.bookId))
        .reduce((acc, s) => acc + (s.timeSpent || 0), 0);
      if (allSec > 0) {
        const ch = Math.floor(allSec / 3600);
        const cm = Math.floor((allSec % 3600) / 60);
        combinedTimeStr = ch > 0 ? `${ch}h ${cm}m` : `${cm}m`;
      }
    }

    return { pagesRead, total, pct, timeStr, combinedTimeStr, sessionsCount: sessions.length };
  }, [selectedBook, activeVisualEdition, modalVisualEditions, selectedBookGroup, readingSessions]);

  // 2D ReactFlow layout (only computed when 2D-Map is active)
  const { nodes, edges } = useMemo(() => {
    if (viewMode !== '2d') return { nodes: [], edges: [] };
    const newNodes = [];
    const newEdges = [];
    let currentY = 0;

    const X_UNI = 40;
    const X_SER = 380;
    const X_BOK = 720;
    const Y_SPACING = 115;

    const edgeColorSubtle = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(31,31,31,0.22)';
    const edgeColorPrimary = alpha(theme.palette.primary.main, 0.75);

    universeNames.forEach(uniName => {
      const uniData = hierarchy.universes[uniName];
      const startY = currentY;
      const uniId = `uni-${uniName}`;

      Object.entries(uniData.series).sort((a, b) => a[0].localeCompare(b[0])).forEach(([serName, serItems]) => {
        const serId = `ser-${uniName}-${serName}`;
        const serStartY = currentY;
        serItems.forEach(item => {
          const nodeId = `book-${item.key}`;
          newNodes.push({ id: nodeId, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { item } });
          newEdges.push({ id: `e-${serId}-${nodeId}`, source: serId, target: nodeId, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
          currentY += Y_SPACING;
        });
        const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
        newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
        newEdges.push({ id: `e-${uniId}-${serId}`, source: uniId, target: serId, animated: true, style: { stroke: edgeColorPrimary, strokeWidth: 2 } });
        currentY += 45;
      });

      uniData.standaloneBooks.forEach(item => {
        const nodeId = `book-${item.key}`;
        newNodes.push({ id: nodeId, type: 'bookNode', position: { x: X_SER, y: currentY }, data: { item } });
        newEdges.push({ id: `e-${uniId}-${nodeId}`, source: uniId, target: nodeId, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
        currentY += Y_SPACING;
      });

      const uniMidY = startY + ((currentY - 45 - startY) / 2);
      newNodes.push({ id: uniId, type: 'universeNode', position: { x: X_UNI, y: Math.max(startY, uniMidY) }, data: { label: uniName } });
      currentY += 90;
    });

    standaloneSeriesNames.forEach(serName => {
      const serItems = hierarchy.standaloneSeries[serName];
      const serId = `st-ser-${serName}`;
      const serStartY = currentY;
      serItems.forEach(item => {
        const nodeId = `book-${item.key}`;
        newNodes.push({ id: nodeId, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { item } });
        newEdges.push({ id: `e-${serId}-${nodeId}`, source: serId, target: nodeId, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
        currentY += Y_SPACING;
      });
      const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
      newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
      currentY += 90;
    });

    hierarchy.standaloneBooks.forEach(item => {
      const nodeId = `book-${item.key}`;
      newNodes.push({ id: nodeId, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { item } });
      currentY += Y_SPACING;
    });

    return { nodes: newNodes, edges: newEdges };
  }, [viewMode, hierarchy, universeNames, standaloneSeriesNames, isDark, theme.palette.primary.main]);

  const renderSeriesShelf = (serName, serItems, key) => {
    const doneCount = serItems.filter(it => it.completed).length;
    return (
      <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <CollectionsBookmarkIcon sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {serName}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {doneCount}/{serItems.length}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5, pt: 0.25 }}>
          {serItems.map(item => (
            <CoverShelfTile key={item.key} item={item} onSelect={openItemModal} isDark={isDark} />
          ))}
        </Box>
      </Box>
    );
  };

  if (books.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Noch keine Bücher vorhanden
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Füge zuerst Bücher unter „Bücher“ hinzu, um deine Universen & Reihen zu sehen.
        </Typography>
      </Card>
    );
  }

  const hasFilteredResults =
    universeNames.length > 0 ||
    standaloneSeriesNames.length > 0 ||
    hierarchy.standaloneBooks.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Slim Top Controls: Filter Pills + Compact View Switch */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', flex: 1, py: 0.25 }}>
          {viewMode === 'explorer' && [
            { id: 'all', label: 'Alle' },
            ...universeNames.map(u => ({ id: `uni:${u}`, label: u })),
            ...(standaloneSeriesNames.length > 0 ? [{ id: 'series', label: 'Reihen' }] : []),
            ...(hierarchy.standaloneBooks.length > 0 ? [{ id: 'standalone', label: 'Einzeln' }] : []),
          ].map(pill => {
            const active = selectedFilter === pill.id;
            return (
              <Box
                key={pill.id}
                onClick={() => setSelectedFilter(pill.id)}
                sx={{
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 500,
                  bgcolor: active
                    ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14)
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  color: active ? 'primary.main' : 'text.secondary',
                  transition: 'all 0.15s ease',
                }}
              >
                {pill.label}
              </Box>
            );
          })}
        </Box>

        {/* Compact Right Controls: Subtle Genre & Tag Filter + Shelf/2D Switch */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          {(availableCategories.length > 0 || availableTags.length > 0) && (
            <>
              <IconButton
                size="small"
                title={
                  categoryFilter !== 'all' || tagFilter !== 'all'
                    ? `Filter: ${[categoryFilter !== 'all' ? categoryFilter : null, tagFilter !== 'all' ? `#${tagFilter}` : null].filter(Boolean).join(' · ')}`
                    : 'Nach Kategorie oder Tag filtern'
                }
                onClick={(e) => setCategoryMenuAnchor(e.currentTarget)}
                sx={{
                  position: 'relative',
                  width: 34,
                  height: 34,
                  bgcolor: (categoryFilter !== 'all' || tagFilter !== 'all')
                    ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14)
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: (categoryFilter !== 'all' || tagFilter !== 'all') ? 'primary.main' : 'divider',
                  color: (categoryFilter !== 'all' || tagFilter !== 'all') ? 'primary.main' : 'text.secondary',
                }}
              >
                <TuneIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <Menu
                anchorEl={categoryMenuAnchor}
                open={Boolean(categoryMenuAnchor)}
                onClose={() => setCategoryMenuAnchor(null)}
                PaperProps={{ sx: { borderRadius: '16px', minWidth: 195, maxHeight: 400 } }}
              >
                {availableCategories.length > 0 && [
                  <Typography
                    key="map-cat-head"
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ px: 2, py: 0.55, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}
                  >
                    Kategorie
                  </Typography>,
                  <MenuItem
                    key="map-cat-all"
                    selected={categoryFilter === 'all'}
                    onClick={() => {
                      setCategoryFilter('all');
                      setSelectedFilter('all');
                      setCategoryMenuAnchor(null);
                    }}
                    sx={{ fontSize: '0.84rem' }}
                  >
                    Alle Kategorien
                  </MenuItem>,
                  ...availableCategories.map((cat) => (
                    <MenuItem
                      key={`map-cat-${cat}`}
                      selected={categoryFilter === cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setSelectedFilter('all');
                        setCategoryMenuAnchor(null);
                      }}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      {cat}
                    </MenuItem>
                  )),
                ]}
                {availableCategories.length > 0 && availableTags.length > 0 && (
                  <Divider sx={{ my: 0.75 }} />
                )}
                {availableTags.length > 0 && [
                  <Typography
                    key="map-tag-head"
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ px: 2, py: 0.55, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}
                  >
                    Tags
                  </Typography>,
                  <MenuItem
                    key="map-tag-all"
                    selected={tagFilter === 'all'}
                    onClick={() => {
                      setTagFilter('all');
                      setSelectedFilter('all');
                      setCategoryMenuAnchor(null);
                    }}
                    sx={{ fontSize: '0.84rem' }}
                  >
                    Alle Tags
                  </MenuItem>,
                  ...availableTags.map((t) => (
                    <MenuItem
                      key={`map-tag-${t}`}
                      selected={tagFilter === t}
                      onClick={() => {
                        setTagFilter(t);
                        setSelectedFilter('all');
                        setCategoryMenuAnchor(null);
                      }}
                      sx={{ fontSize: '0.84rem' }}
                    >
                      #{t}
                    </MenuItem>
                  )),
                ]}
              </Menu>
            </>
          )}

          <Box
            sx={{
              display: 'inline-flex',
              p: 0.35,
              borderRadius: 9999,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            {[
              { id: 'explorer', icon: AccountTreeIcon, title: 'Regal-Ansicht' },
              { id: '2d', icon: MapIcon, title: '2D-Map' },
            ].map(({ id, icon: IconComp, title }) => {
              const active = viewMode === id;
              return (
                <IconButton
                  key={id}
                  size="small"
                  title={title}
                  onClick={() => setViewMode(id)}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: active ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14) : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                  }}
                >
                  <IconComp sx={{ fontSize: 16 }} />
                </IconButton>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Compact Language Filter Row (shown once at least one book has a language) */}
      {(availableLanguages.length > 0 || categoryFilter !== 'all' || tagFilter !== 'all') && (
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', py: 0.15, alignItems: 'center' }}>
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
                onClick={() => {
                  setLanguageFilter(opt.id);
                  setSelectedFilter('all');
                }}
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
                    ? alpha(theme.palette.secondary.main, isDark ? 0.22 : 0.14)
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: active ? 'secondary.main' : 'divider',
                  color: active ? 'secondary.main' : 'text.secondary',
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
                flexShrink: 0,
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
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
                flexShrink: 0,
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.2 : 0.12),
                color: 'secondary.main',
              }}
            >
              <span>#{tagFilter}</span>
              <CloseIcon sx={{ fontSize: 12 }} />
            </Box>
          )}
        </Box>
      )}

      {!hasFilteredResults ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Keine Bücher für diesen Filter
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Setze den Sprach-, Kategorie- oder Tag-Filter zurück, um alle Bücher wieder zu sehen.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setLanguageFilter('all');
              setCategoryFilter('all');
              setTagFilter('all');
            }}
            sx={{ borderRadius: 9999 }}
          >
            Filter zurücksetzen
          </Button>
        </Card>
      ) : viewMode === 'explorer' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Universes */}
          {universeNames
            .filter(u => selectedFilter === 'all' || selectedFilter === `uni:${u}`)
            .map(uniName => {
              const uniData = hierarchy.universes[uniName];
              const uniSeriesEntries = Object.entries(uniData.series).sort((a, b) => a[0].localeCompare(b[0]));
              const allUniItems = [
                ...uniSeriesEntries.flatMap(([, list]) => list),
                ...uniData.standaloneBooks,
              ];
              const doneCount = allUniItems.filter(it => it.completed).length;
              const uniKey = `uni-${uniName}`;
              const isCollapsed = !!collapsedNodes[uniKey];

              return (
                <Card key={uniKey} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
                  <Box
                    onClick={() => toggleNode(uniKey)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
                      <PublicIcon sx={{ fontSize: 20, color: 'primary.main', flexShrink: 0 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                        {uniName}
                      </Typography>
                      <Box
                        sx={{
                          px: 0.95,
                          py: 0.15,
                          borderRadius: 9999,
                          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                          color: 'primary.main',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {doneCount}/{allUniItems.length}
                      </Box>
                    </Box>
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        color: 'text.secondary',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </Box>

                  <Collapse in={!isCollapsed} timeout={200}>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                      {uniSeriesEntries.map(([serName, serItems]) =>
                        renderSeriesShelf(serName, serItems, `uni-${uniName}-ser-${serName}`)
                      )}

                      {uniData.standaloneBooks.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Einzelwerke
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5, pt: 0.25 }}>
                            {uniData.standaloneBooks.map(item => (
                              <CoverShelfTile key={item.key} item={item} onSelect={openItemModal} isDark={isDark} />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Card>
              );
            })}

          {/* Standalone Series */}
          {(selectedFilter === 'all' || selectedFilter === 'series') && standaloneSeriesNames.length > 0 && (
            <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {standaloneSeriesNames.map(serName =>
                  renderSeriesShelf(serName, hierarchy.standaloneSeries[serName], `st-ser-${serName}`)
                )}
              </Box>
            </Card>
          )}

          {/* Standalone Books */}
          {(selectedFilter === 'all' || selectedFilter === 'standalone') && hierarchy.standaloneBooks.length > 0 && (
            <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Einzelbücher
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 0.25 }}>
                {hierarchy.standaloneBooks.map(item => (
                  <CoverShelfTile key={item.key} item={item} onSelect={openItemModal} isDark={isDark} />
                ))}
              </Box>
            </Card>
          )}
        </Box>
      ) : (
        /* Optional Classic 2D ReactFlow Map */
        <Card sx={{ p: 0, borderRadius: '24px', overflow: 'hidden', height: '65vh', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              flexGrow: 1,
              width: '100%',
              position: 'relative',
              bgcolor: isDark ? '#151618' : '#F8FAFD',
              '& .react-flow__controls': {
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
              },
              '& .react-flow__controls-button': {
                bgcolor: 'background.paper',
                color: 'text.primary',
                borderBottomColor: 'divider',
                fill: 'currentColor',
              },
              '& .react-flow__attribution': { opacity: 0.35, bgcolor: 'transparent' },
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => {
                if (node?.type === 'bookNode' && node.data?.item) {
                  openItemModal(node.data.item);
                }
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.15}
              maxZoom={1.5}
              attributionPosition="bottom-right"
            >
              <Background gap={22} size={1.2} color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,31,31,0.08)'} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </Box>
        </Card>
      )}

      {/* Book Detail Dialog on Tap */}
      <Dialog
        open={!!selectedBook}
        onClose={() => openItemModal(null)}
        maxWidth="xs"
        fullWidth
      >
        {selectedBook && activeVisualEdition && (
          <DialogContent sx={{ p: 2.5 }}>
            {/* Edition switcher + Map front-cover selector when 2+ editions exist */}
            {modalVisualEditions.length > 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      gap: 0.65,
                      p: 0.45,
                      borderRadius: '14px',
                      bgcolor: 'background.surfaceVariant',
                    }}
                  >
                    {modalVisualEditions.map((ed) => {
                      const active = ed.key === activeVisualEdition.key;
                      const label = ed.meta
                        ? `${ed.meta.flag} ${ed.meta.label}`
                        : ed.book.name;
                      return (
                        <Box
                          key={ed.key}
                          onClick={() => switchVisualEditionInModal(ed)}
                          sx={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            py: 0.65,
                            px: 1,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            fontSize: '0.78rem',
                            fontWeight: active ? 700 : 500,
                            bgcolor: active ? 'background.paper' : 'transparent',
                            color: active ? 'text.primary' : 'text.secondary',
                            boxShadow: active ? (isDark ? '0 1px 4px rgba(0,0,0,0.45)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{label}</span>
                          {ed.completed ? (
                            <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                          ) : (
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                  <IconButton
                    size="small"
                    title="Vorderes Cover in der Map tauschen"
                    onClick={() => {
                      const currentFront = modalVisualEditions[0];
                      const nextFront = modalVisualEditions.find((e) => e.key !== currentFront.key);
                      if (nextFront?.langCode) {
                        updateBookFrontLanguage(selectedEditionIds, nextFront.langCode);
                      }
                    }}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: 'background.surfaceVariant',
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <SwapHorizIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                {/* Explicit 1-tap control to set the viewed edition as the front cover on the Map */}
                {(() => {
                  const isCurrentlyFront = modalVisualEditions[0]?.key === activeVisualEdition.key;
                  return (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {isCurrentlyFront
                          ? '✓ Wird auf der Map vorne angezeigt'
                          : 'Liegt auf der Map aktuell hinten'}
                      </Typography>
                      {!isCurrentlyFront && activeVisualEdition.langCode && (
                        <Button
                          size="small"
                          startIcon={<FlipToFrontIcon sx={{ fontSize: 14 }} />}
                          onClick={() => updateBookFrontLanguage(selectedEditionIds, activeVisualEdition.langCode)}
                          sx={{ borderRadius: 9999, py: 0.2, px: 1.25, fontSize: '0.7rem', minHeight: 0 }}
                        >
                          Vorne anzeigen
                        </Button>
                      )}
                    </Box>
                  );
                })()}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
                <Box
                  onClick={() => {
                    const targetLang = activeVisualEdition.langCode || normalizeLanguages(selectedBook)[0] || 'de';
                    setCoverPickerState({
                      book: selectedBook,
                      langCode: targetLang,
                      isNewEdition: false,
                      initialCoverUrl: activeVisualEdition.coverUrl || '',
                    });
                  }}
                  sx={{ position: 'relative', cursor: 'pointer', flexShrink: 0, '&:hover': { opacity: 0.88 } }}
                  title="Cover dieser Ausgabe ändern"
                >
                  <BookCover
                    coverUrl={activeVisualEdition.coverUrl}
                    title={selectedBook.name}
                    width={76}
                    height={114}
                    borderRadius="12px"
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'rgba(19, 19, 20, 0.84)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    }}
                  >
                    <ImageSearchIcon sx={{ fontSize: 13 }} />
                  </Box>
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.25 }}>
                    {selectedBook.name}
                  </Typography>
                  {selectedBook.author && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      {selectedBook.author}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65, mt: 1.25 }}>
                    {/* Interactive completion toggle for the currently viewed edition */}
                    <Box
                      onClick={() => {
                        if (activeVisualEdition.langCode) {
                          updateBookEdition(selectedBook.id, activeVisualEdition.langCode, {
                            completed: !activeVisualEdition.completed,
                          });
                        } else {
                          updateBook(
                            selectedBook.id,
                            selectedBook.name,
                            selectedBook.author,
                            selectedBook.series,
                            !selectedBook.completed,
                            selectedBook.wordsPerPage,
                            selectedBook.seriesNumber,
                            selectedBook.universe,
                            selectedBook.totalPages
                          );
                        }
                      }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.4,
                        px: 1,
                        py: 0.25,
                        borderRadius: 9999,
                        cursor: 'pointer',
                        userSelect: 'none',
                        bgcolor: activeVisualEdition.completed
                          ? alpha(theme.palette.success.main, isDark ? 0.2 : 0.14)
                          : alpha(theme.palette.primary.main, isDark ? 0.2 : 0.14),
                        color: activeVisualEdition.completed ? 'success.main' : 'primary.main',
                        border: '1px solid',
                        borderColor: activeVisualEdition.completed
                          ? alpha(theme.palette.success.main, 0.4)
                          : alpha(theme.palette.primary.main, 0.35),
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        transition: 'transform 0.12s ease',
                        '&:active': { transform: 'scale(0.96)' },
                      }}
                    >
                      {activeVisualEdition.completed
                        ? <CheckCircleIcon sx={{ fontSize: 13 }} />
                        : <CheckCircleOutlinedIcon sx={{ fontSize: 13 }} />}
                      {activeVisualEdition.completed
                        ? (activeVisualEdition.meta ? `${activeVisualEdition.meta.short} Gelesen` : 'Gelesen')
                        : (activeVisualEdition.meta ? `${activeVisualEdition.meta.short} Aktiv` : 'Aktiv')}
                    </Box>
                    {selectedBook.series && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.2,
                          borderRadius: 9999,
                          bgcolor: 'background.surfaceVariant',
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {selectedBook.series}{selectedBook.seriesNumber ? ` · Bd. ${selectedBook.seriesNumber}` : ''}
                      </Box>
                    )}
                    {selectedBook.universe && (
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
                        {selectedBook.universe}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => openItemModal(null)} sx={{ color: 'text.secondary', mt: -0.5, mr: -0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Quick Language Toggle: adding English or a 2nd+ language requires choosing its cover & starts active */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sprachen &amp; Ausgaben
              </Typography>
              <LanguagePicker
                value={normalizeLanguages(selectedBook)}
                onToggleLanguage={(code, isActive) => {
                  const currentLangs = normalizeLanguages(selectedBook);
                  if (isActive) {
                    const remaining = currentLangs.filter((c) => c !== code);
                    updateBookLanguages(selectedBook.id, remaining);
                    if (activeVisualEdition.langCode === code) {
                      setActiveVisualKey(remaining[0] ? `${selectedBook.id}:${remaining[0]}` : null);
                    }
                    return;
                  }
                  // Adding English or any 2nd+ language -> require choosing cover (starts as NOT completed!)
                  if (code === 'en' || currentLangs.length >= 1) {
                    setCoverPickerState({
                      book: selectedBook,
                      langCode: code,
                      isNewEdition: true,
                      initialCoverUrl: '',
                    });
                  } else {
                    updateBookLanguages(selectedBook.id, [...currentLangs, code]);
                    setActiveVisualKey(`${selectedBook.id}:${code}`);
                  }
                }}
                compact
                showHint={false}
              />
            </Box>

            {selectedBookStats && (selectedBookStats.total > 0 || selectedBookStats.timeStr || selectedBookStats.combinedTimeStr) && (
              <Box sx={{ mt: 2, p: 1.75, borderRadius: '16px', bgcolor: 'background.surfaceVariant', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {selectedBookStats.total > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Fortschritt{activeVisualEdition.meta && modalVisualEditions.length > 1 ? ` (${activeVisualEdition.meta.short})` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.primary" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {selectedBookStats.pagesRead} / {selectedBookStats.total} S. · {selectedBookStats.pct}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={selectedBookStats.pct} sx={{ height: 6, borderRadius: 9999 }} />
                  </Box>
                )}

                {selectedBookStats.timeStr && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Bisherige Lesezeit
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {selectedBookStats.timeStr} ({selectedBookStats.sessionsCount} {selectedBookStats.sessionsCount === 1 ? 'Session' : 'Sessions'})
                    </Typography>
                  </Box>
                )}

                {selectedBookStats.combinedTimeStr && modalVisualEditions.length > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Gesamt über alle Ausgaben
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {selectedBookStats.combinedTimeStr}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Independent 1-10 Rating & Short Note / Quote per language */}
            <Box sx={{ mt: 2.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bewertung &amp; Fazit{activeVisualEdition.meta && modalVisualEditions.length > 1 ? ` (${activeVisualEdition.meta.flag} ${activeVisualEdition.meta.short})` : ''}
                </Typography>
                {detailRating && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: isDark ? '#FDD663' : '#C25E00', fontSize: '0.76rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    <StarIcon sx={{ fontSize: 14 }} />
                    {detailRating}/10
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 0.4 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const active = detailRating === num;
                  const filled = detailRating && num <= detailRating;
                  return (
                    <Box
                      key={num}
                      onClick={() => {
                        setDetailRating(active ? null : num);
                        setReviewSaved(false);
                      }}
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
                label={
                  activeVisualEdition.meta && modalVisualEditions.length > 1
                    ? `Fazit / Zitat (${activeVisualEdition.meta.label})`
                    : 'Kurzes Fazit oder Lieblingszitat'
                }
                value={detailNotes}
                onChange={(e) => {
                  setDetailNotes(e.target.value);
                  setReviewSaved(false);
                }}
                size="small"
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                placeholder="Gedanken oder Zitat zum Buch..."
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  {reviewSaved ? '✓ Gespeichert' : ''}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={async () => {
                    await updateBookReview(selectedBook.id, detailRating, detailNotes, activeVisualEdition.langCode);
                    setReviewSaved(true);
                  }}
                  sx={{ borderRadius: 9999, px: 2.25 }}
                >
                  Speichern
                </Button>
              </Box>
            </Box>

            {/* Unobtrusive background categories & thematic tags */}
            <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                options={Array.from(new Set([...PRESET_BOOK_CATEGORIES, ...availableCategories]))}
                value={normalizeCategories(selectedBook)}
                onChange={(_, newValue) => {
                  updateBookCategories(selectedBook.id, newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kategorie / Genre (optional)"
                    placeholder="z. B. Romantasy, Fantasy..."
                    size="small"
                  />
                )}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={Array.from(new Set([...PRESET_BOOK_TAGS, ...availableTags]))}
                  value={normalizeTags(selectedBook)}
                  onChange={(_, newValue) => {
                    updateBookTags(selectedBook.id, newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags / Elemente (optional)"
                      placeholder="z. B. Magie, Drachen, Schwertkampf, Moderne..."
                      size="small"
                    />
                  )}
                />
                <Box sx={{ display: 'flex', gap: 0.55, overflowX: 'auto', pb: 0.25 }}>
                  {PRESET_BOOK_TAGS.slice(0, 12).map((tag) => {
                    const currentTags = normalizeTags(selectedBook);
                    const active = currentTags.includes(tag);
                    return (
                      <Box
                        key={tag}
                        onClick={() => {
                          const next = active
                            ? currentTags.filter((t) => t !== tag)
                            : normalizeTags([...currentTags, tag]);
                          updateBookTags(selectedBook.id, next);
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
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Mandatory Cover Picker when adding English / 2nd language or changing an edition cover */}
      <EditionCoverPickerDialog
        open={!!coverPickerState}
        bookTitle={coverPickerState?.book?.name || ''}
        bookAuthor={coverPickerState?.book?.author || ''}
        langCode={coverPickerState?.langCode || 'en'}
        initialCoverUrl={coverPickerState?.initialCoverUrl || ''}
        isNewEdition={!!coverPickerState?.isNewEdition}
        onClose={() => setCoverPickerState(null)}
        onConfirm={async (pickedCoverUrl) => {
          if (!coverPickerState?.book) return;
          const { book, langCode, isNewEdition } = coverPickerState;
          if (isNewEdition) {
            await updateBookEdition(book.id, langCode, {
              coverUrl: pickedCoverUrl,
              completed: false,
              rating: null,
              notes: '',
            });
            setActiveVisualKey(`${book.id}:${langCode}`);
            setDetailRating(null);
            setDetailNotes('');
            setReviewSaved(false);
          } else {
            await updateBookEdition(book.id, langCode, {
              coverUrl: pickedCoverUrl,
            });
          }
          setCoverPickerState(null);
        }}
      />
    </Box>
  );
};

export default BookUniverseMap;
