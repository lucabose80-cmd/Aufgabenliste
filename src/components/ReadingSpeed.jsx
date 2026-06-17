import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { BookOpen, Play, Square, Save } from 'lucide-react';

const ReadingSpeed = () => {
  const { saveReadingSession } = useTaskContext();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [amount, setAmount] = useState('');
  const [showAmountField, setShowAmountField] = useState(false);

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
    </div>
  );
};

export default ReadingSpeed;
