import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Check, ChevronDown, ChevronRight, Play, Square, Save } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

const TaskItem = ({ task }) => {
  const { toggleTaskCompletion, toggleSubTask, deleteTask, getTodayDateString, saveTaskNoteAndTime } = useTaskContext();
  const [expanded, setExpanded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [note, setNote] = useState(task.note || '');
  const [showNoteField, setShowNoteField] = useState(false);

  const today = getTodayDateString();
  const isCompleted = task.isDaily ? task.completedDates.includes(today) : task.completedDates.length > 0;
  
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
    saveTaskNoteAndTime(task.id, note, timerSeconds);
    setTimerSeconds(0);
    setShowNoteField(false);
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="task-item card" style={{ marginBottom: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {task.subTasks.length > 0 && (
            <button className="btn-icon" onClick={() => setExpanded(!expanded)} style={{ padding: '0.25rem' }}>
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
          
          <button 
            onClick={() => toggleTaskCompletion(task.id)}
            disabled={!allSubTasksCompleted && task.subTasks.length > 0}
            style={{
              width: '24px', height: '24px', borderRadius: '4px',
              border: `2px solid ${isCompleted ? 'var(--accent-success)' : 'var(--border-color)'}`,
              backgroundColor: isCompleted ? 'var(--accent-success)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (!allSubTasksCompleted && task.subTasks.length > 0) ? 'not-allowed' : 'pointer',
              opacity: (!allSubTasksCompleted && task.subTasks.length > 0) ? 0.5 : 1
            }}
          >
            {isCompleted && <Check size={16} color="white" />}
          </button>
          
          <span style={{ 
            fontSize: '1.1rem', 
            textDecoration: isCompleted ? 'line-through' : 'none',
            color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)'
          }}>
            {task.title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '4px', gap: '0.5rem' }}>
            <Clock size={16} color="var(--text-muted)" />
            <span style={{ fontFamily: 'monospace' }}>{formatTime(task.timeSpent + timerSeconds)}</span>
            {isTimerRunning ? (
              <button onClick={handleStopTimer} style={{ color: 'var(--accent-danger)' }}><Square size={16} fill="currentColor" /></button>
            ) : (
              <button onClick={() => setIsTimerRunning(true)} style={{ color: 'var(--accent-success)' }}><Play size={16} fill="currentColor" /></button>
            )}
          </div>
          <button className="btn-icon" onClick={() => deleteTask(task.id)} style={{ color: 'var(--accent-danger)' }}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {showNoteField && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="Zusatzinfos (z.B. 20 Seiten gelesen)..." 
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleSaveInfo}>
            <Save size={16} /> Speichern
          </button>
        </div>
      )}

      {expanded && task.subTasks.length > 0 && (
        <div style={{ marginLeft: '2.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {task.subTasks.map(st => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={() => toggleSubTask(task.id, st.id)}
                style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: `2px solid ${st.completed ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  backgroundColor: st.completed ? 'var(--accent-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {st.completed && <Check size={14} color="white" />}
              </button>
              <span style={{ 
                textDecoration: st.completed ? 'line-through' : 'none',
                color: st.completed ? 'var(--text-muted)' : 'var(--text-main)'
              }}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TaskList = ({ view }) => {
  const { tasks, addTask, categories } = useTaskContext();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [subTasksText, setSubTasksText] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '1');

  const filteredTasks = tasks.filter(t => view === 'daily' ? t.isDaily : !t.isDaily);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const subTasks = subTasksText
      .split(',')
      .map(s => s.trim())
      .filter(s => s)
      .map(s => ({ id: Math.random().toString(), title: s, completed: false }));

    addTask({
      title: newTaskTitle,
      categoryId,
      isDaily: view === 'daily',
      subTasks
    });

    setNewTaskTitle('');
    setSubTasksText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Neue Aufgabe erstellen</h3>
        <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Titel der Aufgabe..." 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              style={{ flex: 2 }}
            />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ flex: 1 }}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Unterpunkte (kommagetrennt, z.B. a, b, c)... optional" 
            value={subTasksText}
            onChange={e => setSubTasksText(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Plus size={18} /> Hinzufügen
          </button>
        </form>
      </div>

      <div>
        {filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Noch keine Aufgaben vorhanden.
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
