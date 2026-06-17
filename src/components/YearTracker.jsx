import React, { useState } from 'react';
import { format, eachDayOfInterval, startOfYear, endOfYear, getMonth, isAfter, startOfToday, startOfWeek, endOfWeek, isSameDay, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTaskContext } from '../context/TaskContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const YearTracker = () => {
  const { tasks, toggleTaskCompletion } = useTaskContext();
  const trackableTasks = tasks.filter(t => t.type !== 'general');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const today = startOfToday();
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  // Group days by month for expanded view
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

    // For weekly, x-times and specific-days: evaluate the whole week
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
    
    if (isFuture) return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };

    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    let completedCountInWeek = 0;
    daysInWeek.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      if (task.completedDates.includes(dStr)) completedCountInWeek++;
    });

    let target = 1;
    if (task.type === 'x-times') target = task.targetCount;
    if (task.type === 'specific-days') target = task.specificDays.length;

    const weekGoalMet = completedCountInWeek >= target;

    if (weekGoalMet) {
      return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
    } else {
      if (isCompleted) {
        return { color: 'var(--accent-success)', border: 'var(--accent-success)', opacity: 1 };
      }
      const isCurrentWeek = daysInWeek.some(d => isSameDay(d, today));
      if (isCurrentWeek && !weekGoalMet) {
        return { color: 'var(--bg-main)', border: 'var(--border-color)', opacity: 0.3 };
      }

      return { color: 'var(--accent-danger)', border: 'var(--accent-danger)', opacity: 0.8 };
    }
  };

  const toggleExpand = (id) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const handleDayClick = (task, dateStr) => {
    const isCompleted = task.completedDates.includes(dateStr);
    toggleTaskCompletion(task.id, dateStr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Jahres-Tracker {currentYear}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Klicke auf eine Aufgabe, um die detaillierte Monatsansicht zu öffnen.
        </p>

        {trackableTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Füge tägliche/wöchentliche Aufgaben hinzu, um den Tracker zu nutzen.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {trackableTasks.map(task => {
              const isExpanded = expandedTaskId === task.id;

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
                <div key={task.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  
                  {/* Header / Minimized View */}
                  <div 
                    onClick={() => toggleExpand(task.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, marginRight: '1rem' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{task.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Typ: {getTypeLabel()} {specificDaysString && `(${specificDaysString})`}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 1fr)', gap: '1px', height: '28px', overflow: 'hidden', marginLeft: 'auto' }}>
                      {/* Detailed mini-heatmap (GitHub style) */}
                      {allDays.map((day, idx) => {
                        const style = evaluateDay(day, task);
                        return (
                          <div 
                            key={idx}
                            style={{
                              width: '3px',
                              height: '3px',
                              backgroundColor: style.color,
                              opacity: style.opacity,
                              borderRadius: '1px'
                            }}
                          />
                        );
                      })}
                    </div>

                    <div style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        {months.map((monthDays, idx) => {
                          const monthName = format(new Date(currentYear, idx, 1), 'MMM', { locale: de });
                          
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{monthName}</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                {monthDays.map((day, dIdx) => {
                                  const dateStr = format(day, 'yyyy-MM-dd');
                                  const style = evaluateDay(day, task);
                                  
                                  return (
                                    <div 
                                      key={dIdx}
                                      title={dateStr}
                                      onClick={() => handleDayClick(task, dateStr)}
                                      style={{
                                        width: '100%',
                                        aspectRatio: '1/1',
                                        borderRadius: '2px',
                                        backgroundColor: style.color,
                                        opacity: style.opacity,
                                        cursor: 'pointer'
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
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default YearTracker;
