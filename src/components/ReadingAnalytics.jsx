import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, parseISO, getHours } from 'date-fns';
import { 
  Box, Card, Typography, Grid, useTheme, Tooltip as MuiTooltip,
  Select, MenuItem
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

const ReadingAnalytics = () => {
  const { readingSessions, books } = useTaskContext();
  const theme = useTheme();

  const [filterType, setFilterType] = React.useState('all'); // 'all', 'book', 'author'
  const [filterValue, setFilterValue] = React.useState('');

  const {
    totalPages,
    totalSeconds,
    avgSpeedAllTime,
    avgWpmAllTime,
    trendData,
    durationData,
    timeOfDayData
  } = useMemo(() => {
    let pages = 0;
    let seconds = 0;
    let totalWords = 0;
    let secondsForWpm = 0;

    let filteredSessions = readingSessions;
    if (filterType === 'book' && filterValue) {
      filteredSessions = readingSessions.filter(s => s.bookId === filterValue);
    } else if (filterType === 'author' && filterValue) {
      const authorBooks = books.filter(b => b.author === filterValue).map(b => b.id);
      filteredSessions = readingSessions.filter(s => s.bookId && authorBooks.includes(s.bookId));
    }

    const validSessions = filteredSessions.filter(s => s.timeSpent > 0 && s.amount > 0)
      .sort((a, b) => {
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) return dateDiff;
        if (a.createdAt && b.createdAt) return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
      });

    // For Trend Chart
    const trend = [];
    
    // For Duration Chart
    const durationBuckets = {
      '< 15 Min': { totalSpeed: 0, count: 0 },
      '15-30 Min': { totalSpeed: 0, count: 0 },
      '30-60 Min': { totalSpeed: 0, count: 0 },
      '> 60 Min': { totalSpeed: 0, count: 0 }
    };

    // For Time of Day Chart
    const timeBuckets = {
      'Morgens (6-12)': { totalSpeed: 0, count: 0 },
      'Nachmittags (12-18)': { totalSpeed: 0, count: 0 },
      'Abends (18-24)': { totalSpeed: 0, count: 0 },
      'Nachts (0-6)': { totalSpeed: 0, count: 0 }
    };

    validSessions.forEach((s, index) => {
      pages += s.amount;
      seconds += s.timeSpent;

      const speed = (s.amount / (s.timeSpent / 3600)); // pages per hour

      const book = books.find(b => b.id === s.bookId);
      if (book && book.wordsPerPage) {
        totalWords += s.amount * book.wordsPerPage;
        secondsForWpm += s.timeSpent;
      }

      // Trend
      trend.push({
        name: `Session ${index + 1}`,
        date: format(new Date(s.date), 'dd.MM.'),
        speed: Math.round(speed)
      });

      // Duration
      const minutes = s.timeSpent / 60;
      if (minutes < 15) {
        durationBuckets['< 15 Min'].totalSpeed += speed;
        durationBuckets['< 15 Min'].count++;
      } else if (minutes < 30) {
        durationBuckets['15-30 Min'].totalSpeed += speed;
        durationBuckets['15-30 Min'].count++;
      } else if (minutes < 60) {
        durationBuckets['30-60 Min'].totalSpeed += speed;
        durationBuckets['30-60 Min'].count++;
      } else {
        durationBuckets['> 60 Min'].totalSpeed += speed;
        durationBuckets['> 60 Min'].count++;
      }

      // Time of Day (Only if createdAt exists)
      if (s.createdAt) {
        const hour = getHours(parseISO(s.createdAt));
        if (hour >= 6 && hour < 12) {
          timeBuckets['Morgens (6-12)'].totalSpeed += speed;
          timeBuckets['Morgens (6-12)'].count++;
        } else if (hour >= 12 && hour < 18) {
          timeBuckets['Nachmittags (12-18)'].totalSpeed += speed;
          timeBuckets['Nachmittags (12-18)'].count++;
        } else if (hour >= 18 && hour <= 23) {
          timeBuckets['Abends (18-24)'].totalSpeed += speed;
          timeBuckets['Abends (18-24)'].count++;
        } else {
          timeBuckets['Nachts (0-6)'].totalSpeed += speed;
          timeBuckets['Nachts (0-6)'].count++;
        }
      }
    });

    const dData = Object.keys(durationBuckets).map(key => ({
      name: key,
      speed: durationBuckets[key].count > 0 ? Math.round(durationBuckets[key].totalSpeed / durationBuckets[key].count) : 0
    }));

    const tData = Object.keys(timeBuckets).map(key => ({
      name: key,
      speed: timeBuckets[key].count > 0 ? Math.round(timeBuckets[key].totalSpeed / timeBuckets[key].count) : 0
    }));

    return {
      totalPages: pages,
      totalSeconds: seconds,
      avgSpeedAllTime: seconds > 0 ? Math.round(pages / (seconds / 3600)) : 0,
      avgWpmAllTime: secondsForWpm > 0 ? Math.round(totalWords / (secondsForWpm / 60)) : 0,
      trendData: trend,
      durationData: dData,
      timeOfDayData: tData
    };
  }, [readingSessions, filterType, filterValue, books]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (readingSessions.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Noch keine Lese-Einträge vorhanden.</Typography>
      </Box>
    );
  }

  const uniqueAuthors = Array.from(new Set(books.map(b => b.author).filter(Boolean)));

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    setFilterValue('');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
          <Typography variant="body1" fontWeight="bold" color="primary.main">
            {payload[0].value} Seiten/h
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Card sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">Filter:</Typography>
        <Select value={filterType} onChange={handleFilterTypeChange} size="small" sx={{ minWidth: 120 }}>
          <MenuItem value="all">Alle Einträge</MenuItem>
          <MenuItem value="book">Nach Buch</MenuItem>
          <MenuItem value="author">Nach Autor</MenuItem>
        </Select>

        {filterType === 'book' && (
          <Select 
            value={filterValue} 
            onChange={(e) => setFilterValue(e.target.value)} 
            size="small" 
            displayEmpty
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="" disabled>Buch wählen...</MenuItem>
            {books.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        )}

        {filterType === 'author' && (
          <Select 
            value={filterValue} 
            onChange={(e) => setFilterValue(e.target.value)} 
            size="small" 
            displayEmpty
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="" disabled>Autor wählen...</MenuItem>
            {uniqueAuthors.map(author => <MenuItem key={author} value={author}>{author}</MenuItem>)}
          </Select>
        )}
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.main', display: 'flex' }}>
              <MenuBookIcon />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Gesamt gelesen</Typography>
              <Typography variant="h5" fontWeight="bold">{totalPages} Seiten</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, color: 'success.main', display: 'flex' }}>
              <TimerIcon />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Gesamtzeit</Typography>
              <Typography variant="h5" fontWeight="bold">{formatTime(totalSeconds)}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.main', display: 'flex' }}>
              <SpeedIcon />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Ø Geschwindigkeit</Typography>
              <Typography variant="h5" fontWeight="bold">{avgSpeedAllTime} S/h</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 2, color: 'info.main', display: 'flex' }}>
              <AutoGraphIcon />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Ø Wörter / Min.</Typography>
              <Typography variant="h5" fontWeight="bold">{avgWpmAllTime > 0 ? avgWpmAllTime : '-'} WPM</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Trend Chart */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Geschwindigkeits-Trend</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Seiten pro Stunde im zeitlichen Verlauf
        </Typography>
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={12} />
              <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="speed" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 4, fill: theme.palette.primary.main }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Bar Charts Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Sitzungsdauer vs. Geschwindigkeit</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Liest du schneller, wenn du am Stück liest?
            </Typography>
            <Box sx={{ height: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={11} />
                  <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="speed" radius={[4, 4, 0, 0]}>
                    {durationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={theme.palette.secondary.main} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Tageszeit vs. Geschwindigkeit</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Zu welcher Uhrzeit bist du am konzentriertesten? (Neuere Einträge)
            </Typography>
            <Box sx={{ height: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeOfDayData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={11} />
                  <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="speed" radius={[4, 4, 0, 0]}>
                    {timeOfDayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={theme.palette.success.main} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>
      
    </Box>
  );
};

export default ReadingAnalytics;
