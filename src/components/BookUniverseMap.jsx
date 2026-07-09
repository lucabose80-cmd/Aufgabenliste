import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, useTheme, Chip } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PublicIcon from '@mui/icons-material/Public';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';

const BookUniverseMap = () => {
  const { books } = useTaskContext();
  const theme = useTheme();

  const groupedData = useMemo(() => {
    const data = {
      universes: {},
      standaloneSeries: {},
      standaloneBooks: []
    };

    // Sort books first (so they appear in order within their series)
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

  const renderBook = (book) => (
    <Card 
      key={book.id} 
      sx={{ 
        p: 2, 
        minWidth: 200, 
        flex: '1 1 auto', 
        bgcolor: book.completed ? 'action.hover' : 'background.paper',
        borderLeft: 4,
        borderColor: book.completed ? 'success.main' : 'primary.main',
        boxShadow: theme.shadows[2],
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ textDecoration: book.completed ? 'line-through' : 'none', color: book.completed ? 'text.secondary' : 'text.primary' }}>
          {book.name}
        </Typography>
        {book.completed && <Chip label="Gelesen" color="success" size="small" />}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {book.author && <Chip label={book.author} size="small" variant="outlined" />}
        {book.seriesNumber && <Chip label={`Band ${book.seriesNumber}`} size="small" color="primary" variant="outlined" />}
        {book.totalPages && <Chip label={`${book.totalPages} S.`} size="small" variant="outlined" />}
      </Box>
    </Card>
  );

  const renderSeries = (seriesName, seriesBooks) => (
    <Box 
      key={seriesName} 
      sx={{ 
        bgcolor: 'rgba(255,255,255,0.4)', 
        p: 3, 
        borderRadius: 3, 
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        boxShadow: theme.shadows[1]
      }}
    >
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'secondary.main', fontWeight: 'bold' }}>
        <CollectionsBookmarkIcon /> Reihe: {seriesName}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {seriesBooks.map(renderBook)}
      </Box>
    </Box>
  );

  return (
    <Card sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.default' }}>
      <Typography variant="h5" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <AutoStoriesIcon color="primary" /> Buch-Universum
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Render Universes */}
        {Object.entries(groupedData.universes).sort((a,b) => a[0].localeCompare(b[0])).map(([uniName, uniData]) => (
          <Box 
            key={uniName} 
            sx={{ 
              bgcolor: 'primary.light', 
              p: 3, 
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              boxShadow: theme.shadows[3]
            }}
          >
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.contrastText', fontWeight: 'bold' }}>
              <PublicIcon fontSize="large" /> {uniName}
            </Typography>
            
            {/* Series inside Universe */}
            {Object.entries(uniData.series).sort((a,b) => a[0].localeCompare(b[0])).map(([serName, serBooks]) => 
              renderSeries(serName, serBooks)
            )}
            
            {/* Standalone books inside Universe */}
            {uniData.standaloneBooks.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {uniData.standaloneBooks.map(renderBook)}
              </Box>
            )}
          </Box>
        ))}

        {/* Render Standalone Series (No Universe) */}
        {Object.keys(groupedData.standaloneSeries).length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5" color="text.secondary" sx={{ mt: 2, fontWeight: 'bold' }}>Eigenständige Reihen</Typography>
            {Object.entries(groupedData.standaloneSeries).sort((a,b) => a[0].localeCompare(b[0])).map(([serName, serBooks]) => 
              renderSeries(serName, serBooks)
            )}
          </Box>
        )}

        {/* Render Standalone Books */}
        {groupedData.standaloneBooks.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5" color="text.secondary" sx={{ mt: 2, fontWeight: 'bold' }}>Einzelbücher</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {groupedData.standaloneBooks.map(renderBook)}
            </Box>
          </Box>
        )}

        {books.length === 0 && (
          <Typography color="text.secondary">Noch keine Bücher angelegt. Füge Bücher hinzu, um sie hier zu sehen!</Typography>
        )}
      </Box>
    </Card>
  );
};

export default BookUniverseMap;
