import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format } from 'date-fns';
import { 
  Box, Card, Typography, TextField, Button, IconButton, 
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Tabs, Tab, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import ReadingAnalytics from './ReadingAnalytics';
import BookManager from './BookManager';
import BookUniverseMap from './BookUniverseMap';
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
    timerRunning, setTimerRunning, timerSeconds, setTimerSeconds,
    books
  } = useTaskContext();
  
  const [amount, setAmount] = useState('');
  const [endedOnPage, setEndedOnPage] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionTime, setSessionTime] = useState(format(new Date(), 'HH:mm'));
  const [showAmountField, setShowAmountField] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAmount, setEditAmount] = useState('');
  const [editEndedOnPage, setEditEndedOnPage] = useState('');
  const [editBookId, setEditBookId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

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
    let finalDate = sessionDate;
    let overrideCreatedAt = null;
    const isToday = sessionDate === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) {
      overrideCreatedAt = `${sessionDate}T${sessionTime || '12:00'}:00.000Z`;
    }
    
    const parsedAmount = parseFloat(amount) || 0;
    const timeInHours = timerSeconds / 3600;
    const pagesPerHour = timeInHours > 0 ? parsedAmount / timeInHours : 0;
    
    let forecast = null;
    if (selectedBookId) {
      const book = books.find(b => b.id === selectedBookId);
      if (book && book.totalPages) {
        const sessions = readingSessions.filter(s => s.bookId === book.id);
        let pagesRead = 0;
        let maxEndedOnPage = Math.max(...sessions.map(s => s.endedOnPage || 0));
        
        const currentEndedOnPage = parseInt(endedOnPage, 10);
        if (currentEndedOnPage && currentEndedOnPage > maxEndedOnPage) {
          pagesRead = currentEndedOnPage;
        } else if (maxEndedOnPage > 0) {
          pagesRead = maxEndedOnPage + parsedAmount;
        } else {
          pagesRead = sessions.reduce((acc, s) => acc + s.amount, 0) + parsedAmount;
        }
        
        if (pagesRead < book.totalPages) {
          const remainingPages = book.totalPages - pagesRead;
          const globalReadingSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0) + timerSeconds;
          const globalReadingAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0) + parsedAmount;
          const globalSpeed = globalReadingAmount / (globalReadingSeconds / 3600);
          
          if (globalSpeed > 0) {
            const remainingHours = remainingPages / globalSpeed;
            const h = Math.floor(remainingHours);
            const m = Math.round((remainingHours - h) * 60);
            forecast = `Noch ca. ${h}h ${m}m (${remainingPages} Seiten verbleibend)`;
          }
        } else {
          forecast = "Du hast das Buch scheinbar beendet!";
        }
      }
    }

    setSummaryData({
      timeStr: formatTime(timerSeconds),
      amount: parsedAmount,
      endedOnPage,
      pagesPerHour: Math.round(pagesPerHour),
      forecast
    });
    setSummaryModalOpen(true);

    saveReadingSession(timerSeconds, amount, endedOnPage, selectedBookId, finalDate, overrideCreatedAt);
    setTimerSeconds(0);
    setShowAmountField(false);
    setAmount('');
    setEndedOnPage('');
    setSelectedBookId('');
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
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
    setEditBookId(session.bookId || '');
    setEditDate(session.date || '');
    if (session.createdAt) {
      try { setEditTime(format(new Date(session.createdAt), 'HH:mm')); } catch(e) { setEditTime('12:00'); }
    } else {
      setEditTime('12:00');
    }
  };

  const handleSaveEdit = (id) => {
    updateReadingSession(id, parseInt(editMinutes, 10) * 60, parseFloat(editAmount), editEndedOnPage, editBookId, editDate);
    setEditingSessionId(null);
  };

  const recentSessions = [...readingSessions]
    .sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      if (b.createdAt && a.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    })
    .slice(0, 10);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mb: -2 }}>
        <MenuBookIcon color="primary" fontSize="large" /> Lesegeschwindigkeit
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
          <Tab label="Eingabe & Historie" />
          <Tab label="Bücher" />
          <Tab label="Universum & Reihen" />
          <Tab label="Statistiken" />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <>
          <Card sx={{ p: { xs: 2, sm: 4 } }}>
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
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Datum:</Typography>
                <TextField 
                  type="date" 
                  value={sessionDate} 
                  onChange={(e) => setSessionDate(e.target.value)} 
                  size="small"
                  sx={{ flex: 1, minWidth: 100 }}
                />
              </Box>

              {books.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>Buch:</Typography>
                  <Select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    size="small"
                    displayEmpty
                    sx={{ flex: 1, minWidth: 100 }}
                  >
                    <MenuItem value="">Kein Buch zugeordnet</MenuItem>
                    {books.filter(b => !b.completed || b.id === selectedBookId).map(b => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </Box>
              )}

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
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField 
                        type="date" 
                        value={editDate} 
                        onChange={(e) => setEditDate(e.target.value)}
                        size="small"
                        sx={{ width: 140 }}
                      />
                    </Box>
                    {books.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Select
                          value={editBookId}
                          onChange={(e) => setEditBookId(e.target.value)}
                          size="small"
                          displayEmpty
                          sx={{ width: 140 }}
                        >
                          <MenuItem value="">Kein Buch</MenuItem>
                          {books.filter(b => !b.completed || b.id === editBookId).map(b => (
                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                          ))}
                        </Select>
                      </Box>
                    )}
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
                      secondary={
                        <React.Fragment>
                          {`${session.amount} Seiten${session.endedOnPage ? ` | Beendet auf S. ${session.endedOnPage}` : ''} | ${format(new Date(session.date), 'dd.MM.yyyy HH:mm')}`}
                          {session.bookId && books.find(b => b.id === session.bookId) && (
                            <Typography component="span" variant="body2" sx={{ display: 'block', color: 'primary.main', mt: 0.5 }}>
                              Buch: {books.find(b => b.id === session.bookId).name}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
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
      </>
      ) : activeTab === 1 ? (
        <BookManager />
      ) : activeTab === 2 ? (
        <BookUniverseMap />
      ) : (
        <ReadingAnalytics />
      )}

      <Dialog open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Session gespeichert! 🎉</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {summaryData && (
            <>
              <Typography variant="h6" color="primary">{summaryData.amount} Seiten in {summaryData.timeStr}</Typography>
              
              <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{summaryData.pagesPerHour}</Typography>
                  <Typography variant="body2" color="text.secondary">Seiten / h</Typography>
                </Box>
                {summaryData.endedOnPage && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{summaryData.endedOnPage}</Typography>
                    <Typography variant="body2" color="text.secondary">Seite erreicht</Typography>
                  </Box>
                )}
              </Box>

              {summaryData.forecast && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, width: '100%', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Prognose für dieses Buch</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>{summaryData.forecast}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button variant="contained" onClick={() => setSummaryModalOpen(false)} size="large">Klasse!</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ReadingSpeed;
