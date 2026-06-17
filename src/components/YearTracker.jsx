import React from 'react';
import { format, eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTaskContext } from '../context/TaskContext';

const YearTracker = () => {
  const { tasks } = useTaskContext();
  const dailyTasks = tasks.filter(t => t.isDaily);
  
  const today = startOfToday();
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  // Group days by month
  const months = Array.from({ length: 12 }, (_, i) => allDays.filter(d => getMonth(d) === i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Jahres-Tracker {currentYear}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Behalte deine täglichen Routinen über das ganze Jahr im Blick.
          <br/>
          <span style={{ color: 'var(--accent-success)' }}>Grün</span> = Erledigt | <span style={{ color: 'var(--accent-danger)' }}>Rot</span> = Verpasst
        </p>

        {dailyTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Füge tägliche Routinen hinzu, um den Tracker zu nutzen.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {dailyTasks.map(task => (
              <div key={task.id}>
                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  {task.title}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {months.map((monthDays, idx) => {
                    const monthName = format(new Date(currentYear, idx, 1), 'MMMM', { locale: de });
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{monthName}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                          {monthDays.map((day, dIdx) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isCompleted = task.completedDates.includes(dateStr);
                            const isFuture = isAfter(day, today);
                            
                            let bgColor = 'var(--bg-main)';
                            let borderColor = 'var(--border-color)';
                            
                            if (!isFuture) {
                              bgColor = isCompleted ? 'var(--accent-success)' : 'var(--accent-danger)';
                              borderColor = bgColor;
                            }
                            
                            return (
                              <div 
                                key={dIdx}
                                title={`${dateStr}: ${isFuture ? 'Zukunft' : (isCompleted ? 'Erledigt' : 'Verpasst')}`}
                                style={{
                                  width: '100%',
                                  aspectRatio: '1/1',
                                  borderRadius: '2px',
                                  backgroundColor: bgColor,
                                  border: `1px solid ${borderColor}`,
                                  opacity: isFuture ? 0.3 : 0.8
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YearTracker;
