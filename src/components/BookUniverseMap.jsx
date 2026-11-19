import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ReactFlow, Handle, Position, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Google One Nodes
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
      <Typography
        variant="subtitle1"
        sx={{
          color: 'primary.main',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <PublicIcon fontSize="small" /> {data.label}
      </Typography>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: theme.palette.primary.main, border: 'none', width: 9, height: 9 }}
      />
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
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: theme.palette.secondary.main, border: 'none', width: 8, height: 8 }}
      />
      <Typography
        variant="subtitle2"
        sx={{
          color: 'secondary.main',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
        }}
      >
        <CollectionsBookmarkIcon sx={{ fontSize: 16 }} /> {data.label}
      </Typography>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: theme.palette.secondary.main, border: 'none', width: 8, height: 8 }}
      />
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
        p: 1.75,
        width: 255,
        borderRadius: '18px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: book.completed ? alpha(theme.palette.success.main, 0.4) : 'divider',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.85,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 12,
          bottom: 12,
          width: 3.5,
          borderRadius: '0 4px 4px 0',
          bgcolor: book.completed ? 'success.main' : 'primary.main',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: book.completed ? theme.palette.success.main : theme.palette.primary.main,
          border: 'none',
          width: 8,
          height: 8,
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, pl: 0.75 }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{
            lineHeight: 1.3,
            textDecoration: book.completed ? 'line-through' : 'none',
            color: book.completed ? 'text.secondary' : 'text.primary',
          }}
        >
          {book.name}
        </Typography>
        {book.completed && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0, mt: 0.15 }} />}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 0.75 }}>
        {book.seriesNumber && (
          <Box
            sx={{
              px: 0.9,
              py: 0.15,
              borderRadius: 9999,
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1),
              color: 'primary.main',
              fontSize: '0.68rem',
              fontWeight: 600,
            }}
          >
            Band {book.seriesNumber}
          </Box>
        )}
        {book.author && (
          <Box
            sx={{
              px: 0.9,
              py: 0.15,
              borderRadius: 9999,
              bgcolor: 'background.surfaceVariant',
              color: 'text.secondary',
              fontSize: '0.68rem',
              fontWeight: 500,
            }}
          >
            {book.author}
          </Box>
        )}
        {book.totalPages && (
          <Box
            sx={{
              px: 0.9,
              py: 0.15,
              borderRadius: 9999,
              bgcolor: 'background.surfaceVariant',
              color: 'text.secondary',
              fontSize: '0.68rem',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {book.totalPages} S.
          </Box>
        )}
      </Box>
    </Box>
  );
};

const nodeTypes = {
  universeNode: UniverseNode,
  seriesNode: SeriesNode,
  bookNode: BookNode,
};

const BookUniverseMap = () => {
  const { books } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { nodes, edges } = useMemo(() => {
    const newNodes = [];
    const newEdges = [];
    let currentY = 0;

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

    const X_UNI = 40;
    const X_SER = 380;
    const X_BOK = 720;
    const Y_SPACING = 115;

    const edgeColorSubtle = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(31,31,31,0.22)';
    const edgeColorPrimary = alpha(theme.palette.primary.main, 0.75);

    Object.entries(data.universes).sort((a, b) => a[0].localeCompare(b[0])).forEach(([uniName, uniData]) => {
      const startY = currentY;
      const uniId = `uni-${uniName}`;

      Object.entries(uniData.series).sort((a, b) => a[0].localeCompare(b[0])).forEach(([serName, serBooks]) => {
        const serId = `ser-${uniName}-${serName}`;
        const serStartY = currentY;

        serBooks.forEach(book => {
          newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
          newEdges.push({
            id: `e-${serId}-book-${book.id}`,
            source: serId,
            target: `book-${book.id}`,
            style: { stroke: edgeColorSubtle, strokeWidth: 1.75 },
          });
          currentY += Y_SPACING;
        });

        const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
        newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
        newEdges.push({
          id: `e-${uniId}-${serId}`,
          source: uniId,
          target: serId,
          animated: true,
          style: { stroke: edgeColorPrimary, strokeWidth: 2 },
        });

        currentY += 45;
      });

      uniData.standaloneBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_SER, y: currentY }, data: { book } });
        newEdges.push({
          id: `e-${uniId}-book-${book.id}`,
          source: uniId,
          target: `book-${book.id}`,
          style: { stroke: edgeColorSubtle, strokeWidth: 1.75 },
        });
        currentY += Y_SPACING;
      });

      const uniMidY = startY + ((currentY - 45 - startY) / 2);
      newNodes.push({ id: uniId, type: 'universeNode', position: { x: X_UNI, y: Math.max(startY, uniMidY) }, data: { label: uniName } });

      currentY += 90;
    });

    Object.entries(data.standaloneSeries).sort((a, b) => a[0].localeCompare(b[0])).forEach(([serName, serBooks]) => {
      const serId = `st-ser-${serName}`;
      const serStartY = currentY;

      serBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
        newEdges.push({
          id: `e-${serId}-book-${book.id}`,
          source: serId,
          target: `book-${book.id}`,
          style: { stroke: edgeColorSubtle, strokeWidth: 1.75 },
        });
        currentY += Y_SPACING;
      });

      const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
      newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });

      currentY += 90;
    });

    data.standaloneBooks.forEach(book => {
      newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
      currentY += Y_SPACING;
    });

    return { nodes: newNodes, edges: newEdges };
  }, [books, isDark, theme.palette.primary.main]);

  return (
    <Card sx={{ p: 0, borderRadius: '24px', overflow: 'hidden', height: '68vh', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
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
              Ziehen zum Verschieben · Zoomen über Steuerung oder Geste
            </Typography>
          </Box>
        </Box>
      </Box>

      {books.length === 0 ? (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Füge zuerst Bücher unter „Bücher“ hinzu, um deine Universum- & Reihen-Map zu sehen.
          </Typography>
        </Box>
      ) : (
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
            '& .react-flow__attribution': {
              opacity: 0.35,
              bgcolor: 'transparent',
            },
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
            <Background
              gap={22}
              size={1.2}
              color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,31,31,0.08)'}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </Box>
      )}
    </Card>
  );
};

export default BookUniverseMap;
