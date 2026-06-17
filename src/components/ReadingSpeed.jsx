import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { BookOpen, Play, Square, Save, Trash2, Edit2, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ReadingSpeed = () => {
  const { readingSessions, saveReadingSession, deleteReadingSession, updateReadingSession } = useTaskContext();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [amount, setAmount] = useState('');
  const [showAmountField, setShowAmountField] = useState(false);

  // Edit State
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAmount, setEditAmount] = useState('');

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
    setShowAmountField(true);
  };

  const handleSaveInfo = () => {
    saveReadingSession(timerSeconds, amount);
    setTimerSeconds(0);
    setShowAmountField(false);
    setAmount('');
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h === '00') return `${m}:${s}`;
    return `${h}:${m}:${s}`;
  };

  const handleEditClick = (session) => {
    setEditingSessionId(session.id);
    setEditMinutes(Math.round(session.timeSpent / 60));
    setEditAmount(session.amount);
  };

  const handleSaveEdit = (id) => {
    updateReadingSession(id, parseInt(editMinutes, 10) * 60, parseFloat(editAmount));
    setEditingSessionId(null);
  };

  const recentSessions = [...readingSessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen color="var(--accent-primary)" /> Lesegeschwindigkeit
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3rem 0' }}>
          <div style={{ fontSize: '4rem', fontFamily: 'monospace', fontWeight: 'bold', color: isTimerRunning ? 'var(--accent-primary)' : 'var(--text-main)', transition: 'color 0.3s ease' }}>
            {formatTime(timerSeconds)}
          </div>
          
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            {!showAmountField && (
              isTimerRunning ? (
                <button onClick={handleStopTimer} style={{ background: 'var(--accent-danger)', color: 'white', padding: '1rem 2rem', borderRadius: '50px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.2rem' }}>
                  <Square size={24} fill="currentColor" /> Stoppen
                </button>
              ) : (
                <button onClick={() => setIsTimerRunning(true)} style={{ background: 'var(--accent-success)', color: 'white', padding: '1rem 2rem', borderRadius: '50px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.2rem' }}>
                  <Play size={24} fill="currentColor" /> {timerSeconds === 0 ? 'Starten' : 'Fortsetzen'}
                </button>
              )
            )}
          </div>
        </div>

        {showAmountField && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--border-radius)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Lese-Session speichern</h3>
            <p style={{ color: 'var(--text-muted)' }}>Wie viele Seiten hast du in dieser Zeit ({formatTime(timerSeconds)}) gelesen?</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="Anzahl Seiten" 
                style={{ flex: 1, fontSize: '1.1rem' }}
              />
              <button className="btn-primary" onClick={handleSaveInfo} style={{ padding: '0.75rem 1.5rem' }}>
                <Save size={18} /> Speichern
              </button>
            </div>
            <button 
              onClick={() => {
                setTimerSeconds(0);
                setShowAmountField(false);
                setAmount('');
              }}
              style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', background: 'transparent', color: 'var(--text-danger)', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Verwerfen
            </button>
          </div>
        )}
      </div>

      {recentSessions.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Letzte Lese-Einträge</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSessions.map(session => (
              <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                
                {editingSessionId === session.id ? (
                  <div style={{ display: 'flex', gap: '1rem', flex: 1, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        value={editMinutes} 
                        onChange={(e) => setEditMinutes(e.target.value)}
                        style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                      /> 
                      <span style={{ color: 'var(--text-muted)' }}>Min.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        value={editAmount} 
                        onChange={(e) => setEditAmount(e.target.value)}
                        style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                      />
                      <span style={{ color: 'var(--text-muted)' }}>Seiten</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold' }}>{format(parseISO(session.date), 'dd.MM.yyyy')}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {formatTime(session.timeSpent)} gelesen • {session.amount} Seiten
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingSessionId === session.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(session.id)} style={{ background: 'var(--accent-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}>
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingSessionId(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}>
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(session)} style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => { if(window.confirm('Eintrag löschen?')) deleteReadingSession(session.id) }} style={{ background: 'transparent', color: 'var(--accent-danger)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingSpeed;
