import React from 'react';
import { format, eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTaskContext } from '../context/TaskContext';

const YearTracker = () => {
  const { tasks } = useTaskContext();
  const trackableTasks = tasks.filter(t => t.type !== 'general');
  
  const today = startOfToday();
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  // Group days by month
  const months = Array.from({ length: 12 }, (_, i) => allDays.filter(d => getMonth(d) === i));

  const evaluateDay = (day, task) => {
    const isFuture = isAfter(day, today);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isCompleted = task.completedDates.includes(dateStr);

    if (task.type === 'daily') {
      if (isFuture) return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };
      if (isCompleted) return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
      return { color: 'var(--accent-danger)', border: 'var(--accent-danger)', opacity: 0.8 };
    }

    if (task.type === 'specific-days') {
      const dayOfWeek = day.getDay();
      if (!task.specificDays.includes(dayOfWeek)) {
        return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.1 }; // Not required this day
      }
      if (isFuture) return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };
      if (isCompleted) return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
      return { color: 'var(--accent-danger)', border: 'var(--accent-danger)', opacity: 0.8 };
    }

    // For weekly and x-times: evaluate the whole week
    const weekStart = startOfWeek(day, { weekStartsOn: 1 }); // Monday is 1
    const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
    
    // We don't evaluate weeks in the future fully if the week hasn't ended, 
    // but for simplicity, let's treat any future day as neutral.
    if (isFuture) return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };

    // Get all days in that week
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Count how many times it was completed in this week
    let completedCountInWeek = 0;
    daysInWeek.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      if (task.completedDates.includes(dStr)) completedCountInWeek++;
    });

    const target = task.type === 'weekly' ? 1 : task.targetCount;
    const weekGoalMet = completedCountInWeek >= target;

    if (weekGoalMet) {
      // Whole week is green
      return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
    } else {
      // Goal not met. Week is red, but the days they did it are green
      if (isCompleted) {
        return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
      }
      // If the week is still ongoing (today is in this week), maybe don't mark as red yet?
      // Let's check if the week is strictly in the past, or if it's the current week.
      const isCurrentWeek = daysInWeek.some(d => isSameDay(d, today));
      if (isCurrentWeek && !weekGoalMet) {
        // Current week, not yet met, days not completed are neutral
        return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };
      }

      return { color: 'var(--accent-danger)', border: 'var(--accent-danger)', opacity: 0.8 };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Jahres-Tracker {currentYear}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Behalte deine Gewohnheiten über das ganze Jahr im Blick.
          <br/>
          <span style={{ color: 'var(--accent-success)' }}>Grün</span> = Erledigt/Wochenziel erreicht | <span style={{ color: 'var(--accent-danger)' }}>Rot</span> = Verpasst
        </p>

        {trackableTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Füge tägliche/wöchentliche Aufgaben hinzu, um den Tracker zu nutzen.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {trackableTasks.map(task => (
              <div key={task.id}>
                <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {task.title}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Typ: {task.type} {task.type === 'x-times' && `(${task.targetCount}x)`}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {months.map((monthDays, idx) => {
                    const monthName = format(new Date(currentYear, idx, 1), 'MMMM', { locale: de });
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{monthName}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                          {monthDays.map((day, dIdx) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const style = evaluateDay(day, task);
                            
                            return (
                              <div 
                                key={dIdx}
                                title={dateStr}
                                style={{
                                  width: '100%',
                                  aspectRatio: '1/1',
                                  borderRadius: '2px',
                                  backgroundColor: style.color,
                                  border: `1px solid ${style.border}`,
                                  opacity: style.opacity
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
