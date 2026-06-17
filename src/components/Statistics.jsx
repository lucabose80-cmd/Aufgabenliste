import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Clock, BookOpen, Activity } from 'lucide-react';

const Statistics = () => {
  const { tasks, categories } = useTaskContext();
  
  // Only show tasks that actually have timer logs
  const tasksWithStats = tasks.filter(t => t.timerLogs && t.timerLogs.length > 0);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity color="var(--accent-primary)" />
          Lesestatistiken & Timer
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Hier siehst du deinen wahren Durchschnitt (Gesamtmenge / Gesamtzeit) über alle getrackten Tage hinweg.
        </p>

        {tasksWithStats.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Noch keine Statistiken vorhanden. Nutze den Timer auf einer Aufgabe, um Daten zu sammeln!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {tasksWithStats.map(task => {
              const cat = categories.find(c => c.id === task.categoryId);
              
              const totalSeconds = task.timerLogs.reduce((acc, log) => acc + log.timeSpent, 0);
              const totalAmount = task.timerLogs.reduce((acc, log) => acc + log.amount, 0);
              const totalHours = totalSeconds / 3600;
              const trueSpeed = totalHours > 0 ? (totalAmount / totalHours).toFixed(1) : 0;

              return (
                <div key={task.id} style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius)', 
                  padding: '1.5rem', 
                  backgroundColor: 'var(--bg-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat ? cat.color : 'var(--border-color)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{task.title}</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={14} /> Gesamtzeit
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{formatTime(totalSeconds)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <BookOpen size={14} /> Gesamtmenge
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{totalAmount}</span>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Wahrer Durchschnitt:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-secondary)' }}>
                      {trueSpeed} S/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
