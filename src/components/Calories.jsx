import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Flame, Plus, Save } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const Calories = () => {
  const { calorieGoal, updateCalorieGoal, calorieLogs, saveCalorieLog, getTodayDateString } = useTaskContext();
  const [goalInput, setGoalInput] = useState(calorieGoal || '');
  const [differenceInput, setDifferenceInput] = useState('');
  const todayStr = getTodayDateString();

  const handleSaveGoal = () => {
    updateCalorieGoal(goalInput);
  };

  const handleSaveDifference = () => {
    if (!differenceInput) return;
    saveCalorieLog(differenceInput, todayStr);
    setDifferenceInput('');
  };

  const todayLog = calorieLogs.find(l => l.date === todayStr);

  // Heatmap Logik: Letzte 12 Wochen berechnen
  const getLast12Weeks = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      weeks.push({ start, end });
    }
    return weeks;
  };

  const weeks = getLast12Weeks();
  const weekData = weeks.map(week => {
    const logsInWeek = calorieLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: week.start, end: week.end });
    });
    const sum = logsInWeek.reduce((acc, l) => acc + l.difference, 0);
    return {
      ...week,
      sum,
      hasData: logsInWeek.length > 0
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame color="var(--accent-danger)" /> Kalorienziel
        </h2>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mein tägliches Kalorienziel</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="number" 
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="z.B. 2000"
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleSaveGoal} style={{ padding: '0.75rem 1.5rem' }}>
              <Save size={18} /> Speichern
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

        <div>
          <h3 style={{ marginBottom: '1rem' }}>Heutige Bilanz ({format(new Date(), 'dd.MM.yyyy')})</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Gib ein, wie viele Kalorien du heute drüber (positiv) oder drunter (negativ) warst.
          </p>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="number" 
              value={differenceInput}
              onChange={(e) => setDifferenceInput(e.target.value)}
              placeholder="z.B. +200 oder -100"
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleSaveDifference} style={{ padding: '0.75rem 1.5rem' }}>
              <Plus size={18} /> Eintragen
            </button>
          </div>
          
          {todayLog && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--bg-card)' }}>
              Du hast heute bereits eingetragen: 
              <strong style={{ marginLeft: '0.5rem', color: todayLog.difference > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                {todayLog.difference > 0 ? '+' : ''}{todayLog.difference} kcal
              </strong>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Wochen-Übersicht (Letzte 12 Wochen)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Grün = Unter/im Ziel, Rot = Über dem Ziel, Grau = Keine Einträge
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {weekData.map((data, idx) => {
            let bgColor = 'var(--bg-main)';
            let borderColor = 'var(--border-color)';
            if (data.hasData) {
              if (data.sum <= 0) {
                bgColor = 'var(--accent-success)';
                borderColor = 'var(--accent-success)';
              } else {
                bgColor = 'var(--accent-danger)';
                borderColor = 'var(--accent-danger)';
              }
            }

            return (
              <div 
                key={idx} 
                title={`${format(data.start, 'dd.MM')} - ${format(data.end, 'dd.MM')}: ${data.hasData ? (data.sum > 0 ? '+' + data.sum : data.sum) + ' kcal' : 'Keine Daten'}`}
                style={{
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  opacity: data.hasData ? 0.8 : 0.5,
                  cursor: 'help'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calories;
