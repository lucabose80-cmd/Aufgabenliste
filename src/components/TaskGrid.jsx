import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Trash2, Clock, Check, ChevronDown, ChevronRight, Play, Square, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const TaskItem = ({ task }) => {
  const { toggleTaskCompletion, toggleSubTask, deleteTask, getTodayDateString, saveTaskNoteAndTime } = useTaskContext();
  const [expanded, setExpanded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [note, setNote] = useState(task.note || '');
  const [amount, setAmount] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);

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
    setShowNoteField(true);
  };

  const handleSaveInfo = () => {
    saveTaskNoteAndTime(task.id, note, timerSeconds, amount);
    setTimerSeconds(0);
    setShowNoteField(false);
    setAmount('');
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="task-item card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
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
                Typ: {task.type}
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
        
        <button className="btn-icon" onClick={() => deleteTask(task.id)} style={{ color: 'var(--accent-danger)' }}>
          <Trash2 size={18} />
        </button>
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
        {(task.note || task.averageSpeed) && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {task.note && <div>Notiz: {task.note}</div>}
            {task.averageSpeed && <div style={{ color: 'var(--accent-secondary)' }}>Schnitt: {task.averageSpeed}</div>}
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

        {showNoteField && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Notiz..." 
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          </div>
        )}
      </div>
    </div>
  );
};

const TaskGrid = () => {
  const { tasks, categories } = useTaskContext();

  const taskTypes = [
    { id: 'daily', label: 'Tägliche Routinen' },
    { id: 'weekly', label: 'Einmal pro Woche' },
    { id: 'x-times', label: 'Mehrmals pro Woche' },
    { id: 'specific-days', label: 'An bestimmten Tagen' },
    { id: 'general', label: 'Allgemeine To-Dos' },
  ];

  // Enrich tasks with category color for the badge
  const enrichedTasks = tasks.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return { ...t, categoryColor: cat ? cat.color : 'var(--border-color)' };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {taskTypes.map(typeGroup => {
        const typeTasks = enrichedTasks.filter(t => t.type === typeGroup.id);
        
        if (typeTasks.length === 0) return null;

        return (
          <div key={typeGroup.id}>
            <h2 style={{ 
              marginBottom: '1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'var(--text-main)'
            }}>
              {typeGroup.label}
            </h2>
            <div className="task-grid">
              {typeTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
      
      {tasks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Noch keine Aufgaben vorhanden. Gehe auf "Aufgabe erstellen".
        </div>
      )}
    </div>
  );
};

export default TaskGrid;
