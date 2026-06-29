import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, subDays, subHours } from 'date-fns';
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
import { Box, Card, Typography, LinearProgress, IconButton, Button, Checkbox, Stack, Tooltip as MuiTooltip, Collapse, Select, MenuItem } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';

const SortableTaskItem = ({ task, isWrongDay }) => {
  const [expanded, setExpanded] = useState(false);
  const { toggleTaskCompletion, toggleSubTask, updateTask, categories, getTodayDateString, resetHour } = useTaskContext();
  const hasValidCategory = categories.some(c => c.id === task.categoryId);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      elevation={isDragging ? 8 : 1}
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 3,
        mb: 0,
        bgcolor: task.categoryColor ? `${task.categoryColor}1A` : 'background.paper', // 1A is ~10% opacity
        border: task.categoryColor ? `1px solid ${task.categoryColor}40` : '1px solid',
        borderColor: task.categoryColor ? `${task.categoryColor}40` : 'divider'
      }}
    >
      <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box 
          {...attributes} 
          {...listeners} 
          sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5, touchAction: 'none' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        <Checkbox
          checked={isCompleted}
          onChange={() => toggleTaskCompletion(task.id)}
          disabled={!allSubTasksCompleted && task.subTasks.length > 0}
          icon={<CheckBoxOutlineBlankIcon />}
          checkedIcon={<CheckBoxIcon color="success" />}
          sx={{ p: 0.5, mr: 1 }}
        />
        
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '1.1rem',
              textDecoration: isCompleted ? 'line-through' : 'none',
              color: isCompleted ? 'text.secondary' : 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap'
            }}
          >
            {task.title}
            {task.isShared && (
              <MuiTooltip title="Geteilte Aufgabe">
                <GroupIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.8 }} />
              </MuiTooltip>
            )}
            {streak > 0 && (
              <MuiTooltip title={`${streak} ${(task.type === 'weekly' || task.type === 'x-times') ? 'Wochen' : 'Tage'} in Folge!`}>
                <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'error.main', bgcolor: 'background.default', px: 1, py: 0.25, borderRadius: 4, border: 1, borderColor: 'divider' }}>
                  <LocalFireDepartmentIcon fontSize="small" sx={{ mr: 0.5 }} /> {streak}
                </Box>
              </MuiTooltip>
            )}
            {consistencyScore !== null && (
              <MuiTooltip title={`Zuverlässigkeit der letzten ${Math.min(30, Math.max(1, Math.floor((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24))))} Tage`}>
                <Typography variant="caption" sx={{ color: consistencyScore >= 80 ? 'success.main' : (consistencyScore >= 50 ? 'warning.main' : 'error.main'), fontWeight: 'bold' }}>
                  {consistencyScore}%
                </Typography>
              </MuiTooltip>
            )}
            {completedByToday && isCompleted && (
              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                (erledigt von {completedByToday})
              </Typography>
            )}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 0.5, display: 'block' }}>
            Typ: {getTypeLabel()} {specificDaysString && `(${specificDaysString})`}
          </Typography>

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
                sx={{ 
                  minWidth: 150, 
                  fontSize: '0.75rem', 
                  height: 28,
                  bgcolor: 'background.default',
                  borderRadius: 2,
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
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Teilaufgaben</Typography>
                <Typography variant="caption" color="text.secondary">{progressPercentage}% ({completedSubTasksCount}/{totalSubTasksCount})</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          )}
        </Box>
        
        {task.subTasks.length > 0 && (
          <IconButton onClick={() => setExpanded(!expanded)} size="small" sx={{ mt: 0.5 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {task.subTasks.length > 0 && (
        <Collapse in={expanded}>
          <Box sx={{ ml: 6, mt: 1, mb: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {task.subTasks.map(st => (
              <Box key={st.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={st.completed}
                  onChange={() => toggleSubTask(task.id, st.id)}
                  size="small"
                  sx={{ p: 0.5 }}
                />
                <Typography 
                  variant="body2"
                  sx={{ 
                    textDecoration: st.completed ? 'line-through' : 'none',
                    color: st.completed ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {st.title}
                  {st.completed && task.isShared && st.completedBy && (
                    <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic' }}>
                      (von {st.completedBy})
                    </Typography>
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      )}
      </Box>
    </Card>
  );
};

const TaskGrid = () => {
  const { tasks, categories, getTodayDateString, reorderTasks, reorderCategories, resetHour } = useTaskContext();
  const [showCompleted, setShowCompleted] = useState(false);

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

  const filteredTasks = tasks.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const isWrongDay = t.type === 'specific-days' && !t.specificDays.includes(dayOfWeek);
    return { ...t, categoryColor: cat ? cat.color : undefined, isWrongDay };
  }).filter(t => {
    if (t.isWrongDay && !showCompleted) return false; 
    const isCompletedToday = (t.completedDates || []).includes(today);
    if (isCompletedToday && !showCompleted && t.type !== 'general') return false;
    return true;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant={showCompleted ? "contained" : "outlined"} 
          onClick={() => setShowCompleted(!showCompleted)}
          size="small"
          sx={{ borderRadius: 8 }}
        >
          {showCompleted ? 'Ausgeblendete verbergen' : 'Erledigte anzeigen'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayGroups.sort((a, b) => {
          if (a.id === 'uncategorized') return 1;
          if (b.id === 'uncategorized') return -1;
          const catA = categories.find(c => c.id === a.id);
          const catB = categories.find(c => c.id === b.id);
          return (catA?.order || 0) - (catB?.order || 0);
        }).map((group, groupIndex, arr) => {
          const catTasks = filteredTasks.filter(t => {
            if (group.id === 'uncategorized') {
              return !categories.find(c => c.id === t.categoryId);
            }
            return t.categoryId === group.id;
          });
          if (catTasks.length === 0) return null;

          const isFirstCat = groupIndex === 0;
          const isLastCat = groupIndex === arr.length - 1 || (groupIndex === arr.length - 2 && arr[arr.length - 1].id === 'uncategorized');

          return (
            <Box key={group.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: group.color !== 'text.secondary' ? group.color : 'text.primary', fontWeight: 'bold' }}>
                  <IconButton size="small" onClick={() => toggleCategory(group.id)} sx={{ p: 0, mr: 0.5, color: 'inherit' }}>
                    {collapsedCategories[group.id] ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                  </IconButton>
                  {group.label}
                </Typography>
                
                {group.id !== 'uncategorized' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      disabled={isFirstCat}
                      onClick={() => {
                        const prevCat = arr[groupIndex - 1];
                        if (prevCat) reorderCategories(group.id, prevCat.id);
                      }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      disabled={isLastCat}
                      onClick={() => {
                        const nextCat = arr[groupIndex + 1];
                        if (nextCat && nextCat.id !== 'uncategorized') reorderCategories(group.id, nextCat.id);
                      }}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Collapse in={!collapsedCategories[group.id]}>
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
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: 2,
                      borderLeft: group.color !== 'text.secondary' ? 4 : 0,
                      borderColor: group.color,
                      pl: group.color !== 'text.secondary' ? 2 : 0,
                    }}>
                      {catTasks.map(task => (
                        <SortableTaskItem key={task.id} task={task} isWrongDay={task.isWrongDay} />
                      ))}
                    </Box>
                  </SortableContext>
                </DndContext>
              </Collapse>
            </Box>
          );
        })}
      </Box>
      
      {filteredTasks.length === 0 && tasks.length > 0 && (
        <Card sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6">Alles erledigt für heute! 🎉</Typography>
        </Card>
      )}

      {tasks.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6">Noch keine Aufgaben vorhanden. Gehe auf "Aufgabe erstellen".</Typography>
        </Card>
      )}
    </Box>
  );
};

export default TaskGrid;
