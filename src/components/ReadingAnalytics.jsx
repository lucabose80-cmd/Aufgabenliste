import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, parseISO, getHours } from 'date-fns';
import { de } from 'date-fns/locale';
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
  const [trendView, setTrendView] = React.useState('months');
  const [trendMetric, setTrendMetric] = React.useState('speed');

  const {
    totalPages,
    totalSeconds,
    avgSpeedAllTime,
    avgWpmAllTime,
    trendData,
    monthlyTrendData,
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

    // For Trend Chart (Sessions)
    const trend = [];
    
    // For Trend Chart (Months)
    const monthlyBuckets = {};
    
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
      let wpm = null;
      if (book && book.wordsPerPage) {
        wpm = (s.amount * book.wordsPerPage) / (s.timeSpent / 60);
        totalWords += s.amount * book.wordsPerPage;
        secondsForWpm += s.timeSpent;
      }

      // Trend (Sessions)
      trend.push({
        name: `Session ${index + 1}`,
        date: format(new Date(s.date), 'dd.MM.'),
        speed: Math.round(speed),
        wpm: wpm ? Math.round(wpm) : null,
        pages: s.amount
      });

      // Trend (Months)
      const monthKey = format(new Date(s.date), 'yyyy-MM');
      if (!monthlyBuckets[monthKey]) {
        monthlyBuckets[monthKey] = {
          monthName: format(new Date(s.date), 'MMMM yy', { locale: de }),
          totalSpeed: 0, countSpeed: 0,
          totalWpm: 0, countWpm: 0,
          totalPages: 0
        };
      }
      monthlyBuckets[monthKey].totalSpeed += speed;
      monthlyBuckets[monthKey].countSpeed++;
      monthlyBuckets[monthKey].totalPages += s.amount;
      if (wpm) {
        monthlyBuckets[monthKey].totalWpm += wpm;
        monthlyBuckets[monthKey].countWpm++;
      }

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

    const mTrend = Object.values(monthlyBuckets).map(b => ({
      date: b.monthName,
      speed: b.countSpeed > 0 ? Math.round(b.totalSpeed / b.countSpeed) : 0,
      wpm: b.countWpm > 0 ? Math.round(b.totalWpm / b.countWpm) : null,
      pages: b.totalPages
    }));

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
      trendData: trend.slice(-30), // Only show last 30 sessions to avoid clutter
      monthlyTrendData: mTrend,
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
      const dataKey = payload[0].dataKey;
      let unit = 'Seiten/h';
      if (dataKey === 'wpm') unit = 'WPM';
      if (dataKey === 'pages') unit = 'Seiten';
      
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
          <Typography variant="body1" fontWeight="bold" color="primary.main">
            {payload[0].value} {unit}
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Card sx={{ p: {xs: 1.5, sm: 3}, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, height: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.main', display: 'flex' }}>
            <MenuBookIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Gesamt gelesen</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{totalPages} S.</Typography>
          </Box>
        </Card>
        
        <Card sx={{ p: {xs: 1.5, sm: 3}, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, height: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2, color: 'success.main', display: 'flex' }}>
            <TimerIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Gesamtzeit</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatTime(totalSeconds)}</Typography>
          </Box>
        </Card>

        <Card sx={{ p: {xs: 1.5, sm: 3}, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, height: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.main', display: 'flex' }}>
            <SpeedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ø Tempo (S/h)</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{avgSpeedAllTime}</Typography>
          </Box>
        </Card>

        <Card sx={{ p: {xs: 1.5, sm: 3}, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, height: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'info.light', borderRadius: 2, color: 'info.main', display: 'flex' }}>
            <AutoGraphIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ø WPM</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{avgWpmAllTime > 0 ? avgWpmAllTime : '-'}</Typography>
          </Box>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Card sx={{ p: {xs: 1.5, sm: 3}, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>Geschwindigkeit</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Select
                size="small"
                value={trendMetric}
                onChange={(e) => setTrendMetric(e.target.value)}
                sx={{ minWidth: 80, fontSize: '0.75rem', height: 24 }}
              >
                <MenuItem value="speed" sx={{ fontSize: '0.75rem' }}>S / h</MenuItem>
                <MenuItem value="wpm" sx={{ fontSize: '0.75rem' }}>WPM</MenuItem>
              </Select>
              <Select
                size="small"
                value={trendView}
                onChange={(e) => setTrendView(e.target.value)}
                sx={{ minWidth: 80, fontSize: '0.75rem', height: 24 }}
              >
                <MenuItem value="months" sx={{ fontSize: '0.75rem' }}>Monate</MenuItem>
                <MenuItem value="sessions" sx={{ fontSize: '0.75rem' }}>Sitzung</MenuItem>
              </Select>
            </Box>
          </Box>
          <Box sx={{ height: 180, width: '100%', mt: 'auto', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendView === 'months' ? monthlyTrendData : trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey={trendMetric} stroke={theme.palette.primary.main} strokeWidth={2} dot={{ r: 3, fill: theme.palette.primary.main }} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        <Card sx={{ p: {xs: 1.5, sm: 3}, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>Seiten gelesen</Typography>
            </Box>
          </Box>
          <Box sx={{ height: 180, width: '100%', mt: 'auto', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendView === 'months' ? monthlyTrendData : trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pages" stroke={theme.palette.info.main} strokeWidth={2} dot={{ r: 3, fill: theme.palette.info.main }} activeDot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        <Card sx={{ p: {xs: 1.5, sm: 3}, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2, mb: 2 }}>Dauer vs. Tempo</Typography>
          <Box sx={{ height: 180, width: '100%', mt: 'auto', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={9} tick={{fontSize: 9}} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
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
        
        <Card sx={{ p: {xs: 1.5, sm: 3}, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2, mb: 2 }}>Zeit vs. Tempo</Typography>
          <Box sx={{ height: 180, width: '100%', mt: 'auto', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeOfDayData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={9} tick={{fontSize: 9}} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={10} tick={{fontSize: 10}} />
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
      </Box>
      
    </Box>
  );
};

export default ReadingAnalytics;
