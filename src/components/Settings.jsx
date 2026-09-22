import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, Grid, Button, IconButton, Checkbox, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Switch } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const COLORS = [
  { name: 'Indigo (Standard)', hex: '#6366f1' },
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
  const { theme, accentColor, pinnedNavItems, saveSettings, resetHour, vacationMode, saveVacationMode, resetTaskStatistics } = useTaskContext();

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 800, mx: 'auto' }}>
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <SettingsIcon color="primary" fontSize="large" /> Personalisierung
        </Typography>

        {/* Theme Toggle */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>Erscheinungsbild</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="outlined"
                fullWidth
                onClick={() => handleThemeChange('dark')}
                sx={{
                  py: 3,
                  border: 2,
                  borderColor: theme === 'dark' ? 'primary.main' : 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'background.paper',
                  }
                }}
              >
                <DarkModeIcon color={theme === 'dark' ? 'primary' : 'inherit'} fontSize="large" />
                <Typography fontWeight="bold">Dark Mode</Typography>
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="outlined"
                fullWidth
                onClick={() => handleThemeChange('light')}
                sx={{
                  py: 3,
                  border: 2,
                  borderColor: theme === 'light' ? 'primary.main' : 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'background.paper',
                  }
                }}
              >
                <LightModeIcon color={theme === 'light' ? 'primary' : 'inherit'} fontSize="large" />
                <Typography fontWeight="bold">Light Mode</Typography>
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Accent Color Selection */}
        <Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>Hauptfarbe (Akzent)</Typography>
          <Grid container spacing={2}>
            {COLORS.map((c) => (
              <Grid item xs={6} sm={4} md={3} key={c.hex}>
                <Box
                  onClick={() => handleColorChange(c.hex)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: 2,
                    borderColor: accentColor === c.hex ? c.hex : 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: c.hex,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: c.hex, boxShadow: 2 }} />
                  <Typography variant="caption" fontWeight="bold" align="center">{c.name}</Typography>
                  
                  {accentColor === c.hex && (
                    <CheckCircleIcon 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        color: c.hex,
                        fontSize: 20,
                        bgcolor: 'background.paper',
                        borderRadius: '50%'
                      }} 
                    />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Navigation Personalization */}
        <Box sx={{ mt: 5 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>Menüleiste anpassen (Handy)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Wähle bis zu 5 Punkte, die unten in der Navigation angezeigt werden sollen. Der Rest landet im "Mehr" Menü.
          </Typography>
          <Grid container spacing={2}>
            {sortedNavItems.map((item) => {
              const isPinned = (pinnedNavItems || []).includes(item.id);
              const pinIndex = (pinnedNavItems || []).indexOf(item.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Box 
                    onClick={() => handleNavToggle(item.id)}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: isPinned ? 'primary.main' : 'divider',
                      bgcolor: isPinned ? 'primary.light' : 'background.paper',
                      color: isPinned ? 'primary.contrastText' : 'text.primary',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    <Checkbox 
                      checked={isPinned} 
                      sx={{ p: 0.5, mr: 1, color: isPinned ? 'primary.contrastText' : 'inherit', '&.Mui-checked': { color: 'primary.contrastText' } }} 
                    />
                    <Typography variant="body2" fontWeight={isPinned ? 'bold' : 'normal'} sx={{ flexGrow: 1 }}>
                      {item.label}
                    </Typography>
                    
                    {isPinned && (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => moveNav(e, item.id, 'up')}
                          disabled={pinIndex === 0}
                          sx={{ p: 0, color: 'inherit', opacity: pinIndex === 0 ? 0.3 : 1 }}
                        >
                          <KeyboardArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(e) => moveNav(e, item.id, 'down')}
                          disabled={pinIndex === pinnedNavItems.length - 1}
                          sx={{ p: 0, color: 'inherit', opacity: pinIndex === pinnedNavItems.length - 1 ? 0.3 : 1 }}
                        >
                          <KeyboardArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Reset Timer */}
        <Box sx={{ mt: 5 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>Tageswechsel (Reset)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Um wie viel Uhr sollen deine täglichen Aufgaben für den neuen Tag zurückgesetzt werden?
          </Typography>
          <FormControl fullWidth sx={{ maxWidth: 300 }}>
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

        {/* Urlaubsmodus */}
        <Box sx={{ mt: 5 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>Urlaubsmodus</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Wenn aktiviert, werden Aufgaben nicht mehr angezeigt und Streaks brechen nicht ab, während du im Urlaub bist.
          </Typography>
          <FormControlLabel
            control={<Switch checked={vacationMode} onChange={(e) => saveVacationMode(e.target.checked)} color="primary" />}
            label={<Typography fontWeight="bold">Urlaubsmodus aktivieren</Typography>}
          />
        </Box>

        {/* Reset Statistiken */}
        <Box sx={{ mt: 5, p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6" gutterBottom color="error.dark">Gefahrenzone</Typography>
          <Typography variant="body2" sx={{ mb: 2 }} color="error.dark">
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
        </Box>

      </Card>
    </Box>
  );
};

export default Settings;
