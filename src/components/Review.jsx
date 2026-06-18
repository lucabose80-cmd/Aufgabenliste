import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, isSameMonth, isSameYear, parseISO, subDays, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { Box, Card, Typography, Button, Stack, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const Review = () => {
  const { tasks, readingSessions, calorieLogs } = useTaskContext();
  const [viewMode, setViewMode] = useState('month'); 
  const theme = useTheme();

  const today = new Date();

  const isDateInView = (dateStr) => {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    if (viewMode === 'month') return isSameMonth(date, today);
    return isSameYear(date, today);
  };

  let totalTasksCompleted = 0;
  tasks.forEach(task => {
    task.completedDates.forEach(dateStr => {
      if (isDateInView(dateStr)) {
        totalTasksCompleted++;
      }
    });
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
  
  const allStreaks = [];

  tasks.filter(t => t.type === 'daily').forEach(task => {
    const completedDates = task.completedDates || [];
    if (completedDates.length === 0) return;

    let streak = 0;
    let checkDate = new Date(); 
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

    if (!completedDates.includes(todayStr) && !completedDates.includes(yesterdayStr)) {
      return;
    }

    if (!completedDates.includes(todayStr)) {
      checkDate = subDays(checkDate, 1);
    }

    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (completedDates.includes(dateStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    if (streak > 0) {
      allStreaks.push({ title: task.title, streak });
    }
  });

  allStreaks.sort((a, b) => b.streak - a.streak);
  const topStreaks = allStreaks.slice(0, 3);

  const taskData = [];
  
  if (viewMode === 'month') {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      let tCount = 0;
      tasks.forEach(task => {
        if (task.completedDates && task.completedDates.includes(dateStr)) tCount++;
      });
      taskData.push({ name: `${i}.`, count: tCount });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const monthPrefix = format(new Date(today.getFullYear(), i, 1), 'yyyy-MM');
      const monthName = format(new Date(today.getFullYear(), i, 1), 'MMM', { locale: de });
      
      let tCount = 0;
      tasks.forEach(task => {
        if (task.completedDates) {
          task.completedDates.forEach(d => {
            if (d.startsWith(monthPrefix)) tCount++;
          });
        }
      });
      taskData.push({ name: monthName, count: tCount });
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10 }}>
      
      <Box sx={{ display: 'flex', gap: 2, bgcolor: 'background.paper', p: 1, borderRadius: 3, width: 'fit-content' }}>
        <Button 
          variant={viewMode === 'month' ? 'contained' : 'text'}
          onClick={() => setViewMode('month')}
          sx={{ borderRadius: 2 }}
        >
          {format(today, 'MMMM', { locale: de })}
        </Button>
        <Button 
          variant={viewMode === 'year' ? 'contained' : 'text'}
          onClick={() => setViewMode('year')}
          sx={{ borderRadius: 2 }}
        >
          {format(today, 'yyyy')}
        </Button>
      </Box>

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

      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <EmojiEventsIcon color="warning" /> Highlights (Top Streaks)
        </Typography>
        {topStreaks.length > 0 ? (
          <Stack spacing={2}>
            {topStreaks.map((s, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="h4">
                  {index === 0 ? '🔥' : index === 1 ? '✨' : '⭐'}
                </Typography>
                <Box>
                  <Typography variant="h6" fontWeight="bold">{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Schon <Typography component="span" fontWeight="bold">{s.streak} Tage</Typography> in Folge geschafft!
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">Noch keine aktiven Streaks vorhanden.</Typography>
        )}
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mt: 2 }}>
        <Card sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckBoxIcon fontSize="small" /> Erledigte Aufgaben im Verlauf
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: 8 }}
                  itemStyle={{ color: theme.palette.text.primary }}
                />
                <Bar dataKey="count" name="Aufgaben" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Review;
