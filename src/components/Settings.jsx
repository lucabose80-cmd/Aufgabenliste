import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Grid, Button, Select, MenuItem, FormControl, InputLabel, Switch, Divider } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import GridViewIcon from '@mui/icons-material/GridView';
import CategoriesManager from './CategoriesManager';

const COLORS = [
  { name: 'Google Blau', hex: '#1a73e8' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Smaragdgrün', hex: '#10b981' },
  { name: 'Kirschrot', hex: '#f43f5e' },
  { name: 'Bernstein', hex: '#f59e0b' },
  { name: 'Ozeanblau', hex: '#0ea5e9' },
  { name: 'Amethyst', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' }
];

const NAV_ITEMS = [
  { id: 'home', label: 'Aufgaben' },
  { id: 'past-review', label: 'Rückblick' },
  { id: 'reading-speed', label: 'Lesegeschwindigkeit' },
  { id: 'shopping', label: 'Einkaufsliste' },
  { id: 'categories', label: 'Kategorien verwalten' },
  { id: 'create', label: 'Aufgabe erstellen' },
];

const Settings = () => {
  const { theme, accentColor, pinnedNavItems, saveSettings, resetHour, vacationMode, saveVacationMode, resetTaskStatistics, enableReadingFeature, taskColumns, saveTaskColumns } = useTaskContext();
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const handleThemeChange = (newTheme) => {
    saveSettings(newTheme, accentColor, undefined, pinnedNavItems);
  };

  const handleColorChange = (newColor) => {
    saveSettings(theme, newColor, undefined, pinnedNavItems);
  };

  const handleResetHourChange = (e) => {
    saveSettings(theme, accentColor, undefined, pinnedNavItems, undefined, undefined, e.target.value);
  };

  const handleNavToggle = (itemId) => {
    let newPinned = [...(pinnedNavItems || [])];
    if (newPinned.includes(itemId)) {
      newPinned = newPinned.filter(id => id !== itemId);
    } else {
      if (newPinned.length >= 5) {
        alert('Du kannst maximal 5 Menüpunkte anpinnen.');
        return;
      }
      newPinned.push(itemId);
    }
    saveSettings(theme, accentColor, undefined, newPinned);
  };

  const moveNav = (e, itemId, direction) => {
    e.stopPropagation();
    let newPinned = [...(pinnedNavItems || [])];
    const index = newPinned.indexOf(itemId);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      [newPinned[index - 1], newPinned[index]] = [newPinned[index], newPinned[index - 1]];
    } else if (direction === 'down' && index < newPinned.length - 1) {
      [newPinned[index + 1], newPinned[index]] = [newPinned[index], newPinned[index + 1]];
    }
    saveSettings(theme, accentColor, undefined, newPinned);
  };

  const sortedNavItems = [...NAV_ITEMS].sort((a, b) => {
    const aIndex = (pinnedNavItems || []).indexOf(a.id);
    const bIndex = (pinnedNavItems || []).indexOf(b.id);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10, maxWidth: 760, mx: 'auto' }}>
      {/* Erscheinungsbild & Akzentfarbe */}
      <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '24px' }}>
        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
          Erscheinungsbild
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
          <Grid item xs={6}>
            <Box
              onClick={() => handleThemeChange('dark')}
              sx={{
                py: 2.5,
                px: 2,
                borderRadius: '18px',
                border: '1.5px solid',
                borderColor: theme === 'dark' ? 'primary.main' : 'divider',
                bgcolor: theme === 'dark' ? alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.08) : 'background.surfaceVariant',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <DarkModeIcon sx={{ color: theme === 'dark' ? 'primary.main' : 'text.secondary', fontSize: 28 }} />
              <Typography variant="body2" fontWeight={600} color={theme === 'dark' ? 'primary.main' : 'text.primary'}>
                Dark Mode
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box
              onClick={() => handleThemeChange('light')}
              sx={{
                py: 2.5,
                px: 2,
                borderRadius: '18px',
                border: '1.5px solid',
                borderColor: theme === 'light' ? 'primary.main' : 'divider',
                bgcolor: theme === 'light' ? alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.08) : 'background.surfaceVariant',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <LightModeIcon sx={{ color: theme === 'light' ? 'primary.main' : 'text.secondary', fontSize: 28 }} />
              <Typography variant="body2" fontWeight={600} color={theme === 'light' ? 'primary.main' : 'text.primary'}>
                Light Mode
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          Akzentfarbe
        </Typography>
        <Grid container spacing={1.25}>
          {COLORS.map((c) => {
            const isSelected = accentColor?.toLowerCase() === c.hex.toLowerCase();
            return (
              <Grid item xs={6} sm={3} key={c.hex}>
                <Box
                  onClick={() => handleColorChange(c.hex)}
                  sx={{
                    p: 1.5,
                    borderRadius: '16px',
                    border: '1.5px solid',
                    borderColor: isSelected ? c.hex : 'divider',
                    bgcolor: isSelected ? alpha(c.hex, isDark ? 0.16 : 0.08) : 'background.surfaceVariant',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: c.hex,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c.hex }} />
                  <Typography variant="caption" fontWeight={600} align="center" sx={{ fontSize: '0.72rem' }}>
                    {c.name}
                  </Typography>
                  {isSelected && (
                    <CheckCircleIcon
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: c.hex,
                        fontSize: 18,
                      }}
                    />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3.5, mb: 1.5, fontWeight: 600 }}>
          Aufgaben-Layout
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <Box
              onClick={() => saveTaskColumns(1)}
              sx={{
                py: 2,
                px: 2,
                borderRadius: '18px',
                border: '1.5px solid',
                borderColor: (taskColumns || 1) === 1 ? 'primary.main' : 'divider',
                bgcolor: (taskColumns || 1) === 1 ? alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.08) : 'background.surfaceVariant',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <ViewAgendaIcon sx={{ color: (taskColumns || 1) === 1 ? 'primary.main' : 'text.secondary', fontSize: 26 }} />
              <Typography variant="body2" fontWeight={600} color={(taskColumns || 1) === 1 ? 'primary.main' : 'text.primary'}>
                1 Spalte
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box
              onClick={() => saveTaskColumns(2)}
              sx={{
                py: 2,
                px: 2,
                borderRadius: '18px',
                border: '1.5px solid',
                borderColor: taskColumns === 2 ? 'primary.main' : 'divider',
                bgcolor: taskColumns === 2 ? alpha(muiTheme.palette.primary.main, isDark ? 0.16 : 0.08) : 'background.surfaceVariant',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <GridViewIcon sx={{ color: taskColumns === 2 ? 'primary.main' : 'text.secondary', fontSize: 26 }} />
              <Typography variant="body2" fontWeight={600} color={taskColumns === 2 ? 'primary.main' : 'text.primary'}>
                2 Spalten
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Kategorien verwalten */}
      <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '24px' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Kategorien verwalten
        </Typography>
        <CategoriesManager isEmbedded={true} />
      </Card>

      {/* Allgemeine Einstellungen */}
      <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Allgemein
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" fontWeight={600}>Tageswechsel (Reset)</Typography>
            <Typography variant="body2" color="text.secondary">
              Um wie viel Uhr sollen deine täglichen Aufgaben zurückgesetzt werden?
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="reset-hour-label">Uhrzeit</InputLabel>
            <Select
              labelId="reset-hour-label"
              value={resetHour || 3}
              label="Uhrzeit"
              onChange={handleResetHourChange}
            >
              {[...Array(24)].map((_, i) => (
                <MenuItem key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00 Uhr
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>Urlaubsmodus</Typography>
            <Typography variant="body2" color="text.secondary">
              Pausiert Aufgaben und schützt deine Streaks während du im Urlaub bist.
            </Typography>
          </Box>
          <Switch checked={vacationMode} onChange={(e) => saveVacationMode(e.target.checked)} color="primary" />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>Lesen-Tab anzeigen</Typography>
            <Typography variant="body2" color="text.secondary">
              Schalte den separaten &quot;Lesen&quot;-Tab für Lesestatistiken ein oder aus.
            </Typography>
          </Box>
          <Switch
            checked={enableReadingFeature}
            onChange={(e) => saveSettings(undefined, undefined, undefined, undefined, undefined, undefined, undefined, e.target.checked)}
            color="primary"
          />
        </Box>
      </Card>

      {/* Gefahrenzone */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: '24px',
          bgcolor: alpha(muiTheme.palette.error.main, isDark ? 0.1 : 0.06),
          borderColor: alpha(muiTheme.palette.error.main, 0.28),
        }}
      >
        <Typography variant="h6" gutterBottom color="error.main" fontWeight={700}>
          Gefahrenzone
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Hier kannst du alle Statistiken und Erledigungen deiner Aufgaben unwiderruflich zurücksetzen. Deine Lese-Statistiken bleiben erhalten.
        </Typography>
        <Button 
          variant="contained" 
          color="error" 
          onClick={() => {
            if (window.confirm("Bist du sicher? Alle abgeschlossenen Aufgaben und Streaks werden unwiderruflich gelöscht!")) {
              resetTaskStatistics();
            }
          }}
        >
          Statistiken zurücksetzen
        </Button>
      </Card>
    </Box>
  );
};

export default Settings;
