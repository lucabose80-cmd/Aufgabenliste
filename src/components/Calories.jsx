import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Flame, Plus, Save, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const Calories = () => {
  const { calorieGoal, updateCalorieGoal, calorieLogs, saveCalorieLog, deleteCalorieLog, getTodayDateString } = useTaskContext();
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

  const handleDeleteLog = () => {
    if (confirm('Möchtest du den heutigen Eintrag löschen?')) {
      deleteCalorieLog(todayStr);
    }
  };

  const todayLog = calorieLogs.find(l => l.date === todayStr);

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
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                Du hast heute bereits eingetragen: 
                <strong style={{ marginLeft: '0.5rem', color: todayLog.difference > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                  {todayLog.difference > 0 ? '+' : ''}{todayLog.difference} kcal
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setDifferenceInput(todayLog.difference)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  <Edit2 size={16} /> Ändern
                </button>
                <button 
                  onClick={handleDeleteLog}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--accent-danger)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} /> Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calories;
