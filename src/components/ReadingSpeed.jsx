import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format } from 'date-fns';
import { 
  Box, Card, Typography, TextField, Button, IconButton, 
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider 
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

const ReadingSpeed = () => {
  const { 
    readingSessions, saveReadingSession, deleteReadingSession, updateReadingSession,
    timerRunning, setTimerRunning, timerSeconds, setTimerSeconds
  } = useTaskContext();
  
  const [amount, setAmount] = useState('');
  const [endedOnPage, setEndedOnPage] = useState('');
  const [showAmountField, setShowAmountField] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAmount, setEditAmount] = useState('');
  const [editEndedOnPage, setEditEndedOnPage] = useState('');

  const handleStartTimer = () => {
    setTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  const handleStopTimer = () => {
    if (timerRunning) {
      handlePauseTimer();
    }
    setShowAmountField(true);
  };

  const handleSaveInfo = () => {
    saveReadingSession(timerSeconds, amount, endedOnPage);
    setTimerSeconds(0);
    setShowAmountField(false);
    setAmount('');
    setEndedOnPage('');
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h === '00') return `${m}:${s}`;
    return `${h}:${m}:${s}`;
  };

  const handleEditClick = (session) => {
    setEditingSessionId(session.id);
    setEditMinutes(Math.round(session.timeSpent / 60));
    setEditAmount(session.amount);
    setEditEndedOnPage(session.endedOnPage || '');
  };

  const handleSaveEdit = (id) => {
    updateReadingSession(id, parseInt(editMinutes, 10) * 60, parseFloat(editAmount), editEndedOnPage);
    setEditingSessionId(null);
  };

  const recentSessions = [...readingSessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 800, mx: 'auto' }}>
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <MenuBookIcon color="primary" fontSize="large" /> Lesegeschwindigkeit
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: { xs: 8, sm: 4 }, minHeight: { xs: '40vh', sm: 'auto' } }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontFamily: 'monospace', 
              fontWeight: 'bold', 
              fontSize: { xs: '4rem', sm: '3.75rem' },
              color: timerRunning ? 'primary.main' : 'text.primary',
              transition: 'color 0.3s ease'
            }}
          >
            {formatTime(timerSeconds)}
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {!showAmountField && (
              <>
                {timerRunning ? (
                  <>
                    <Button 
                      variant="contained" 
                      color="warning" 
                      onClick={handlePauseTimer}
                      startIcon={<PauseIcon />}
                      size="large"
                      sx={{ borderRadius: 8, px: 4 }}
                    >
                      Pausieren
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={handleStopTimer}
                      startIcon={<StopIcon />}
                      size="large"
                      sx={{ borderRadius: 8, px: 4 }}
                    >
                      Stoppen & Speichern
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={handleStartTimer}
                      startIcon={<PlayArrowIcon />}
                      size="large"
                      sx={{ borderRadius: 8, px: 4 }}
                    >
                      {timerSeconds === 0 ? 'Starten' : 'Fortsetzen'}
                    </Button>
                    {timerSeconds > 0 && (
                      <Button 
                        variant="contained" 
                        color="error" 
                        onClick={handleStopTimer}
                        startIcon={<StopIcon />}
                        size="large"
                        sx={{ borderRadius: 8, px: 4 }}
                      >
                        Stoppen & Speichern
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </Box>

        {showAmountField && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>Lese-Session speichern</Typography>
              <Typography variant="body2" color="text.secondary">
                Wie viele Seiten hast du in dieser Zeit ({formatTime(timerSeconds)}) gelesen?
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Gelesene Seiten:</Typography>
                <TextField 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="z.B. 15" 
                  size="small"
                  sx={{ flex: 1, minWidth: 100 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Beendet auf Seite (optional):</Typography>
                <TextField 
                  type="number" 
                  value={endedOnPage} 
                  onChange={(e) => setEndedOnPage(e.target.value)} 
                  placeholder="z.B. 120" 
                  size="small"
                  sx={{ flex: 1, minWidth: 100 }}
                />
              </Box>

              <Button variant="contained" color="primary" onClick={handleSaveInfo} startIcon={<SaveIcon />} sx={{ mt: 2 }}>
                Speichern
              </Button>
            </Box>
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => {
                setTimerSeconds(0);
                setShowAmountField(false);
                setAmount('');
                setEndedOnPage('');
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Verwerfen & Timer zurücksetzen
            </Button>
          </Box>
        )}
      </Card>

      {recentSessions.length > 0 && (
        <Card sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Letzte Lese-Einträge</Typography>
          <List>
            {recentSessions.map(session => (
              <ListItem key={session.id} sx={{ bgcolor: 'background.default', borderRadius: 2, mb: 1, border: 1, borderColor: 'divider', px: 2 }}>
                {editingSessionId === session.id ? (
                  <Box sx={{ display: 'flex', gap: 2, flex: 1, alignItems: 'center', flexWrap: 'wrap', py: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField 
                        type="number" 
                        value={editMinutes} 
                        onChange={(e) => setEditMinutes(e.target.value)}
                        size="small"
                        sx={{ width: 80 }}
                      />
                      <Typography variant="body2">Min.</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField 
                        type="number" 
                        value={editAmount} 
                        onChange={(e) => setEditAmount(e.target.value)}
                        size="small"
                        sx={{ width: 80 }}
                      />
                      <Typography variant="body2">Seiten</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField 
                        type="number" 
                        value={editEndedOnPage} 
                        onChange={(e) => setEditEndedOnPage(e.target.value)}
                        size="small"
                        placeholder="Beendet auf"
                        sx={{ width: 100 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                      <IconButton color="success" onClick={() => handleSaveEdit(session.id)}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => setEditingSessionId(null)}>
                        <ClearIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <ListItemText 
                      primary={`${formatTime(session.timeSpent)} gelesen`} 
                      secondary={`${session.amount} Seiten${session.endedOnPage ? ` | Beendet auf S. ${session.endedOnPage}` : ''} | ${format(new Date(session.date), 'dd.MM.yyyy HH:mm')}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton color="primary" onClick={() => handleEditClick(session)} sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteReadingSession(session.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </>
                )}
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
};

export default ReadingSpeed;
