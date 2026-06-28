import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { 
  Box, Card, Typography, TextField, Button, IconButton, 
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';

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
          <TextField 
            label="Autor" 
            value={newBookAuthor} 
            onChange={(e) => setNewBookAuthor(e.target.value)} 
            size="small" 
            fullWidth 
          />
          <TextField 
            label="Reihe" 
            value={newBookSeries} 
            onChange={(e) => setNewBookSeries(e.target.value)} 
            size="small" 
            fullWidth 
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
                    <TextField 
                      label="Autor" 
                      value={editAuthor} 
                      onChange={(e) => setEditAuthor(e.target.value)} 
                      size="small" 
                    />
                    <TextField 
                      label="Reihe" 
                      value={editSeries} 
                      onChange={(e) => setEditSeries(e.target.value)} 
                      size="small" 
                    />
                  </Box>
                ) : (
                  <ListItemText 
                    primary={book.name} 
                    secondary={
                      <React.Fragment>
                        {book.author && <Typography component="span" variant="body2" color="text.primary">Autor: {book.author}</Typography>}
                        {book.author && book.series && <br />}
                        {book.series && <Typography component="span" variant="body2" color="text.secondary">Reihe: {book.series}</Typography>}
                      </React.Fragment>
                    }
                  />
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
