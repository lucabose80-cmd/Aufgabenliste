import React, { useState, useRef, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, subDays, subHours, isSameWeek } from 'date-fns';
import { de } from 'date-fns/locale';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Card, Typography, LinearProgress, IconButton, Button, Checkbox, Tooltip as MuiTooltip, Collapse, Select, MenuItem, Dialog, DialogContent, InputBase, Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloseIcon from '@mui/icons-material/Close';
import TaskCreator from './TaskCreator';

const SortableTaskItem = ({ task, isWrongDay, isEditMode, onEdit, onDelete, setGlobalEditMode, isCompact = false }) => {
  const timerRef = useRef(null);
  const touchStartRef = useRef(null);
  const longPressedRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const clearLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e) => {
    if (isEditMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressedRef.current = false;
    clearLongPress();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      setGlobalEditMode(true);
    }, 550);
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === 'mouse') {
      clearLongPress();
    }
  };

  const handleTouchStart = (e) => {
    if (isEditMode) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || isEditMode) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      clearLongPress();
    }
    // only if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      setSwipeOffset(deltaX);
    }
  };

  const { toggleTaskCompletion, toggleSubTask, updateTask, categories, getTodayDateString, resetHour } = useTaskContext();

  const handleTouchEnd = () => {
    clearLongPress();
    if (!touchStartRef.current || isEditMode) return;
    if (swipeOffset > 80) {
      // Swipe Right -> Complete
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
      toggleTaskCompletion(task.id);
    } else if (swipeOffset < -80) {
      // Swipe Left -> Edit
      onEdit(task);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
  };

  const [expanded, setExpanded] = useState(false);
  const hasValidCategory = categories.some(c => c.id === task.categoryId);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const dndTransform = CSS.Transform.toString(transform) || '';
  const style = {
    transform: dndTransform + (swipeOffset ? ` translateX(${swipeOffset}px)` : ''),
    transition: isDragging ? transition : (swipeOffset ? 'none' : 'transform 0.2s'),
    opacity: isDragging ? 0.5 : ((task.isCompleted || isWrongDay) ? 0.5 : 1),
    position: 'relative',
    zIndex: isDragging ? 999 : 1,
  };

  const today = getTodayDateString();
  const isCompleted = task.type === 'general' ? (task.completedDates || []).length > 0 : (task.completedDates || []).includes(today);
  
  const totalSubTasksCount = task.subTasks.length;
  const completedSubTasksCount = task.subTasks.filter(st => st.completed).length;
  const allSubTasksCompleted = totalSubTasksCount === 0 || completedSubTasksCount === totalSubTasksCount;
  const progressPercentage = totalSubTasksCount > 0 ? Math.round((completedSubTasksCount / totalSubTasksCount) * 100) : 0;

  const daysMap = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 0: 'So' };
  const specificDaysString = task.type === 'specific-days' && task.specificDays 
    ? task.specificDays.map(d => daysMap[d]).join(', ') 
    : '';

  const completedByToday = task.isShared && task.completedByMap && task.completedByMap[today];

  const getXTimesCompletionsThisWeek = () => {
    if (task.type !== 'x-times' || !task.completedDates) return 0;
    const now = subHours(new Date(), resetHour || 3);
    return task.completedDates.filter(dateStr => {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(year, month - 1, day);
      return isSameWeek(date, now, { weekStartsOn: 1 });
    }).length;
  };

  const getTypeLabel = () => {
    switch (task.type) {
      case 'daily': return 'Täglich';
      case 'weekly': return 'Einmal pro Woche';
      case 'x-times': 
        const count = getXTimesCompletionsThisWeek();
        return `${count}/${task.targetCount}x pro Woche`;
      case 'specific-days': return 'Bestimmte Tage';
      case 'general': return 'Allgemeines To-Do';
      default: return task.type;
    }
  };

  const calculateStreak = () => {
    if (task.type === 'general') return 0;
    const completedDates = task.completedDates || [];
    if (completedDates.length === 0) return 0;

    let streak = 0;
    const now = subHours(new Date(), resetHour || 3);
    const todayStr = format(now, 'yyyy-MM-dd');
    let createdStr = task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd') : null;

    if (task.type === 'daily' || task.type === 'specific-days') {
      let checkDate = now;
      const isScheduled = (d) => {
        if (task.type === 'daily') return true;
        if (task.type === 'specific-days') return task.specificDays.includes(d.getDay());
        return false;
      };

      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const completed = completedDates.includes(dateStr);
        const scheduled = isScheduled(checkDate);

        if (scheduled) {
          if (completed) {
            streak++;
          } else {
            if (dateStr === todayStr) {
              // Grace period
            } else {
              break;
            }
          }
        } else {
          if (completed) {
            streak++;
          }
        }

        checkDate = subDays(checkDate, 1);

        if (createdStr && format(checkDate, 'yyyy-MM-dd') < createdStr) {
          break;
        } else if (streak > 3650) {
          break;
        }
      }
    } else if (task.type === 'weekly' || task.type === 'x-times') {
      const target = task.type === 'weekly' ? 1 : (task.targetCount || 1);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      let currentMonday = new Date(now.getFullYear(), now.getMonth(), diff);
      currentMonday.setHours(0,0,0,0);
      
      let isCurrentWeek = true;

      while (true) {
        let count = 0;
        for (let i = 0; i < 7; i++) {
          const dStr = format(new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + i), 'yyyy-MM-dd');
          if (completedDates.includes(dStr)) count++;
        }
        
        if (count >= target) {
          streak++;
        } else {
          if (isCurrentWeek) {
            // Grace period: week is not over yet
          } else {
            break;
          }
        }

        isCurrentWeek = false;
        currentMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7);
        
        if (createdStr) {
           const sundayStr = format(new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + 6), 'yyyy-MM-dd');
           if (sundayStr < createdStr) break;
        } else if (streak > 520) {
           break;
        }
      }
    }
    return streak;
  };

  const getConsistencyScore = () => {
    if (!task.createdAt || task.type === 'general') return null;
    const createdAtDate = new Date(task.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const createdDay = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), createdAtDate.getDate());

    const isCompletedToday = (task.completedDates || []).some(dateStr => {
      const d = new Date(dateStr);
      return d.getFullYear() === today.getFullYear() && 
             d.getMonth() === today.getMonth() && 
             d.getDate() === today.getDate();
    });

    const calendarDaysPast = Math.max(0, Math.floor((today - createdDay) / (1000 * 60 * 60 * 24)));
    const daysSinceCreation = isCompletedToday ? calendarDaysPast + 1 : calendarDaysPast;
    
    if (daysSinceCreation === 0) return 100;
    
    const totalDays = Math.min(30, daysSinceCreation);
    
    let expectedCompletions = 1;
    const completedCount = (task.completedDates || []).filter(dateStr => {
      const d = new Date(dateStr);
      const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const daysAgo = Math.floor((today - dDay) / (1000 * 60 * 60 * 24));
      
      if (isCompletedToday) {
        return daysAgo >= 0 && daysAgo < totalDays;
      } else {
        return daysAgo > 0 && daysAgo <= totalDays;
      }
    }).length;

    switch (task.type) {
      case 'daily':
        expectedCompletions = totalDays;
        break;
      case 'weekly':
        expectedCompletions = Math.max(1, Math.floor(totalDays / 7));
        break;
      case 'x-times':
        expectedCompletions = Math.max(1, Math.floor((totalDays / 7) * task.targetCount));
        break;
      case 'specific-days':
        let specificDaysCount = 0;
        for (let i = 0; i < totalDays; i++) {
          const offset = isCompletedToday ? i : i + 1;
          const d = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
          if (task.specificDays.includes(d.getDay())) specificDaysCount++;
        }
        expectedCompletions = Math.max(1, specificDaysCount);
        break;
      default:
        return null;
    }

    const consistency = Math.min(100, Math.round((completedCount / expectedCompletions) * 100));
    return consistency;
  };

  const streak = calculateStreak();
  const consistencyScore = getConsistencyScore();

  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const swipeTint =
    swipeOffset > 30
      ? alpha(muiTheme.palette.success.main, isDark ? 0.16 : 0.08)
      : swipeOffset < -30
      ? alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.08)
      : undefined;

  return (
    <Card 
      ref={setNodeRef} 
      className={isEditMode ? 'jiggle-mode' : ''}
      style={style} 
      elevation={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        borderRadius: '20px',
        mb: 0,
        bgcolor: swipeTint || 'background.paper',
        border: '1px solid',
        borderColor: isDragging
          ? 'primary.main'
          : (swipeOffset > 30
            ? alpha(muiTheme.palette.success.main, 0.45)
            : (swipeOffset < -30
              ? alpha(muiTheme.palette.primary.main, 0.45)
              : 'divider')),
        boxShadow: isDragging
          ? (isDark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 28px rgba(0,0,0,0.12)')
          : (isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)'),
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        '& *': {
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
        transition: isDragging
          ? undefined
          : 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
        '&:hover': !isEditMode ? {
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(31,31,31,0.16)',
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.28)'
            : '0 4px 14px rgba(0,0,0,0.06)',
        } : {},
      }}
    >
      {/* Subtle category indicator pill on left edge */}
      {task.categoryColor && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 16,
            bottom: 16,
            width: 3.5,
            borderRadius: '0 4px 4px 0',
            bgcolor: task.categoryColor,
            opacity: isCompleted ? 0.35 : 0.85,
            pointerEvents: 'none',
          }}
        />
      )}

      {isEditMode && (
        <Box 
          {...attributes} 
          {...listeners} 
          sx={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'grab', touchAction: 'none', borderRadius: '20px' }}
        />
      )}
      {isEditMode && (
        <IconButton 
          size="small" 
          color="error" 
          onClick={(e) => { e.stopPropagation(); onDelete(task); }} 
          sx={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 30,
            height: 30,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.12)',
            '&:hover': { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' },
            zIndex: 10,
          }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      {isEditMode && (
        <IconButton 
          size="small" 
          color="primary" 
          onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
          sx={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 30,
            height: 30,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.12)',
            '&:hover': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' },
            zIndex: 10,
          }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      <Box sx={{ flexGrow: 1, px: isCompact ? { xs: 1.35, sm: 2 } : 2, py: isCompact ? { xs: 1.35, sm: 1.75 } : 1.75, display: 'flex', flexDirection: 'column', pointerEvents: isEditMode ? 'none' : 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: isCompact ? { xs: 0.75, sm: 1.25 } : 1.25 }}>
          {!isEditMode && (
            <Checkbox
              checked={isCompleted}
              onChange={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                toggleTaskCompletion(task.id);
              }}
              disabled={!allSubTasksCompleted && task.subTasks.length > 0}
              icon={<RadioButtonUncheckedIcon sx={{ fontSize: isCompact ? { xs: 19, sm: 22 } : 22, color: 'text.secondary', opacity: 0.7 }} />}
              checkedIcon={<CheckCircleIcon sx={{ fontSize: isCompact ? { xs: 19, sm: 22 } : 22, color: 'success.main' }} />}
              sx={{
                p: 0.25,
                mt: 0.1,
                transition: 'transform 0.15s ease',
                '&:active': { transform: 'scale(0.88)' },
              }}
            />
          )}
          
          <Box
            sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => {
              if (longPressedRef.current) {
                longPressedRef.current = false;
                return;
              }
              setExpanded(!expanded);
            }}
          >
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                fontSize: isCompact ? { xs: '0.84rem', sm: '0.96rem' } : '0.96rem',
                lineHeight: 1.35,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'text.secondary' : 'text.primary',
                wordBreak: 'break-word',
              }}
            >
              {task.title}
            </Typography>

            {/* Unified metadata pill row */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.2,
                  borderRadius: 9999,
                  bgcolor: 'background.surfaceVariant',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {getTypeLabel()}{specificDaysString ? ` · ${specificDaysString}` : ''}
              </Box>

              {streak > 0 && (
                <MuiTooltip title={`${streak} ${(task.type === 'weekly' || task.type === 'x-times') ? 'Wochen' : 'Tage'} in Folge!`}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.25,
                      px: 0.9,
                      py: 0.2,
                      borderRadius: 9999,
                      bgcolor: alpha(muiTheme.palette.warning.main, isDark ? 0.18 : 0.14),
                      color: isDark ? '#FDD663' : '#C25E00',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      lineHeight: 1.4,
                    }}
                  >
                    <LocalFireDepartmentIcon sx={{ fontSize: 13 }} />
                    {streak}
                  </Box>
                </MuiTooltip>
              )}

              {consistencyScore !== null && (
                <MuiTooltip title={`Zuverlässigkeit der letzten ${Math.min(30, Math.max(1, Math.floor((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24))))} Tage`}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 0.9,
                      py: 0.2,
                      borderRadius: 9999,
                      bgcolor: alpha(
                        consistencyScore >= 80
                          ? muiTheme.palette.success.main
                          : (consistencyScore >= 50 ? muiTheme.palette.warning.main : muiTheme.palette.error.main),
                        isDark ? 0.16 : 0.12
                      ),
                      color:
                        consistencyScore >= 80
                          ? 'success.main'
                          : (consistencyScore >= 50 ? 'warning.main' : 'error.main'),
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {consistencyScore}%
                  </Box>
                </MuiTooltip>
              )}

              {task.isShared && (
                <MuiTooltip title="Geteilte Aufgabe">
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.4,
                      px: 0.85,
                      py: 0.2,
                      borderRadius: 9999,
                      bgcolor: alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.1),
                      color: 'primary.main',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    <GroupIcon sx={{ fontSize: 13 }} />
                    {completedByToday && isCompleted ? completedByToday : 'Geteilt'}
                  </Box>
                </MuiTooltip>
              )}
            </Box>

            {!hasValidCategory && categories.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Select
                  value=""
                  displayEmpty
                  size="small"
                  onChange={(e) => {
                    if (e.target.value) {
                      updateTask(task.id, { categoryId: e.target.value });
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ 
                    minWidth: 150, 
                    fontSize: '0.75rem', 
                    height: 28,
                    bgcolor: 'background.surfaceVariant',
                    borderRadius: 9999,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' }
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.75rem' }}>Kategorie zuweisen...</MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            {totalSubTasksCount > 0 && (
              <Box sx={{ mt: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
                    Teilaufgaben
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {completedSubTasksCount}/{totalSubTasksCount} · {progressPercentage}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 5, borderRadius: 9999 }} />
              </Box>
            )}
          </Box>
          
          {(task.subTasks.length > 0 || task.type !== 'general') && (
            <IconButton
              onClick={() => setExpanded(!expanded)}
              size="small"
              sx={{
                mt: -0.25,
                p: isCompact ? { xs: 0.25, sm: 0.5 } : 0.5,
                color: 'text.secondary',
                transform: (!isCompact && expanded) ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.22s ease, background-color 0.2s ease',
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {!isCompact && (
          <Collapse in={expanded} timeout={220}>
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: '14px',
                bgcolor: 'background.surfaceVariant',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {task.subTasks.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {[...task.subTasks].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)).map(st => (
                    <Box
                      key={st.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.35,
                        px: 0.5,
                        borderRadius: '10px',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        },
                      }}
                    >
                      <Checkbox
                        checked={st.completed}
                        onChange={() => {
                          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                          toggleSubTask(task.id, st.id);
                        }}
                        size="small"
                        icon={<RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                        checkedIcon={<CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />}
                        sx={{ p: 0.25 }}
                      />
                      <Typography 
                        variant="body2"
                        sx={{ 
                          fontSize: '0.84rem',
                          textDecoration: st.completed ? 'line-through' : 'none',
                          color: st.completed ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {st.title}
                        {st.completed && task.isShared && st.completedBy && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                            (von {st.completedBy})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {task.type !== 'general' && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    Letzte 7 Tage
                  </Typography>
                  <Box 
                    sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, overflowX: 'auto' }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                      const baseDate = subHours(new Date(), resetHour || 3);
                      const d = subDays(baseDate, daysAgo);
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const isDone = (task.completedDates || []).includes(dateStr);
                      const isScheduled = task.type !== 'specific-days' || (task.specificDays || []).includes(d.getDay());
                      const shortDay = format(d, 'EE', { locale: de });
                      const shortDate = format(d, 'dd.MM');
                      const isToday = daysAgo === 0;
                      return (
                        <Box 
                          key={dateStr}
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                            toggleTaskCompletion(task.id, dateStr);
                          }}
                          sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            minWidth: 36,
                            cursor: 'pointer',
                            '&:hover .day-circle': {
                              transform: 'scale(1.1)',
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: isToday ? 700 : 500,
                              color: isToday ? 'primary.main' : 'text.secondary',
                            }}
                          >
                            {shortDay}
                          </Typography>
                          <Box 
                            className="day-circle"
                            sx={{ 
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: isDone
                                ? 'success.main'
                                : (!isScheduled ? 'transparent' : 'background.paper'),
                              color: isDone ? (isDark ? '#131314' : '#FFFFFF') : 'text.disabled',
                              border: (!isScheduled && !isDone) ? 'none' : '1.5px solid',
                              borderColor: isDone
                                ? 'success.main'
                                : (isToday ? 'primary.main' : 'divider'),
                              my: 0.5,
                              transition: 'transform 0.15s ease, background-color 0.2s ease',
                            }}
                          >
                            {isDone ? (
                              <CheckIcon sx={{ fontSize: 16, strokeWidth: 2 }} />
                            ) : (!isScheduled ? (
                              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'divider' }} />
                            ) : null)}
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                            {shortDate}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        )}

        {isCompact && (
          <Dialog
            open={expanded}
            onClose={() => setExpanded(false)}
            maxWidth="xs"
            fullWidth
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <DialogContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5 }}>
                <Checkbox
                  checked={isCompleted}
                  onChange={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                    toggleTaskCompletion(task.id);
                  }}
                  disabled={!allSubTasksCompleted && task.subTasks.length > 0}
                  icon={<RadioButtonUncheckedIcon sx={{ fontSize: 22, color: 'text.secondary', opacity: 0.7 }} />}
                  checkedIcon={<CheckCircleIcon sx={{ fontSize: 22, color: 'success.main' }} />}
                  sx={{ p: 0.25, mt: 0.1 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {task.categoryColor && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: task.categoryColor, flexShrink: 0 }} />
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        lineHeight: 1.3,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        color: isCompleted ? 'text.secondary' : 'text.primary',
                        wordBreak: 'break-word',
                      }}
                    >
                      {task.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1,
                        py: 0.2,
                        borderRadius: 9999,
                        bgcolor: 'background.surfaceVariant',
                        color: 'text.secondary',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                      }}
                    >
                      {getTypeLabel()}{specificDaysString ? ` · ${specificDaysString}` : ''}
                    </Box>
                    {streak > 0 && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.25,
                          px: 0.9,
                          py: 0.2,
                          borderRadius: 9999,
                          bgcolor: alpha(muiTheme.palette.warning.main, isDark ? 0.18 : 0.14),
                          color: isDark ? '#FDD663' : '#C25E00',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        <LocalFireDepartmentIcon sx={{ fontSize: 13 }} />
                        {streak}
                      </Box>
                    )}
                    {consistencyScore !== null && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 0.9,
                          py: 0.2,
                          borderRadius: 9999,
                          bgcolor: alpha(
                            consistencyScore >= 80
                              ? muiTheme.palette.success.main
                              : (consistencyScore >= 50 ? muiTheme.palette.warning.main : muiTheme.palette.error.main),
                            isDark ? 0.16 : 0.12
                          ),
                          color:
                            consistencyScore >= 80
                              ? 'success.main'
                              : (consistencyScore >= 50 ? 'warning.main' : 'error.main'),
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {consistencyScore}%
                      </Box>
                    )}
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: 'text.secondary', mt: -0.5, mr: -0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {totalSubTasksCount > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', fontWeight: 500 }}>
                      Teilaufgaben
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {completedSubTasksCount}/{totalSubTasksCount} · {progressPercentage}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 5, borderRadius: 9999 }} />
                </Box>
              )}

              {(task.subTasks.length > 0 || task.type !== 'general') && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '16px',
                    bgcolor: 'background.surfaceVariant',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {task.subTasks.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {[...task.subTasks].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)).map(st => (
                        <Box
                          key={st.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.35,
                            px: 0.5,
                            borderRadius: '10px',
                          }}
                        >
                          <Checkbox
                            checked={st.completed}
                            onChange={() => {
                              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                              toggleSubTask(task.id, st.id);
                            }}
                            size="small"
                            icon={<RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                            checkedIcon={<CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />}
                            sx={{ p: 0.25 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.86rem',
                              textDecoration: st.completed ? 'line-through' : 'none',
                              color: st.completed ? 'text.secondary' : 'text.primary',
                            }}
                          >
                            {st.title}
                            {st.completed && task.isShared && st.completedBy && (
                              <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                                (von {st.completedBy})
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {task.type !== 'general' && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                      >
                        Letzte 7 Tage
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, overflowX: 'auto' }}>
                        {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                          const baseDate = subHours(new Date(), resetHour || 3);
                          const d = subDays(baseDate, daysAgo);
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const isDone = (task.completedDates || []).includes(dateStr);
                          const isScheduled = task.type !== 'specific-days' || (task.specificDays || []).includes(d.getDay());
                          const shortDay = format(d, 'EE', { locale: de });
                          const shortDate = format(d, 'dd.MM');
                          const isToday = daysAgo === 0;
                          return (
                            <Box
                              key={dateStr}
                              onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 40, 60]);
                                toggleTaskCompletion(task.id, dateStr);
                              }}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: 36,
                                cursor: 'pointer',
                                '&:hover .day-circle': { transform: 'scale(1.1)' },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: isToday ? 700 : 500,
                                  color: isToday ? 'primary.main' : 'text.secondary',
                                }}
                              >
                                {shortDay}
                              </Typography>
                              <Box
                                className="day-circle"
                                sx={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: isDone
                                    ? 'success.main'
                                    : (!isScheduled ? 'transparent' : 'background.paper'),
                                  color: isDone ? (isDark ? '#131314' : '#FFFFFF') : 'text.disabled',
                                  border: (!isScheduled && !isDone) ? 'none' : '1.5px solid',
                                  borderColor: isDone
                                    ? 'success.main'
                                    : (isToday ? 'primary.main' : 'divider'),
                                  my: 0.5,
                                  transition: 'transform 0.15s ease, background-color 0.2s ease',
                                }}
                              >
                                {isDone ? (
                                  <CheckIcon sx={{ fontSize: 16, strokeWidth: 2 }} />
                                ) : (!isScheduled ? (
                                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'divider' }} />
                                ) : null)}
                              </Box>
                              <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                                {shortDate}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<EditIcon fontSize="small" />}
                  onClick={() => {
                    setExpanded(false);
                    onEdit(task);
                  }}
                  sx={{ borderRadius: 9999, color: 'text.secondary', px: 1.5 }}
                >
                  Bearbeiten
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setExpanded(false)}
                  sx={{ borderRadius: 9999, px: 2, borderColor: 'divider', color: 'text.primary' }}
                >
                  Schließen
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
        )}
      </Box>
    </Card>
  );
};

