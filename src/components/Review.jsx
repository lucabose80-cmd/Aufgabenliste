import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Calendar, CheckSquare, BookOpen, Flame, Award, Activity } from 'lucide-react';
import { format, isSameMonth, isSameYear, parseISO, subDays, startOfWeek } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { de } from 'date-fns/locale';

const Review = () => {
  const { tasks, readingSessions, calorieLogs } = useTaskContext();
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'

  const today = new Date();

  // Filter Logik
  const isDateInView = (dateStr) => {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    if (viewMode === 'month') return isSameMonth(date, today);
    return isSameYear(date, today);
  };

  // 1. Aufgaben (Tasks)
  let totalTasksCompleted = 0;
  tasks.forEach(task => {
    task.completedDates.forEach(dateStr => {
      if (isDateInView(dateStr)) {
        totalTasksCompleted++;
      }
    });
  });

  // 2. Lese-Statistik
  const filteredReading = readingSessions.filter(session => isDateInView(session.date));
  const totalReadingAmount = filteredReading.reduce((acc, s) => acc + s.amount, 0);
  const totalReadingSeconds = filteredReading.reduce((acc, s) => acc + s.timeSpent, 0);
  const totalReadingHours = (totalReadingSeconds / 3600).toFixed(1);

  // 3. Kalorien
  const filteredCalories = calorieLogs.filter(log => isDateInView(log.date));
  
  const weeklySums = {};
  filteredCalories.forEach(log => {
    const d = parseISO(log.date);
    const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weeklySums[wStart]) weeklySums[wStart] = 0;
    weeklySums[wStart] += log.difference;
  });

  const totalWeeks = Object.keys(weeklySums).length;
  const successfulWeeks = Object.values(weeklySums).filter(sum => sum <= 0).length;
  
  // 4. Längster aktueller Streak (nur zur Info, da wir Streaks aktuell über die ganze Zeit rechnen)
  let bestStreak = 0;
  let bestStreakTask = '';

  tasks.filter(t => t.type === 'daily').forEach(task => {
    const completedDates = task.completedDates || [];
    if (completedDates.length === 0) return;

    let streak = 0;
    let checkDate = new Date(); 
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

    if (!completedDates.includes(todayStr) && !completedDates.includes(yesterdayStr)) {
      return;
    }

    if (!completedDates.includes(todayStr)) {
      checkDate = subDays(checkDate, 1);
    }

    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (completedDates.includes(dateStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    if (streak > bestStreak) {
      bestStreak = streak;
      bestStreakTask = task.title;
    }
  });

  // --- Chart Data ---
  const readingData = [];
  const taskData = [];
  
  if (viewMode === 'month') {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const daySessions = readingSessions.filter(s => s.date === dateStr);
      const dayAmount = daySessions.reduce((acc, s) => acc + s.amount, 0);
      const dayTime = daySessions.reduce((acc, s) => acc + s.timeSpent, 0);
      const daySpeed = dayTime > 0 ? Math.round(dayAmount / (dayTime / 3600)) : 0;
      
      readingData.push({ 
        name: `${i}.`, 
        amount: dayAmount,
        speed: daySpeed
      });
      
      let tCount = 0;
      tasks.forEach(task => {
        if (task.completedDates && task.completedDates.includes(dateStr)) tCount++;
      });
      taskData.push({ name: `${i}.`, count: tCount });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const monthPrefix = format(new Date(today.getFullYear(), i, 1), 'yyyy-MM');
      const monthName = format(new Date(today.getFullYear(), i, 1), 'MMM', { locale: de });
      
      const monthSessions = readingSessions.filter(s => s.date && s.date.startsWith(monthPrefix));
      const monthAmount = monthSessions.reduce((acc, s) => acc + s.amount, 0);
      const monthTime = monthSessions.reduce((acc, s) => acc + s.timeSpent, 0);
      const monthSpeed = monthTime > 0 ? Math.round(monthAmount / (monthTime / 3600)) : 0;
      
      readingData.push({ 
        name: monthName, 
        amount: monthAmount,
        speed: monthSpeed
      });
      
      let tCount = 0;
      tasks.forEach(task => {
        if (task.completedDates) {
          task.completedDates.forEach(d => {
            if (d.startsWith(monthPrefix)) tCount++;
          });
        }
      });
      taskData.push({ name: monthName, count: tCount });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      
      <div style={{ display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem', borderRadius: 'var(--border-radius)', width: 'fit-content' }}>
        <button 
          onClick={() => setViewMode('month')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--border-radius)',
            border: 'none',
            background: viewMode === 'month' ? 'var(--accent-primary)' : 'transparent',
            color: viewMode === 'month' ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {format(today, 'MMMM', { locale: de })}
        </button>
        <button 
          onClick={() => setViewMode('year')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--border-radius)',
            border: 'none',
            background: viewMode === 'year' ? 'var(--accent-primary)' : 'transparent',
            color: viewMode === 'year' ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {format(today, 'yyyy')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Aufgaben */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%' }}>
            <CheckSquare size={32} color="var(--accent-primary)" />
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Aufgaben erledigt</h3>
          <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>{totalTasksCompleted}</span>
        </div>

        {/* Card 2: Lesen */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '50%' }}>
            <BookOpen size={32} color="#ec4899" />
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Gelesen</h3>
          <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ec4899' }}>{totalReadingAmount} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>S.</span></span>
          <span style={{ color: 'var(--text-muted)' }}>in {totalReadingHours} Stunden</span>
        </div>

        {/* Card 3: Kalorien */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
            <Flame size={32} color="var(--accent-danger)" />
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Kalorienziel</h3>
          <span style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            color: successfulWeeks === totalWeeks && totalWeeks > 0 ? 'var(--accent-success)' : 'var(--text-main)' 
          }}>
            {successfulWeeks} / {totalWeeks}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>Wochen erreicht</span>
        </div>

      </div>

      {/* Highlights */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Award color="var(--accent-warning)" /> Highlights
        </h2>
        {bestStreak > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem' }}>🔥</div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Längster aktiver Streak</div>
              <div style={{ color: 'var(--text-muted)' }}>Du hast <strong>{bestStreakTask}</strong> schon {bestStreak} Tage in Folge geschafft!</div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Noch keine aktiven Streaks (tägliche Aufgaben an aufeinanderfolgenden Tagen) vorhanden.</p>
        )}
      </div>

      {/* --- Diagramme --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={18} /> Erledigte Aufgaben im Verlauf
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Bar dataKey="count" name="Aufgaben" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} /> Gelesene Seiten im Verlauf
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={readingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Line type="monotone" dataKey="amount" name="Seiten" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} /> Lesegeschwindigkeit (Seiten pro Stunde)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={readingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Line type="monotone" dataKey="speed" name="Seiten/h" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Review;
