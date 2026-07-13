import React, { useEffect, useRef } from 'react';
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

    if (series.startDate) {
      let dubStartDate = new Date(series.startDate);
      if (series.dubDelay) {
        dubStartDate = addDays(dubStartDate, series.dubDelay * 7);
      }
      
      // If the show (or dub) hasn't started yet, find the next occurrence on or after dubStartDate
      if (isBefore(now, dubStartDate)) {
        // Find the first occurrence after the dubStartDate
        let nextOcc = setDay(dubStartDate, targetDayIndex, { weekStartsOn: 1 });
        nextOcc = setHours(nextOcc, hours);
        nextOcc = setMinutes(nextOcc, minutes);
        nextOcc = setSeconds(nextOcc, 0);
        if (isBefore(nextOcc, dubStartDate)) {
           nextOcc = addDays(nextOcc, 7);
        }
        return nextOcc;
      }
    }
    
    const out = getEpisodesOut(series);
    if (out !== null) {
      if (out > series.currentEpisode) {
        // They are behind! Return a past date so it stays "Bereits erschienen"
        return mostRecentOcc;
      } else {
        // They are caught up. Next episode is in the future.
        let next = addDays(mostRecentOcc, 7);
        // Ensure it's strictly in the future
        while(isBefore(next, now)) {
           next = addDays(next, 7);
        }
        return next;
      }
    }
    
    // Fallback if startDate is unknown
    const buffer = 1 * 60 * 60 * 1000;
    const effectiveOcc = new Date(mostRecentOcc.getTime() - buffer);

    if (isBefore(lastWatched, effectiveOcc)) {
      return mostRecentOcc;
    } else {
      return addDays(mostRecentOcc, 7);
    }
  };

  const getEpisodesOut = (series) => {
    if (series.status === 'Abgeschlossen') return parseInt(series.totalEpisodes, 10) || null;
    if (series.startDate) {
      const start = new Date(series.startDate);
      const now = new Date();
      if (isBefore(now, start)) return 0;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeks = Math.floor((now.getTime() - start.getTime()) / msPerWeek);
      let out = weeks + 1 - (series.dubDelay || 0);
      out = Math.max(0, out);
      if (series.totalEpisodes) {
        return Math.min(out, parseInt(series.totalEpisodes, 10));
      }
      return out;
    }
    return null;
  };

  const activeSeries = trackedSeries.filter(s => 
    s.releaseDay && 
    (s.status === 'Aktuell am schauen' || s.status === 'Wartet auf neue Staffel' || s.status === 'Geplant')
  );

  const fetchedRefs = useRef(new Set());
  useEffect(() => {
    const fetchMissingData = async () => {
      for (const s of activeSeries) {
        if (!('startDate' in s) && s.apiId && !fetchedRefs.current.has(s.id)) {
          fetchedRefs.current.add(s.id);
          try {
            if (s.apiId.startsWith('mal-')) {
              const id = s.apiId.split('-')[1];
              const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
              if (res.ok) {
                const data = await res.json();
                const startDate = data.data?.aired?.from || null;
                const totalEpisodes = data.data?.episodes || s.totalEpisodes || '';
                updateTrackedSeries(s.id, { startDate, totalEpisodes });
              }
              await new Promise(r => setTimeout(r, 500));
            } else if (s.apiId.startsWith('tvm-')) {
              const id = s.apiId.split('-')[1];
              const res = await fetch(`https://api.tvmaze.com/shows/${id}`);
              if (res.ok) {
                const data = await res.json();
                const startDate = data.premiered || null;
                updateTrackedSeries(s.id, { startDate });
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    fetchMissingData();
  }, [activeSeries, updateTrackedSeries]);

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
                  {(() => {
                    const episodesOut = getEpisodesOut(s);
                    const isFinished = s.status === 'Abgeschlossen';
                    let epLabel = `Episode ${s.currentEpisode + 1} anstehend`;
                    
                    if (episodesOut !== null && episodesOut > s.currentEpisode) {
                      const remaining = episodesOut - s.currentEpisode;
                      if (remaining > 1) {
                        epLabel = `${remaining} Folgen verfügbar (bis Ep. ${episodesOut})`;
                      } else if (isFinished) {
                         epLabel = `Letzte Folge anstehend`;
                      }
                    }
                    return <Chip label={epLabel} size="small" />;
                  })()}
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
