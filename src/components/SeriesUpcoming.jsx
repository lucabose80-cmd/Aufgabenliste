import React from 'react';
import { Box, Typography, Card, CardContent, CardMedia, IconButton, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTaskContext } from '../context/TaskContext';
import { addDays, setDay, setHours, setMinutes, setSeconds, isBefore, format } from 'date-fns';
import { de } from 'date-fns/locale';
import SeriesUpdater from './SeriesUpdater';

const DAY_MAP = {
  'Sonntag': 0,
  'Montag': 1,
  'Dienstag': 2,
  'Mittwoch': 3,
  'Donnerstag': 4,
  'Freitag': 5,
  'Samstag': 6
};

export default function SeriesUpcoming() {
  const { trackedSeries, updateTrackedSeries } = useTaskContext();

  const getNextOccurrence = (series) => {
    const dayName = series.releaseDay;
    const timeStr = series.releaseTime;
    const lastWatchedStr = series.lastWatchedDate || series.createdAt || new Date(0).toISOString();
    const lastWatched = new Date(lastWatchedStr);

    const now = new Date();
    const targetDayIndex = DAY_MAP[dayName];
    if (targetDayIndex === undefined) return null;
    
    let thisWeekOcc = setDay(now, targetDayIndex, { weekStartsOn: 1 });
    
    let hours = 0;
    let minutes = 0;
    if (timeStr) {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
      }
    }
    
    thisWeekOcc = setHours(thisWeekOcc, hours);
    thisWeekOcc = setMinutes(thisWeekOcc, minutes);
    thisWeekOcc = setSeconds(thisWeekOcc, 0);
    
    let mostRecentOcc = thisWeekOcc;
    if (isBefore(now, mostRecentOcc)) {
      mostRecentOcc = addDays(mostRecentOcc, -7);
    }
    
    const buffer = 1 * 60 * 60 * 1000;
    const effectiveOcc = new Date(mostRecentOcc.getTime() - buffer);

    if (isBefore(lastWatched, effectiveOcc)) {
      return mostRecentOcc;
    } else {
      return addDays(mostRecentOcc, 7);
    }
  };

  const activeSeries = trackedSeries.filter(s => 
    s.releaseDay && 
    (s.status === 'Aktuell am schauen' || s.status === 'Wartet auf neue Staffel' || s.status === 'Geplant')
  );

  const upcomingList = activeSeries.map(s => {
    const nextDate = getNextOccurrence(s);
    return { ...s, nextDate };
  }).filter(s => s.nextDate !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

  const handleCheckOff = (series) => {
    const newEp = (series.currentEpisode || 0) + 1;
    updateTrackedSeries(series.id, { 
      currentEpisode: newEp,
      lastWatchedDate: new Date().toISOString()
    });
  };

  return (
    <Box sx={{ p: 1, pb: 8, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Als nächstes fällig</Typography>
        <SeriesUpdater />
      </Box>
      
      {upcomingList.length === 0 ? (
        <Typography color="text.secondary">Du hast aktuell keine fortlaufenden Serien mit Release-Tagen.</Typography>
      ) : (
        upcomingList.map((s) => {
          const isAvailableNow = isBefore(s.nextDate, new Date());
          const dateStr = format(s.nextDate, "EEEE, dd.MM.", { locale: de });
          const timeStr = s.releaseTime ? ` um ${s.releaseTime} Uhr` : '';

          return (
            <Card key={s.id} sx={{ display: 'flex', mb: 2, alignItems: 'center', p: 1, borderLeft: isAvailableNow ? '4px solid' : 'none', borderColor: 'success.main' }}>
              {s.coverUrl && (
                <CardMedia
                  component="img"
                  sx={{ width: 70, height: 100, objectFit: 'cover', borderRadius: 1 }}
                  image={s.coverUrl}
                  alt={s.name}
                />
              )}
              <CardContent sx={{ flexGrow: 1, py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{s.name}</Typography>
                
                {isAvailableNow ? (
                  <Chip size="small" label="Bereits erschienen" color="success" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {dateStr}{timeStr}
                  </Typography>
                )}
                
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip label={`Episode ${s.currentEpisode + 1} anstehend`} size="small" />
                </Box>
              </CardContent>
              <Box sx={{ px: 2 }}>
                <IconButton 
                  color={isAvailableNow ? "success" : "default"}
                  onClick={() => handleCheckOff(s)}
                  size="large"
                >
                  <CheckCircleIcon fontSize="large" />
                </IconButton>
              </Box>
            </Card>
          );
        })
      )}
    </Box>
  );
}
