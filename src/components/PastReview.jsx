import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Grid, ToggleButtonGroup, ToggleButton, Stack, Paper } from '@mui/material';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isWithinInterval, parseISO, startOfWeek, format, eachDayOfInterval, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const SortableCard = ({ id, children, md }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <Grid item xs={12} md={md} ref={setNodeRef} style={style}>
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box 
          {...attributes} 
          {...listeners} 
          sx={{ position: 'absolute', top: 8, right: 8, cursor: 'grab', zIndex: 1, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
        >
          <DragIndicatorIcon />
        </Box>
        {children}
      </Box>
    </Grid>
  );
};

const PastReview = () => {
  const { tasks, readingSessions, calorieLogs, pastReviewOrder, saveSettings, theme, accentColor, shoppingListId, pinnedNavItems, dashboardOrder } = useTaskContext();
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
    let currentReadingSeconds = 0;
    let pastReadingSeconds = 0;
    readingSessions.forEach(session => {
      if (isCurrent(session.date)) {
        currentReading += session.amount;
        currentReadingSeconds += session.timeSpent;
      }
      if (isPast(session.date)) {
        pastReading += session.amount;
        pastReadingSeconds += session.timeSpent;
      }
    });

    const currentSpeed = currentReadingSeconds > 0 ? Math.round(currentReading / (currentReadingSeconds / 3600)) : 0;
    const pastSpeed = pastReadingSeconds > 0 ? Math.round(pastReading / (pastReadingSeconds / 3600)) : 0;

    const trackableTasks = tasks.filter(t => t.type !== 'general');
    
    const countPerfectDays = (start, end) => {
      let perfectDaysCount = 0;
      const days = eachDayOfInterval({ start, end });
      days.forEach(day => {
        if (isAfter(day, today)) return;
        
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        
        let tasksShouldBeDone = 0;
        let tasksActuallyDone = 0;
        
        trackableTasks.forEach(task => {
          let shouldDo = false;
          if (task.type === 'daily') shouldDo = true;
          if (task.type === 'specific-days' && task.specificDays.includes(dayOfWeek)) shouldDo = true;
          
          if (shouldDo) {
            tasksShouldBeDone++;
            if (task.completedDates.includes(dateStr)) tasksActuallyDone++;
          }
        });
        
        if (tasksShouldBeDone > 0 && tasksActuallyDone === tasksShouldBeDone) {
          perfectDaysCount++;
        }
      });
      return perfectDaysCount;
    };

    const currentPerfectDays = countPerfectDays(currentStart, currentEnd);
    const pastPerfectDays = countPerfectDays(pastStart, pastEnd);

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
      calories: { current: currentCalories, past: pastCalories },
      speed: { current: currentSpeed, past: pastSpeed },
      perfectDays: { current: currentPerfectDays, past: pastPerfectDays }
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = pastReviewOrder.indexOf(active.id);
      const newIndex = pastReviewOrder.indexOf(over.id);
      const newOrder = [...pastReviewOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      saveSettings(theme, accentColor, shoppingListId, pinnedNavItems, dashboardOrder, newOrder);
    }
  };

  const renderCard = (id) => {
    switch (id) {
      case 'tasks':
        return (
          <SortableCard key="tasks" id="tasks" md={4}>
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
          </SortableCard>
        );
      case 'perfectDays':
        return (
          <SortableCard key="perfectDays" id="perfectDays" md={4}>
            <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>Perfekte Tage</Typography>
              <Typography variant="h2" fontWeight="bold" color="success.main" sx={{ mb: 1 }}>
                {stats.perfectDays.current}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Letzter {timeframe === 'month' ? 'Monat' : 'Jahr'}: {stats.perfectDays.past}
              </Typography>
              {renderTrend(stats.perfectDays.current, stats.perfectDays.past, 'Tage')}
            </Card>
          </SortableCard>
        );
      case 'reading':
        return (
          <SortableCard key="reading" id="reading" md={4}>
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
          </SortableCard>
        );
      case 'speed':
        return (
          <SortableCard key="speed" id="speed" md={6}>
            <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>Lesegeschwindigkeit (Ø)</Typography>
              <Typography variant="h2" fontWeight="bold" color="info.main" sx={{ mb: 1 }}>
                {stats.speed.current} <Typography component="span" variant="h5" color="text.secondary">S./h</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Letzter {timeframe === 'month' ? 'Monat' : 'Jahr'}: {stats.speed.past} S./h
              </Typography>
              {renderTrend(stats.speed.current, stats.speed.past, 'S./h')}
            </Card>
          </SortableCard>
        );
      case 'calories':
        return (
          <SortableCard key="calories" id="calories" md={6}>
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
          </SortableCard>
        );
      default:
        return null;
    }
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pastReviewOrder} strategy={rectSortingStrategy}>
          <Grid container spacing={3} alignItems="stretch">
            {pastReviewOrder.map(id => renderCard(id))}
          </Grid>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default PastReview;
