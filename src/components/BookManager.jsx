import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { 
  Box, Card, Typography, TextField, Button, IconButton, 
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Autocomplete, Checkbox, FormControlLabel, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const BookManager = () => {
  const { books, addBook, updateBook, deleteBook } = useTaskContext();
  
  const [newBookName, setNewBookName] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookSeries, setNewBookSeries] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editSeries, setEditSeries] = useState('');

  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    addBook(newBookName, newBookAuthor, newBookSeries);
    setNewBookName('');
    setNewBookAuthor('');
    setNewBookSeries('');
    setIsAdding(false);
  };

  const handleToggleCompleted = (book) => {
    updateBook(book.id, book.name, book.author, book.series, !book.completed);
  };

  const handleEditClick = (book) => {
    setEditingId(book.id);
    setEditName(book.name);
    setEditAuthor(book.author || '');
    setEditSeries(book.series || '');
  };

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    updateBook(id, editName, editAuthor, editSeries);
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

  return (
    <Card sx={{ p: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Meine Bücher</Typography>
        {!isAdding && (
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setIsAdding(true)} size="small">
            Buch hinzufügen
          </Button>
        )}
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
          <Autocomplete
            freeSolo
            options={uniqueSeries}
            value={newBookSeries}
            onInputChange={(e, newValue) => setNewBookSeries(newValue)}
            renderInput={(params) => <TextField {...params} label="Reihe" size="small" fullWidth />}
          />
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
                    <Autocomplete
                      freeSolo
                      options={uniqueSeries}
                      value={editSeries}
                      onInputChange={(e, newValue) => setEditSeries(newValue)}
                      renderInput={(params) => <TextField {...params} label="Reihe" size="small" />}
                    />
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
                          {book.series && <Typography component="span" variant="body2" color={book.completed ? 'text.disabled' : 'text.secondary'}>Reihe: {book.series}</Typography>}
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
    </Card>
  );
};

export default BookManager;
