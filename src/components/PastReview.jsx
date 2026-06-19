import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Grid, ToggleButtonGroup, ToggleButton, Stack, Paper } from '@mui/material';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isWithinInterval, parseISO, startOfWeek, format } from 'date-fns';
import { de } from 'date-fns/locale';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

const PastReview = () => {
  const { tasks, readingSessions, calorieLogs } = useTaskContext();
  const [timeframe, setTimeframe] = useState('month');

  const stats = useMemo(() => {
    const today = new Date();
    
    let currentStart, currentEnd, pastStart, pastEnd;

    if (timeframe === 'month') {
      currentStart = startOfMonth(today);
      currentEnd = endOfMonth(today);
      pastStart = startOfMonth(subMonths(today, 1));
      pastEnd = endOfMonth(subMonths(today, 1));
    } else {
      currentStart = startOfYear(today);
      currentEnd = endOfYear(today);
      pastStart = startOfYear(subYears(today, 1));
      pastEnd = endOfYear(subYears(today, 1));
    }

    const isCurrent = (dateStr) => {
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: currentStart, end: currentEnd });
      } catch { return false; }
    };

    const isPast = (dateStr) => {
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: pastStart, end: pastEnd });
      } catch { return false; }
    };

    let currentTasks = 0;
    let pastTasks = 0;
    tasks.forEach(task => {
      (task.completedDates || []).forEach(d => {
        if (isCurrent(d)) currentTasks++;
        if (isPast(d)) pastTasks++;
      });
    });

    let currentReading = 0;
    let pastReading = 0;
    readingSessions.forEach(session => {
      if (isCurrent(session.date)) currentReading += session.amount;
      if (isPast(session.date)) pastReading += session.amount;
    });

    const calcSuccessfulWeeks = (start, end, logs) => {
      const weeklySums = {};
      logs.forEach(log => {
        try {
          const d = parseISO(log.date);
          if (isWithinInterval(d, { start, end })) {
            const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            if (!weeklySums[wStart]) weeklySums[wStart] = 0;
            weeklySums[wStart] += log.difference;
          }
        } catch {}
      });
      return Object.values(weeklySums).filter(sum => sum <= 0).length;
    };

    const currentCalories = calcSuccessfulWeeks(currentStart, currentEnd, calorieLogs);
    const pastCalories = calcSuccessfulWeeks(pastStart, pastEnd, calorieLogs);

    return {
      currentPeriodName: timeframe === 'month' ? format(currentStart, 'MMMM', { locale: de }) : format(currentStart, 'yyyy'),
      pastPeriodName: timeframe === 'month' ? format(pastStart, 'MMMM', { locale: de }) : format(pastStart, 'yyyy'),
      tasks: { current: currentTasks, past: pastTasks },
      reading: { current: currentReading, past: pastReading },
      calories: { current: currentCalories, past: pastCalories }
    };
  }, [tasks, readingSessions, calorieLogs, timeframe]);

  const renderTrend = (current, past, unit = '') => {
    let diff = current - past;
    let percent = past === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / past) * 100);
    
    if (diff === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', gap: 0.5 }}>
          <RemoveIcon fontSize="small" />
          <Typography variant="body2" fontWeight="bold">Gleichbleibend</Typography>
        </Box>
      );
    }

    const isPositive = diff > 0;
    const color = isPositive ? 'success.main' : 'error.main';
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color, gap: 0.5 }}>
        <Icon fontSize="small" />
        <Typography variant="body2" fontWeight="bold">
          {isPositive ? '+' : ''}{diff} {unit} ({isPositive ? '+' : ''}{percent}%)
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 1000, mx: 'auto' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          color="primary"
          value={timeframe}
          exclusive
          onChange={(e, newV) => { if (newV) setTimeframe(newV); }}
          sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 0.5 }}
        >
          <ToggleButton value="month" sx={{ px: { xs: 2, sm: 4 }, py: 1, borderRadius: 2, border: 'none', '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.main' } } }}>Monatsvergleich</ToggleButton>
          <ToggleButton value="year" sx={{ px: { xs: 2, sm: 4 }, py: 1, borderRadius: 2, border: 'none', '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.main' } } }}>Jahresvergleich</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Typography variant="h5" fontWeight="bold" textAlign="center" color="text.secondary" gutterBottom>
        {stats.currentPeriodName} vs. {stats.pastPeriodName}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>Aufgaben erledigt</Typography>
            <Typography variant="h2" fontWeight="bold" color="primary.main" sx={{ mb: 1 }}>
              {stats.tasks.current}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Letzter {timeframe === 'month' ? 'Monat' : 'Jahr'}: {stats.tasks.past}
            </Typography>
            {renderTrend(stats.tasks.current, stats.tasks.past)}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>Seiten gelesen</Typography>
            <Typography variant="h2" fontWeight="bold" color="secondary.main" sx={{ mb: 1 }}>
              {stats.reading.current}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Letzter {timeframe === 'month' ? 'Monat' : 'Jahr'}: {stats.reading.past}
            </Typography>
            {renderTrend(stats.reading.current, stats.reading.past, 'Seiten')}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>Kalorienziel Wochen</Typography>
            <Typography variant="h2" fontWeight="bold" color="error.main" sx={{ mb: 1 }}>
              {stats.calories.current}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Letzter {timeframe === 'month' ? 'Monat' : 'Jahr'}: {stats.calories.past}
            </Typography>
            {renderTrend(stats.calories.current, stats.calories.past, 'Wochen')}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PastReview;
