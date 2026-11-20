import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Collapse, LinearProgress, Dialog, DialogContent, IconButton, TextField, Button } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MapIcon from '@mui/icons-material/Map';
import StarIcon from '@mui/icons-material/Star';
import { ReactFlow, Handle, Position, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BookCover from './BookCover';
import { LanguageCoverBadge, LanguagePill, LanguagePicker } from './LanguageBadge';
import {
  normalizeLanguages,
  getLanguageMeta,
  isBilingual,
} from '../utils/bookLanguages';

/**
 * Groups books in a series shelf so two separate editions of the exact same band
 * (same seriesNumber, distinct non-empty languages like DE + EN) automatically stack
 * into one unified dual-edition tile. Single books with multiple languages (['de', 'en'])
 * are also represented cleanly as bilingual ShelfItems.
 */
const buildShelfItems = (bookList, allowEditionStacking = false) => {
  if (!allowEditionStacking) {
    return bookList.map((book) => {
      const langs = normalizeLanguages(book);
      return {
        key: book.id,
        primaryBook: book,
        editions: [book],
        languages: langs,
        bilingual: isBilingual(langs),
        completed: !!book.completed,
        rating: book.rating || null,
        seriesNumber: book.seriesNumber || null,
      };
    });
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

      // Prefer DE edition or an active edition first for stable cover order
      const sortedGroup = [...group].sort((a, b) => {
        const aLang = normalizeLanguages(a)[0] || '';
        const bLang = normalizeLanguages(b)[0] || '';
        if (aLang === 'de' && bLang !== 'de') return -1;
        if (bLang === 'de' && aLang !== 'de') return 1;
        return 0;
      });
      const combinedLangs = normalizeLanguages(Array.from(groupLangSet));
      const primary = sortedGroup[0];
      const bestRating = sortedGroup.map((b) => b.rating).filter(Boolean).sort((a, b) => b - a)[0] || null;

      items.push({
        key: sortedGroup.length > 1 ? `stack-${sortedGroup.map((b) => b.id).join('-')}` : primary.id,
        primaryBook: primary,
        editions: sortedGroup,
        languages: combinedLangs,
        bilingual: isBilingual(combinedLangs),
        completed: sortedGroup.every((b) => !!b.completed),
        anyCompleted: sortedGroup.some((b) => !!b.completed),
        rating: bestRating,
        seriesNumber: num,
      });
    } else {
      usedIds.add(book.id);
      items.push({
        key: book.id,
        primaryBook: book,
        editions: [book],
        languages: bookLangs,
        bilingual: isBilingual(bookLangs),
        completed: !!book.completed,
        anyCompleted: !!book.completed,
        rating: book.rating || null,
        seriesNumber: num,
      });
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
  const secondEdition = item.editions.length > 1 ? item.editions[1] : null;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Subtle stacked back card for bilingual / dual-edition books */}
      {item.bilingual && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'translate(5px, -5px)',
            borderRadius: '16px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(245, 176, 65, 0.22) 0%, rgba(94, 151, 246, 0.28) 100%)'
              : 'linear-gradient(135deg, rgba(245, 176, 65, 0.24) 0%, rgba(94, 151, 246, 0.24) 100%)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(138, 180, 248, 0.35)' : 'rgba(26, 115, 232, 0.28)',
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
          width: 245,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: item.bilingual
            ? alpha(theme.palette.primary.main, isDark ? 0.45 : 0.35)
            : (item.completed ? alpha(theme.palette.success.main, 0.4) : 'divider'),
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ background: item.completed ? theme.palette.success.main : theme.palette.primary.main, border: 'none', width: 8, height: 8 }} />
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          {secondEdition && (
            <Box sx={{ position: 'absolute', top: -2, left: 4, opacity: 0.75, pointerEvents: 'none' }}>
              <BookCover coverUrl={secondEdition.coverUrl} title={secondEdition.name} width={36} height={54} borderRadius="7px" />
            </Box>
          )}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <BookCover coverUrl={book.coverUrl} title={book.name} width={36} height={54} borderRadius="7px" />
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.45 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, color: item.completed ? 'text.secondary' : 'text.primary' }}>
            {book.name}
          </Typography>
          {item.languages.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LanguagePill languages={item.languages} compact />
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

// --- Minimal Cover-First Shelf Tile (supports single & stacked bilingual / dual-edition books) ---
const CoverShelfTile = ({ item, onSelect, isDark }) => {
  const book = item.primaryBook;
  const secondEdition = item.editions.length > 1 ? item.editions[1] : null;

  return (
    <Box
      onClick={() => onSelect(item)}
      sx={{
        width: item.bilingual ? 102 : 96,
        flexShrink: 0,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        pt: item.bilingual ? 0.5 : 0,
        pr: item.bilingual ? 0.75 : 0,
        transition: 'transform 0.16s ease',
        '&:hover': { transform: 'translateY(-3px)' },
        '&:active': { transform: 'scale(0.97)' },
      }}
    >
      <Box sx={{ position: 'relative', width: 96, height: 142 }}>
        {/* Stacked second-edition card peeking cleanly behind the front cover */}
        {item.bilingual && (
          <Box
            sx={{
              position: 'absolute',
              top: -4,
              left: 5,
              width: 96,
              height: 142,
              borderRadius: '12px',
              overflow: 'hidden',
              transform: 'rotate(2.2deg)',
              transformOrigin: 'bottom left',
              pointerEvents: 'none',
              zIndex: 0,
              ...(!secondEdition?.coverUrl ? {
                background: isDark
                  ? 'linear-gradient(155deg, rgba(245, 176, 65, 0.34) 0%, rgba(94, 151, 246, 0.42) 100%)'
                  : 'linear-gradient(155deg, rgba(245, 176, 65, 0.42) 0%, rgba(94, 151, 246, 0.38) 100%)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(138, 180, 248, 0.45)' : 'rgba(26, 115, 232, 0.35)',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.12)',
              } : {}),
            }}
          >
            {secondEdition?.coverUrl && (
              <BookCover
                coverUrl={secondEdition.coverUrl}
                title={secondEdition.name}
                width={96}
                height={142}
                borderRadius="12px"
                sx={{ opacity: 0.85 }}
              />
            )}
          </Box>
        )}

        <Box sx={{ position: 'relative', zIndex: 1, width: 96, height: 142 }}>
          <BookCover
            coverUrl={book.coverUrl}
            title={book.name}
            width={96}
            height={142}
            borderRadius="12px"
            sx={{
              opacity: item.completed ? 0.84 : 1,
              ...(item.bilingual ? {
                borderColor: isDark ? 'rgba(138, 180, 248, 0.45)' : 'rgba(26, 115, 232, 0.32)',
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
                bgcolor: isDark ? 'rgba(19, 19, 20, 0.82)' : 'rgba(255, 255, 255, 0.9)',
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

          {/* Subtle completed check badge in top-right corner */}
          {item.completed && (
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
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
            </Box>
          )}

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
  const { books, readingSessions, updateBookReview, updateBookLanguages } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [viewMode, setViewMode] = useState('explorer'); // 'explorer' | '2d'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'uni:<name>' | 'series' | 'standalone'
  const [languageFilter, setLanguageFilter] = useState('all'); // 'all' | 'bilingual' | 'de' | 'en' | ...
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedEditionIds, setSelectedEditionIds] = useState([]);
  const [activeEditionId, setActiveEditionId] = useState(null);
  const [detailRating, setDetailRating] = useState(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  const selectedEditions = useMemo(
    () => selectedEditionIds.map((id) => books.find((b) => b.id === id)).filter(Boolean),
    [books, selectedEditionIds]
  );

  const selectedBook = useMemo(
    () => selectedEditions.find((b) => b.id === activeEditionId) || selectedEditions[0] || null,
    [selectedEditions, activeEditionId]
  );

  const openItemModal = (item) => {
    if (!item) {
      setSelectedEditionIds([]);
      setActiveEditionId(null);
      return;
    }
    const ids = item.editions.map((b) => b.id);
    const primary = item.primaryBook;
    setSelectedEditionIds(ids);
    setActiveEditionId(primary.id);
    setDetailRating(primary.rating || null);
    setDetailNotes(primary.notes || '');
    setReviewSaved(false);
  };

  const switchEditionInModal = (book) => {
    setActiveEditionId(book.id);
    setDetailRating(book.rating || null);
    setDetailNotes(book.notes || '');
    setReviewSaved(false);
  };

  const toggleNode = (key) => {
    setCollapsedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Detect which languages are actually in use across all books
  const availableLanguages = useMemo(() => {
    const langSet = new Set();
    books.forEach((b) => normalizeLanguages(b).forEach((c) => langSet.add(c)));
    return normalizeLanguages(Array.from(langSet));
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

    // Convert raw book arrays into ShelfItems (stacking dual-language editions of the same band)
    // and apply the active languageFilter cleanly
    const matchesLangFilter = (item) => {
      if (languageFilter === 'all') return true;
      if (languageFilter === 'bilingual') return item.bilingual;
      return item.languages.includes(languageFilter);
    };

    const filtered = {
      universes: {},
      standaloneSeries: {},
      standaloneBooks: buildShelfItems(data.standaloneBooks, false).filter(matchesLangFilter),
    };

    Object.entries(data.universes).forEach(([uniName, uniData]) => {
      const seriesMap = {};
      Object.entries(uniData.series).forEach(([serName, list]) => {
        const items = buildShelfItems(list, true).filter(matchesLangFilter);
        if (items.length > 0) seriesMap[serName] = items;
      });
      const soloItems = buildShelfItems(uniData.standaloneBooks, false).filter(matchesLangFilter);
      if (Object.keys(seriesMap).length > 0 || soloItems.length > 0) {
        filtered.universes[uniName] = { series: seriesMap, standaloneBooks: soloItems };
      }
    });

    Object.entries(data.standaloneSeries).forEach(([serName, list]) => {
      const items = buildShelfItems(list, true).filter(matchesLangFilter);
      if (items.length > 0) filtered.standaloneSeries[serName] = items;
    });

    return filtered;
  }, [books, languageFilter]);

  const universeNames = useMemo(() => Object.keys(hierarchy.universes).sort((a, b) => a.localeCompare(b)), [hierarchy]);
  const standaloneSeriesNames = useMemo(() => Object.keys(hierarchy.standaloneSeries).sort((a, b) => a.localeCompare(b)), [hierarchy]);

  // Compute reading stats for the selected book modal (plus combined time if multi-edition)
  const selectedBookStats = useMemo(() => {
    if (!selectedBook) return null;
    const sessions = readingSessions.filter(s => s.bookId === selectedBook.id);
    const totalSec = sessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);
    const maxEnded = Math.max(0, ...sessions.map(s => s.endedOnPage || 0));
    const pagesRead = maxEnded > 0 ? maxEnded : sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
    const total = Number(selectedBook.totalPages) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((pagesRead / total) * 100)) : null;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const timeStr = totalSec > 0 ? (h > 0 ? `${h}h ${m}m` : `${m}m`) : null;

    let combinedTimeStr = null;
    if (selectedEditions.length > 1) {
      const allIds = new Set(selectedEditions.map((b) => b.id));
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
  }, [selectedBook, selectedEditions, readingSessions]);

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

        {/* Compact Icon Switch: Shelf vs 2D-Map */}
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

      {/* Compact Language Filter Row (shown once at least one book has a language) */}
      {availableLanguages.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', py: 0.15 }}>
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
        </Box>
      )}

      {!hasFilteredResults ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Keine Bücher für diesen Sprachfilter
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tippe ein Buch an, um ihm Sprachen (z. B. Deutsch &amp; Englisch) zuzuweisen.
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setLanguageFilter('all')} sx={{ borderRadius: 9999 }}>
            Alle Sprachen anzeigen
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
        {selectedBook && (
          <DialogContent sx={{ p: 2.5 }}>
            {/* Edition switcher when 2+ separate language editions are stacked */}
            {selectedEditions.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.65,
                  p: 0.45,
                  mb: 2,
                  borderRadius: '14px',
                  bgcolor: 'background.surfaceVariant',
                }}
              >
                {selectedEditions.map((ed) => {
                  const active = ed.id === selectedBook.id;
                  const edLangs = normalizeLanguages(ed);
                  const label = edLangs.length > 0
                    ? edLangs.map((c) => {
                        const m = getLanguageMeta(c);
                        return `${m.flag} ${m.label}`;
                      }).join(' / ')
                    : ed.name;
                  return (
                    <Box
                      key={ed.id}
                      onClick={() => switchEditionInModal(ed)}
                      sx={{
                        flex: 1,
                        textAlign: 'center',
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
                      {label}
                    </Box>
                  );
                })}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
                <BookCover
                  coverUrl={selectedBook.coverUrl}
                  title={selectedBook.name}
                  width={76}
                  height={114}
                  borderRadius="12px"
                />
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
                    <Box
                      sx={{
                        px: 1,
                        py: 0.2,
                        borderRadius: 9999,
                        bgcolor: selectedBook.completed
                          ? alpha(theme.palette.success.main, isDark ? 0.18 : 0.12)
                          : alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                        color: selectedBook.completed ? 'success.main' : 'primary.main',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {selectedBook.completed ? 'Gelesen' : 'Aktiv'}
                    </Box>
                    <LanguagePill languages={selectedBook} compact />
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

            {/* Quick 1-tap Language Toggle right inside the Map Detail Modal */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Gelesene Sprache(n)
              </Typography>
              <LanguagePicker
                value={normalizeLanguages(selectedBook)}
                onChange={(nextLangs) => updateBookLanguages(selectedBook.id, nextLangs)}
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
                        Fortschritt
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

                {selectedBookStats.combinedTimeStr && selectedEditions.length > 1 && (
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

            {/* 1-10 Rating & Short Note / Quote */}
            <Box sx={{ mt: 2.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bewertung &amp; Fazit
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
                label="Kurzes Fazit oder Lieblingszitat"
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
                    await updateBookReview(selectedBook.id, detailRating, detailNotes);
                    setReviewSaved(true);
                  }}
                  sx={{ borderRadius: 9999, px: 2.25 }}
                >
                  Speichern
                </Button>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

export default BookUniverseMap;
