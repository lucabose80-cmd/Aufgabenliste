import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Trash2, Clock, Check, ChevronDown, ChevronRight, Play, Square, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const TaskItem = ({ task, isWrongDay }) => {
  const { toggleTaskCompletion, toggleSubTask, getTodayDateString, saveTimerSession } = useTaskContext();
  const [expanded, setExpanded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [amount, setAmount] = useState('');
  const [showAmountField, setShowAmountField] = useState(false);

  const today = getTodayDateString();
  const isCompleted = task.type === 'general' ? task.completedDates.length > 0 : task.completedDates.includes(today);
  
  const allSubTasksCompleted = task.subTasks.length === 0 || task.subTasks.every(st => st.completed);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setShowAmountField(true);
  };

  const handleSaveInfo = () => {
    saveTimerSession(task.id, timerSeconds, amount);
    setTimerSeconds(0);
    setShowAmountField(false);
    setAmount('');
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
    <div className="task-item card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', opacity: (isCompleted || isWrongDay) ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
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
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600',
              textDecoration: isCompleted ? 'line-through' : 'none',
              color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
              wordBreak: 'break-word'
            }}>
              {task.title}
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
          </div>
        </div>
        
      </div>

      <div style={{ flex: 1 }}>
        {task.subTasks.length > 0 && (
          <div style={{ marginLeft: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
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

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {task.averageSpeed && (
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)' }}>
            Schnitt: {task.averageSpeed}
          </div>
        )}

        {task.hasTimer && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '4px', gap: '0.5rem' }}>
              <Clock size={16} color="var(--text-muted)" />
              <span style={{ fontFamily: 'monospace' }}>{formatTime(task.timeSpent + timerSeconds)}</span>
              {isTimerRunning ? (
                <button onClick={handleStopTimer} style={{ color: 'var(--accent-danger)' }}><Square size={16} fill="currentColor" /></button>
              ) : (
                <button onClick={() => setIsTimerRunning(true)} style={{ color: 'var(--accent-success)' }}><Play size={16} fill="currentColor" /></button>
              )}
            </div>
          </div>
        )}

        {showAmountField && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="Menge (z.B. Seiten)" 
              style={{ flex: 1, fontSize: '0.85rem' }}
            />
            <button className="btn-primary" onClick={handleSaveInfo} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
              <Save size={14} /> Speichern
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskGrid = () => {
  const { tasks, categories, getTodayDateString } = useTaskContext();
  const [showCompleted, setShowCompleted] = useState(false);

  const displayGroups = [
    { id: 'routines', label: 'Tägliche Routinen', types: ['daily', 'weekly', 'x-times', 'specific-days'] },
    { id: 'general', label: 'Allgemeine To-Dos', types: ['general'] }
  ];

  const today = getTodayDateString();
  const dayOfWeek = new Date().getDay();

  // Enrich tasks and filter based on advanced logic
  const filteredTasks = tasks.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const isWrongDay = t.type === 'specific-days' && !t.specificDays.includes(dayOfWeek);
    return { ...t, categoryColor: cat ? cat.color : 'var(--border-color)', isWrongDay };
  }).filter(t => {
    // 1. Wrong day for specific-days
    if (t.isWrongDay && !showCompleted) {
      return false; 
    }

    // 2. Completed for today
    const isCompletedToday = t.completedDates.includes(today);
    
    if (isCompletedToday && !showCompleted && t.type !== 'general') {
      return false;
    }

    return true;
  });

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
            <div className="task-grid">
              {typeTasks.map(task => (
                <TaskItem key={task.id} task={task} isWrongDay={task.isWrongDay} />
              ))}
            </div>
          </div>
        );
      })}
      
      </div>
      
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
