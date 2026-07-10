import React, { useState } from 'react';
import { 
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  Typography, LinearProgress, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, IconButton 
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTaskContext } from '../context/TaskContext';
import { v4 as uuidv4 } from 'uuid';

const DAYS_MAP = {
  'Sundays': 'Sonntag', 'Mondays': 'Montag', 'Tuesdays': 'Dienstag',
  'Wednesdays': 'Mittwoch', 'Thursdays': 'Donnerstag', 'Fridays': 'Freitag', 'Saturdays': 'Samstag',
  'Sunday': 'Sonntag', 'Monday': 'Montag', 'Tuesday': 'Dienstag',
  'Wednesday': 'Mittwoch', 'Thursday': 'Donnerstag', 'Friday': 'Freitag', 'Saturday': 'Samstag'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default function SeriesUpdater() {
  const { trackedSeries, addTrackedSeries, updateTrackedSeries } = useTaskContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foundUpdates, setFoundUpdates] = useState([]);
  const [processedIds, setProcessedIds] = useState([]); // to hide added/updated items

  const handleCheck = async () => {
    setIsOpen(true);
    setIsChecking(true);
    setFoundUpdates([]);
    setProcessedIds([]);
    
    // Only check series that are marked as "Abgeschlossen" or "Wartet auf neue Staffel"
    const seriesToCheck = trackedSeries.filter(s => 
      s.status === 'Abgeschlossen' || s.status === 'Wartet auf neue Staffel'
    );

    if (seriesToCheck.length === 0) {
      setIsChecking(false);
      setProgress(100);
      return;
    }

    const updates = [];

    for (let i = 0; i < seriesToCheck.length; i++) {
      const s = seriesToCheck[i];
      setProgress(Math.round(((i) / seriesToCheck.length) * 100));

      try {
        if (s.apiId && s.apiId.startsWith('mal-')) {
          const malId = s.apiId.split('-')[1];
          // 1. Check relations
          const relRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/relations`);
          if (relRes.status === 429) { await sleep(1000); i--; continue; } // rate limit retry
          const relData = await relRes.json();
          
          if (relData && relData.data) {
            const sequelRel = relData.data.find(r => r.relation === 'Sequel');
            if (sequelRel && sequelRel.entry && sequelRel.entry.length > 0) {
              const sequelMalId = sequelRel.entry[0].mal_id;
              
              // Ensure we don't already track this sequel
              if (!trackedSeries.some(t => t.apiId === `mal-${sequelMalId}`)) {
                await sleep(400); // rate limit for next request
                
                // 2. Fetch sequel details
                const seqRes = await fetch(`https://api.jikan.moe/v4/anime/${sequelMalId}`);
                if (seqRes.status === 429) { await sleep(1000); i--; continue; } // retry whole step? Actually this is risky, let's just fail this one.
                if (seqRes.ok) {
                  const seqData = await seqRes.json();
                  const a = seqData.data;
                  if (a) {
                    let day = '';
                    if (a.broadcast && a.broadcast.day) {
                      const engDay = a.broadcast.day.split(' ')[0];
                      day = DAYS_MAP[engDay] || '';
                    }
                    
                    updates.push({
                      type: 'new_anime',
                      originalId: s.id,
                      data: {
                        apiId: `mal-${a.mal_id}`,
                        name: a.title_english || a.title,
                        type: 'anime',
                        status: a.status === 'Finished Airing' ? 'Abgeschlossen' : 'Aktuell am schauen',
                        releaseDay: day,
                        releaseTime: (a.broadcast && a.broadcast.time) ? a.broadcast.time : '',
                        coverUrl: a.images && a.images.jpg ? (a.images.jpg.large_image_url || a.images.jpg.image_url) : '',
                        totalEpisodes: a.episodes || '',
                        currentEpisode: 0
                      }
                    });
                  }
                }
              }
            }
          }
          await sleep(500); // Be gentle with Jikan API

        } else if (s.apiId && s.apiId.startsWith('tvm-')) {
          const tvmId = s.apiId.split('-')[1];
          const res = await fetch(`https://api.tvmaze.com/shows/${tvmId}`);
          if (res.ok) {
            const data = await res.json();
            // If the show is no longer Ended, it might have a new season!
            if (data.status !== 'Ended' && s.status === 'Abgeschlossen') {
              let day = '';
              if (data.schedule && data.schedule.days && data.schedule.days.length > 0) {
                day = DAYS_MAP[data.schedule.days[0]] || '';
              }
              updates.push({
                type: 'update_serie',
                originalId: s.id,
                data: {
                  status: 'Aktuell am schauen',
                  releaseDay: day,
                  releaseTime: (data.schedule && data.schedule.time) ? data.schedule.time : ''
                }
              });
            }
          }
        }
      } catch (err) {
        console.error("Fehler beim Prüfen von Fortsetzungen:", err);
      }
    }

    setFoundUpdates(updates);
    setProgress(100);
    setIsChecking(false);
  };

  const handleApplyUpdate = (updateItem, index) => {
    if (updateItem.type === 'new_anime') {
      addTrackedSeries(updateItem.data);
    } else if (updateItem.type === 'update_serie') {
      updateTrackedSeries(updateItem.originalId, updateItem.data);
    }
    setProcessedIds([...processedIds, index]);
  };

  return (
    <>
      <Button 
        variant="outlined" 
        size="small" 
        startIcon={<SyncIcon />} 
        onClick={handleCheck}
        sx={{ borderRadius: 4 }}
      >
        Auf neue Staffeln prüfen
      </Button>

      <Dialog open={isOpen} onClose={() => !isChecking && setIsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fortsetzungen Suchen</DialogTitle>
        <DialogContent>
          {isChecking ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                Suche nach neuen Staffeln für deine abgeschlossenen Serien...
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              {foundUpdates.length === 0 ? (
                <Typography color="text.secondary">Keine neuen Fortsetzungen gefunden. Alles auf dem neuesten Stand!</Typography>
              ) : (
                <List disablePadding>
                  {foundUpdates.map((upd, idx) => {
                    const isProcessed = processedIds.includes(idx);
                    if (upd.type === 'new_anime') {
                      return (
                        <ListItem key={idx} disableGutters divider>
                          <ListItemAvatar>
                            <Avatar src={upd.data.coverUrl} variant="rounded" sx={{ width: 40, height: 56 }} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={upd.data.name} 
                            secondary={`Neue Anime Staffel gefunden!`}
                          />
                          <IconButton 
                            color={isProcessed ? "success" : "primary"} 
                            onClick={() => !isProcessed && handleApplyUpdate(upd, idx)}
                          >
                            {isProcessed ? <CheckCircleIcon /> : <AddCircleIcon />}
                          </IconButton>
                        </ListItem>
                      );
                    } else {
                      // update_serie
                      const original = trackedSeries.find(t => t.id === upd.originalId);
                      return (
                        <ListItem key={idx} disableGutters divider>
                          <ListItemAvatar>
                            <Avatar src={original?.coverUrl} variant="rounded" sx={{ width: 40, height: 56 }} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={original?.name} 
                            secondary={`Neue Serie-Staffel läuft (Status: ${upd.data.status})!`}
                          />
                          <IconButton 
                            color={isProcessed ? "success" : "primary"} 
                            onClick={() => !isProcessed && handleApplyUpdate(upd, idx)}
                          >
                            {isProcessed ? <CheckCircleIcon /> : <SyncIcon />}
                          </IconButton>
                        </ListItem>
                      );
                    }
                  })}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)} disabled={isChecking}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
