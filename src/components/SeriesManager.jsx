import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, CardMedia, 
  Grid, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, CircularProgress, 
  ToggleButtonGroup, ToggleButton, Fab, LinearProgress,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import RemoveCircleOutlinedIcon from '@mui/icons-material/RemoveCircleOutlined';
import { useTaskContext } from '../context/TaskContext';

const STATUS_OPTIONS = [
  'Aktuell am schauen',
  'Geplant',
  'Pausiert',
  'Wartet auf neue Staffel',
  'Abgeschlossen'
];

const DAYS_MAP = {
  'Mondays': 'Montag', 'Monday': 'Montag',
  'Tuesdays': 'Dienstag', 'Tuesday': 'Dienstag',
  'Wednesdays': 'Mittwoch', 'Wednesday': 'Mittwoch',
  'Thursdays': 'Donnerstag', 'Thursday': 'Donnerstag',
  'Fridays': 'Freitag', 'Friday': 'Freitag',
  'Saturdays': 'Samstag', 'Saturday': 'Samstag',
  'Sundays': 'Sonntag', 'Sunday': 'Sonntag'
};

const DAY_OPTIONS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function SeriesManager() {
  const { trackedSeries, addTrackedSeries, updateTrackedSeries, deleteTrackedSeries } = useTaskContext();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  
  // Dialog state
  const [dialogMode, setDialogMode] = useState('search'); // 'search' or 'manual'
  const [searchType, setSearchType] = useState('serie'); // 'serie' or 'anime'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'serie',
    status: 'Aktuell am schauen',
    releaseDay: '',
    releaseTime: '',
    currentEpisode: 0,
    totalEpisodes: '',
    coverUrl: '',
    apiId: ''
  });

  const openAddDialog = () => {
    setEditingSeries(null);
    setDialogMode('search');
    setSearchQuery('');
    setSearchResults([]);
    setFormData({
      name: '', type: 'serie', status: 'Aktuell am schauen', 
      releaseDay: '', releaseTime: '', currentEpisode: 0, totalEpisodes: '', coverUrl: '', apiId: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (series) => {
    setEditingSeries(series);
    setDialogMode('manual');
    setFormData({ ...series });
    setIsDialogOpen(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      if (searchType === 'serie') {
        const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        const mapped = data.map(item => {
          const s = item.show;
          let day = '';
          if (s.schedule && s.schedule.days && s.schedule.days.length > 0) {
            day = DAYS_MAP[s.schedule.days[0]] || '';
          }
          return {
            apiId: `tvm-${s.id}`,
            name: s.name,
            type: 'serie',
            status: s.status === 'Ended' ? 'Abgeschlossen' : 'Aktuell am schauen',
            releaseDay: day,
            releaseTime: (s.schedule && s.schedule.time) ? s.schedule.time : '',
            coverUrl: s.image ? (s.image.original || s.image.medium) : '',
            totalEpisodes: '' // TVMaze search doesn't return total episodes easily
          };
        }).filter(s => !trackedSeries.some(t => t.apiId === s.apiId));
        setSearchResults(mapped);
      } else {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&sfw=true`);
        const data = await res.json();
        const mapped = (data.data || []).map(a => {
          let day = '';
          if (a.broadcast && a.broadcast.day) {
            // "Mondays" -> "Montag"
            const engDay = a.broadcast.day.split(' ')[0];
            day = DAYS_MAP[engDay] || '';
          }
          return {
            apiId: `mal-${a.mal_id}`,
            name: a.title_english || a.title,
            type: 'anime',
            status: a.status === 'Finished Airing' ? 'Abgeschlossen' : 'Aktuell am schauen',
            releaseDay: day,
            releaseTime: (a.broadcast && a.broadcast.time) ? a.broadcast.time : '',
            coverUrl: a.images && a.images.jpg ? (a.images.jpg.large_image_url || a.images.jpg.image_url) : '',
            totalEpisodes: a.episodes || ''
          };
        }).filter(s => !trackedSeries.some(t => t.apiId === s.apiId));
        setSearchResults(mapped);
      }
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const selectSearchResult = (item) => {
    setFormData({
      ...formData,
      ...item,
      currentEpisode: 0
    });
    setDialogMode('manual');
  };

  const handleSave = () => {
    if (!formData.name) return;
    
    if (editingSeries) {
      updateTrackedSeries(editingSeries.id, formData);
    } else {
      addTrackedSeries(formData);
    }
    setIsDialogOpen(false);
  };

  const adjustEpisode = (series, delta) => {
    const newEp = Math.max(0, (series.currentEpisode || 0) + delta);
    updateTrackedSeries(series.id, { currentEpisode: newEp });
  };

  const statusColors = {
    'Aktuell am schauen': 'success',
    'Geplant': 'info',
    'Pausiert': 'warning',
    'Wartet auf neue Staffel': 'secondary',
    'Abgeschlossen': 'default'
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', pb: 8 }}>
      {trackedSeries.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          Du hast noch keine Serien oder Animes hinzugefügt.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {trackedSeries.map(s => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={s.id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {s.coverUrl && (
                  <CardMedia
                    component="img"
                    height="180"
                    image={s.coverUrl}
                    alt={s.name}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, lineHeight: 1.2 }}>
                      {s.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEditDialog(s)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteTrackedSeries(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={s.type === 'anime' ? 'Anime' : 'Serie'} size="small" variant="outlined" />
                    <Chip label={s.status} size="small" color={statusColors[s.status]} />
                    {s.releaseDay && <Chip label={`${s.releaseDay}${s.releaseTime ? ` ${s.releaseTime}` : ''}`} size="small" color="primary" variant="outlined" />}
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Episode: {s.currentEpisode} {s.totalEpisodes ? `/ ${s.totalEpisodes}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" color="primary" onClick={() => adjustEpisode(s, -1)}>
                        <RemoveCircleOutlinedIcon />
                      </IconButton>
                      <Box sx={{ flexGrow: 1 }}>
                        {s.totalEpisodes ? (
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, (s.currentEpisode / s.totalEpisodes) * 100)} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        ) : (
                          <LinearProgress 
                            variant="determinate" 
                            value={100} 
                            color="success"
                            sx={{ height: 8, borderRadius: 4, opacity: 0.5 }}
                          />
                        )}
                      </Box>
                      <IconButton size="small" color="primary" onClick={() => adjustEpisode(s, 1)}>
                        <AddCircleOutlinedIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 70, right: 24 }}
        onClick={openAddDialog}
      >
        <AddIcon />
      </Fab>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSeries ? 'Serie bearbeiten' : 'Serie hinzufügen'}</DialogTitle>
        <DialogContent dividers>
          {!editingSeries && dialogMode === 'search' ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <ToggleButtonGroup
                  color="primary"
                  value={searchType}
                  exclusive
                  onChange={(e, val) => { if(val) setSearchType(val); }}
                  fullWidth
                >
                  <ToggleButton value="serie">Serie</ToggleButton>
                  <ToggleButton value="anime">Anime</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField 
                  fullWidth 
                  label={`${searchType === 'serie' ? 'Serien' : 'Anime'} suchen (via API)`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => { if(e.key === 'Enter') handleSearch(); }}
                />
                <Button variant="contained" onClick={handleSearch} disabled={!searchQuery || isSearching}>
                  {isSearching ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {searchResults.map((res, i) => (
                  <Card key={i} sx={{ display: 'flex', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => selectSearchResult(res)}>
                    {res.coverUrl && (
                      <CardMedia
                        component="img"
                        sx={{ width: 80, objectFit: 'cover' }}
                        image={res.coverUrl}
                        alt={res.name}
                      />
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{res.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {res.releaseDay ? `Release: ${res.releaseDay}` : 'Kein spezifischer Release-Tag'} | {res.status}
                      </Typography>
                    </Box>
                  </Card>
                ))}
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button variant="text" onClick={() => setDialogMode('manual')}>
                  Manuell eintragen
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField 
                label="Name" 
                fullWidth 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
              
              <TextField 
                select 
                label="Typ" 
                fullWidth 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <MenuItem value="serie">Serie</MenuItem>
                <MenuItem value="anime">Anime</MenuItem>
              </TextField>

              <TextField 
                select 
                label="Status" 
                fullWidth 
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                {STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  select 
                  label="Release Tag" 
                  fullWidth 
                  value={formData.releaseDay} 
                  onChange={(e) => setFormData({...formData, releaseDay: e.target.value})}
                >
                  <MenuItem value="">- Kein spezifischer Tag -</MenuItem>
                  {DAY_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
                
                <TextField 
                  label="Uhrzeit" 
                  type="time" 
                  fullWidth 
                  InputLabelProps={{ shrink: true }}
                  value={formData.releaseTime || ''} 
                  onChange={(e) => setFormData({...formData, releaseTime: e.target.value})} 
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  label="Aktuelle Episode" 
                  type="number" 
                  fullWidth 
                  value={formData.currentEpisode} 
                  onChange={(e) => setFormData({...formData, currentEpisode: parseInt(e.target.value) || 0})} 
                />
                <TextField 
                  label="Episoden gesamt" 
                  type="number" 
                  fullWidth 
                  value={formData.totalEpisodes} 
                  onChange={(e) => setFormData({...formData, totalEpisodes: parseInt(e.target.value) || ''})} 
                />
              </Box>

              <TextField 
                label="Cover Bild URL (Optional)" 
                fullWidth 
                value={formData.coverUrl} 
                onChange={(e) => setFormData({...formData, coverUrl: e.target.value})} 
              />
              
              {!editingSeries && (
                <Button variant="text" onClick={() => setDialogMode('search')}>
                  Zurück zur API-Suche
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
          {(editingSeries || dialogMode === 'manual') && (
            <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
              Speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
