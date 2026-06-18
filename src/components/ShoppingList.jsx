import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Box, Card, Typography, TextField, Button, IconButton, Select, MenuItem, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, Checkbox } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const ShoppingList = () => {
  const { user } = useAuth();
  
  const [activeList, setActiveList] = useState(null);
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActiveList(null);
      setIsListLoading(false);
      return;
    }

    const listsRef = collection(db, 'shared_lists');
    const q = query(listsRef, where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const listDoc = snapshot.docs[0];
        setActiveList({ id: listDoc.id, ...listDoc.data() });
      } else {
        setActiveList(null);
      }
      setIsListLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !activeList) return;

    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = [];
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (u.uid !== user.uid && !activeList.members?.includes(u.uid)) {
            usersList.push(u);
          }
        });
        setAllUsers(usersList);
        if (usersList.length > 0) setSelectedUserToInvite(usersList[0].uid);
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
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(loadedItems);
    });

    return () => unsubscribeItems();
  }, [user, activeList]);

  const handleCreateList = async () => {
    if (!user) return;
    const newListId = uuidv4();
    await setDoc(doc(db, 'shared_lists', newListId), {
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      members: [user.uid]
    });
  };

  const handleInviteUser = async () => {
    if (!selectedUserToInvite || !activeList) return;
    await updateDoc(doc(db, 'shared_lists', activeList.id), {
      members: arrayUnion(selectedUserToInvite)
    });
    setSelectedUserToInvite('');
  };

  const handleLeaveList = async () => {
    if (!user || !activeList) return;
    await updateDoc(doc(db, 'shared_lists', activeList.id), {
      members: arrayRemove(user.uid)
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim() || !user || !activeList) return;

    const itemId = uuidv4();
    await setDoc(doc(db, 'shared_lists', activeList.id, 'items', itemId), {
      text: newItemText.trim(),
      completed: false,
      createdAt: serverTimestamp(),
      addedBy: user.email
    });
    setNewItemText('');
  };

  const toggleItem = async (id, currentStatus) => {
    if (!user || !activeList) return;
    await updateDoc(doc(db, 'shared_lists', activeList.id, 'items', id), {
      completed: !currentStatus
    });
  };

  const deleteItem = async (id) => {
    if (!user || !activeList) return;
    await deleteDoc(doc(db, 'shared_lists', activeList.id, 'items', id));
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

  if (!activeList) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pb: 10, maxWidth: 800, mx: 'auto' }}>
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center', p: { xs: 3, sm: 6 } }}>
          <ShoppingCartIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h4" fontWeight="bold">Gemeinsame Einkaufsliste</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 400 }}>
            Du hast aktuell keine Einkaufsliste. Aktiviere deine Liste, um andere Nutzer einzuladen und gemeinsam einzukaufen!
          </Typography>

          <Button variant="contained" size="large" onClick={handleCreateList} startIcon={<AddIcon />}>
            Liste aktivieren
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10, maxWidth: 800, mx: 'auto' }}>
      
      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
              <ShoppingCartIcon color="primary" /> Einkaufsliste
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <PersonAddIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">Teilnehmer hinzufügen:</Typography>
              
              {allUsers.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Select 
                    value={selectedUserToInvite} 
                    onChange={(e) => setSelectedUserToInvite(e.target.value)}
                    size="small"
                    sx={{ minWidth: 150 }}
                  >
                    {allUsers.map(u => (
                      <MenuItem key={u.uid} value={u.uid}>{u.email}</MenuItem>
                    ))}
                  </Select>
                  <Button variant="contained" onClick={handleInviteUser} size="small">
                    Einladen
                  </Button>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">Alle registrierten Nutzer sind bereits eingeladen.</Typography>
              )}
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

        <Box component="form" onSubmit={handleAddItem} sx={{ display: 'flex', gap: 1, mt: 4 }}>
          <TextField 
            placeholder="Artikel hinzufügen..." 
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            fullWidth
            variant="outlined"
          />
          <Button type="submit" variant="contained" color="primary" sx={{ px: 3 }}>
            <AddIcon />
          </Button>
        </Box>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', border: 1, borderStyle: 'dashed', borderColor: 'divider', bgcolor: 'background.default' }}>
            <Typography color="text.secondary">Noch keine Artikel auf der Liste.</Typography>
          </Card>
        ) : (
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map(item => (
              <Card key={item.id} sx={{ opacity: item.completed ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                <ListItem>
                  <Checkbox
                    checked={item.completed}
                    onChange={() => toggleItem(item.id, item.completed)}
                    color="success"
                  />
                  <ListItemText 
                    primary={item.text} 
                    secondary={item.addedBy ? `von ${item.addedBy.split('@')[0]}` : null}
                    primaryTypographyProps={{ 
                      sx: { 
                        textDecoration: item.completed ? 'line-through' : 'none',
                        color: item.completed ? 'text.secondary' : 'text.primary',
                        fontSize: '1.1rem'
                      } 
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" color="error" onClick={() => deleteItem(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Card>
            ))}
          </List>
        )}
      </Box>

    </Box>
  );
};

export default ShoppingList;
