import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Box, Card, Typography, TextField, Button, IconButton, Select, MenuItem, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { startOfWeek, parseISO } from 'date-fns';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const UNITS = ['x', 'kg', 'g', 'L', 'ml', 'Pkg.'];

function SortableItem({ item, toggleItem, deleteItem, forceDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: item });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    boxShadow: forceDragging ? '0 5px 15px rgba(0,0,0,0.2)' : 'none',
  };

  return (
    <ListItem 
      disablePadding 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      sx={{ touchAction: 'none' }}
    >
      <Box sx={{ 
        width: '100%', 
        bgcolor: item.completed ? 'action.hover' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        p: 1,
        cursor: isDragging || forceDragging ? 'grabbing' : 'grab'
      }}>
        <Checkbox
          edge="start"
          checked={item.completed}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            if (toggleItem) toggleItem(item.id, item.completed);
          }}
          color="success"
        />
        <ListItemText 
          primary={
            <Typography sx={{ 
              textDecoration: item.completed ? 'line-through' : 'none',
              color: item.completed ? 'text.secondary' : 'text.primary',
              fontWeight: item.completed ? 'normal' : 'bold'
            }}>
              {item.quantity && item.quantity !== '1' && item.unit === 'x' ? `${item.quantity}x ` : ''}
              {item.quantity && item.unit !== 'x' ? `${item.quantity} ${item.unit} ` : ''}
              {item.text}
              {item.completed && item.completedBy && (
                <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                  (von {item.completedBy})
                </Typography>
              )}
            </Typography>
          }
          secondary={`Hinzugefügt von ${item.addedBy || 'Unbekannt'}`}
          sx={{ m: 0 }}
        />
        <ListItemSecondaryAction>
          <IconButton edge="end" color="error" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => {
            e.stopPropagation();
            if (deleteItem) deleteItem(item.id);
          }}>
            <DeleteIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </Box>
    </ListItem>
  );
}

const DroppableList = ({ id, items, toggleItem, deleteItem, title }) => {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>{title}</Typography>
      <Card sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <List ref={setNodeRef} sx={{ width: '100%', minHeight: 60, pb: items.length === 0 ? 2 : 0 }}>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <SortableItem item={item} toggleItem={toggleItem} deleteItem={deleteItem} />
                {index < items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            {items.length === 0 && (
              <ListItem><ListItemText primary={<Typography color="text.secondary">Keine Artikel in dieser Kategorie</Typography>} /></ListItem>
            )}
          </List>
        </SortableContext>
      </Card>
    </Box>
  );
};

