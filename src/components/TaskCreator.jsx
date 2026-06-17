import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

const TaskCreator = () => {
  const { addTask, categories } = useTaskContext();
  
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '1');
  const [type, setType] = useState('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [specificDays, setSpecificDays] = useState([]);
  const [subTasks, setSubTasks] = useState([]);
  const [currentSubTask, setCurrentSubTask] = useState('');
  const [hasTimer, setHasTimer] = useState(true);

  const daysOfWeek = [
    { id: 1, label: 'Mo' },
    { id: 2, label: 'Di' },
    { id: 3, label: 'Mi' },
    { id: 4, label: 'Do' },
    { id: 5, label: 'Fr' },
    { id: 6, label: 'Sa' },
    { id: 0, label: 'So' }
  ];

  const handleToggleDay = (dayId) => {
    setSpecificDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const formattedSubTasks = subTasks.map(s => ({ 
      id: Math.random().toString(), 
      title: s, 
      completed: false 
    }));

    addTask({
      title,
      categoryId,
      type,
      targetCount: type === 'x-times' ? parseInt(targetCount, 10) : (type === 'weekly' ? 1 : 0),
      specificDays: type === 'specific-days' ? specificDays : [],
      hasTimer,
      subTasks: formattedSubTasks
    });

    setTitle('');
    setSubTasks([]);
    setCurrentSubTask('');
    setSpecificDays([]);
    setTargetCount(1);
    alert('Aufgabe erfolgreich erstellt!');
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Neue Aufgabe erstellen</h3>
      
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Titel der Aufgabe</label>
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Gym, Japanisch lernen..." 
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Kategorie</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aufgabentyp</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="daily">Täglich</option>
              <option value="weekly">Einmal pro Woche (Weekly)</option>
              <option value="x-times">X-Mal pro Woche</option>
              <option value="specific-days">An bestimmten Tagen</option>
              <option value="general">Allgemeines To-Do</option>
            </select>
          </div>
        </div>

        {type === 'x-times' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Wie oft pro Woche?</label>
            <input 
              type="number" 
              min="1" 
              max="7" 
              value={targetCount}
              onChange={e => setTargetCount(e.target.value)}
            />
          </div>
        )}

        {type === 'specific-days' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>An welchen Tagen?</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {daysOfWeek.map(day => (
                <button
                  type="button"
                  key={day.id}
                  onClick={() => handleToggleDay(day.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--border-radius-sm)',
                    border: `1px solid ${specificDays.includes(day.id) ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    backgroundColor: specificDays.includes(day.id) ? 'var(--accent-primary)' : 'transparent',
                    color: specificDays.includes(day.id) ? 'white' : 'var(--text-main)',
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Unterpunkte (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={currentSubTask}
              onChange={e => setCurrentSubTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (currentSubTask.trim()) {
                    setSubTasks([...subTasks, currentSubTask.trim()]);
                    setCurrentSubTask('');
                  }
                }
              }}
              placeholder="Neuer Unterpunkt..." 
              style={{ flex: 1 }}
            />
            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => {
                if (currentSubTask.trim()) {
                  setSubTasks([...subTasks, currentSubTask.trim()]);
                  setCurrentSubTask('');
                }
              }}
            >
              Hinzufügen
            </button>
          </div>
          {subTasks.length > 0 && (
            <ul style={{ listStyleType: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subTasks.map((st, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.9rem' }}>{st}</span>
                  <button 
                    type="button"
                    onClick={() => setSubTasks(subTasks.filter((_, i) => i !== idx))}
                    style={{ color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.5rem' }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="hasTimer"
            checked={hasTimer}
            onChange={(e) => setHasTimer(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <label htmlFor="hasTimer" style={{ fontSize: '0.95rem' }}>Timer & Infos für diese Aufgabe aktivieren</label>
        </div>

        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem', padding: '0.75rem 1.5rem' }}>
          <Plus size={20} /> Aufgabe erstellen
        </button>
      </form>
    </div>
  );
};

export default TaskCreator;
