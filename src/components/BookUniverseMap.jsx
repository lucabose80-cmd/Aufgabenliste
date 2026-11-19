import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Collapse, LinearProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MapIcon from '@mui/icons-material/Map';
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
        p: 1.5,
        width: 260,
        borderRadius: '18px',
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
      <BookCover coverUrl={book.coverUrl} title={book.name} width={38} height={56} borderRadius="7px" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.25, textDecoration: book.completed ? 'line-through' : 'none', color: book.completed ? 'text.secondary' : 'text.primary' }}>
          {book.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {[book.seriesNumber ? `Band ${book.seriesNumber}` : null, book.author, book.totalPages ? `${book.totalPages} S.` : null].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      {book.completed && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />}
    </Box>
  );
};

const nodeTypes = {
  universeNode: UniverseNode,
  seriesNode: SeriesNode,
  bookNode: BookNode,
};

// --- Connected Book Card inside Tree Explorer ---
const ExplorerBookCard = ({ book, isDark, theme }) => (
  <Box
    sx={{
      p: 1.25,
      minWidth: 190,
      maxWidth: 230,
      flexShrink: 0,
      borderRadius: '16px',
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: book.completed ? alpha(theme.palette.success.main, 0.4) : 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      position: 'relative',
      transition: 'border-color 0.2s ease',
    }}
  >
    <BookCover coverUrl={book.coverUrl} title={book.name} width={40} height={58} borderRadius="8px" />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
        {book.seriesNumber && (
          <Box
            sx={{
              px: 0.75,
              py: 0.1,
              borderRadius: 9999,
              bgcolor: book.completed
                ? alpha(theme.palette.success.main, isDark ? 0.18 : 0.12)
                : alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
              color: book.completed ? 'success.main' : 'primary.main',
              fontSize: '0.64rem',
              fontWeight: 700,
            }}
          >
            Bd. {book.seriesNumber}
          </Box>
        )}
        {book.completed && <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />}
      </Box>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{
          fontSize: '0.82rem',
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          color: book.completed ? 'text.secondary' : 'text.primary',
        }}
      >
        {book.name}
      </Typography>
      {(book.author || book.totalPages) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 0.25,
            fontSize: '0.68rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {[book.author, book.totalPages ? `${book.totalPages} S.` : null].filter(Boolean).join(' · ')}
        </Typography>
      )}
    </Box>
  </Box>
);