const ShoppingList = () => {
  const { user } = useAuth();
  
  const [allLists, setAllLists] = useState([]);
  const [activeListId, setActiveListId] = useState('');
  
  const activeList = allLists.find(l => l.id === activeListId);
  
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('x');
  const [newCategory, setNewCategory] = useState('daily');
  
  const [allUsersDB, setAllUsersDB] = useState([]);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Fix undefined state

  const [activeDragId, setActiveDragId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) {
      setAllLists([]);
      setActiveListId('');
      setIsListLoading(false);
      return;
    }

    const listsRef = collection(db, 'shared_lists');
    const q = query(listsRef, where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLists(lists);
      if (lists.length > 0) {
        if (!activeListId || !lists.find(l => l.id === activeListId)) {
          setActiveListId(lists[0].id);
        }
      } else {
        setActiveListId('');
      }
      setIsListLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeListId]);

  useEffect(() => {
    if (!user || !activeList) return;

    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = [];
        usersSnap.forEach(doc => {
          usersList.push(doc.data());
        });
        setAllUsersDB(usersList);
        const invitable = usersList.filter(u => u.uid !== user.uid && !activeList.members?.includes(u.uid));
        if (invitable.length > 0) setSelectedUserToInvite(invitable[0].uid);
      } catch (err) {
        console.error("Fehler beim Laden der Benutzer:", err);
      }
    };
    
    fetchUsers();
  }, [user, activeList]);

  useEffect(() => {
    if (!user || !activeList) {
      setItems([]);
      return;
    }

    const itemsRef = collection(db, 'shared_lists', activeList.id, 'items');
    // Using descending createdAt to keep newest at top by default before first manual sort
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      
      const itemsToKeep = [];
      loadedItems.forEach(item => {
        if (item.completed && item.completedAt) {
          const completedDate = parseISO(item.completedAt);
          if (completedDate < weekStart) {
            deleteDoc(doc(db, 'shared_lists', activeList.id, 'items', item.id));
            return;
          }
        }
        itemsToKeep.push(item);
      });

      setItems(itemsToKeep);
      setIsListLoading(false);
    }); return () => unsubscribeItems();
  }, [user, activeList]);

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    const newListId = uuidv4();
    await setDoc(doc(db, 'shared_lists', newListId), {
      name: newListName.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      members: [user.uid]
    });
    setActiveListId(newListId);
    setIsCreateModalOpen(false);
    setNewListName('');
  };

  const handleInviteUser = async () => {
    if (!selectedUserToInvite || !activeList) return;
    await updateDoc(doc(db, 'shared_lists', activeList.id), {
      pendingMembers: arrayUnion(selectedUserToInvite)
    });
    setIsInviteModalOpen(false);
    setSelectedUserToInvite('');
  };

  const handleLeaveList = async () => {
    if (!user || !activeList) return;
    if (confirm('Möchtest du diese Liste wirklich verlassen?')) {
      await updateDoc(doc(db, 'shared_lists', activeList.id), {
        members: arrayRemove(user.uid)
      });
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim() || !user || !activeList) return;

    let myName = user.email;
    try {
      const myDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      if (!myDoc.empty && myDoc.docs[0].data().displayName) {
        myName = myDoc.docs[0].data().displayName;
      }
    } catch(err) {}

    // Find the max order for the chosen category
    const categoryItems = items.filter(i => (i.category || 'daily') === newCategory);
    const maxOrder = categoryItems.reduce((max, item) => Math.max(max, item.order || 0), 0);

    const itemId = uuidv4();
    await setDoc(doc(db, 'shared_lists', activeList.id, 'items', itemId), {
      text: newItemText.trim(),
      quantity: newQuantity.trim() || '1',
      unit: newUnit,
      completed: false,
      createdAt: serverTimestamp(),
      addedBy: myName,
      category: newCategory,
      order: maxOrder + 10 // Provide a starting order
    });
    setNewItemText('');
    setNewQuantity('1');
  };

  const toggleItem = async (id, currentStatus) => {
    if (!user || !activeList) return;
    
    let myName = user.displayName || user.email || 'Unbekannt';
    const me = allUsersDB.find(u => u.uid === user.uid);
    if (me && me.displayName) myName = me.displayName;

    const updateData = { completed: !currentStatus };
    if (!currentStatus) {
      updateData.completedAt = new Date().toISOString();
      updateData.completedBy = myName;
    } else {
      updateData.completedAt = null;
      updateData.completedBy = null;
    }

    await updateDoc(doc(db, 'shared_lists', activeList.id, 'items', id), updateData);
  };

  const deleteItem = async (id) => {
    if (!user || !activeList) return;
    await deleteDoc(doc(db, 'shared_lists', activeList.id, 'items', id));
  };

  const dailyItems = items
    .filter(i => (i.category || 'daily') === 'daily' && !i.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const generalItems = items
    .filter(i => i.category === 'general' && !i.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
    
  const completedItems = items.filter(i => i.completed);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeItem = items.find(i => i.id === active.id);
    if (!activeItem) return;

    const overItem = items.find(i => i.id === over.id);
    const isOverContainer = over.id === 'daily-container' || over.id === 'general-container';
    
    let targetCategory = activeItem.category || 'daily';
    
    if (isOverContainer) {
      targetCategory = over.id === 'daily-container' ? 'daily' : 'general';
    } else if (overItem) {
      targetCategory = overItem.category || 'daily';
    }

    let currentTargetList = targetCategory === 'daily' ? [...dailyItems] : [...generalItems];
    const activeIndex = currentTargetList.findIndex(i => i.id === active.id);
    
    if ((activeItem.category || 'daily') !== targetCategory) {
       if (isOverContainer) {
          currentTargetList.push(activeItem);
       } else {
          const overIndex = currentTargetList.findIndex(i => i.id === over.id);
          if (overIndex !== -1) {
             currentTargetList.splice(overIndex, 0, activeItem);
          } else {
             currentTargetList.push(activeItem);
          }
       }
    } else {
       if (active.id === over.id) return;
       const overIndex = currentTargetList.findIndex(i => i.id === over.id);
       if (activeIndex !== -1 && overIndex !== -1) {
          currentTargetList = arrayMove(currentTargetList, activeIndex, overIndex);
       }
    }

    const batch = writeBatch(db);
    currentTargetList.forEach((item, index) => {
      const itemRef = doc(db, 'shared_lists', activeList.id, 'items', item.id);
      batch.update(itemRef, { 
        order: index * 10,
        category: targetCategory
      });
    });
    
    try {
       await batch.commit();
    } catch(err) {
       console.error("Fehler beim Speichern der Sortierung:", err);
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10, alignItems: 'center', textAlign: 'center', mt: 4, maxWidth: 800, mx: 'auto' }}>
        <ShoppingCartIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
        <Typography variant="h5" color="text.secondary">Gemeinsame Einkaufsliste</Typography>
        <Typography color="text.secondary">Du musst eingeloggt sein, um diese Funktion zu nutzen.</Typography>
      </Box>
    );
  }

  if (isListLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10, maxWidth: 800, mx: 'auto' }}>
      
      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ListAltIcon color="primary" />
            <Select 
              value={activeListId} 
              onChange={(e) => setActiveListId(e.target.value)}
              size="small"
              displayEmpty
              sx={{ minWidth: 200, fontWeight: 'bold' }}
            >
              {allLists.length === 0 && <MenuItem value="" disabled>Keine Listen</MenuItem>}
              {allLists.map(list => (
                <MenuItem key={list.id} value={list.id}>{list.name || 'Einkaufsliste'}</MenuItem>
              ))}
            </Select>
          </Box>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIsCreateModalOpen(true)} size="small">
            Neue Liste
          </Button>
        </Box>
      </Card>

      {!activeList ? (
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center', p: { xs: 3, sm: 6 } }}>
          <ShoppingCartIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h5">Keine aktive Liste</Typography>
          <Typography color="text.secondary">Wähle eine Liste aus oder erstelle eine neue.</Typography>
        </Card>
      ) : (
        <Card sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {activeList.name || 'Einkaufsliste'}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Mitglieder:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {activeList.members?.map(memberId => {
                    const memberUser = allUsersDB.find(u => u.uid === memberId);
                    const isMe = memberId === user.uid;
                    return (
                      <Chip 
                        key={memberId} 
                        label={isMe ? 'Du' : (memberUser?.displayName || memberUser?.email || 'Unbekannt')} 
                        size="small" 
                        color={isMe ? 'primary' : 'default'}
                      />
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <PersonAddIcon fontSize="small" color="action" />
                
                {(() => {
                  const invitableUsers = allUsersDB.filter(u => u.uid !== user.uid && !activeList.members?.includes(u.uid));
                  if (invitableUsers.length > 0) {
                    return (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Select 
                          value={selectedUserToInvite} 
                          onChange={(e) => setSelectedUserToInvite(e.target.value)}
                          size="small"
                          sx={{ minWidth: 150 }}
                        >
                          {invitableUsers.map(u => (
                            <MenuItem key={u.uid} value={u.uid}>{u.displayName || u.email}</MenuItem>
                          ))}
                        </Select>
                        <Button variant="contained" onClick={handleInviteUser} size="small">
                          Einladen
                        </Button>
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Box>
            </Box>

            <Button 
              variant="outlined" 
              color="error"
              onClick={handleLeaveList} 
              startIcon={<LogoutIcon />}
              size="small"
            >
              Verlassen
            </Button>
          </Box>

          <Box component="form" onSubmit={handleAddItem} sx={{ display: 'flex', gap: 1, mt: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="daily">Täglicher Einkauf</MenuItem>
              <MenuItem value="general">Allgemein</MenuItem>
            </Select>
            <TextField 
              placeholder="Menge" 
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              sx={{ width: 80 }}
              size="small"
            />
            <Select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              size="small"
              sx={{ width: 90 }}
            >
              {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
            <TextField 
              placeholder="Artikel hinzufügen..." 
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 150 }}
              size="small"
            />
            <Button type="submit" variant="contained" color="primary">
              <AddIcon />
            </Button>
          </Box>
        </Card>
      )}

      {activeList && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              startIcon={showCompleted ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowCompleted(!showCompleted)}
              size="small"
              color="inherit"
            >
              {showCompleted ? 'Erledigte ausblenden' : 'Erledigte anzeigen'}
            </Button>
          </Box>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragId(e.active.id)}
            onDragEnd={handleDragEnd}
          >
            <DroppableList 
              id="daily-container" 
              items={dailyItems} 
              toggleItem={toggleItem} 
              deleteItem={deleteItem} 
              title="Täglicher Einkauf" 
            />
            
            <DroppableList 
              id="general-container" 
              items={generalItems} 
              toggleItem={toggleItem} 
              deleteItem={deleteItem} 
              title="Allgemein" 
            />
            
            <DragOverlay>
              {activeDragId ? (
                <Card sx={{ bgcolor: 'background.paper', boxShadow: 3 }}>
                  <List disablePadding>
                    <SortableItem 
                      item={items.find(i => i.id === activeDragId)} 
                      toggleItem={() => {}} 
                      deleteItem={() => {}} 
                      forceDragging={true}
                    />
                  </List>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>

          {showCompleted && completedItems.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>Erledigt</Typography>
              <Card sx={{ bgcolor: 'background.default', borderRadius: 2, overflow: 'hidden', opacity: 0.8 }}>
                <List sx={{ width: '100%' }}>
                  {completedItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                       <ListItem disablePadding>
                         <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                           <Checkbox checked={true} onChange={() => toggleItem(item.id, true)} color="success" />
                           <ListItemText 
                             primary={<Typography sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                               {item.quantity && item.quantity !== '1' && item.unit === 'x' ? `${item.quantity}x ` : ''}
                               {item.quantity && item.unit !== 'x' ? `${item.quantity} ${item.unit} ` : ''}
                               {item.text}
                             </Typography>}
                           />
                           <ListItemSecondaryAction>
                             <IconButton edge="end" color="error" onClick={() => deleteItem(item.id)}><DeleteIcon /></IconButton>
                           </ListItemSecondaryAction>
                         </Box>
                       </ListItem>
                       {index < completedItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Box>
          )}
        </Box>
      )}

      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <DialogTitle>Neue Einkaufsliste erstellen</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Name der Liste"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateModalOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateList} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShoppingList;
