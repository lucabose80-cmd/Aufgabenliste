import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval, subHours } from 'date-fns';
import { Box, Card, Typography, TextField, Button, IconButton, Divider } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineIcon from '@mui/icons-material/Timeline';

const Calories = () => {
  const { calorieGoal, updateCalorieGoal, calorieLogs, saveCalorieLog, deleteCalorieLog, getTodayDateString, resetHour } = useTaskContext();
  const [goalInput, setGoalInput] = useState(calorieGoal || '');
  const [differenceInput, setDifferenceInput] = useState('');
  const todayStr = getTodayDateString();
  const todayDate = subHours(new Date(), resetHour || 3);

  const handleSaveGoal = () => {
    updateCalorieGoal(goalInput);
  };

  const handleSaveDifference = () => {
    if (differenceInput === '' || differenceInput === null || differenceInput === undefined) return;
    let val = differenceInput.toString().trim();
    saveCalorieLog(val, todayStr);
    setDifferenceInput('');
  };

  const handleAddDifference = () => {
    if (differenceInput === '' || differenceInput === null || differenceInput === undefined) return;
    const current = todayLog ? todayLog.difference : 0;
    const added = parseInt(differenceInput.toString().replace('+', ''), 10) || 0;
    saveCalorieLog(current + added, todayStr);
    setDifferenceInput('');
  };

  const handleDeleteLog = () => {
    if (confirm('Möchtest du den heutigen Eintrag löschen?')) {
      deleteCalorieLog(todayStr);
      setDifferenceInput('');
    }
  };

  const todayLog = calorieLogs.find(l => l.date === todayStr);

  const weeklyBalance = calorieLogs.reduce((acc, log) => {
    try {
      const logDate = parseISO(log.date);
      const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(todayDate, { weekStartsOn: 1 });
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
        return acc + log.difference;
      }
    } catch { }
    return acc;
  }, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 800, mx: 'auto' }}>
      <Card sx={{ p: { xs: 2, sm: 4 }, bgcolor: weeklyBalance > 0 ? 'error.light' : (weeklyBalance < 0 ? 'success.light' : 'background.paper'), color: weeklyBalance !== 0 ? '#fff' : 'inherit' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <TimelineIcon /> Wochenbilanz
        </Typography>
        <Typography variant="h3" sx={{ mt: 2, fontWeight: 'bold', textAlign: 'center' }}>
          {weeklyBalance > 0 ? '+' : ''}{weeklyBalance} kcal
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, opacity: 0.9 }}>
          {weeklyBalance > 0 ? 'Du bist diese Woche insgesamt über deinem Ziel.' : (weeklyBalance < 0 ? 'Du bist diese Woche insgesamt unter deinem Ziel.' : 'Du bist diese Woche genau auf dem Ziel.')}
        </Typography>
      </Card>

      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <LocalFireDepartmentIcon color="error" fontSize="large" /> Kalorienziel
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>Mein tägliches Kalorienziel</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField 
              type="number" 
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="z.B. 2000"
              fullWidth
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button variant="contained" color="primary" onClick={handleSaveGoal} startIcon={<SaveIcon />}>
              Speichern
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom>Heutige Bilanz ({format(new Date(), 'dd.MM.yyyy')})</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Gib ein, wie viele Kalorien du heute drüber (positiv) oder drunter (negativ) warst.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField 
              type="text" 
              inputMode="numeric"
              value={differenceInput}
              onChange={(e) => setDifferenceInput(e.target.value)}
              placeholder="z.B. +200 oder -100"
              fullWidth
              sx={{ flex: 1, minWidth: 200 }}
            />
            {!todayLog ? (
              <Button variant="contained" color="primary" onClick={handleSaveDifference} startIcon={<AddIcon />}>
                Eintragen
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" color="primary" onClick={handleAddDifference} startIcon={<AddIcon />}>
                  Dazu addieren
                </Button>
                <Button variant="outlined" color="primary" onClick={handleSaveDifference} startIcon={<EditIcon />}>
                  Überschreiben
                </Button>
              </Box>
            )}
          </Box>
          
          {todayLog && (
            <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography>
                Du hast heute bereits eingetragen: 
                <Typography component="span" fontWeight="bold" color={todayLog.difference > 0 ? 'error.main' : 'success.main'} sx={{ ml: 1 }}>
                  {todayLog.difference > 0 ? '+' : ''}{todayLog.difference} kcal
                </Typography>
              </Typography>
              <IconButton color="error" onClick={handleDeleteLog} title="Löschen">
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default Calories;
