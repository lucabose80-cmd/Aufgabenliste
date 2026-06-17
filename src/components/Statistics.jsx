import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Clock, BookOpen, Activity, Flame } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

const Statistics = () => {
  const { readingSessions, calorieLogs } = useTaskContext();
  
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // --- Lesestatistik ---
  const totalReadingSeconds = readingSessions.reduce((acc, session) => acc + session.timeSpent, 0);
  const totalReadingAmount = readingSessions.reduce((acc, session) => acc + session.amount, 0);
  const totalReadingHours = totalReadingSeconds / 3600;
  const averageReadingSpeed = totalReadingHours > 0 ? (totalReadingAmount / totalReadingHours).toFixed(1) : 0;

  // --- Kalorien Wochenbilanz ---
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

  const currentWeekLogs = calorieLogs.filter(log => {
    const logDate = parseISO(log.date);
    return isWithinInterval(logDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
  });

  const weeklyCalorieBalance = currentWeekLogs.reduce((acc, log) => acc + log.difference, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      
      {/* LESE-STATISTIK */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen color="var(--accent-primary)" />
          Lesestatistik
        </h2>
        
        {readingSessions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Noch keine Lese-Sessions vorhanden. Nutze den Timer unter "Lesegeschwindigkeit".
          </div>
        ) : (
          <div style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '1.5rem', 
            backgroundColor: 'var(--bg-main)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> Gesamtzeit
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatTime(totalReadingSeconds)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <BookOpen size={14} /> Gelesen
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{totalReadingAmount} Seiten</span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Durchschnittliche Geschwindigkeit</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                {averageReadingSpeed} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-main)' }}>Seiten/h</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KALORIEN-BILANZ */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Flame color="var(--accent-danger)" />
          Kalorien-Wochenbilanz
        </h2>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Woche vom {format(startOfCurrentWeek, 'dd.MM.')} bis {format(endOfCurrentWeek, 'dd.MM.')}
        </p>

        <div style={{ 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--border-radius)', 
          padding: '2rem', 
          backgroundColor: 'var(--bg-main)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Gesamt-Abweichung diese Woche:</span>
          <div style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            color: weeklyCalorieBalance > 0 ? 'var(--accent-danger)' : (weeklyCalorieBalance < 0 ? 'var(--accent-success)' : 'var(--text-main)') 
          }}>
            {weeklyCalorieBalance > 0 ? '+' : ''}{weeklyCalorieBalance} kcal
          </div>
          {weeklyCalorieBalance > 0 && (
            <p style={{ color: 'var(--accent-danger)', textAlign: 'center' }}>Du bist über deinem Wochenziel.</p>
          )}
          {weeklyCalorieBalance < 0 && (
            <p style={{ color: 'var(--accent-success)', textAlign: 'center' }}>Du bist unter deinem Wochenziel. Super!</p>
          )}
          {weeklyCalorieBalance === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Du bist exakt im Ziel (oder hast noch nichts eingetragen).</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default Statistics;
