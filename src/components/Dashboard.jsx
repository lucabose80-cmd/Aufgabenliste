import React from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { useTaskContext } from '../context/TaskContext';

const Dashboard = () => {
  const { tasks, getTodayDateString } = useTaskContext();
  
  // Calculate stats
  const dailyTasks = tasks.filter(t => t.isDaily);
  const longtermTasks = tasks.filter(t => !t.isDaily);
  
  const today = getTodayDateString();
  const completedDailyToday = dailyTasks.filter(t => t.completedDates.includes(today)).length;
  
  const completedLongterm = longtermTasks.filter(t => t.completedDates.length > 0).length;

  // Generate heatmap data for the last 30 days
  const endDate = new Date();
  const startDate = subDays(endDate, 29);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tägliche Aufgaben (Heute)</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {completedDailyToday} / {dailyTasks.length}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Langzeit-Ziele erreicht</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {completedLongterm} / {longtermTasks.length}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Gesamte Aufgaben</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Habit Tracker / Heatmap */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Activity Tracker (Letzte 30 Tage)</h3>
        {dailyTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Füge tägliche Routinen hinzu, um deinen Tracker zu füllen.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dailyTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto' }}>
                <div style={{ minWidth: '150px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {task.title}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {days.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isCompleted = task.completedDates.includes(dateStr);
                    return (
                      <div 
                        key={idx}
                        title={`${dateStr}: ${isCompleted ? 'Erledigt' : 'Nicht erledigt'}`}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          backgroundColor: isCompleted ? 'var(--accent-primary)' : 'var(--bg-main)',
                          border: `1px solid ${isCompleted ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          opacity: isCompleted ? 1 : 0.5
                        }}
                      />
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

export default Dashboard;
