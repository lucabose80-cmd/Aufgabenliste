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
  const { book } = data;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        p: 1.25,
        width: 230,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: book.completed ? alpha(theme.palette.success.main, 0.4) : 'divider',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: book.completed ? theme.palette.success.main : theme.palette.primary.main, border: 'none', width: 8, height: 8 }} />
      <BookCover coverUrl={book.coverUrl} title={book.name} width={36} height={54} borderRadius="7px" />
      <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, minWidth: 0, lineHeight: 1.25, color: book.completed ? 'text.secondary' : 'text.primary' }}>
        {book.name}
      </Typography>
      {book.completed && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />}
    </Box>
  );
};

const nodeTypes = {
  universeNode: UniverseNode,
  seriesNode: SeriesNode,
  bookNode: BookNode,
};

// --- Minimal Cover-First Shelf Tile (Cover + Name only; tap for details) ---
const CoverShelfTile = ({ book, onSelect, isDark }) => (
  <Box
    onClick={() => onSelect(book)}
    sx={{
      width: 96,
      flexShrink: 0,
      cursor: 'pointer',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.75,
      transition: 'transform 0.16s ease',
      '&:hover': { transform: 'translateY(-3px)' },
      '&:active': { transform: 'scale(0.97)' },
    }}
  >
    <Box sx={{ position: 'relative', width: 96, height: 142 }}>
      <BookCover
        coverUrl={book.coverUrl}
        title={book.name}
        width={96}
        height={142}
        borderRadius="12px"
        sx={{
          opacity: book.completed ? 0.82 : 1,
        }}
      />

      {/* Subtle Band badge in top-left corner */}
      {book.seriesNumber && (
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
          #{book.seriesNumber}
        </Box>
      )}

      {/* Subtle completed check badge in top-right corner */}
      {book.completed && (
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
    </Box>

    <Typography
      variant="caption"
      fontWeight={600}
      sx={{
        fontSize: '0.76rem',
        lineHeight: 1.25,
        color: book.completed ? 'text.secondary' : 'text.primary',
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

const BookUniverseMap = () => {
  const { books, readingSessions, updateBookReview } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [viewMode, setViewMode] = useState('explorer'); // 'explorer' | '2d'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'uni:<name>' | 'series' | 'standalone'
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [detailRating, setDetailRating] = useState(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  const selectedBook = useMemo(
    () => books.find(b => b.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const setSelectedBook = (book) => {
    if (book) {
      setSelectedBookId(book.id);
      setDetailRating(book.rating || null);
      setDetailNotes(book.notes || '');
      setReviewSaved(false);
    } else {
      setSelectedBookId(null);
    }
  };

  const toggleNode = (key) => {
    setCollapsedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

    return data;
  }, [books]);

  const universeNames = useMemo(() => Object.keys(hierarchy.universes).sort((a, b) => a.localeCompare(b)), [hierarchy]);
  const standaloneSeriesNames = useMemo(() => Object.keys(hierarchy.standaloneSeries).sort((a, b) => a.localeCompare(b)), [hierarchy]);

  // Compute reading stats for the selected book modal
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
    return { pagesRead, total, pct, timeStr, sessionsCount: sessions.length };
  }, [selectedBook, readingSessions]);

  // 2D ReactFlow layout (only computed when 2D-Map is active)
  const { nodes, edges } = useMemo(() => {
    if (viewMode !== '2d') return { nodes: [], edges: [] };
    const newNodes = [];
    const newEdges = [];
    let currentY = 0;

    const X_UNI = 40;
    const X_SER = 380;
    const X_BOK = 720;
    const Y_SPACING = 110;

    const edgeColorSubtle = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(31,31,31,0.22)';
    const edgeColorPrimary = alpha(theme.palette.primary.main, 0.75);

    universeNames.forEach(uniName => {
      const uniData = hierarchy.universes[uniName];
      const startY = currentY;
      const uniId = `uni-${uniName}`;

      Object.entries(uniData.series).sort((a, b) => a[0].localeCompare(b[0])).forEach(([serName, serBooks]) => {
        const serId = `ser-${uniName}-${serName}`;
        const serStartY = currentY;
        serBooks.forEach(book => {
          newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
          newEdges.push({ id: `e-${serId}-book-${book.id}`, source: serId, target: `book-${book.id}`, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
          currentY += Y_SPACING;
        });
        const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
        newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
        newEdges.push({ id: `e-${uniId}-${serId}`, source: uniId, target: serId, animated: true, style: { stroke: edgeColorPrimary, strokeWidth: 2 } });
        currentY += 45;
      });

      uniData.standaloneBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_SER, y: currentY }, data: { book } });
        newEdges.push({ id: `e-${uniId}-book-${book.id}`, source: uniId, target: `book-${book.id}`, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
        currentY += Y_SPACING;
      });

      const uniMidY = startY + ((currentY - 45 - startY) / 2);
      newNodes.push({ id: uniId, type: 'universeNode', position: { x: X_UNI, y: Math.max(startY, uniMidY) }, data: { label: uniName } });
      currentY += 90;
    });

    standaloneSeriesNames.forEach(serName => {
      const serBooks = hierarchy.standaloneSeries[serName];
      const serId = `st-ser-${serName}`;
      const serStartY = currentY;
      serBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
        newEdges.push({ id: `e-${serId}-book-${book.id}`, source: serId, target: `book-${book.id}`, style: { stroke: edgeColorSubtle, strokeWidth: 1.75 } });
        currentY += Y_SPACING;
      });
      const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
      newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
      currentY += 90;
    });

    hierarchy.standaloneBooks.forEach(book => {
      newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
      currentY += Y_SPACING;
    });

    return { nodes: newNodes, edges: newEdges };
  }, [viewMode, hierarchy, universeNames, standaloneSeriesNames, isDark, theme.palette.primary.main]);

  const renderSeriesShelf = (serName, serBooks, key) => {
    const doneCount = serBooks.filter(b => b.completed).length;
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
            {doneCount}/{serBooks.length}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {serBooks.map(book => (
            <CoverShelfTile key={book.id} book={book} onSelect={setSelectedBook} isDark={isDark} />
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

      {viewMode === 'explorer' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Universes */}
          {universeNames
            .filter(u => selectedFilter === 'all' || selectedFilter === `uni:${u}`)
            .map(uniName => {
              const uniData = hierarchy.universes[uniName];
              const uniSeriesEntries = Object.entries(uniData.series).sort((a, b) => a[0].localeCompare(b[0]));
              const allUniBooks = [
                ...uniSeriesEntries.flatMap(([, list]) => list),
                ...uniData.standaloneBooks,
              ];
              const doneCount = allUniBooks.filter(b => b.completed).length;
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
                        {doneCount}/{allUniBooks.length}
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
                      {uniSeriesEntries.map(([serName, serBooks]) =>
                        renderSeriesShelf(serName, serBooks, `uni-${uniName}-ser-${serName}`)
                      )}

                      {uniData.standaloneBooks.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Einzelwerke
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
                            {uniData.standaloneBooks.map(book => (
                              <CoverShelfTile key={book.id} book={book} onSelect={setSelectedBook} isDark={isDark} />
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {hierarchy.standaloneBooks.map(book => (
                  <CoverShelfTile key={book.id} book={book} onSelect={setSelectedBook} isDark={isDark} />
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
        onClose={() => setSelectedBook(null)}
        maxWidth="xs"
        fullWidth
      >
        {selectedBook && (
          <DialogContent sx={{ p: 2.5 }}>
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
              <IconButton size="small" onClick={() => setSelectedBook(null)} sx={{ color: 'text.secondary', mt: -0.5, mr: -0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {selectedBookStats && (selectedBookStats.total > 0 || selectedBookStats.timeStr) && (
              <Box sx={{ mt: 2.25, p: 1.75, borderRadius: '16px', bgcolor: 'background.surfaceVariant', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
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
