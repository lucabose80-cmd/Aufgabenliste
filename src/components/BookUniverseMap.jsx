import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, useTheme, Chip } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { ReactFlow, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Nodes
const UniverseNode = ({ data }) => {
  return (
    <Box sx={{ p: 2, minWidth: 200, borderRadius: 3, border: '2px solid', borderColor: 'primary.main', bgcolor: 'primary.light', boxShadow: 3, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ color: 'primary.contrastText', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <PublicIcon /> {data.label}
      </Typography>
      <Handle type="source" position={Position.Right} style={{ background: '#1976d2' }} />
    </Box>
  );
};

const SeriesNode = ({ data }) => {
  return (
    <Box sx={{ p: 2, minWidth: 200, borderRadius: 3, border: '2px solid', borderColor: 'secondary.main', bgcolor: 'background.paper', boxShadow: 2, textAlign: 'center' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#9c27b0' }} />
      <Typography variant="subtitle1" sx={{ color: 'secondary.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <CollectionsBookmarkIcon fontSize="small" /> {data.label}
      </Typography>
      <Handle type="source" position={Position.Right} style={{ background: '#9c27b0' }} />
    </Box>
  );
};

const BookNode = ({ data }) => {
  const { book } = data;
  return (
    <Card sx={{ p: 2, width: 250, bgcolor: book.completed ? 'action.hover' : 'background.paper', borderLeft: 4, borderColor: book.completed ? 'success.main' : 'primary.main', boxShadow: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Handle type="target" position={Position.Left} style={{ background: book.completed ? '#2e7d32' : '#1976d2' }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ textDecoration: book.completed ? 'line-through' : 'none', color: book.completed ? 'text.secondary' : 'text.primary' }}>
          {book.name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {book.completed && <Chip label="Gelesen" color="success" size="small" />}
        {book.author && <Chip label={book.author} size="small" variant="outlined" />}
        {book.seriesNumber && <Chip label={`Band ${book.seriesNumber}`} size="small" color="primary" variant="outlined" />}
        {book.totalPages && <Chip label={`${book.totalPages} S.`} size="small" variant="outlined" />}
      </Box>
    </Card>
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

  const { nodes, edges } = useMemo(() => {
    let newNodes = [];
    let newEdges = [];
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

    // Populate data structure
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

    const X_UNI = 50;
    const X_SER = 400;
    const X_BOK = 750;
    const Y_SPACING = 120;

    // Layout Universes
    Object.entries(data.universes).sort((a,b) => a[0].localeCompare(b[0])).forEach(([uniName, uniData]) => {
      const startY = currentY;
      const uniId = `uni-${uniName}`;

      // Series inside Universe
      Object.entries(uniData.series).sort((a,b) => a[0].localeCompare(b[0])).forEach(([serName, serBooks]) => {
        const serId = `ser-${uniName}-${serName}`;
        const serStartY = currentY;

        serBooks.forEach(book => {
          newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
          newEdges.push({ id: `e-${serId}-book-${book.id}`, source: serId, target: `book-${book.id}`, animated: true });
          currentY += Y_SPACING;
        });

        // Center series node vertically relative to its books
        const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
        newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });
        newEdges.push({ id: `e-${uniId}-${serId}`, source: uniId, target: serId, animated: true, style: { stroke: '#1976d2', strokeWidth: 2 } });
        
        // Add extra spacing between series
        currentY += 50; 
      });

      // Standalone books inside Universe
      uniData.standaloneBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_SER, y: currentY }, data: { book } });
        newEdges.push({ id: `e-${uniId}-book-${book.id}`, source: uniId, target: `book-${book.id}`, animated: true });
        currentY += Y_SPACING;
      });

      const uniMidY = startY + ((currentY - 50 - startY) / 2);
      newNodes.push({ id: uniId, type: 'universeNode', position: { x: X_UNI, y: Math.max(startY, uniMidY) }, data: { label: uniName } });

      currentY += 100; // Extra space after universe
    });

    // Layout Standalone Series
    Object.entries(data.standaloneSeries).sort((a,b) => a[0].localeCompare(b[0])).forEach(([serName, serBooks]) => {
      const serId = `st-ser-${serName}`;
      const serStartY = currentY;

      serBooks.forEach(book => {
        newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
        newEdges.push({ id: `e-${serId}-book-${book.id}`, source: serId, target: `book-${book.id}`, animated: true });
        currentY += Y_SPACING;
      });

      const serMidY = serStartY + ((currentY - Y_SPACING - serStartY) / 2);
      newNodes.push({ id: serId, type: 'seriesNode', position: { x: X_SER, y: Math.max(serStartY, serMidY) }, data: { label: serName } });

      currentY += 100;
    });

    // Layout Standalone Books
    data.standaloneBooks.forEach(book => {
      newNodes.push({ id: `book-${book.id}`, type: 'bookNode', position: { x: X_BOK, y: currentY }, data: { book } });
      currentY += Y_SPACING;
    });

    return { nodes: newNodes, edges: newEdges };
  }, [books]);

  return (
    <Card sx={{ p: 0, bgcolor: 'background.default', height: '70vh', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <AutoStoriesIcon color="primary" /> Buch-Map
        </Typography>
        <Typography variant="body2" color="text.secondary">Tippe/Klicke und ziehe, um dich zu bewegen. Scrolle zum Zoomen.</Typography>
      </Box>

      <Box sx={{ 
        flexGrow: 1, 
        width: '100%', 
        position: 'relative',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, rgba(25,118,210,0.1) 0%, rgba(156,39,176,0.1) 100%)' 
          : 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(156,39,176,0.05) 100%)'
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        />
      </Box>
    </Card>
  );
};

export default BookUniverseMap;
