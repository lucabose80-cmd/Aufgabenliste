import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { 
  Box, Card, Typography, TextField, Button, IconButton, 
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Autocomplete, Checkbox, FormControlLabel, Tooltip, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';

const BookManager = () => {
  const { books, addBook, updateBook, deleteBook, assignBookToUnassignedSessions, readingSessions, renameAuthor, renameSeries } = useTaskContext();
  
  const [newBookName, setNewBookName] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookSeries, setNewBookSeries] = useState('');
  const [newBookWordsPerPage, setNewBookWordsPerPage] = useState('');
  const [newBookSeriesNumber, setNewBookSeriesNumber] = useState('');
  const [newBookUniverse, setNewBookUniverse] = useState('');
  const [newBookTotalPages, setNewBookTotalPages] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editSeries, setEditSeries] = useState('');
  const [editWordsPerPage, setEditWordsPerPage] = useState('');
  const [editSeriesNumber, setEditSeriesNumber] = useState('');
  const [editUniverse, setEditUniverse] = useState('');
  const [editTotalPages, setEditTotalPages] = useState('');

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageType, setManageType] = useState('author'); // 'author' | 'series'
  const [manageOldName, setManageOldName] = useState('');
  const [manageNewName, setManageNewName] = useState('');

  const [completedBookStats, setCompletedBookStats] = useState(null);

  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    addBook(newBookName, newBookAuthor, newBookSeries, newBookWordsPerPage, newBookSeriesNumber, newBookUniverse, newBookTotalPages);
    setNewBookName('');
    setNewBookAuthor('');
    setNewBookSeries('');
    setNewBookWordsPerPage('');
    setNewBookSeriesNumber('');
    setNewBookUniverse('');
    setNewBookTotalPages('');
    setIsAdding(false);
  };

  const handleToggleCompleted = (book) => {
    const isNowCompleted = !book.completed;
    updateBook(book.id, book.name, book.author, book.series, isNowCompleted, book.wordsPerPage, book.seriesNumber, book.universe, book.totalPages);

    if (isNowCompleted) {
      // Calculate stats for completed book
      const sessions = readingSessions.filter(s => s.bookId === book.id);
      if (sessions.length > 0) {
        const bookSeconds = sessions.reduce((acc, s) => acc + s.timeSpent, 0);
        const bookAmount = sessions.reduce((acc, s) => acc + s.amount, 0);
        
        let pagesRead = 0;
        let maxEndedOnPage = Math.max(...sessions.map(s => s.endedOnPage || 0));
        if (maxEndedOnPage > 0) {
          pagesRead = maxEndedOnPage;
        } else {
          pagesRead = bookAmount;
        }

        const bookSpeed = bookSeconds > 0 ? bookAmount / (bookSeconds / 3600) : 0;
        
        // Calculate global speed for comparison
        const globalSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0);
        const globalAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0);
        const globalSpeed = globalSeconds > 0 ? globalAmount / (globalSeconds / 3600) : 0;

        let precisionStr = '';
        if (globalSpeed > 0 && bookSpeed > 0) {
          const diff = bookSpeed - globalSpeed;
          const percentage = Math.abs(Math.round((diff / globalSpeed) * 100));
          if (diff > 0) {
            precisionStr = `Du warst bei diesem Buch ${percentage}% schneller als dein Durchschnitt!`;
          } else if (diff < 0) {
            precisionStr = `Du warst bei diesem Buch ${percentage}% langsamer als dein Durchschnitt.`;
          } else {
            precisionStr = `Deine Geschwindigkeit lag exakt im Durchschnitt!`;
          }
        }

        const h = Math.floor(bookSeconds / 3600);
        const m = Math.floor((bookSeconds % 3600) / 60);

        setCompletedBookStats({
          name: book.name,
          timeStr: `${h}h ${m}m`,
          pages: pagesRead,
          speed: Math.round(bookSpeed),
          precisionStr
        });
      }
    }
  };

  const handleEditClick = (book) => {
    setEditingId(book.id);
    setEditName(book.name);
    setEditAuthor(book.author || '');
    setEditSeries(book.series || '');
    setEditWordsPerPage(book.wordsPerPage ? book.wordsPerPage.toString() : '');
    setEditSeriesNumber(book.seriesNumber ? book.seriesNumber.toString() : '');
    setEditUniverse(book.universe || '');
    setEditTotalPages(book.totalPages ? book.totalPages.toString() : '');
  };

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    updateBook(id, editName, editAuthor, editSeries, undefined, editWordsPerPage, editSeriesNumber, editUniverse, editTotalPages);
    setEditingId(null);
  };

  // Sort books by series first, then author, then name
  const sortedBooks = [...books].sort((a, b) => {
    const seriesA = a.series || '';
    const seriesB = b.series || '';
    if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
    const authorA = a.author || '';
    const authorB = b.author || '';
    if (authorA !== authorB) return authorA.localeCompare(authorB);
    return a.name.localeCompare(b.name);
  });

  const uniqueAuthors = Array.from(new Set(books.map(b => b.author).filter(Boolean)));
  const uniqueSeries = Array.from(new Set(books.map(b => b.series).filter(Boolean)));

  const seriesAuthorMap = books.reduce((acc, book) => {
    if (book.series && book.author) acc[book.series] = book.author;
    return acc;
  }, {});

  const handleSeriesChange = (newValue, isEdit = false) => {
    if (isEdit) {
      setEditSeries(newValue);
      if (seriesAuthorMap[newValue] && !editAuthor) setEditAuthor(seriesAuthorMap[newValue]);
    } else {
      setNewBookSeries(newValue);
      if (seriesAuthorMap[newValue] && !newBookAuthor) setNewBookAuthor(seriesAuthorMap[newValue]);
    }
  };
  const unassignedSessionsCount = readingSessions.filter(s => !s.bookId || !books.some(b => b.id === s.bookId)).length;

  const getBookForecast = (book) => {
    if (!book.totalPages) return null;
    const sessions = readingSessions.filter(s => s.bookId === book.id);
    if (sessions.length === 0) return null;

    let pagesRead = 0;
    let maxEndedOnPage = Math.max(...sessions.map(s => s.endedOnPage || 0));
    if (maxEndedOnPage > 0) {
      pagesRead = maxEndedOnPage;
    } else {
      pagesRead = sessions.reduce((acc, s) => acc + s.amount, 0);
    }
    
    if (pagesRead >= book.totalPages) return "Fertig gelesen";

    const remainingPages = book.totalPages - pagesRead;

    const globalReadingSeconds = readingSessions.reduce((acc, s) => acc + s.timeSpent, 0);
    const globalReadingAmount = readingSessions.reduce((acc, s) => acc + s.amount, 0);
    
    if (globalReadingSeconds === 0 || globalReadingAmount === 0) return null;
    
    const globalSpeedPagesPerHour = globalReadingAmount / (globalReadingSeconds / 3600);
    const remainingHours = remainingPages / globalSpeedPagesPerHour;
    
    const h = Math.floor(remainingHours);
    const m = Math.round((remainingHours - h) * 60);
    
    if (h > 0) return `Noch ca. ${h}h ${m}m (${remainingPages} S. verbleibend)`;
    return `Noch ca. ${m}m (${remainingPages} S. verbleibend)`;
  };

  const handleManageRename = () => {
    if (!manageOldName) return;
    if (manageType === 'author') {
      renameAuthor(manageOldName, manageNewName);
    } else {
      renameSeries(manageOldName, manageNewName);
    }
    setIsManageModalOpen(false);
    setManageOldName('');
    setManageNewName('');
  };

  return (
    <Card sx={{ p: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Meine Bücher</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setIsManageModalOpen(true)} size="small">
            Autoren/Reihen
          </Button>
          {!isAdding && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setIsAdding(true)} size="small">
              Buch hinzufügen
            </Button>
          )}
        </Box>
      </Box>

      {isAdding && (
        <Box sx={{ mb: 4, p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2">Neues Buch</Typography>
          <TextField 
            label="Titel" 
            value={newBookName} 
            onChange={(e) => setNewBookName(e.target.value)} 
            size="small" 
            fullWidth 
          />
          <Autocomplete
            freeSolo
            options={uniqueAuthors}
            value={newBookAuthor}
            onInputChange={(e, newValue) => setNewBookAuthor(newValue)}
            renderInput={(params) => <TextField {...params} label="Autor" size="small" fullWidth />}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Autocomplete
              freeSolo
              options={uniqueSeries}
              value={newBookSeries}
              onInputChange={(e, newValue) => handleSeriesChange(newValue, false)}
              renderInput={(params) => <TextField {...params} label="Reihe" size="small" fullWidth />}
              sx={{ flex: 2 }}
            />
            <TextField 
              label="Nummer (Band)" 
              type="number"
              value={newBookSeriesNumber} 
              onChange={(e) => setNewBookSeriesNumber(e.target.value)} 
              size="small" 
              sx={{ flex: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Universum" 
              value={newBookUniverse} 
              onChange={(e) => setNewBookUniverse(e.target.value)} 
              size="small" 
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Gesamtseiten" 
              type="number"
              value={newBookTotalPages} 
              onChange={(e) => setNewBookTotalPages(e.target.value)} 
              size="small" 
              fullWidth
            />
            <TextField 
              label="Wörter pro Seite (Ø)" 
              type="number"
              value={newBookWordsPerPage} 
              onChange={(e) => setNewBookWordsPerPage(e.target.value)} 
              size="small" 
              fullWidth 
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleAddBook} disabled={!newBookName.trim()}>Speichern</Button>
            <Button variant="text" onClick={() => setIsAdding(false)}>Abbrechen</Button>
          </Box>
        </Box>
      )}

      <List sx={{ p: 0 }}>
        {sortedBooks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Noch keine Bücher angelegt.</Typography>
        ) : (
          sortedBooks.map(book => (
            <React.Fragment key={book.id}>
              <ListItem sx={{ py: 2 }}>
                {editingId === book.id ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', mr: 6 }}>
                    <TextField 
                      label="Titel" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      size="small" 
                    />
                    <Autocomplete
                      freeSolo
                      options={uniqueAuthors}
                      value={editAuthor}
                      onInputChange={(e, newValue) => setEditAuthor(newValue)}
                      renderInput={(params) => <TextField {...params} label="Autor" size="small" />}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Autocomplete
                        freeSolo
                        options={uniqueSeries}
                        value={editSeries}
                        onInputChange={(e, newValue) => handleSeriesChange(newValue, true)}
                        renderInput={(params) => <TextField {...params} label="Reihe" size="small" fullWidth />}
                        sx={{ flex: 2 }}
                      />
                      <TextField 
                        label="Band" 
                        type="number"
                        value={editSeriesNumber} 
                        onChange={(e) => setEditSeriesNumber(e.target.value)} 
                        size="small" 
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <TextField 
                      label="Universum" 
                      value={editUniverse} 
                      onChange={(e) => setEditUniverse(e.target.value)} 
                      size="small" 
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField 
                        label="Gesamtseiten" 
                        type="number"
                        value={editTotalPages} 
                        onChange={(e) => setEditTotalPages(e.target.value)} 
                        size="small" 
                        fullWidth
                      />
                      <TextField 
                        label="Wörter pro Seite (Ø)" 
                        type="number"
                        value={editWordsPerPage} 
                        onChange={(e) => setEditWordsPerPage(e.target.value)} 
                        size="small" 
                        fullWidth
                      />
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Tooltip title={book.completed ? "Buch wieder öffnen" : "Buch abschließen"}>
                      <Checkbox
                        icon={<CheckCircleOutlinedIcon />}
                        checkedIcon={<CheckCircleIcon color="success" />}
                        checked={!!book.completed}
                        onChange={() => handleToggleCompleted(book)}
                        sx={{ mr: 1 }}
                      />
                    </Tooltip>
                    <ListItemText 
                      primary={
                        <Typography sx={{ textDecoration: book.completed ? 'line-through' : 'none', color: book.completed ? 'text.secondary' : 'text.primary' }}>
                          {book.name}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          {book.author && <Typography component="span" variant="body2" color={book.completed ? 'text.disabled' : 'text.primary'}>Autor: {book.author}</Typography>}
                          {book.author && book.series && <br />}
                          {book.series && (
                            <Typography component="span" variant="body2" color={book.completed ? 'text.disabled' : 'text.secondary'}>
                              Reihe: {book.series} {book.seriesNumber ? `(Band ${book.seriesNumber})` : ''} 
                              {book.universe ? ` | Universum: ${book.universe}` : ''}
                            </Typography>
                          )}
                          {!book.completed && getBookForecast(book) && (
                            <React.Fragment>
                              <br />
                              <Typography component="span" variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                {getBookForecast(book)}
                              </Typography>
                            </React.Fragment>
                          )}
                        </React.Fragment>
                      }
                    />
                  </>
                )}
                
                <ListItemSecondaryAction sx={{ top: '50%', transform: 'translateY(-50%)' }}>
                  {editingId === book.id ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <IconButton onClick={() => handleSaveEdit(book.id)} color="primary" size="small"><SaveIcon /></IconButton>
                      <IconButton onClick={() => setEditingId(null)} size="small"><ClearIcon /></IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex' }}>
                      {unassignedSessionsCount > 0 && (
                        <Tooltip title={`Allen ${unassignedSessionsCount} Einträgen ohne Buch dieses Buch zuweisen`}>
                          <IconButton onClick={() => assignBookToUnassignedSessions(book.id)} color="success" size="small">
                            <LibraryAddCheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton onClick={() => handleEditClick(book)} size="small"><EditIcon /></IconButton>
                      <IconButton onClick={() => deleteBook(book.id)} color="error" size="small"><DeleteIcon /></IconButton>
                    </Box>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))
        )}
      </List>

      <Dialog open={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Autoren / Reihen verwalten</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Hier kannst du Schreibfehler bei Autoren oder Reihen korrigieren. Lasse das Feld "Neuer Name" leer, um es aus allen Büchern zu löschen.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant={manageType === 'author' ? 'contained' : 'outlined'} onClick={() => setManageType('author')}>Autor umbenennen</Button>
            <Button variant={manageType === 'series' ? 'contained' : 'outlined'} onClick={() => setManageType('series')}>Reihe umbenennen</Button>
          </Box>
          <Autocomplete
            options={manageType === 'author' ? uniqueAuthors : uniqueSeries}
            value={manageOldName}
            onChange={(e, newValue) => setManageOldName(newValue)}
            renderInput={(params) => <TextField {...params} label={`Zu ändernde${manageType === 'author' ? 'r Autor' : ' Reihe'} auswählen`} size="small" />}
          />
          <TextField 
            label="Neuer Name (leer = entfernen)" 
            value={manageNewName}
            onChange={(e) => setManageNewName(e.target.value)}
            size="small"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={() => setIsManageModalOpen(false)}>Abbrechen</Button>
            <Button variant="contained" color="primary" onClick={handleManageRename} disabled={!manageOldName}>
              Anwenden
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completedBookStats} onClose={() => setCompletedBookStats(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Buch abgeschlossen! 🎉</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {completedBookStats && (
            <>
              <Typography variant="h6" color="primary" align="center">{completedBookStats.name}</Typography>
              
              <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{completedBookStats.timeStr}</Typography>
                  <Typography variant="body2" color="text.secondary">Lesezeit</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{completedBookStats.pages}</Typography>
                  <Typography variant="body2" color="text.secondary">Seiten</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{completedBookStats.speed}</Typography>
                  <Typography variant="body2" color="text.secondary">Seiten / h</Typography>
                </Box>
              </Box>

              {completedBookStats.precisionStr && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, width: '100%', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Prognose & Präzision</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>{completedBookStats.precisionStr}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button variant="contained" onClick={() => setCompletedBookStats(null)} size="large">Super!</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default BookManager;
