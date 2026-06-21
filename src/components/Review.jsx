import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { 
  format, isSameMonth, isSameYear, parseISO, subDays, startOfWeek, endOfWeek, 
  eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfDay, isSameDay, subHours 
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Box, Card, Typography, Button, Stack, useTheme, Grid, Select, MenuItem, Tooltip as MuiTooltip, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const SortableDashboardItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0 }}>
        <Box 
          {...attributes} 
          {...listeners} 
          sx={{ cursor: 'grab', color: 'text.secondary', p: 1, touchAction: 'none' }}
        >
          <DragIndicatorIcon />
        </Box>
      </Box>
      {children}
    </Box>
  );
};

const Review = () => {
  const { tasks, readingSessions, calorieLogs, toggleTaskCompletion, dashboardOrder, saveSettings } = useTaskContext();
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedTrackerTask, setSelectedTrackerTask] = useState('all');
  const [expandedMonthIndex, setExpandedMonthIndex] = useState(null);
  const theme = useTheme();

  const todayDate = subHours(new Date(), 3);
  const today = startOfDay(todayDate);

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

  const earliestTaskDate = React.useMemo(() => {
    let minDate = new Date().toISOString().substring(0, 10);
    let hasTrackable = false;
    trackableTasks.forEach(t => {
      if (t.createdAt) {
        const cDate = t.createdAt.substring(0, 10);
        if (cDate < minDate) minDate = cDate;
        hasTrackable = true;
      }
    });
    return hasTrackable ? minDate : null;
  }, [trackableTasks]);

  const evaluateDay = (day) => {
    const isFuture = isAfter(day, today);
    if (isFuture) return { color: 'background.default', border: 'divider', opacity: 0.3 };
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay();

    if (selectedTrackerTask === 'all') {
      if (earliestTaskDate && dateStr < earliestTaskDate) {
        return { color: 'background.default', border: 'divider', opacity: 0.3 };
      }
      let tasksShouldBeDone = 0;
      let tasksActuallyDone = 0;
      
      trackableTasks.forEach(task => {
        let shouldDo = false;
        
        if (task.type === 'daily') shouldDo = true;
        if (task.type === 'specific-days' && task.specificDays.includes(dayOfWeek)) shouldDo = true;
        
        if (task.type === 'x-times' || task.type === 'weekly') {
          const isDoneToday = (task.completedDates || []).includes(dateStr);
          if (isDoneToday) {
            shouldDo = true;
          } else {
            const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
            const isGracePeriodOver = today >= weekEnd;
            if (isGracePeriodOver) {
              const weekStart = startOfWeek(day, { weekStartsOn: 1 });
              let count = 0;
              (task.completedDates || []).forEach(d => {
                const dDate = parseISO(d);
                if (dDate >= weekStart && dDate <= weekEnd) count++;
              });
              if (count < task.targetCount) {
                shouldDo = true;
              }
            }
          }
        }
        
        if (shouldDo) {
          tasksShouldBeDone++;
          if ((task.completedDates || []).includes(dateStr)) tasksActuallyDone++;
        }
      });

      if (tasksShouldBeDone === 0) return { color: 'background.default', border: 'divider', opacity: 0.3 };
      if (tasksActuallyDone === tasksShouldBeDone) return { color: 'success.main', border: 'success.dark', opacity: 1 };
      if (tasksActuallyDone > 0) return { color: 'warning.main', border: 'warning.dark', opacity: 0.8 };
      return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
    } else {
      const task = tasks.find(t => t.id === selectedTrackerTask);
      if (!task) return { color: 'background.default', border: 'divider', opacity: 0.3 };
      
      if (task.createdAt && dateStr < task.createdAt.substring(0, 10)) {
        return { color: 'background.default', border: 'divider', opacity: 0.3 };
      }
      
      const isCompleted = (task.completedDates || []).includes(dateStr);
      if (task.type === 'daily' || task.type === 'specific-days') {
        let shouldDo = task.type === 'daily' || task.specificDays.includes(dayOfWeek);
        if (!shouldDo && !isCompleted) return { color: 'background.default', border: 'divider', opacity: 0.3 };
        if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
        return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
      }

      if (task.type === 'x-times' || task.type === 'weekly') {
        if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
        const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
        const isGracePeriodOver = today >= weekEnd;
        if (isGracePeriodOver) {
          const weekStart = startOfWeek(day, { weekStartsOn: 1 });
          let count = 0;
          (task.completedDates || []).forEach(d => {
            const dDate = parseISO(d);
            if (dDate >= weekStart && dDate <= weekEnd) count++;
          });
          if (count < task.targetCount) return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
        }
        return { color: 'background.default', border: 'divider', opacity: 0.3 };
      }

      if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
      return { color: 'background.default', border: 'divider', opacity: 0.3 };
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = dashboardOrder.indexOf(active.id);
      const newIndex = dashboardOrder.indexOf(over.id);
      const newOrder = [...dashboardOrder];
      const [moved] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      saveSettings(undefined, undefined, undefined, undefined, newOrder);
    }
  };

  const renderWidget = (id) => {
    switch (id) {
      case 'stats': return (
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
      );
      case 'highlights': return (
        <Card sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
            <EmojiEventsIcon color="warning" /> Highlights & Rekorde
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="stretch">
            <Box sx={{ flex: 1, p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
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

            <Box sx={{ flex: 1, p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>LESE-MEILENSTEIN</Typography>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">{globalReadingAmount} Seiten</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Insgesamt gelesen in {formatTime(globalReadingSeconds)}. Weiter so!
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, p: 3, bgcolor: 'background.default', borderRadius: 3, border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>AKTUELLE TOP STREAKS</Typography>
              {topStreaks.length > 0 ? (
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
              ) : (
                <Typography color="text.secondary" sx={{ mt: 2 }}>Noch keine aktiven Streaks.</Typography>
              )}
            </Box>
          </Stack>
        </Card>
      );
      case 'chart': return (
        <Card sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
            <BarChartIcon color="primary" /> Aufgaben-Verlauf
          </Typography>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                <RechartsTooltip 
                  cursor={{ fill: theme.palette.action.hover }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: theme.shadows[4], backgroundColor: theme.palette.background.paper }}
                  labelStyle={{ color: theme.palette.text.secondary, marginBottom: '4px' }}
                />
                <Bar dataKey="count" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      );
      case 'tracker': return (
        <Card sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
              <CalendarMonthIcon color="success" /> Fortschritts-Tracker
            </Typography>
            
            <Select
              size="small"
              value={selectedTrackerTask}
              onChange={(e) => setSelectedTrackerTask(e.target.value)}
              sx={{ minWidth: 200, bgcolor: 'background.default', borderRadius: 2 }}
            >
              <MenuItem value="all"><em>Alle Aufgaben (Ø)</em></MenuItem>
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
            <Box sx={{ display: 'flex', gap: 2, minWidth: viewMode === 'month' ? '100%' : 800 }}>
              {months.map((monthDays, mIndex) => {
                if (monthDays.length === 0) return null;
                if (viewMode === 'month' && mIndex !== todayDate.getMonth()) return null;
                const monthName = format(monthDays[0], 'MMM', { locale: de });
                
                let hasSuccess = false;
                const allValid = monthDays.every(day => {
                  const { color } = evaluateDay(day);
                  if (color === 'success.main') hasSuccess = true;
                  return color === 'success.main' || color === 'background.default';
                });
                const isMonthPerfect = allValid && hasSuccess;

                return (
                  <Box key={mIndex} sx={{ flex: 1, minWidth: 100 }}>
                    <Typography 
                      variant="caption" 
                      color={isMonthPerfect ? 'success.main' : 'text.secondary'} 
                      sx={{ mb: 1, display: 'block', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => setExpandedMonthIndex(mIndex)}
                    >
                      {monthName} {isMonthPerfect && '⭐'}
                    </Typography>
                    <Box 
                      onClick={() => setExpandedMonthIndex(mIndex)}
                      sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)', 
                        gap: 0.5,
                        bgcolor: isMonthPerfect ? 'success.light' : 'background.default',
                        p: 1,
                        borderRadius: 2,
                        border: 1,
                        borderColor: isMonthPerfect ? 'success.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': { borderColor: 'primary.main' }
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
      );
      default: return null;
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

      {/* DASHBOARD WIDGETS WITH DND */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboardOrder} strategy={verticalListSortingStrategy}>
          {dashboardOrder.map(id => (
            <SortableDashboardItem key={id} id={id}>
              {renderWidget(id)}
            </SortableDashboardItem>
          ))}
        </SortableContext>
      </DndContext>

      {/* EXPANDED MONTH DIALOG */}
      <Dialog 
        open={expandedMonthIndex !== null} 
        onClose={() => setExpandedMonthIndex(null)}
        maxWidth="xs"
        fullWidth
      >
        {expandedMonthIndex !== null && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                {format(months[expandedMonthIndex][0], 'MMMM yyyy', { locale: de })}
              </Typography>
              <IconButton onClick={() => setExpandedMonthIndex(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              {selectedTrackerTask === 'all' && (
                <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                  Bitte wähle eine spezifische Aufgabe aus, um sie hier nachtragen zu können.
                </Typography>
              )}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: 1,
                mt: 2
              }}>
                {/* Wochentage Header */}
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                  <Typography key={d} variant="caption" align="center" color="text.secondary" fontWeight="bold">
                    {d}
                  </Typography>
                ))}
                
                {/* Leerfelder für den Start des Monats */}
                {Array.from({ length: (months[expandedMonthIndex][0].getDay() + 6) % 7 }).map((_, i) => (
                  <Box key={`empty-${i}`} />
                ))}

                {/* Tage */}
                {months[expandedMonthIndex].map((day, dIndex) => {
                  const { color, opacity, border } = evaluateDay(day);
                  const isFuture = isAfter(day, today);
                  const dateStr = format(day, 'yyyy-MM-dd');
                  
                  return (
                    <Box 
                      key={dIndex}
                      onClick={() => {
                        if (!isFuture && selectedTrackerTask !== 'all') {
                          toggleTaskCompletion(selectedTrackerTask, dateStr);
                        }
                      }}
                      sx={{ 
                        aspectRatio: '1/1',
                        bgcolor: color,
                        opacity,
                        borderRadius: 1,
                        border: 1,
                        borderColor: border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (!isFuture && selectedTrackerTask !== 'all') ? 'pointer' : 'default',
                        '&:hover': (!isFuture && selectedTrackerTask !== 'all') ? { opacity: 1, transform: 'scale(1.05)' } : {}
                      }}
                    >
                      <Typography variant="caption" sx={{ color: color === 'success.main' || color === 'error.main' || color === 'warning.main' ? 'white' : 'text.primary', fontWeight: 'bold' }}>
                        {format(day, 'd')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

    </Box>
  );
};

export default Review;
