import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { 
  format, isSameMonth, isSameYear, parseISO, subDays, startOfWeek, endOfWeek, 
  eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfToday, isSameDay 
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Box, Card, Typography, Button, Stack, useTheme, Grid, Select, MenuItem, Tooltip as MuiTooltip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const Review = () => {
  const { tasks, readingSessions, calorieLogs } = useTaskContext();
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedTrackerTask, setSelectedTrackerTask] = useState('all');
  const theme = useTheme();

  const todayDate = new Date();
  const today = startOfToday();

  // --- REVIEW STATS (Month/Year) ---
  const isDateInView = (dateStr) => {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    if (viewMode === 'month') return isSameMonth(date, todayDate);
    return isSameYear(date, todayDate);
  };

  let totalTasksCompleted = 0;
  tasks.forEach(task => {
    if (task.completedDates) {
      task.completedDates.forEach(dateStr => {
        if (isDateInView(dateStr)) totalTasksCompleted++;
      });
    }
  });

  const filteredReading = readingSessions.filter(session => isDateInView(session.date));
  const totalReadingAmount = filteredReading.reduce((acc, s) => acc + s.amount, 0);
  const totalReadingSeconds = filteredReading.reduce((acc, s) => acc + s.timeSpent, 0);
  const totalReadingHours = (totalReadingSeconds / 3600).toFixed(1);

  const filteredCalories = calorieLogs.filter(log => isDateInView(log.date));
  const weeklySums = {};
  filteredCalories.forEach(log => {
    const d = parseISO(log.date);
    const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weeklySums[wStart]) weeklySums[wStart] = 0;
    weeklySums[wStart] += log.difference;
  });

  const totalWeeks = Object.keys(weeklySums).length;
  const successfulWeeks = Object.values(weeklySums).filter(sum => sum <= 0).length;

  // --- READING STATS (Global) ---
  const globalReadingSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0);
  const globalReadingAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0);
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // --- HIGHLIGHTS ---
  const allStreaks = [];
  let maxTasksInOneDay = 0;
  let bestDay = null;
  
  const dailyTaskCounts = {};

  tasks.forEach(task => {
    const completedDates = task.completedDates || [];
    completedDates.forEach(d => {
      dailyTaskCounts[d] = (dailyTaskCounts[d] || 0) + 1;
      if (dailyTaskCounts[d] > maxTasksInOneDay) {
        maxTasksInOneDay = dailyTaskCounts[d];
        bestDay = d;
      }
    });

    if (task.type === 'daily' && completedDates.length > 0) {
      let streak = 0;
      let checkDate = todayDate; 
      const todayStr = format(checkDate, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

      if (completedDates.includes(todayStr) || completedDates.includes(yesterdayStr)) {
        if (!completedDates.includes(todayStr)) checkDate = subDays(checkDate, 1);
        while (true) {
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          if (completedDates.includes(dateStr)) {
            streak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }
        if (streak > 0) allStreaks.push({ title: task.title, streak });
      }
    }
  });

  allStreaks.sort((a, b) => b.streak - a.streak);
  const topStreaks = allStreaks.slice(0, 3);

  // --- BARCHART DATA ---
  const taskData = [];
  if (viewMode === 'month') {
    const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      taskData.push({ name: `${i}.`, count: dailyTaskCounts[dateStr] || 0 });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const monthPrefix = format(new Date(todayDate.getFullYear(), i, 1), 'yyyy-MM');
      const monthName = format(new Date(todayDate.getFullYear(), i, 1), 'MMM', { locale: de });
      let tCount = 0;
      Object.keys(dailyTaskCounts).forEach(d => {
        if (d.startsWith(monthPrefix)) tCount += dailyTaskCounts[d];
      });
      taskData.push({ name: monthName, count: tCount });
    }
  }

  // --- YEAR TRACKER HEATMAP ---
  const trackableTasks = tasks.filter(t => t.type !== 'general');
  const yearStart = startOfYear(todayDate);
  const yearEnd = endOfYear(todayDate);
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  const months = Array.from({ length: 12 }, (_, i) => allDays.filter(d => getMonth(d) === i));

  const evaluateDay = (day) => {
    const isFuture = isAfter(day, today);
    if (isFuture) return { color: 'background.default', border: 'divider', opacity: 0.3 };
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay();

    if (selectedTrackerTask === 'all') {
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

      if (tasksShouldBeDone === 0) return { color: 'background.default', border: 'divider', opacity: 0.3 };
      if (tasksActuallyDone === tasksShouldBeDone) return { color: 'success.main', border: 'success.dark', opacity: 1 };
      if (tasksActuallyDone > 0) return { color: 'warning.main', border: 'warning.dark', opacity: 0.8 };
      return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
    } else {
      const task = tasks.find(t => t.id === selectedTrackerTask);
      if (!task) return { color: 'background.default', border: 'divider', opacity: 0.3 };
      
      const isCompleted = task.completedDates.includes(dateStr);
      if (task.type === 'daily' || task.type === 'specific-days') {
        let shouldDo = task.type === 'daily' || task.specificDays.includes(dayOfWeek);
        if (!shouldDo && !isCompleted) return { color: 'background.default', border: 'divider', opacity: 0.3 };
        if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
        return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
      }

      // Fallback for weekly/x-times logic in heatmap (simplified)
      if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
      return { color: 'background.default', border: 'divider', opacity: 0.3 };
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 1000, mx: 'auto' }}>
      
      {/* HEADER TABS */}
      <Box sx={{ display: 'flex', gap: 2, bgcolor: 'background.paper', p: 1, borderRadius: 3, width: 'fit-content', mx: { xs: 'auto', sm: 0 } }}>
        <Button 
          variant={viewMode === 'month' ? 'contained' : 'text'}
          onClick={() => setViewMode('month')}
          sx={{ borderRadius: 2 }}
        >
          {format(todayDate, 'MMMM', { locale: de })}
        </Button>
        <Button 
          variant={viewMode === 'year' ? 'contained' : 'text'}
          onClick={() => setViewMode('year')}
          sx={{ borderRadius: 2 }}
        >
          {format(todayDate, 'yyyy')}
        </Button>
      </Box>

      {/* QUICK STATS */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
        <Card sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, p: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: '50%', display: 'flex', color: 'primary.contrastText' }}>
            <CheckBoxIcon fontSize="large" />
          </Box>
          <Typography variant="h6" color="text.secondary">Aufgaben erledigt</Typography>
          <Typography variant="h3" fontWeight="bold">{totalTasksCompleted}</Typography>
        </Card>

        <Card sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, p: 3 }}>
          <Box sx={{ p: 2, bgcolor: '#fce4ec', borderRadius: '50%', display: 'flex', color: '#ec4899' }}>
            <ShowChartIcon fontSize="large" />
          </Box>
          <Typography variant="h6" color="text.secondary">Lesegeschwindigkeit (Ø)</Typography>
          <Typography variant="h3" fontWeight="bold" color="#ec4899">
            {totalReadingHours > 0 ? Math.round(totalReadingAmount / totalReadingHours) : 0} 
            <Typography component="span" variant="h6" color="text.primary" sx={{ ml: 1 }}>S./h</Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">basierend auf {totalReadingAmount} Seiten</Typography>
        </Card>

        <Card sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, p: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: '50%', display: 'flex', color: 'error.contrastText' }}>
            <LocalFireDepartmentIcon fontSize="large" />
          </Box>
          <Typography variant="h6" color="text.secondary">Kalorienziel</Typography>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            color={successfulWeeks === totalWeeks && totalWeeks > 0 ? 'success.main' : 'text.primary'}
          >
            {successfulWeeks} / {totalWeeks}
          </Typography>
          <Typography variant="body2" color="text.secondary">Wochen erreicht</Typography>
        </Card>
      </Box>

      {/* HIGHLIGHTS */}
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <EmojiEventsIcon color="warning" /> Highlights & Rekorde
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>PRODUKTIVSTER TAG</Typography>
              {bestDay ? (
                <>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">{maxTasksInOneDay} Aufgaben</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Dein Rekord wurde am {format(parseISO(bestDay), 'dd. MMMM yyyy', { locale: de })} aufgestellt.
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary">Noch keine Aufgaben erledigt.</Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>LESE-MEILENSTEIN</Typography>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">{globalReadingAmount} Seiten</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Insgesamt gelesen in {formatTime(globalReadingSeconds)}. Weiter so!
              </Typography>
            </Box>
          </Grid>
          
          {topStreaks.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>AKTUELLE TOP STREAKS</Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {topStreaks.map((s, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5">{index === 0 ? '🔥' : index === 1 ? '✨' : '⭐'}</Typography>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">{s.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{s.streak} Tage in Folge</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )}
        </Grid>
      </Card>

      {/* BARCHART */}
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <ShowChartIcon color="primary" /> Erledigte Aufgaben im Verlauf
        </Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: 8 }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
              <Bar dataKey="count" name="Aufgaben" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* YEAR TRACKER HEATMAP */}
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
            <CalendarMonthIcon color="success" /> Jahres-Tracker {todayDate.getFullYear()}
          </Typography>
          <Select 
            value={selectedTrackerTask} 
            onChange={(e) => setSelectedTrackerTask(e.target.value)}
            size="small"
            sx={{ minWidth: 200, borderRadius: 2 }}
          >
            <MenuItem value="all">Alle Aufgaben (Perfekte Tage)</MenuItem>
            {trackableTasks.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>
            ))}
          </Select>
        </Box>

        {selectedTrackerTask === 'all' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ein Tag ist grün, wenn du <strong>alle</strong> für diesen Tag geplanten Aufgaben erledigt hast. Orange bedeutet teilweise erfüllt.
          </Typography>
        )}

        <Box sx={{ overflowX: 'auto', pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, minWidth: 800 }}>
            {months.map((monthDays, mIndex) => {
              if (monthDays.length === 0) return null;
              const monthName = format(monthDays[0], 'MMM', { locale: de });
              
              return (
                <Box key={mIndex} sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', textAlign: 'center', fontWeight: 'bold' }}>
                    {monthName}
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: 0.5,
                    bgcolor: 'background.default',
                    p: 1,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider'
                  }}>
                    {monthDays.map((day, dIndex) => {
                      const { color, opacity, border } = evaluateDay(day);
                      return (
                        <MuiTooltip key={dIndex} title={format(day, 'dd.MM.yyyy')} arrow placement="top">
                          <Box 
                            sx={{ 
                              aspectRatio: '1/1',
                              bgcolor: color,
                              opacity,
                              borderRadius: '4px',
                              border: 1,
                              borderColor: border,
                              cursor: 'pointer',
                              '&:hover': { opacity: 1, transform: 'scale(1.1)' },
                              transition: 'all 0.2s'
                            }}
                          />
                        </MuiTooltip>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Card>

    </Box>
  );
};

export default Review;