const BookUniverseMap = () => {
  const { books } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [viewMode, setViewMode] = useState('explorer'); // 'explorer' | '2d'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'uni:<name>' | 'series' | 'standalone'
  const [collapsedNodes, setCollapsedNodes] = useState({});

  const toggleNode = (key) => {
    setCollapsedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Structured hierarchy used by BOTH the interactive Explorer and the 2D Map
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

  // 2D ReactFlow layout (only computed when needed)
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

  const renderSeriesBranch = (serName, serBooks, branchKey) => {
    const isCollapsed = !!collapsedNodes[branchKey];
    const doneCount = serBooks.filter(b => b.completed).length;
    const pct = serBooks.length > 0 ? Math.round((doneCount / serBooks.length) * 100) : 0;

    return (
      <Box
        key={branchKey}
        sx={{
          position: 'relative',
          pl: { xs: 2, sm: 2.5 },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 22,
            width: { xs: 14, sm: 18 },
            height: 2,
            bgcolor: alpha(theme.palette.secondary.main, 0.45),
            borderRadius: 2,
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: '18px',
            bgcolor: 'background.surfaceVariant',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            onClick={() => toggleNode(branchKey)}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, cursor: 'pointer', userSelect: 'none' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <CollectionsBookmarkIcon sx={{ fontSize: 18, color: 'secondary.main', flexShrink: 0 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {serName}
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.15,
                  borderRadius: 9999,
                  bgcolor: doneCount === serBooks.length
                    ? alpha(theme.palette.success.main, isDark ? 0.18 : 0.12)
                    : alpha(theme.palette.secondary.main, isDark ? 0.18 : 0.12),
                  color: doneCount === serBooks.length ? 'success.main' : 'secondary.main',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {doneCount}/{serBooks.length}
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

          <LinearProgress
            variant="determinate"
            value={pct}
            color={doneCount === serBooks.length ? 'success' : 'secondary'}
            sx={{ height: 4, borderRadius: 9999, mt: 1, mb: isCollapsed ? 0 : 1.5 }}
          />

          <Collapse in={!isCollapsed} timeout={200}>
            {/* Connected horizontal Band-1 -> Band-2 -> Band-3 timeline */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflowX: 'auto',
                pb: 0.5,
                pt: 0.25,
              }}
            >
              {serBooks.map((book, idx) => (
                <React.Fragment key={book.id}>
                  <ExplorerBookCard book={book} isDark={isDark} theme={theme} />
                  {idx < serBooks.length - 1 && (
                    <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Collapse>
        </Box>
      </Box>
    );
  };

  if (books.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Noch keine Bücher im Universum
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Füge zuerst Bücher unter „Bücher“ hinzu, um deine Universen & Reihen zu erkunden.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header & View Mode Toggle */}
      <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
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
              <AutoStoriesIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                Universum & Reihen
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {universeNames.length} Universen · {standaloneSeriesNames.length} Einzelreihen · {books.length} Bücher
              </Typography>
            </Box>
          </Box>

          {/* Explorer vs 2D-Map Toggle */}
          <Box
            sx={{
              display: 'inline-flex',
              p: 0.4,
              borderRadius: 9999,
              bgcolor: 'background.surfaceVariant',
              gap: 0.35,
            }}
          >
            {[
              { id: 'explorer', label: 'Übersicht', icon: AccountTreeIcon },
              { id: '2d', label: '2D-Map', icon: MapIcon },
            ].map(({ id, label, icon: IconComp }) => {
              const active = viewMode === id;
              return (
                <Box
                  key={id}
                  onClick={() => setViewMode(id)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.4,
                    py: 0.5,
                    borderRadius: 9999,
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '0.76rem',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? 'background.paper' : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    boxShadow: active ? (isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <IconComp sx={{ fontSize: 15 }} />
                  {label}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Quick Universe / Section Filter Pills (Explorer mode) */}
        {viewMode === 'explorer' && (
          <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25 }}>
            {[
              { id: 'all', label: 'Alle' },
              ...universeNames.map(u => ({ id: `uni:${u}`, label: u })),
              ...(standaloneSeriesNames.length > 0 ? [{ id: 'series', label: 'Einzelreihen' }] : []),
              ...(hierarchy.standaloneBooks.length > 0 ? [{ id: 'standalone', label: 'Einzelbücher' }] : []),
            ].map(pill => {
              const active = selectedFilter === pill.id;
              return (
                <Box
                  key={pill.id}
                  onClick={() => setSelectedFilter(pill.id)}
                  sx={{
                    px: 1.5,
                    py: 0.55,
                    borderRadius: 9999,
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexShrink: 0,
                    fontSize: '0.78rem',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active
                      ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.12)
                      : 'background.surfaceVariant',
                    color: active ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </Box>
              );
            })}
          </Box>
        )}
      </Card>

      {viewMode === 'explorer' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
              const pct = allUniBooks.length > 0 ? Math.round((doneCount / allUniBooks.length) * 100) : 0;
              const uniKey = `uni-${uniName}`;
              const isCollapsed = !!collapsedNodes[uniKey];

              return (
                <Card
                  key={uniKey}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: '24px',
                    borderColor: alpha(theme.palette.primary.main, isDark ? 0.3 : 0.22),
                  }}
                >
                  {/* Universe Header Node */}
                  <Box
                    onClick={() => toggleNode(uniKey)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '12px',
                          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12),
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <PublicIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                          {uniName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {uniSeriesEntries.length} {uniSeriesEntries.length === 1 ? 'Reihe' : 'Reihen'} · {doneCount}/{allUniBooks.length} gelesen ({pct}%)
                        </Typography>
                      </Box>
                    </Box>
                    <ExpandMoreIcon
                      sx={{
                        color: 'text.secondary',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </Box>

                  <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 9999, mt: 1.5 }} />

                  {/* Connected Tree Branches */}
                  <Collapse in={!isCollapsed} timeout={220}>
                    <Box
                      sx={{
                        mt: 2,
                        ml: { xs: 1.5, sm: 2.25 },
                        borderLeft: '2px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.75,
                        py: 0.5,
                      }}
                    >
                      {uniSeriesEntries.map(([serName, serBooks]) =>
                        renderSeriesBranch(serName, serBooks, `uni-${uniName}-ser-${serName}`)
                      )}

                      {uniData.standaloneBooks.length > 0 && (
                        <Box
                          sx={{
                            position: 'relative',
                            pl: { xs: 2, sm: 2.5 },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 28,
                              width: { xs: 14, sm: 18 },
                              height: 2,
                              bgcolor: alpha(theme.palette.primary.main, 0.35),
                            },
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Einzelwerke im Universum
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5 }}>
                            {uniData.standaloneBooks.map(book => (
                              <ExplorerBookCard key={book.id} book={book} isDark={isDark} theme={theme} />
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
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CollectionsBookmarkIcon fontSize="small" color="secondary" />
                Einzelreihen
              </Typography>
              <Box
                sx={{
                  ml: 1,
                  borderLeft: '2px solid',
                  borderColor: alpha(theme.palette.secondary.main, 0.35),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.75,
                }}
              >
                {standaloneSeriesNames.map(serName =>
                  renderSeriesBranch(serName, hierarchy.standaloneSeries[serName], `st-ser-${serName}`)
                )}
              </Box>
            </Card>
          )}

          {/* Standalone Books */}
          {(selectedFilter === 'all' || selectedFilter === 'standalone') && hierarchy.standaloneBooks.length > 0 && (
            <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Einzelbücher ({hierarchy.standaloneBooks.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                {hierarchy.standaloneBooks.map(book => (
                  <ExplorerBookCard key={book.id} book={book} isDark={isDark} theme={theme} />
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
    </Box>
  );
};

export default BookUniverseMap;
