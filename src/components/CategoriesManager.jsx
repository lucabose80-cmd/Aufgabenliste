import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Box, Card, Typography, TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const CategoriesManager = () => {
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

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>Kategorien verwalten</Typography>
      
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center' }}>
        <TextField 
          size="small"
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)} 
          placeholder="Neue Kategorie..." 
          fullWidth
        />
        <input 
          type="color" 
          value={newCatColor} 
          onChange={e => setNewCatColor(e.target.value)} 
          style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />}>
          Hinzufügen
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {categories.map(cat => (
          <Box key={cat.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider' }}>
            
            {editingId === cat.id ? (
              // EDIT MODE
              <Box sx={{ display: 'flex', flex: 1, gap: 2, alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={editColor} 
                  onChange={e => setEditColor(e.target.value)} 
                  style={{ width: '40px', height: '30px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
                <TextField 
                  size="small"
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={saveEditing} color="success" size="small">
                    <CheckIcon />
                  </IconButton>
                  <IconButton onClick={cancelEditing} color="default" size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              // VIEW MODE
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: cat.color }} />
                  <Typography fontWeight="bold">{cat.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => startEditing(cat)} color="default" size="small">
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
    </Card>
  );
};

export default CategoriesManager;
