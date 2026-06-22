import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Box, Card, Typography, TextField, MenuItem, Button, 
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Stack, Divider, Select, FormControl, InputLabel, OutlinedInput, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const TaskCreator = () => {
  const { addTask, updateTask, deleteTask, tasks, categories } = useTaskContext();
  const { user } = useAuth();
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '1');
  const [type, setType] = useState('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [specificDays, setSpecificDays] = useState([]);
  const [subTasks, setSubTasks] = useState([]);
  const [currentSubTask, setCurrentSubTask] = useState('');
  
  const [isShared, setIsShared] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = [];
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (u.uid !== user.uid) {
            usersList.push(u);
          }
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Fehler beim Laden der Benutzer:", err);
      }
    };
    fetchUsers();
  }, [user]);

  const daysOfWeek = [
    { id: 1, label: 'Mo' },
    { id: 2, label: 'Di' },
    { id: 3, label: 'Mi' },
    { id: 4, label: 'Do' },
    { id: 5, label: 'Fr' },
    { id: 6, label: 'Sa' },
    { id: 0, label: 'So' }
  ];

  const handleToggleDay = (dayId) => {
    setSpecificDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const existingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;
    const existingSubTasks = existingTask ? existingTask.subTasks : [];

    const formattedSubTasks = subTasks.map(s => {
      const existing = existingSubTasks.find(st => st.title === s);
      if (existing) return existing;
      return { id: Math.random().toString(), title: s, completed: false };
    });

    let newMembers = isShared && user ? [user.uid] : [];
    let newPendingMembers = [];

    if (editingTaskId && isShared) {
      const existingTask = tasks.find(t => t.id === editingTaskId);
      if (existingTask) {
        newMembers = (existingTask.members || []).filter(m => m === user?.uid || selectedMembers.includes(m));
        if (user && !newMembers.includes(user.uid)) newMembers.push(user.uid);
        
        newPendingMembers = selectedMembers.filter(m => !(existingTask.members || []).includes(m));
      }
    } else if (isShared) {
      newPendingMembers = selectedMembers;
    }

    const taskPayload = {
      title,
      categoryId,
      type,
      targetCount: type === 'x-times' ? parseInt(targetCount, 10) : (type === 'weekly' ? 1 : 0),
      specificDays: type === 'specific-days' ? specificDays : [],
      subTasks: formattedSubTasks,
      isShared: isShared,
      members: newMembers,
      pendingMembers: newPendingMembers
    };

    if (editingTaskId) {
      updateTask(editingTaskId, taskPayload);
      alert('Aufgabe erfolgreich aktualisiert!');
    } else {
      addTask(taskPayload);
      alert('Aufgabe erfolgreich erstellt!');
    }

    setEditingTaskId(null);
    setTitle('');
    setSubTasks([]);
    setCurrentSubTask('');
    setSpecificDays([]);
    setTargetCount(1);
    setIsShared(false);
    setSelectedMembers([]);
  };

  const handleEdit = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setCategoryId(task.categoryId);
    setType(task.type);
    setTargetCount(task.targetCount);
    setSpecificDays(task.specificDays);
    setSubTasks(task.subTasks.map(st => st.title));
    setIsShared(task.isShared || false);
    const allShared = [...(task.members || []), ...(task.pendingMembers || [])];
    setSelectedMembers(allShared.filter(m => m !== user?.uid));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTitle('');
    setSubTasks([]);
    setCurrentSubTask('');
    setSpecificDays([]);
    setTargetCount(1);
    setIsShared(false);
    setSelectedMembers([]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 800, mx: 'auto' }}>
      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          {editingTaskId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
        </Typography>
      
        <form onSubmit={handleAdd}>
          <Stack spacing={3}>
            
            <TextField 
              label="Titel der Aufgabe" 
              variant="outlined" 
              fullWidth 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Gym, Japanisch lernen..."
            />

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                select
                label="Kategorie"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                fullWidth
              >
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color }} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                select
                label="Aufgabentyp"
                value={type}
                onChange={e => setType(e.target.value)}
                fullWidth
              >
                <MenuItem value="daily">Täglich</MenuItem>
                <MenuItem value="weekly">Einmal pro Woche (Weekly)</MenuItem>
                <MenuItem value="x-times">X-Mal pro Woche</MenuItem>
                <MenuItem value="specific-days">An bestimmten Tagen</MenuItem>
                <MenuItem value="general">Allgemeines To-Do</MenuItem>
              </TextField>
            </Box>

            {user && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonAddIcon color="action" />
                  <Typography variant="subtitle2">Aufgabe teilen</Typography>
                </Box>
                <TextField
                  select
                  label="Status"
                  value={isShared ? 'shared' : 'private'}
                  onChange={e => {
                    setIsShared(e.target.value === 'shared');
                    if (e.target.value === 'private') setSelectedMembers([]);
                  }}
                  size="small"
                  sx={{ width: 200 }}
                >
                  <MenuItem value="private">Privat</MenuItem>
                  <MenuItem value="shared">Geteilt</MenuItem>
                </TextField>
                
                {isShared && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Nutzer auswählen</InputLabel>
                    <Select
                      multiple
                      value={selectedMembers}
                      onChange={e => setSelectedMembers(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                      input={<OutlinedInput label="Nutzer auswählen" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const usr = allUsers.find(u => u.uid === value);
                            return <Chip key={value} label={usr ? (usr.displayName || usr.email) : value} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {allUsers.map((u) => (
                        <MenuItem key={u.uid} value={u.uid}>
                          {u.displayName || u.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

            {type === 'x-times' && (
              <TextField 
                label="Wie oft pro Woche?" 
                type="number"
                variant="outlined" 
                fullWidth 
                inputProps={{ min: 1, max: 7 }}
                value={targetCount}
                onChange={e => setTargetCount(e.target.value)}
              />
            )}

            {type === 'specific-days' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>An welchen Tagen?</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {daysOfWeek.map(day => (
                    <Button
                      key={day.id}
                      variant={specificDays.includes(day.id) ? 'contained' : 'outlined'}
                      color="primary"
                      onClick={() => handleToggleDay(day.id)}
                      sx={{ borderRadius: 8 }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Unterpunkte (optional)</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField 
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={currentSubTask}
                  onChange={e => setCurrentSubTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (currentSubTask.trim()) {
                        setSubTasks([...subTasks, currentSubTask.trim()]);
                        setCurrentSubTask('');
                      }
                    }
                  }}
                  placeholder="Neuer Unterpunkt..."
                />
                <Button 
                  variant="contained" 
                  onClick={() => {
                    if (currentSubTask.trim()) {
                      setSubTasks([...subTasks, currentSubTask.trim()]);
                      setCurrentSubTask('');
                    }
                  }}
                >
                  <AddIcon />
                </Button>
              </Box>

              {subTasks.length > 0 && (
                <List dense sx={{ mt: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  {subTasks.map((st, idx) => (
                    <ListItem key={idx}>
                      <ListItemText primary={st} />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" color="error" onClick={() => setSubTasks(subTasks.filter((_, i) => i !== idx))}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                startIcon={editingTaskId ? <SaveIcon /> : <AddIcon />}
                fullWidth
              >
                {editingTaskId ? 'Aktualisieren' : 'Aufgabe erstellen'}
              </Button>
              {editingTaskId && (
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={handleCancelEdit}
                  fullWidth
                >
                  Abbrechen
                </Button>
              )}
            </Box>

          </Stack>
        </form>
      </Card>

      <Card sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Alle Aufgaben verwalten
        </Typography>
        {tasks.length === 0 ? (
          <Typography color="text.secondary">Keine Aufgaben vorhanden.</Typography>
        ) : (
          <Box>
            {categories.map(cat => {
              const catTasks = tasks.filter(t => t.categoryId === cat.id);
              if (catTasks.length === 0) return null;
              
              return (
                <Box key={cat.id} sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: cat.color, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat.color }} />
                    {cat.name}
                  </Typography>
                  <List disablePadding>
                    {catTasks.map((task) => (
                      <ListItem 
                        key={task.id}
                        sx={{ 
                          bgcolor: 'background.default', 
                          borderRadius: 2,
                          mb: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderLeft: `4px solid ${cat.color}`
                        }}
                      >
                        <ListItemText 
                          primary={task.title} 
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                          secondary={`Typ: ${task.type}`}
                          secondaryTypographyProps={{ textTransform: 'uppercase', fontSize: '0.75rem' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton color="primary" onClick={() => handleEdit(task)} sx={{ mr: 1 }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              if(window.confirm('Aufgabe wirklich endgültig löschen?')) {
                                deleteTask(task.id);
                                if (editingTaskId === task.id) handleCancelEdit();
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              );
            })}
            
            {/* Catch any tasks that might have a missing/deleted category */}
            {(() => {
              const missingTasks = tasks.filter(t => !categories.find(c => c.id === t.categoryId));
              if (missingTasks.length === 0) return null;
              
              return (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                    Ohne Kategorie
                  </Typography>
                  <List disablePadding>
                    {missingTasks.map((task) => (
                      <ListItem 
                        key={task.id}
                        sx={{ 
                          bgcolor: 'background.default', 
                          borderRadius: 2,
                          mb: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderLeft: `4px solid gray`
                        }}
                      >
                        <ListItemText 
                          primary={task.title} 
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                          secondary={`Typ: ${task.type}`}
                          secondaryTypographyProps={{ textTransform: 'uppercase', fontSize: '0.75rem' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton color="primary" onClick={() => handleEdit(task)} sx={{ mr: 1 }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              if(window.confirm('Aufgabe wirklich endgültig löschen?')) {
                                deleteTask(task.id);
                                if (editingTaskId === task.id) handleCancelEdit();
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              );
            })()}
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default TaskCreator;
