import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Box, Card, Typography, Select, MenuItem, Dialog, DialogContent, DialogTitle,
  IconButton, Tooltip as MuiTooltip, LinearProgress
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
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BookCover from './BookCover';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const ReadingAnalytics = () => {
  const { readingSessions, books } = useTaskContext();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [filterType, setFilterType] = useState('all'); // 'all', 'book', 'author'
  const [filterValue, setFilterValue] = useState('');
  const [trendView, setTrendView] = useState('months');
  const [trendMetric, setTrendMetric] = useState('speed');
  const [expandedChart, setExpandedChart] = useState(null); // null | 'speed' | 'pages' | 'readingTime' | 'weekday'

  const {
    totalPages,
    totalSeconds,
    avgSpeedAllTime,
    avgWpmAllTime,
    avgPagesPerSession,
    activeDaysCount,
    currentStreak,
    longestStreak,
    trendData,
    monthlyTrendData,
    weekdayData,
    heatmapWeeks,
    topBooks,
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
    const weekdayPages = [0, 0, 0, 0, 0, 0, 0]; // Mo=0 .. So=6
    const dayMap = {}; // 'yyyy-MM-dd' -> { pages, seconds }
    const bookStatsMap = {}; // bookId -> { pages, seconds }

    validSessions.forEach((s, index) => {
      pages += s.amount;
      seconds += s.timeSpent;

      const speed = s.amount / (s.timeSpent / 3600);
      const minutes = Math.round(s.timeSpent / 60);

      const book = books.find(b => b.id === s.bookId);
      let wpm = null;
      if (book && book.wordsPerPage) {
        wpm = (s.amount * book.wordsPerPage) / (s.timeSpent / 60);
        totalWords += s.amount * book.wordsPerPage;
        secondsForWpm += s.timeSpent;
      }

      const sessionDateObj = new Date(s.date);
      const dayKey = format(sessionDateObj, 'yyyy-MM-dd');
      if (!dayMap[dayKey]) dayMap[dayKey] = { pages: 0, seconds: 0 };
      dayMap[dayKey].pages += s.amount;
      dayMap[dayKey].seconds += s.timeSpent;

      // JS getDay(): Sun=0, Mon=1..Sat=6 -> map to Mon=0..Sun=6
      const wdIdx = (sessionDateObj.getDay() + 6) % 7;
      weekdayPages[wdIdx] += s.amount;

      if (s.bookId) {
        if (!bookStatsMap[s.bookId]) bookStatsMap[s.bookId] = { pages: 0, seconds: 0 };
        bookStatsMap[s.bookId].pages += s.amount;
        bookStatsMap[s.bookId].seconds += s.timeSpent;
      }

      trend.push({
        name: `Session ${index + 1}`,
        date: format(sessionDateObj, 'dd.MM.'),
        speed: Math.round(speed),
        wpm: wpm ? Math.round(wpm) : null,
        pages: s.amount,
        minutes,
      });

      const monthKey = format(sessionDateObj, 'yyyy-MM');
      if (!monthlyBuckets[monthKey]) {
        monthlyBuckets[monthKey] = {
          monthName: format(sessionDateObj, 'MMM yy', { locale: de }),
          totalSpeed: 0, countSpeed: 0,
          totalWpm: 0, countWpm: 0,
          totalPages: 0,
          totalSeconds: 0,
        };
      }
      monthlyBuckets[monthKey].totalSpeed += speed;
      monthlyBuckets[monthKey].countSpeed++;
      monthlyBuckets[monthKey].totalPages += s.amount;
      monthlyBuckets[monthKey].totalSeconds += s.timeSpent;
      if (wpm) {
        monthlyBuckets[monthKey].totalWpm += wpm;
        monthlyBuckets[monthKey].countWpm++;
      }
    });

    // Calculate current & longest reading streak
    const sortedDayKeys = Object.keys(dayMap).sort();
    let curStreak = 0;
    let maxStreak = 0;

    if (sortedDayKeys.length > 0) {
      let running = 1;
      maxStreak = 1;
      for (let i = 1; i < sortedDayKeys.length; i++) {
        const prev = new Date(`${sortedDayKeys[i - 1]}T00:00:00`);
        const curr = new Date(`${sortedDayKeys[i]}T00:00:00`);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          running++;
          if (running > maxStreak) maxStreak = running;
        } else if (diffDays > 1) {
          running = 1;
        }
      }

      // Check current streak ending today or yesterday
      const today = new Date();
      let checkDate = today;
      if (!dayMap[format(checkDate, 'yyyy-MM-dd')]) {
        checkDate = subDays(today, 1);
      }
      while (dayMap[format(checkDate, 'yyyy-MM-dd')]) {
        curStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Build 12-week heatmap (84 days ending today, aligned by week columns)
    const today = new Date();
    const weeks = [];
    const totalDays = 84;
    const startDay = subDays(today, totalDays - 1);
    // Align startDay back to Monday so rows are Mo..So
    const startOffset = (startDay.getDay() + 6) % 7;
    const gridStart = subDays(startDay, startOffset);

    let maxDailyPages = 1;
    Object.values(dayMap).forEach(d => {
      if (d.pages > maxDailyPages) maxDailyPages = d.pages;
    });

    let cursor = new Date(gridStart);
    while (cursor <= today) {
      const weekCol = [];
      for (let r = 0; r < 7; r++) {
        const key = format(cursor, 'yyyy-MM-dd');
        const isFuture = cursor > today;
        const entry = dayMap[key];
        const intensity = !entry || isFuture
          ? 0
          : Math.min(4, Math.ceil((entry.pages / maxDailyPages) * 4));
        weekCol.push({
          key,
          label: format(cursor, 'dd.MM.yyyy'),
          pages: entry ? entry.pages : 0,
          minutes: entry ? Math.round(entry.seconds / 60) : 0,
          intensity,
          isFuture,
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
      weeks.push(weekCol);
    }

    const mTrend = Object.values(monthlyBuckets).map(b => ({
      date: b.monthName,
      speed: b.countSpeed > 0 ? Math.round(b.totalSpeed / b.countSpeed) : 0,
      wpm: b.countWpm > 0 ? Math.round(b.totalWpm / b.countWpm) : null,
      pages: b.totalPages,
      minutes: Math.round(b.totalSeconds / 60),
    }));

    const wdData = WEEKDAY_LABELS.map((label, idx) => ({
      name: label,
      pages: weekdayPages[idx],
    }));

    const rankedBooks = Object.entries(bookStatsMap)
      .map(([bookId, stats]) => {
        const book = books.find(b => b.id === bookId);
        if (!book) return null;
        return {
          id: bookId,
          name: book.name,
          author: book.author || '',
          coverUrl: book.coverUrl || null,
          pages: stats.pages,
          seconds: stats.seconds,
          speed: stats.seconds > 0 ? Math.round(stats.pages / (stats.seconds / 3600)) : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.pages - a.pages)
      .slice(0, 5);

    return {
      totalPages: pages,
      totalSeconds: seconds,
      avgSpeedAllTime: seconds > 0 ? Math.round(pages / (seconds / 3600)) : 0,
      avgWpmAllTime: secondsForWpm > 0 ? Math.round(totalWords / (secondsForWpm / 60)) : 0,
      avgPagesPerSession: validSessions.length > 0 ? Math.round(pages / validSessions.length) : 0,
      activeDaysCount: sortedDayKeys.length,
      currentStreak: curStreak,
      longestStreak: maxStreak,
      trendData: trend.slice(-30),
      monthlyTrendData: mTrend,
      weekdayData: wdData,
      heatmapWeeks: weeks,
      topBooks: rankedBooks,
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
      if (dataKey === 'minutes') unit = 'Min.';

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
      case 'readingTime':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="minutes" radius={[8, 8, 2, 2]}>
                {data.map((_, i) => <Cell key={i} fill={theme.palette.success.main} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'weekday':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={weekdayData} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="pages" radius={[8, 8, 2, 2]}>
                {weekdayData.map((_, i) => <Cell key={i} fill={theme.palette.secondary.main} />)}
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
    { id: 'readingTime', title: 'Lesezeit (Minuten)' },
    { id: 'weekday', title: 'Lese-Rhythmus (Mo–So)' },
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

  const getHeatmapColor = (intensity) => {
    if (intensity === 0) return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(31,31,31,0.06)';
    const opacities = [0, 0.28, 0.5, 0.74, 1];
    return alpha(theme.palette.success.main, opacities[intensity]);
  };

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

  const maxTopBookPages = topBooks.length > 0 ? Math.max(...topBooks.map(b => b.pages), 1) : 1;

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

      {/* Core 2x2 KPI Grid */}
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

      {/* Consistency & Streak Summary Strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
        {[
          { label: 'Aktueller Streak', value: `${currentStreak} Tage`, icon: LocalFireDepartmentIcon, color: theme.palette.warning.main },
          { label: 'Längster Streak', value: `${longestStreak} Tage`, icon: EmojiEventsIcon, color: theme.palette.primary.main },
          { label: 'Aktive Lesetage', value: `${activeDaysCount}`, icon: CalendarMonthIcon, color: theme.palette.success.main },
          { label: 'Ø Seiten / Session', value: `${avgPagesPerSession} S.`, icon: MenuBookIcon, color: theme.palette.secondary.main },
        ].map(({ label, value, icon: IconComp, color }) => (
          <Card
            key={label}
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <IconComp sx={{ fontSize: 20, color, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, fontSize: '0.68rem' }}>
                {label}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* 12-Week Reading Activity Heatmap */}
      <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '22px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.75, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Lese-Aktivität (letzte 12 Wochen)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', mr: 0.25 }}>
              Weniger
            </Typography>
            {[0, 1, 2, 3, 4].map(lvl => (
              <Box
                key={lvl}
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: '3px',
                  bgcolor: getHeatmapColor(lvl),
                }}
              />
            ))}
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', ml: 0.25 }}>
              Mehr
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 0.2, pr: 0.5 }}>
            {WEEKDAY_LABELS.map((d, idx) => (
              <Typography
                key={d}
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.62rem', lineHeight: '14px', visibility: idx % 2 === 0 ? 'visible' : 'hidden' }}
              >
                {d}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.55, flex: 1 }}>
            {heatmapWeeks.map((week, wIdx) => (
              <Box key={wIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.55, flex: 1, minWidth: 14 }}>
                {week.map(day => (
                  <MuiTooltip
                    key={day.key}
                    title={day.pages > 0 ? `${day.label}: ${day.pages} Seiten (${day.minutes} Min.)` : `${day.label}: Keine Session`}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        maxWidth: 18,
                        borderRadius: '4px',
                        bgcolor: day.isFuture ? 'transparent' : getHeatmapColor(day.intensity),
                        transition: 'transform 0.15s ease',
                        '&:hover': !day.isFuture ? { transform: 'scale(1.2)' } : {},
                      }}
                    />
                  </MuiTooltip>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Card>

      {/* Responsive 2x2 Useful Charts Grid */}
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
              transition: 'border-color 0.2s ease',
              '&:hover': { borderColor: 'primary.main' },
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

      {/* Top Books Ranking */}
      {topBooks.length > 0 && filterType !== 'book' && (
        <Card sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '22px' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            Top Bücher nach gelesenen Seiten
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {topBooks.map((b, idx) => (
              <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ width: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                >
                  {idx + 1}
                </Typography>
                <BookCover coverUrl={b.coverUrl} title={b.name} width={34} height={50} borderRadius="6px" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.4 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {b.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{b.pages} S.</strong> · {formatTime(b.seconds)} · {b.speed} S/h
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round((b.pages / maxTopBookPages) * 100)}
                    sx={{ height: 5, borderRadius: 9999 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      )}

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
            {(expandedChart === 'speed' || expandedChart === 'pages' || expandedChart === 'readingTime') && (
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
