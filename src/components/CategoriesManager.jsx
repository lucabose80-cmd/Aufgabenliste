import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const CategoriesManager = ({ isEmbedded }) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useTaskContext();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName, newCatColor);
    setNewCatName('');
  };

  const startEditing = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEditing = () => {
    if (!editName.trim()) return;
    updateCategory(editingId, editName, editColor);
    setEditingId(null);
  };

  const handleDeleteClick = (catId) => {
    setCatToDelete(catId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (catToDelete) {
      deleteCategory(catToDelete);
    }
    setDeleteConfirmOpen(false);
    setCatToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setCatToDelete(null);
  };

  const Container = isEmbedded ? Box : Card;
  const containerProps = isEmbedded ? {} : { sx: { maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } } };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>Kategorien verwalten</Typography>}
      
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <TextField 
          size="small"
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)} 
          placeholder="Neue Kategorie..." 
          fullWidth
        />
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <input 
            type="color" 
            value={newCatColor} 
            onChange={e => setNewCatColor(e.target.value)} 
            style={{ width: '40px', height: '40px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '12px', background: 'transparent', flexShrink: 0 }}
          />
          <Button type="submit" variant="contained" startIcon={<AddIcon fontSize="small" />} sx={{ whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}>
            Hinzufügen
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {categories.map(cat => (
          <Box
            key={cat.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2,
              py: 1.25,
              bgcolor: 'background.surfaceVariant',
              borderRadius: '16px',
            }}
          >
            
            {editingId === cat.id ? (
              // EDIT MODE
              <Box sx={{ display: 'flex', flex: 1, gap: 1.5, alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={editColor} 
                  onChange={e => setEditColor(e.target.value)} 
                  style={{ width: '36px', height: '32px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'transparent' }}
                />
                <TextField 
                  size="small"
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton onClick={saveEditing} color="success" size="small">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={cancelEditing} color="default" size="small">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              // VIEW MODE
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: cat.color, flexShrink: 0 }} />
                  <Typography variant="body2" fontWeight={600}>{cat.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton onClick={() => startEditing(cat)} color="default" size="small" sx={{ color: 'text.secondary' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {categories.length > 1 && (
                    <IconButton onClick={() => handleDeleteClick(cat.id)} color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </>
            )}

          </Box>
        ))}
      </Box>

      <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
        <DialogTitle>Kategorie löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchtest du diese Kategorie wirklich löschen? Alle zugehörigen Aufgaben werden nach "Allgemein" verschoben.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">Abbrechen</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Löschen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CategoriesManager;