const TaskGrid = () => {
  const { tasks, categories, getTodayDateString, reorderTasks, reorderCategories, resetHour, deleteTask, vacationMode, taskColumns } = useTaskContext();
  const [showCompleted, setShowCompleted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const displayGroups = categories.map(cat => ({
    id: cat.id,
    label: cat.name,
    color: cat.color
  }));

  displayGroups.push({ id: 'uncategorized', label: 'Ohne Kategorie', color: 'text.secondary' });

  const today = getTodayDateString();
  const dayOfWeek = subHours(new Date(), resetHour || 3).getDay();

  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('collapsedCategories')) || {};
    } catch {
      return {};
    }
  });

  const toggleCategory = (groupId) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('collapsedCategories', JSON.stringify(next));
      return next;
    });
  };

  const mappedTasks = tasks.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const isWrongDay = t.type === 'specific-days' && !t.specificDays.includes(dayOfWeek);
    const isCompletedToday = (t.completedDates || []).includes(today) || (t.isShared && t.completedByMap && t.completedByMap[today]);
    return { ...t, categoryColor: cat ? cat.color : undefined, isWrongDay, isCompletedToday };
  });

  const activeTasks = mappedTasks.filter(t => {
    if (t.isWrongDay) return false; 
    if (t.isCompletedToday) return false;
    return true;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  const doneTasks = mappedTasks.filter(t => {
    if (t.type === 'general' && (t.completedDates || []).length > 0) return false;
    if (!t.isCompletedToday) return false;
    return true;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  const allTasksForToday = tasks.filter(t => (t.type !== 'general' || t.isShared) && t.type !== 'weekly' && t.type !== 'x-times' && (t.type !== 'specific-days' || (t.specificDays && t.specificDays.includes(dayOfWeek))));
  const totalTasks = allTasksForToday.length;
  const completedTasks = allTasksForToday.filter(t => (t.completedDates || []).includes(today) || (t.isShared && t.completedByMap && t.completedByMap[today])).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const getPerfectDays = () => {
    return [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
      const d = subDays(subHours(new Date(), resetHour || 3), daysAgo);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dow = d.getDay();
      
      const trackable = tasks.filter(t => {
        if ((!t.isShared && t.type === 'general') || t.type === 'weekly' || t.type === 'x-times') return false;
        if (t.createdAt && dateStr < format(new Date(t.createdAt), 'yyyy-MM-dd')) return false;
        if (t.type === 'specific-days' && t.specificDays && !t.specificDays.includes(dow)) return false;
        return true;
      });

      if (trackable.length === 0) return { dateStr, perfect: false };
      const isPerfect = trackable.every(t => (t.completedDates || []).includes(dateStr) || (t.isShared && t.completedByMap && t.completedByMap[dateStr]));
      return { dateStr, perfect: isPerfect };
    });
  };
  const perfectDays = getPerfectDays();
  const allPerfect = perfectDays.every(d => d.perfect);

  const getMonthlyScore = () => {
    let possibleCompletions = 0;
    let actualCompletions = 0;
    const baseDate = subHours(new Date(), resetHour || 3);
    
    for (let i = 0; i < 30; i++) {
      const d = subDays(baseDate, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dow = d.getDay();
      
      const trackable = tasks.filter(t => {
          if ((!t.isShared && t.type === 'general') || t.type === 'weekly' || t.type === 'x-times') return false;
        if (t.createdAt && dateStr < format(new Date(t.createdAt), 'yyyy-MM-dd')) return false;
        if (t.type === 'specific-days' && t.specificDays && !t.specificDays.includes(dow)) return false;
        return true;
      });

      possibleCompletions += trackable.length;
      trackable.forEach(t => {
        if ((t.completedDates || []).includes(dateStr) || (t.isShared && t.completedByMap && t.completedByMap[dateStr])) {
          actualCompletions++;
        }
      });
    }

    if (possibleCompletions === 0) return null;
    return Math.round((actualCompletions / possibleCompletions) * 100);
  };

  const monthScore = getMonthlyScore();
  let badgeInfo = null;
  if (monthScore !== null) {
    if (monthScore >= 90) badgeInfo = { label: 'S-Tier', color: '#ffd700', icon: '🌟' };
    else if (monthScore >= 75) badgeInfo = { label: 'Gold', color: '#ffb347', icon: '🏆' };
    else if (monthScore >= 50) badgeInfo = { label: 'Silber', color: '#c0c0c0', icon: '🥈' };
    else badgeInfo = { label: 'Bronze', color: '#cd7f32', icon: '🥉' };
  }

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const getHistoricalMonths = () => {
    const history = [];
    const baseDate = subHours(new Date(), resetHour || 3);
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth();

    for (let i = 0; i < 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let possibleCompletions = 0;
      let actualCompletions = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(y, m, day);
        if (d > baseDate) continue;

        const dateStr = format(d, 'yyyy-MM-dd');
        const dow = d.getDay();
        
        const trackable = tasks.filter(t => {
            if ((!t.isShared && t.type === 'general') || t.type === 'weekly' || t.type === 'x-times') return false;
          if (t.createdAt && dateStr < format(new Date(t.createdAt), 'yyyy-MM-dd')) return false;
          if (t.type === 'specific-days' && t.specificDays && !t.specificDays.includes(dow)) return false;
          return true;
        });

        possibleCompletions += trackable.length;
        trackable.forEach(t => {
          if ((t.completedDates || []).includes(dateStr) || (t.isShared && t.completedByMap && t.completedByMap[dateStr])) {
            actualCompletions++;
          }
        });
      }

      if (possibleCompletions > 0) {
        const score = Math.round((actualCompletions / possibleCompletions) * 100);
        let badge = { label: 'Bronze', color: '#cd7f32', icon: '🥉' };
        if (score >= 90) badge = { label: 'S-Tier', color: '#ffd700', icon: '🌟' };
        else if (score >= 75) badge = { label: 'Gold', color: '#ffb347', icon: '🏆' };
        else if (score >= 50) badge = { label: 'Silber', color: '#c0c0c0', icon: '🥈' };
        
        history.push({
          id: `${y}-${m}`,
          monthName: format(new Date(y, m, 1), 'MMMM yyyy', { locale: de }),
          score,
          badge
        });
      }
    }
    return history;
  };

  const [quickAddText, setQuickAddText] = useState('');
  const { addTask } = useTaskContext();
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;
    await addTask({
      title: quickAddText.trim(),
      type: 'general',
      categoryId: categories[0]?.id || '1',
      targetCount: 1,
      specificDays: []
    });
    setQuickAddText('');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTasks(active.id, over.id);
    }
  };

  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const formattedToday = format(subHours(new Date(), resetHour || 3), 'EEEE, d. MMMM', { locale: de });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
      {!isOnline && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: alpha(muiTheme.palette.error.main, isDark ? 0.18 : 0.1),
            color: 'error.main',
            border: '1px solid',
            borderColor: alpha(muiTheme.palette.error.main, 0.3),
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <WifiOffIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            Du bist offline. Aufgaben können derzeit nicht synchronisiert werden. Nur die Lesegeschwindigkeit ist verfügbar.
          </Typography>
        </Box>
      )}

      {isEditMode && (
        <Box
          sx={{
            position: 'sticky',
            top: 8,
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 1.25,
              px: 2,
              py: 1,
              borderRadius: 9999,
              bgcolor: isDark ? alpha('#1E1F20', 0.94) : alpha('#FFFFFF', 0.94),
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: isDark ? '0 8px 28px rgba(0,0,0,0.45)' : '0 8px 24px rgba(0,0,0,0.1)',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ px: 0.75, display: { xs: 'none', sm: 'block' } }}>
              Bearbeitungsmodus
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setIsCreatingNew(true)}
              sx={{ borderRadius: 9999 }}
            >
              Neue Aufgabe
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => setIsEditMode(false)}
              sx={{ borderRadius: 9999 }}
            >
              Fertig
            </Button>
          </Box>
        </Box>
      )}

      {/* Google One Style Daily Progress Hero Card */}
      {!vacationMode && totalTasks > 0 && (
        <Card
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.78rem', display: 'block', mb: 0.25 }}>
                {formattedToday}
              </Typography>
              <MuiTooltip title="Dein Tagesziel umfasst nur wiederkehrende Routinen (z.B. täglich oder an bestimmten Tagen). Allgemeine To-Dos werden hier nicht mitgezählt, damit sie deine tägliche Serie nicht blockieren.">
                <Typography variant="h5" sx={{ fontWeight: 700, cursor: 'help', display: 'inline-block' }}>
                  Tagesziel
                </Typography>
              </MuiTooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: progressPercent === 100 ? 'success.main' : 'primary.main',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {progressPercent}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                ({completedTasks}/{totalTasks})
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progressPercent}
            color={progressPercent === 100 ? 'success' : 'primary'}
            sx={{ height: 10, borderRadius: 9999 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <MuiTooltip title={allPerfect ? 'Perfekte Woche!' : 'Perfekte Tage (Letzte 7 Tage)'}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 9999,
                  bgcolor: 'background.surfaceVariant',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5, fontSize: '0.72rem' }}>
                  7 Tage
                </Typography>
                {perfectDays.map((d) => (
                  <LocalFireDepartmentIcon
                    key={d.dateStr}
                    sx={{
                      fontSize: '1.05rem',
                      color: d.perfect ? (allPerfect ? '#F9AB00' : 'warning.main') : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(31,31,31,0.16)'),
                      filter: (allPerfect && d.perfect) ? 'drop-shadow(0 0 4px rgba(249, 171, 0, 0.6))' : 'none',
                      transform: (allPerfect && d.perfect) ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                    }}
                  />
                ))}
              </Box>
            </MuiTooltip>

            {badgeInfo && (
              <MuiTooltip title={`Deine Konstanz der letzten 30 Tage liegt bei ${monthScore}%. Klicken für Trophäen-Wand.`}>
                <Chip
                  onClick={() => setHistoryModalOpen(true)}
                  size="small"
                  icon={<span style={{ fontSize: '13px', marginLeft: 8 }}>{badgeInfo.icon}</span>}
                  label={`${monthScore}% ${badgeInfo.label}`}
                  sx={{
                    height: 30,
                    px: 0.5,
                    fontSize: '0.76rem',
                    bgcolor: alpha(badgeInfo.color, isDark ? 0.18 : 0.16),
                    color: isDark ? badgeInfo.color : '#5C4200',
                    border: '1px solid',
                    borderColor: alpha(badgeInfo.color, 0.35),
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(badgeInfo.color, isDark ? 0.28 : 0.25),
                      transform: 'translateY(-1px)',
                    },
                  }}
                />
              </MuiTooltip>
            )}
          </Box>
        </Card>
      )}

      {/* Unified Pill Quick-Add Bar */}
      <Box
        component="form"
        onSubmit={handleQuickAdd}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 2.5,
          pr: 0.75,
          py: 0.65,
          borderRadius: 9999,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: `0 0 0 3px ${alpha(muiTheme.palette.primary.main, isDark ? 0.2 : 0.12)}`,
          },
        }}
      >
        <InputBase
          fullWidth
          placeholder="Schnelle Aufgabe hinzufügen..."
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          sx={{
            fontSize: '0.94rem',
            color: 'text.primary',
            '& input::placeholder': {
              color: 'text.secondary',
              opacity: 0.85,
            },
          }}
        />
        <IconButton
          type="submit"
          aria-label="Aufgabe hinzufügen"
          sx={{
            width: 38,
            height: 38,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Main Task Categories & Grid */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pointerEvents: !isOnline ? 'none' : 'auto', opacity: !isOnline ? 0.7 : 1 }}>
        {vacationMode ? (
          <Card
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              borderRadius: '24px',
              bgcolor: alpha(muiTheme.palette.primary.main, isDark ? 0.14 : 0.08),
              borderColor: alpha(muiTheme.palette.primary.main, 0.25),
            }}
          >
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              🏖️ Urlaubsmodus ist aktiv
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
              Genieße deinen Urlaub! Aufgaben werden nicht angezeigt und deine Streaks bleiben erhalten.
            </Typography>
          </Card>
        ) : (
          <>
            {displayGroups
              .sort((a, b) => {
                if (a.id === 'uncategorized') return 1;
                if (b.id === 'uncategorized') return -1;
                const catA = categories.find(c => c.id === a.id);
                const catB = categories.find(c => c.id === b.id);
                return (catA?.order || 0) - (catB?.order || 0);
              })
              .map((group, groupIndex, arr) => {
                const catTasks = activeTasks.filter(t => {
                  if (group.id === 'uncategorized') {
                    return !categories.find(c => c.id === t.categoryId);
                  }
                  return t.categoryId === group.id;
                });
                if (catTasks.length === 0) return null;

                const isFirstCat = groupIndex === 0;
                const isLastCat = groupIndex === arr.length - 1 || (groupIndex === arr.length - 2 && arr[arr.length - 1].id === 'uncategorized');
                const isCollapsed = !!collapsedCategories[group.id];

                return (
                  <Box key={group.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                      <Box
                        onClick={() => toggleCategory(group.id)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1.25,
                          cursor: 'pointer',
                          userSelect: 'none',
                          py: 0.5,
                          pr: 1.5,
                          borderRadius: 9999,
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          },
                        }}
                      >
                        <ExpandMoreIcon
                          fontSize="small"
                          sx={{
                            color: 'text.secondary',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: group.color !== 'text.secondary' ? group.color : 'text.secondary',
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
                          {group.label}
                        </Typography>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.15,
                            borderRadius: 9999,
                            bgcolor: 'background.surfaceVariant',
                            color: 'text.secondary',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {catTasks.length}
                        </Box>
                      </Box>

                      {group.id !== 'uncategorized' && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            disabled={isFirstCat}
                            onClick={() => {
                              const prevCat = arr[groupIndex - 1];
                              if (prevCat) reorderCategories(group.id, prevCat.id);
                            }}
                            sx={{ color: 'text.secondary' }}
                          >
                            <ArrowUpwardIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={isLastCat}
                            onClick={() => {
                              const nextCat = arr[groupIndex + 1];
                              if (nextCat && nextCat.id !== 'uncategorized') reorderCategories(group.id, nextCat.id);
                            }}
                            sx={{ color: 'text.secondary' }}
                          >
                            <ArrowDownwardIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    <Collapse in={!isCollapsed} timeout={220}>
                      <DndContext
                        id={group.id}
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={catTasks.map(t => t.id)}
                          strategy={rectSortingStrategy}
                        >
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: taskColumns === 2
                                ? 'repeat(2, minmax(0, 1fr))'
                                : { xs: '1fr', sm: 'repeat(auto-fill, minmax(310px, 1fr))' },
                              gap: taskColumns === 2 ? { xs: 1.25, sm: 1.75 } : 1.75,
                              alignItems: 'start',
                            }}
                          >
                            {catTasks.map(task => (
                              <SortableTaskItem
                                key={task.id}
                                task={task}
                                isWrongDay={task.isWrongDay}
                                isEditMode={isEditMode}
                                isCompact={taskColumns === 2}
                                setGlobalEditMode={setIsEditMode}
                                onEdit={(t) => setTaskToEdit(t)}
                                onDelete={(t) => {
                                  if (window.confirm(`Möchtest du die Aufgabe "${t.title}" wirklich löschen?`)) {
                                    deleteTask(t.id);
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </SortableContext>
                      </DndContext>
                    </Collapse>
                  </Box>
                );
              })}
          </>
        )}
      </Box>

      {!vacationMode && activeTasks.length === 0 && tasks.length > 0 && (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '24px',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: alpha(muiTheme.palette.success.main, isDark ? 0.18 : 0.12),
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 0.5,
            }}
          >
            <DoneAllIcon />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Alles erledigt für heute!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Starke Leistung — genieße den Rest deines Tages.
          </Typography>
        </Card>
      )}

      {!vacationMode && tasks.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '24px', color: 'text.secondary' }}>
          <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
            Noch keine Aufgaben vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Füge oben deine erste Aufgabe hinzu, um loszulegen.
          </Typography>
        </Card>
      )}

      {!vacationMode && doneTasks.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Box
            onClick={() => setShowCompleted(!showCompleted)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              userSelect: 'none',
              px: 1.5,
              py: 0.75,
              mb: 1.5,
              borderRadius: 9999,
              bgcolor: 'background.surfaceVariant',
              color: 'text.secondary',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              Heute erledigt ({doneTasks.length})
            </Typography>
          </Box>
          <Collapse in={showCompleted} timeout={220}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={() => {}}>
              <SortableContext items={doneTasks.map(t => t.id)} strategy={rectSortingStrategy}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: taskColumns === 2
                      ? 'repeat(2, minmax(0, 1fr))'
                      : { xs: '1fr', sm: 'repeat(auto-fill, minmax(310px, 1fr))' },
                    gap: taskColumns === 2 ? { xs: 1.25, sm: 1.75 } : 1.75,
                    alignItems: 'start',
                    opacity: 0.72,
                  }}
                >
                  {doneTasks.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isWrongDay={false}
                      isEditMode={isEditMode}
                      isCompact={taskColumns === 2}
                      setGlobalEditMode={setIsEditMode}
                      onEdit={(t) => setTaskToEdit(t)}
                      onDelete={(t) => {
                        if (window.confirm(`Möchtest du die Aufgabe "${t.title}" wirklich löschen?`)) {
                          deleteTask(t.id);
                        }
                      }}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>
          </Collapse>
        </Box>
      )}

      <Dialog open={!!taskToEdit} onClose={() => setTaskToEdit(null)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {taskToEdit && (
            <TaskCreator
              initialEditTaskId={taskToEdit.id}
              onClose={() => setTaskToEdit(null)}
              isOverlay={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingNew} onClose={() => setIsCreatingNew(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {isCreatingNew && (
            <TaskCreator
              onClose={() => setIsCreatingNew(false)}
              isOverlay={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Trophäen-Wand
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deine Leistung der vergangenen Kalendermonate
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {getHistoricalMonths().map(m => (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  py: 1.5,
                  borderRadius: '16px',
                  bgcolor: 'background.surfaceVariant',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {m.monthName}
                </Typography>
                <Chip
                  size="small"
                  icon={<span style={{ fontSize: '14px', marginLeft: 6 }}>{m.badge.icon}</span>}
                  label={`${m.score}% ${m.badge.label}`}
                  sx={{
                    bgcolor: alpha(m.badge.color, isDark ? 0.2 : 0.18),
                    color: isDark ? m.badge.color : '#5C4200',
                    fontWeight: 600,
                  }}
                />
              </Box>
            ))}
            {getHistoricalMonths().length === 0 && (
              <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
                Noch keine abgeschlossenen Monate vorhanden.
              </Typography>
            )}
          </Box>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 3, borderRadius: 9999 }}
            onClick={() => setHistoryModalOpen(false)}
          >
            Schließen
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TaskGrid;
