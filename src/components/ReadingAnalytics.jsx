import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, parseISO, getHours } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Box, Card, Typography, Select, MenuItem, Dialog, DialogContent, DialogTitle, IconButton
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';

const ReadingAnalytics = () => {
  const { readingSessions, books } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [filterType, setFilterType] = useState('all'); // 'all', 'book', 'author'
  const [filterValue, setFilterValue] = useState('');
  const [trendView, setTrendView] = useState('months');
  const [trendMetric, setTrendMetric] = useState('speed');
  const [expandedChart, setExpandedChart] = useState(null); // null | 'speed' | 'pages' | 'duration' | 'time'

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

    const validSessions = filteredSessions
      .filter(s => s.timeSpent > 0 && s.amount > 0)
      .sort((a, b) => {
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) return dateDiff;
        if (a.createdAt && b.createdAt) return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
      });

    const trend = [];
    const monthlyBuckets = {};

    const durationBuckets = {
      '< 15 Min': { totalSpeed: 0, count: 0 },
      '15-30 Min': { totalSpeed: 0, count: 0 },
      '30-60 Min': { totalSpeed: 0, count: 0 },
      '> 60 Min': { totalSpeed: 0, count: 0 }
    };

    const timeBuckets = {
      'Morgens': { totalSpeed: 0, count: 0 },
      'Nachmittags': { totalSpeed: 0, count: 0 },
      'Abends': { totalSpeed: 0, count: 0 },
      'Nachts': { totalSpeed: 0, count: 0 }
    };

    validSessions.forEach((s, index) => {
      pages += s.amount;
      seconds += s.timeSpent;

      const speed = s.amount / (s.timeSpent / 3600);

      const book = books.find(b => b.id === s.bookId);
      let wpm = null;
      if (book && book.wordsPerPage) {
        wpm = (s.amount * book.wordsPerPage) / (s.timeSpent / 60);
        totalWords += s.amount * book.wordsPerPage;
        secondsForWpm += s.timeSpent;
      }

      trend.push({
        name: `Session ${index + 1}`,
        date: format(new Date(s.date), 'dd.MM.'),
        speed: Math.round(speed),
        wpm: wpm ? Math.round(wpm) : null,
        pages: s.amount
      });

      const monthKey = format(new Date(s.date), 'yyyy-MM');
      if (!monthlyBuckets[monthKey]) {
        monthlyBuckets[monthKey] = {
          monthName: format(new Date(s.date), 'MMM yy', { locale: de }),
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

      if (s.createdAt) {
        const hour = getHours(parseISO(s.createdAt));
        if (hour >= 6 && hour < 12) {
          timeBuckets['Morgens'].totalSpeed += speed;
          timeBuckets['Morgens'].count++;
        } else if (hour >= 12 && hour < 18) {
          timeBuckets['Nachmittags'].totalSpeed += speed;
          timeBuckets['Nachmittags'].count++;
        } else if (hour >= 18 && hour <= 23) {
          timeBuckets['Abends'].totalSpeed += speed;
          timeBuckets['Abends'].count++;
        } else {
          timeBuckets['Nachts'].totalSpeed += speed;
          timeBuckets['Nachts'].count++;
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
      trendData: trend.slice(-30),
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
      <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Noch keine Statistiken
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Starte deine erste Lese-Session im Tab „Timer“, um hier Auswertungen zu sehen.
        </Typography>
      </Card>
    );
  }

  const uniqueAuthors = Array.from(new Set(books.map(b => b.author).filter(Boolean)));

  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setFilterValue('');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataKey = payload[0].dataKey;
      let unit = 'Seiten/h';
      if (dataKey === 'wpm') unit = 'WPM';
      if (dataKey === 'pages') unit = 'Seiten';

      return (
        <Box
          sx={{
            bgcolor: isDark ? '#303134' : '#FFFFFF',
            px: 1.5,
            py: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            {label}
          </Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {payload[0].value} {unit}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const renderChartInner = (chartId, height = 190) => {
    const data = trendView === 'months' ? monthlyTrendData : trendData;
    const gridStroke = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(31,31,31,0.07)';
    const axisColor = theme.palette.text.secondary;

    switch (chartId) {
      case 'speed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={`speedGrad-${height}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={trendMetric}
                stroke={theme.palette.primary.main}
                strokeWidth={2.5}
                fill={`url(#speedGrad-${height})`}
                dot={{ r: 3, fill: theme.palette.primary.main }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pages':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={`pagesGrad-${height}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.info.main} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={theme.palette.info.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pages"
                stroke={theme.palette.info.main}
                strokeWidth={2.5}
                fill={`url(#pagesGrad-${height})`}
                dot={{ r: 3, fill: theme.palette.info.main }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'duration':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={durationData} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="speed" radius={[8, 8, 2, 2]}>
                {durationData.map((_, i) => <Cell key={i} fill={theme.palette.secondary.main} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'time':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={timeOfDayData} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="speed" radius={[8, 8, 2, 2]}>
                {timeOfDayData.map((_, i) => <Cell key={i} fill={theme.palette.success.main} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const chartMeta = [
    { id: 'speed', title: trendMetric === 'wpm' ? 'Geschwindigkeit (WPM)' : 'Geschwindigkeit (S/h)' },
    { id: 'pages', title: 'Seiten gelesen' },
    { id: 'duration', title: 'Dauer vs. Tempo' },
    { id: 'time', title: 'Tageszeit vs. Tempo' },
  ];

  const kpis = [
    {
      label: 'Gesamt gelesen',
      value: `${totalPages} S.`,
      icon: MenuBookIcon,
      color: theme.palette.primary.main,
    },
    {
      label: 'Gesamtzeit',
      value: formatTime(totalSeconds),
      icon: TimerIcon,
      color: theme.palette.success.main,
    },
    {
      label: 'Ø Tempo',
      value: `${avgSpeedAllTime} S/h`,
      icon: SpeedIcon,
      color: theme.palette.warning.main,
    },
    {
      label: 'Ø WPM',
      value: avgWpmAllTime > 0 ? avgWpmAllTime : '—',
      icon: AutoGraphIcon,
      color: theme.palette.info.main,
    },
  ];

  const PillSwitch = ({ options, value, onChange }) => (
    <Box
      sx={{
        display: 'inline-flex',
        p: 0.4,
        borderRadius: 9999,
        bgcolor: 'background.surfaceVariant',
        gap: 0.35,
      }}
    >
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Box
            key={opt.value}
            onClick={() => onChange(opt.value)}
            sx={{
              px: 1.4,
              py: 0.45,
              borderRadius: 9999,
              cursor: 'pointer',
              userSelect: 'none',
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
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filter & Controls Card */}
      <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25 }}>
          <PillSwitch
            value={filterType}
            onChange={handleFilterTypeChange}
            options={[
              { value: 'all', label: 'Alle' },
              { value: 'book', label: 'Buch' },
              { value: 'author', label: 'Autor' },
            ]}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PillSwitch
              value={trendView}
              onChange={setTrendView}
              options={[
                { value: 'months', label: 'Monate' },
                { value: 'sessions', label: 'Sessions' },
              ]}
            />
            <PillSwitch
              value={trendMetric}
              onChange={setTrendMetric}
              options={[
                { value: 'speed', label: 'S/h' },
                { value: 'wpm', label: 'WPM' },
              ]}
            />
          </Box>
        </Box>

        {filterType === 'book' && (
          <Select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            size="small"
            displayEmpty
            fullWidth
            sx={{ bgcolor: 'background.surfaceVariant', borderRadius: '14px', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
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
            fullWidth
            sx={{ bgcolor: 'background.surfaceVariant', borderRadius: '14px', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
          >
            <MenuItem value="" disabled>Autor wählen...</MenuItem>
            {uniqueAuthors.map(author => <MenuItem key={author} value={author}>{author}</MenuItem>)}
          </Select>
        )}
      </Card>

      {/* 2x2 KPI Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.75 }}>
        {kpis.map(({ label, value, icon: IconComp, color }) => (
          <Card
            key={label}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '12px',
                bgcolor: alpha(color, isDark ? 0.18 : 0.12),
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComp fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block' }}>
                {label}
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  mt: 0.25,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                {value}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Responsive Chart Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.75 }}>
        {chartMeta.map(({ id, title }) => (
          <Card
            key={id}
            onClick={() => setExpandedChart(id)}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '22px',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, transform 0.15s ease',
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {title}
              </Typography>
              <OpenInFullIcon sx={{ fontSize: 15, color: 'text.secondary', opacity: 0.65 }} />
            </Box>
            <Box sx={{ height: 185, width: '100%' }}>
              {renderChartInner(id, 185)}
            </Box>
          </Card>
        ))}
      </Box>

      {/* Fullscreen Chart Dialog */}
      <Dialog
        open={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h6" fontWeight={700}>
              {expandedChart ? chartMeta.find(c => c.id === expandedChart)?.title : ''}
            </Typography>
            {(expandedChart === 'speed' || expandedChart === 'pages') && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {expandedChart === 'speed' && (
                  <PillSwitch
                    value={trendMetric}
                    onChange={setTrendMetric}
                    options={[
                      { value: 'speed', label: 'S/h' },
                      { value: 'wpm', label: 'WPM' },
                    ]}
                  />
                )}
                <PillSwitch
                  value={trendView}
                  onChange={setTrendView}
                  options={[
                    { value: 'months', label: 'Monate' },
                    { value: 'sessions', label: 'Sessions' },
                  ]}
                />
              </Box>
            )}
          </Box>
          <IconButton onClick={() => setExpandedChart(null)} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ height: '58vh', width: '100%' }}>
            {expandedChart && renderChartInner(expandedChart, '100%')}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReadingAnalytics;
