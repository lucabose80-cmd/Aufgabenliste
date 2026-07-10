import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Chip } from '@mui/material';
import { useTaskContext } from '../context/TaskContext';
import { format, addDays } from 'date-fns';

const DAY_OPTIONS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const ENG_TO_GER = {
  'Monday': 'Montag', 'Tuesday': 'Dienstag', 'Wednesday': 'Mittwoch',
  'Thursday': 'Donnerstag', 'Friday': 'Freitag', 'Saturday': 'Samstag', 'Sunday': 'Sonntag'
};

export default function SeriesCalendar() {
  const { trackedSeries } = useTaskContext();

  const todayEng = format(new Date(), 'EEEE');
  const tomorrowEng = format(addDays(new Date(), 1), 'EEEE');
  
  const todayGer = ENG_TO_GER[todayEng];
  const tomorrowGer = ENG_TO_GER[tomorrowEng];

  // We only want to show series that are currently watched or planned and have a release day.
  const activeSeries = trackedSeries.filter(s => 
    s.releaseDay && 
    (s.status === 'Aktuell am schauen' || s.status === 'Geplant' || s.status === 'Wartet auf neue Staffel')
  );

  const getSeriesForDay = (day) => activeSeries.filter(s => s.releaseDay === day);

  const renderDaySection = (dayName, label, highlight = false) => {
    const seriesForDay = getSeriesForDay(dayName);
    
    return (
      <Box sx={{ mb: 4 }} key={dayName}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: highlight ? 'primary.main' : 'text.primary' }}>
          {label} ({dayName})
        </Typography>
        
        {seriesForDay.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Keine Releases an diesem Tag.</Typography>
        ) : (
          <Grid container spacing={2}>
            {seriesForDay.map(s => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={s.id}>
                <Card sx={{ display: 'flex', border: highlight ? '2px solid' : 'none', borderColor: 'primary.main' }}>
                  {s.coverUrl && (
                    <CardMedia
                      component="img"
                      sx={{ width: 100, objectFit: 'cover' }}
                      image={s.coverUrl}
                      alt={s.name}
                    />
                  )}
                  <CardContent sx={{ p: 1.5, flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2, mb: 1 }}>{s.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip label={s.type === 'anime' ? 'Anime' : 'Serie'} size="small" variant="outlined" />
                      {s.releaseTime && <Chip label={`${s.releaseTime} Uhr`} size="small" color="primary" variant="outlined" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Episode: {s.currentEpisode} {s.totalEpisodes ? `/ ${s.totalEpisodes}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  const otherDays = DAY_OPTIONS.filter(d => d !== todayGer && d !== tomorrowGer);

  return (
    <Box sx={{ p: 1, pb: 8 }}>
      {renderDaySection(todayGer, 'Heute', true)}
      {renderDaySection(tomorrowGer, 'Morgen', false)}
      
      <Typography variant="h6" sx={{ mt: 4, mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
        Später in der Woche
      </Typography>
      
      {otherDays.map(day => renderDaySection(day, day))}
    </Box>
  );
}
