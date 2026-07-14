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
        if (s.apiId && (s.apiId.startsWith('mal-') || s.apiId.startsWith('al-'))) {
          const id = parseInt(s.apiId.split('-')[1], 10);
          const isMal = s.apiId.startsWith('mal-');

          const query = `
            query ($idMal: Int, $id: Int) {
              Media(idMal: $idMal, id: $id, type: ANIME) {
                id
                relations {
                  edges {
                    relationType
                    node {
                      id
                      idMal
                      title {
                        romaji
                        english
                      }
                      status
                      nextAiringEpisode {
                        airingAt
                      }
                      coverImage {
                        large
                      }
                      episodes
                    }
                  }
                }
              }
            }
          `;

          const variables = isMal ? { idMal: id } : { id: id };

          const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              query: query,
              variables: variables
            })
          });

          if (res.ok) {
            const json = await res.json();
            const media = json.data?.Media;
            if (media && media.relations && media.relations.edges) {
              const sequelEdge = media.relations.edges.find(e => e.relationType === 'SEQUEL');
              if (sequelEdge && sequelEdge.node) {
                const a = sequelEdge.node;
                
                // Track by AL ID going forward
                const newApiId = `al-${a.id}`;
                const legacyMalId = a.idMal ? `mal-${a.idMal}` : null;
                
                if (!trackedSeries.some(t => t.apiId === newApiId || (legacyMalId && t.apiId === legacyMalId))) {
                  let day = '';
                  let releaseTime = '';
                  if (a.nextAiringEpisode && a.nextAiringEpisode.airingAt) {
                    const date = new Date(a.nextAiringEpisode.airingAt * 1000);
                    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    day = days[date.getDay()];
                    releaseTime = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  }

                  let statusStr = 'Geplant';
                  if (a.status === 'FINISHED') statusStr = 'Abgeschlossen';
                  else if (a.status === 'RELEASING') statusStr = 'Aktuell am schauen';
                  else if (a.status === 'HIATUS') statusStr = 'Pausiert';

                  updates.push({
                    type: 'new_anime',
                    originalId: s.id,
                    data: {
                      apiId: newApiId,
                      name: a.title.english || a.title.romaji,
                      type: 'anime',
                      status: statusStr,
                      releaseDay: day,
                      releaseTime: releaseTime,
                      coverUrl: a.coverImage ? a.coverImage.large : '',
                      totalEpisodes: a.episodes || '',
                      currentEpisode: 0
                    }
                  });
                }
              }
            }
          }
          await sleep(200); // Be gentle with AniList API (90 req/min)

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
