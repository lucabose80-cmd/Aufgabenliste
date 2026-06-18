import React, { useState } from 'react';
import { format, eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Collapse, IconButton, Grid, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const YearTracker = () => {
  const { tasks, toggleTaskCompletion } = useTaskContext();
  const trackableTasks = tasks.filter(t => t.type !== 'general');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const today = startOfToday();
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  const months = Array.from({ length: 12 }, (_, i) => allDays.filter(d => getMonth(d) === i));

  const evaluateDay = (day, task) => {
    const isFuture = isAfter(day, today);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isCompleted = task.completedDates.includes(dateStr);

    if (task.type === 'daily') {
      if (isFuture) return { color: 'background.default', border: 'divider', opacity: 0.3 };
      if (isCompleted) return { color: 'success.main', border: 'success.dark', opacity: 1 };
      return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
    }

    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
    
    if (isFuture) return { color: 'background.default', border: 'divider', opacity: 0.3 };

    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    let completedCountInWeek = 0;
    daysInWeek.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      if (task.completedDates.includes(dStr)) completedCountInWeek++;
    });

    let target = 1;
    if (task.type === 'x-times') target = task.targetCount;
    if (task.type === 'specific-days') target = task.specificDays.length;

    const weekGoalMet = completedCountInWeek >= target;

    if (weekGoalMet) {
      return { color: 'success.main', border: 'success.dark', opacity: 1 };
    } else {
      if (isCompleted) {
        return { color: 'success.main', border: 'success.dark', opacity: 1 };
      }
      const isCurrentWeek = daysInWeek.some(d => isSameDay(d, today));
      if (isCurrentWeek && !weekGoalMet) {
        return { color: 'background.default', border: 'divider', opacity: 0.3 };
      }

      return { color: 'error.main', border: 'error.dark', opacity: 0.8 };
    }
  };

  const toggleExpand = (id) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const handleDayClick = (e, task, dateStr) => {
    e.stopPropagation();
    toggleTaskCompletion(task.id, dateStr);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 1000, mx: 'auto' }}>
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>Jahres-Tracker {currentYear}</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Klicke auf eine Aufgabe, um die detaillierte Monatsansicht zu öffnen.
        </Typography>

        {trackableTasks.length === 0 ? (
          <Typography color="text.secondary">Füge tägliche/wöchentliche Aufgaben hinzu, um den Tracker zu nutzen.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {trackableTasks.map(task => {
              const isExpanded = expandedTaskId === task.id;

              const daysMap = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 0: 'So' };
              const specificDaysString = task.type === 'specific-days' && task.specificDays 
                ? task.specificDays.map(d => daysMap[d]).join(', ') 
                : '';

              const getTypeLabel = () => {
                switch (task.type) {
                  case 'daily': return 'Täglich';
                  case 'weekly': return 'Einmal pro Woche';
                  case 'x-times': return `${task.targetCount}x pro Woche`;
                  case 'specific-days': return 'Bestimmte Tage';
                  case 'general': return 'Allgemeines To-Do';
                  default: return task.type;
                }
              };

              return (
                <Box 
                  key={task.id} 
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 2, 
                    p: 2, 
                    bgcolor: 'background.paper',
                    boxShadow: isExpanded ? 3 : 0,
                    transition: 'box-shadow 0.3s'
                  }}
                >
                  
                  <Box 
                    onClick={() => toggleExpand(task.id)}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer' 
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, mr: 2 }}>
                      <Typography variant="h6" fontWeight="bold">{task.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        Typ: {getTypeLabel()} {specificDaysString && `(${specificDaysString})`}
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      display: 'grid', 
                      gridAutoFlow: 'column', 
                      gridTemplateRows: 'repeat(7, 1fr)', 
                      gap: '1px', 
                      height: 28, 
                      overflow: 'hidden', 
                      ml: 'auto',
                      mr: 2,
                      opacity: isExpanded ? 0.5 : 1,
                      transition: 'opacity 0.3s'
                    }}>
                      {allDays.map((day, idx) => {
                        const style = evaluateDay(day, task);
                        return (
                          <Box 
                            key={idx}
                            sx={{
                              width: 3,
                              height: 3,
                              bgcolor: style.color,
                              opacity: style.opacity,
                              borderRadius: '1px'
                            }}
                          />
                        );
                      })}
                    </Box>

                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                      <Grid container spacing={3}>
                        {months.map((monthDays, idx) => {
                          const monthName = format(new Date(currentYear, idx, 1), 'MMM', { locale: de });
                          
                          return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">{monthName}</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                  {monthDays.map((day, dIdx) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const style = evaluateDay(day, task);
                                    
                                    return (
                                      <Tooltip title={dateStr} key={dIdx} arrow placement="top">
                                        <Box 
                                          onClick={(e) => handleDayClick(e, task, dateStr)}
                                          sx={{
                                            width: '100%',
                                            aspectRatio: '1/1',
                                            borderRadius: '2px',
                                            bgcolor: style.color,
                                            opacity: style.opacity,
                                            cursor: 'pointer',
                                            '&:hover': {
                                              opacity: 1,
                                              transform: 'scale(1.1)'
                                            },
                                            transition: 'transform 0.1s'
                                          }}
                                        />
                                      </Tooltip>
                                    );
                                  })}
                                </Box>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Collapse>

                </Box>
              );
            })}
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default YearTracker;
