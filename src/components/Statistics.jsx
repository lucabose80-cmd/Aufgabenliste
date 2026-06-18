import React from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, eachWeekOfInterval, startOfYear, endOfYear } from 'date-fns';
import { Box, Card, Typography, Tooltip, Grid } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

const Statistics = () => {
  const { readingSessions, calorieLogs } = useTaskContext();
  
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const totalReadingSeconds = readingSessions.reduce((acc, session) => acc + session.timeSpent, 0);
  const totalReadingAmount = readingSessions.reduce((acc, session) => acc + session.amount, 0);
  const totalReadingHours = totalReadingSeconds / 3600;
  const averageReadingSpeed = totalReadingHours > 0 ? (totalReadingAmount / totalReadingHours).toFixed(1) : 0;

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

  const currentWeekLogs = calorieLogs.filter(log => {
    const logDate = parseISO(log.date);
    return isWithinInterval(logDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
  });

  const weeklyCalorieBalance = currentWeekLogs.reduce((acc, log) => acc + log.difference, 0);

  const getAllWeeksOfYear = () => {
    const now = new Date();
    const weeksList = eachWeekOfInterval(
      { start: startOfYear(now), end: endOfYear(now) },
      { weekStartsOn: 1 }
    );
    
    return weeksList.map(weekStart => {
      return {
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 })
      };
    });
  };

  const weeks = getAllWeeksOfYear();
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10 }}>
      
      {/* LESE-STATISTIK */}
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <MenuBookIcon color="primary" />
          Lesestatistik
        </Typography>
        
        {readingSessions.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ p: 4 }}>
            Noch keine Lese-Sessions vorhanden. Nutze den Timer unter "Lesegeschwindigkeit".
          </Typography>
        ) : (
          <Box sx={{ 
            border: 1, 
            borderColor: 'divider', 
            borderRadius: 2, 
            p: 3, 
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon fontSize="small" /> Gesamtzeit
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">{formatTime(totalReadingSeconds)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MenuBookIcon fontSize="small" /> Gelesen
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">{totalReadingAmount} Seiten</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderStyle: 'dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Durchschnittliche Geschwindigkeit</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {averageReadingSpeed} <Typography component="span" variant="h6" fontWeight="normal" color="text.primary">Seiten/h</Typography>
              </Typography>
            </Box>
          </Box>
        )}
      </Card>

      {/* KALORIEN-BILANZ */}
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <LocalFireDepartmentIcon color="error" />
          Kalorien-Wochenbilanz
        </Typography>
        
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Woche vom {format(startOfCurrentWeek, 'dd.MM.')} bis {format(endOfCurrentWeek, 'dd.MM.')}
        </Typography>

        <Box sx={{ 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 2, 
          p: 4, 
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}>
          <Typography color="text.secondary">Gesamt-Abweichung diese Woche:</Typography>
          <Typography 
            variant="h2" 
            fontWeight="bold" 
            color={weeklyCalorieBalance > 0 ? 'error.main' : (weeklyCalorieBalance < 0 ? 'success.main' : 'text.primary')}
          >
            {weeklyCalorieBalance > 0 ? '+' : ''}{weeklyCalorieBalance} <Typography component="span" variant="h6" fontWeight="normal" color="text.primary">kcal</Typography>
          </Typography>
          {weeklyCalorieBalance > 0 && (
            <Typography color="error.main" align="center">Du bist über deinem Wochenziel.</Typography>
          )}
          {weeklyCalorieBalance < 0 && (
            <Typography color="success.main" align="center">Du bist unter deinem Wochenziel. Super!</Typography>
          )}
          {weeklyCalorieBalance === 0 && (
            <Typography color="text.secondary" align="center">Du bist exakt im Ziel (oder hast noch nichts eingetragen).</Typography>
          )}
        </Box>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Jahres-Übersicht</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Grün = Unter/im Ziel, Rot = Über dem Ziel, Grau = Keine Einträge
        </Typography>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(20px, 1fr))', 
          gap: 0.5, 
          width: '100%' 
        }}>
          {weekData.map((data, idx) => {
            let bgColor = 'background.default';
            let borderColor = 'divider';
            if (data.hasData) {
              if (data.sum <= 0) {
                bgColor = 'success.main';
                borderColor = 'success.dark';
              } else {
                bgColor = 'error.main';
                borderColor = 'error.dark';
              }
            }

            const title = `${format(data.start, 'dd.MM')} - ${format(data.end, 'dd.MM')}: ${data.hasData ? (data.sum > 0 ? '+' + data.sum : data.sum) + ' kcal' : 'Keine Daten'}`;

            return (
              <Tooltip title={title} key={idx} arrow placement="top">
                <Box
                  sx={{
                    aspectRatio: '1/1',
                    minHeight: 20,
                    borderRadius: 1,
                    bgcolor: bgColor,
                    border: 1,
                    borderColor: borderColor,
                    opacity: data.hasData ? 0.8 : 0.5,
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 1,
                    }
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Card>

    </Box>
  );
};

export default Statistics;
