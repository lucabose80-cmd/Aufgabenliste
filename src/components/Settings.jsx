import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Settings as SettingsIcon, Moon, Sun, Check } from 'lucide-react';

const COLORS = [
  { name: 'Indigo (Standard)', hex: '#6366f1' },
  { name: 'Smaragdgrün', hex: '#10b981' },
  { name: 'Kirschrot', hex: '#f43f5e' },
  { name: 'Bernstein', hex: '#f59e0b' },
  { name: 'Ozeanblau', hex: '#0ea5e9' },
  { name: 'Amethyst', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' }
];

const Settings = () => {
  const { theme, accentColor, updateThemeSettings } = useTaskContext();

  const handleThemeChange = (newTheme) => {
    updateThemeSettings(newTheme, accentColor);
  };

  const handleColorChange = (newColor) => {
    updateThemeSettings(theme, newColor);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon color="var(--accent-primary)" /> Personalisierung
        </h2>

        {/* Theme Toggle */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Erscheinungsbild</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => handleThemeChange('dark')}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: 'var(--border-radius)',
                border: `2px solid ${theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Moon size={24} color={theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-main)'} />
              <span style={{ fontWeight: '500' }}>Dark Mode</span>
            </button>
            <button 
              onClick={() => handleThemeChange('light')}
              style={{
                flex: 1,
                padding: '1.5rem',
                borderRadius: 'var(--border-radius)',
                border: `2px solid ${theme === 'light' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Sun size={24} color={theme === 'light' ? 'var(--accent-primary)' : 'var(--text-main)'} />
              <span style={{ fontWeight: '500' }}>Light Mode</span>
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '2.5rem' }} />

        {/* Accent Color Selection */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Hauptfarbe (Akzent)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleColorChange(c.hex)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--border-radius)',
                  border: `2px solid ${accentColor === c.hex ? c.hex : 'var(--border-color)'}`,
                  background: 'var(--bg-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c.hex }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{c.name}</span>
                {accentColor === c.hex && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                    <Check size={14} color={c.hex} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
