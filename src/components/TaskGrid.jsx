import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Check, GripVertical, Flame } from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTaskItem = ({ task, isWrongDay }) => {
  const { toggleTaskCompletion, toggleSubTask, getTodayDateString } = useTaskContext();
  
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
  const isCompleted = task.type === 'general' ? task.completedDates.length > 0 : task.completedDates.includes(today);
  
  const totalSubTasksCount = task.subTasks.length;
  const completedSubTasksCount = task.subTasks.filter(st => st.completed).length;
  const allSubTasksCompleted = totalSubTasksCount === 0 || completedSubTasksCount === totalSubTasksCount;
  const progressPercentage = totalSubTasksCount > 0 ? Math.round((completedSubTasksCount / totalSubTasksCount) * 100) : 0;

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

  // Streak Logik
  const calculateStreak = () => {
    if (task.type !== 'daily') return 0;
    
    const completedDates = task.completedDates || [];
    if (completedDates.length === 0) return 0;

    let streak = 0;
    let checkDate = new Date(); 
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

    if (!completedDates.includes(todayStr) && !completedDates.includes(yesterdayStr)) {
      return 0;
    }

    // Wenn heute nicht gemacht, aber gestern, beginnen wir mit gestern als Startpunkt der Rückwärts-Prüfung
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
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div ref={setNodeRef} style={style} className={`task-item card ${isWrongDay ? 'task-wrong-day' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
            
            {/* Drag Handle */}
            <div 
              {...attributes} 
              {...listeners} 
              style={{ cursor: 'grab', display: 'flex', alignItems: 'center', paddingTop: '2px', color: 'var(--text-muted)' }}
            >
              <GripVertical size={20} />
            </div>

            <button 
              onClick={() => toggleTaskCompletion(task.id)}
              disabled={!allSubTasksCompleted && task.subTasks.length > 0}
              style={{
                width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                border: `2px solid ${isCompleted ? 'var(--accent-success)' : 'var(--border-color)'}`,
                backgroundColor: isCompleted ? 'var(--accent-success)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (!allSubTasksCompleted && task.subTasks.length > 0) ? 'not-allowed' : 'pointer',
                opacity: (!allSubTasksCompleted && task.subTasks.length > 0) ? 0.5 : 1
              }}
            >
              {isCompleted && <Check size={16} color="white" />}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600',
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                wordBreak: 'break-word',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {task.title}
                {streak >= 2 && (
                  <span title={`${streak} Tage in Folge!`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--accent-danger)', background: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '50px', border: '1px solid var(--border-color)' }}>
                    <Flame size={14} style={{ marginRight: '2px' }} /> {streak}
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Typ: {getTypeLabel()} {specificDaysString && `(${specificDaysString})`}
                </span>
                <div 
                  title="Kategorie"
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: task.categoryColor || 'var(--accent-primary)' 
                  }}
                />
              </div>

              {totalSubTasksCount > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Teilaufgaben</span>
                    <span>{progressPercentage}% ({completedSubTasksCount}/{totalSubTasksCount})</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPercentage}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {task.subTasks.length > 0 && (
            <div style={{ marginLeft: '3.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {task.subTasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    onClick={() => toggleSubTask(task.id, st.id)}
                    style={{
                      width: '18px', height: '18px', borderRadius: '4px',
                      border: `2px solid ${st.completed ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      backgroundColor: st.completed ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {st.completed && <Check size={12} color="white" />}
                  </button>
                  <span style={{ 
                    textDecoration: st.completed ? 'line-through' : 'none',
                    color: st.completed ? 'var(--text-muted)' : 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskGrid = () => {
  const { tasks, categories, getTodayDateString, reorderTasks } = useTaskContext();
  const [showCompleted, setShowCompleted] = useState(false);

  const displayGroups = [
    { id: 'routines', label: 'Tägliche Routinen', types: ['daily', 'weekly', 'x-times', 'specific-days'] },
    { id: 'general', label: 'Allgemeine To-Dos', types: ['general'] }
  ];

  const today = getTodayDateString();
  const dayOfWeek = new Date().getDay();

  // Tasks anreichern und sortieren
  const filteredTasks = tasks.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const isWrongDay = t.type === 'specific-days' && !t.specificDays.includes(dayOfWeek);
    return { ...t, categoryColor: cat ? cat.color : 'var(--border-color)', isWrongDay };
  }).filter(t => {
    if (t.isWrongDay && !showCompleted) return false; 
    const isCompletedToday = t.completedDates.includes(today);
    if (isCompletedToday && !showCompleted && t.type !== 'general') return false;
    return true;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Verhindert, dass normale Klicks als Drag interpretiert werden
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowCompleted(!showCompleted)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--border-radius)',
            backgroundColor: showCompleted ? 'var(--accent-primary)' : 'transparent',
            border: `1px solid ${showCompleted ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            color: showCompleted ? 'white' : 'var(--text-muted)',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          {showCompleted ? 'Ausgeblendete verbergen' : 'Erledigte anzeigen'}
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {displayGroups.map(group => {
            const typeTasks = filteredTasks.filter(t => group.types.includes(t.type));
            if (typeTasks.length === 0) return null;

            return (
              <div key={group.id}>
                <h2 style={{ 
                  marginBottom: '1.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  color: 'var(--text-main)'
                }}>
                  {group.label}
                </h2>
                <SortableContext 
                  items={typeTasks.map(t => t.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="task-grid">
                    {typeTasks.map(task => (
                      <SortableTaskItem key={task.id} task={task} isWrongDay={task.isWrongDay} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
      
      {filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Alles erledigt für heute! 🎉
        </div>
      )}

      {tasks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Noch keine Aufgaben vorhanden. Gehe auf "Aufgabe erstellen".
        </div>
      )}
    </div>
  );
};

export default TaskGrid;
