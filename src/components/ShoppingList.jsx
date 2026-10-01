import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  Box, Typography, TextField, Button, IconButton, Select, MenuItem,
  CircularProgress, Divider, Checkbox, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Avatar, InputAdornment, Fab, Tooltip, Collapse, Paper, InputBase
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { startOfWeek, parseISO } from 'date-fns';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, useDroppable
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const UNITS = ['x', 'kg', 'g', 'L', 'ml', 'Pkg.'];

function SortableItem({ item, toggleItem, deleteItem }) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: item });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  };

  const quantityLabel = item.quantity && item.quantity !== '1' && item.unit === 'x'
    ? `${item.quantity}× `
    : item.quantity && item.unit !== 'x'
    ? `${item.quantity} ${item.unit} `
    : '';

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        py: 0.75,
        gap: 1,
        '&:hover .delete-btn': { opacity: 1 },
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{ color: 'text.disabled', cursor: 'grab', touchAction: 'none', display: 'flex', flexShrink: 0 }}
      >
        <DragIndicatorIcon sx={{ fontSize: 18 }} />
      </Box>

      {/* Checkbox */}
      <Checkbox
        checked={item.completed}
        onChange={() => toggleItem && toggleItem(item.id, item.completed)}
        size="small"
        sx={{ p: 0.5, color: 'text.disabled', '&.Mui-checked': { color: 'success.main' } }}
      />

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            textDecoration: item.completed ? 'line-through' : 'none',
            color: item.completed ? 'text.disabled' : 'text.primary',
            fontWeight: item.completed ? 400 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {quantityLabel && (
            <Typography component="span" variant="caption" sx={{ color: 'primary.main', fontWeight: 600, mr: 0.5 }}>
              {quantityLabel}
            </Typography>
          )}
          {item.text}
        </Typography>
        {item.completed && item.completedBy && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            ✓ {item.completedBy}
          </Typography>
        )}
      </Box>

      {/* Delete */}
      <IconButton
        className="delete-btn"
        size="small"
        onClick={() => deleteItem && deleteItem(item.id)}
        sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0 }}
      >
        <DeleteIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

function CategorySection({ id, title, items, toggleItem, deleteItem, accent }) {
  const { setNodeRef } = useDroppable({ id });
  const theme = useTheme();

  return (
    <Box>
      {/* Section label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5, mb: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: '0.65rem' }}>
          {title}
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', ml: 0.5 }} />
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
          {items.length}
        </Typography>
      </Box>

      {/* Items */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <Box ref={setNodeRef} sx={{ minHeight: 48 }}>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <SortableItem item={item} toggleItem={toggleItem} deleteItem={deleteItem} />
                {index < items.length - 1 && <Divider sx={{ mx: 1.5 }} />}
              </React.Fragment>
            ))}
            {items.length === 0 && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" color="text.disabled">Noch nichts hier</Typography>
              </Box>
            )}
          </Box>
        </SortableContext>
      </Box>
    </Box>
  );
}

const ShoppingList = () => {
  const { user } = useAuth();
  const theme = useTheme();

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
  const [showMeta, setShowMeta] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [activeDragId, setActiveDragId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) { setAllLists([]); setActiveListId(''); setIsListLoading(false); return; }
    const q = query(collection(db, 'shared_lists'), where('members', 'array-contains', user.uid));
    return onSnapshot(q, (snap) => {
      const lists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllLists(lists);
      if (lists.length > 0 && (!activeListId || !lists.find(l => l.id === activeListId))) {
        setActiveListId(lists[0].id);
      } else if (lists.length === 0) {
        setActiveListId('');
      }
      setIsListLoading(false);
    });
  }, [user, activeListId]);

  useEffect(() => {
    if (!user || !activeList) return;
    getDocs(collection(db, 'users')).then(snap => {
      const list = snap.docs.map(d => d.data());
      setAllUsersDB(list);
      const invitable = list.filter(u => u.uid !== user.uid && !activeList.members?.includes(u.uid));
      if (invitable.length > 0) setSelectedUserToInvite(invitable[0].uid);
    }).catch(() => {});
  }, [user, activeList]);

  useEffect(() => {
    if (!user || !activeList) { setItems([]); return; }
    const q = query(collection(db, 'shared_lists', activeList.id, 'items'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const loaded = [];
      snap.docs.forEach(d => {
        const item = { id: d.id, ...d.data() };
        if (item.completed && item.completedAt && parseISO(item.completedAt) < weekStart) {
          deleteDoc(doc(db, 'shared_lists', activeList.id, 'items', item.id));
        } else {
          loaded.push(item);
        }
      });
      setItems(loaded);
      setIsListLoading(false);
    });
  }, [user, activeList]);

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    const id = uuidv4();
    await setDoc(doc(db, 'shared_lists', id), { name: newListName.trim(), createdBy: user.uid, createdAt: serverTimestamp(), members: [user.uid] });
    setActiveListId(id);
    setIsCreateModalOpen(false);
    setNewListName('');
  };

  const handleInviteUser = async () => {
    if (!selectedUserToInvite || !activeList) return;
    await updateDoc(doc(db, 'shared_lists', activeList.id), { pendingMembers: arrayUnion(selectedUserToInvite) });
    setSelectedUserToInvite('');
  };

  const handleLeaveList = async () => {
    if (!user || !activeList) return;
    if (confirm('Liste wirklich verlassen?')) {
      await updateDoc(doc(db, 'shared_lists', activeList.id), { members: arrayRemove(user.uid) });
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim() || !user || !activeList) return;
    let myName = user.email;
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      if (!snap.empty && snap.docs[0].data().displayName) myName = snap.docs[0].data().displayName;
    } catch {}
    const catItems = items.filter(i => (i.category || 'daily') === newCategory);
    const maxOrder = catItems.reduce((m, i) => Math.max(m, i.order || 0), 0);
    const id = uuidv4();
    await setDoc(doc(db, 'shared_lists', activeList.id, 'items', id), {
      text: newItemText.trim(), quantity: newQuantity.trim() || '1', unit: newUnit,
      completed: false, createdAt: serverTimestamp(), addedBy: myName,
      category: newCategory, order: maxOrder + 10
    });
    setNewItemText('');
    setNewQuantity('1');
  };

  const toggleItem = async (id, currentStatus) => {
    if (!user || !activeList) return;
    let myName = user.displayName || user.email || 'Unbekannt';
    const me = allUsersDB.find(u => u.uid === user.uid);
    if (me?.displayName) myName = me.displayName;
    const updateData = { completed: !currentStatus };
    if (!currentStatus) {
      updateData.completedAt = new Date().toISOString();
      updateData.completedBy = myName;
      const remaining = items.filter(i => !i.completed && i.id !== id);
      if (remaining.length === 0 && items.length > 0) {
        fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listName: activeList.name, completedByUid: user.uid }) }).catch(() => {});
      }
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

  const dailyItems = items.filter(i => (i.category || 'daily') === 'daily' && !i.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
  const generalItems = items.filter(i => i.category === 'general' && !i.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
  const completedItems = items.filter(i => i.completed);

  const handleDragEnd = async ({ active, over }) => {
    setActiveDragId(null);
    if (!over) return;
    const activeItem = items.find(i => i.id === active.id);
    if (!activeItem) return;
    const overItem = items.find(i => i.id === over.id);
    const isOverContainer = over.id === 'daily-container' || over.id === 'general-container';
    let targetCategory = activeItem.category || 'daily';
    if (isOverContainer) targetCategory = over.id === 'daily-container' ? 'daily' : 'general';
    else if (overItem) targetCategory = overItem.category || 'daily';
    let list = targetCategory === 'daily' ? [...dailyItems] : [...generalItems];
    const activeIndex = list.findIndex(i => i.id === active.id);
    if ((activeItem.category || 'daily') !== targetCategory) {
      const overIndex = list.findIndex(i => i.id === over.id);
      overIndex !== -1 ? list.splice(overIndex, 0, activeItem) : list.push(activeItem);
    } else {
      if (active.id === over.id) return;
      const overIndex = list.findIndex(i => i.id === over.id);
      if (activeIndex !== -1 && overIndex !== -1) list = arrayMove(list, activeIndex, overIndex);
    }
    const batch = writeBatch(db);
    list.forEach((item, index) => {
      batch.update(doc(db, 'shared_lists', activeList.id, 'items', item.id), { order: index * 10, category: targetCategory });
    });
    await batch.commit().catch(console.error);
  };

  if (!user) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 8, color: 'text.secondary' }}>
      <ShoppingCartIcon sx={{ fontSize: 48 }} />
      <Typography>Einloggen um die Einkaufsliste zu nutzen.</Typography>
    </Box>
  );

  if (isListLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

  const invitableUsers = allUsersDB.filter(u => u.uid !== user.uid && !activeList?.members?.includes(u.uid));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, pb: 14, maxWidth: 600, mx: 'auto' }}>

      {/* ── Top bar: list selector ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Select
          value={activeListId}
          onChange={(e) => setActiveListId(e.target.value)}
          size="small"
          displayEmpty
          variant="standard"
          disableUnderline
          sx={{ fontWeight: 700, fontSize: '1rem', flex: 1, '.MuiSelect-select': { py: 0 } }}
        >
          {allLists.length === 0 && <MenuItem value="" disabled>Keine Listen</MenuItem>}
          {allLists.map(l => <MenuItem key={l.id} value={l.id}>{l.name || 'Einkaufsliste'}</MenuItem>)}
        </Select>

        <Tooltip title="Neue Liste erstellen">
          <IconButton size="small" onClick={() => setIsCreateModalOpen(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {activeList && (
          <Tooltip title="Details & Mitglieder">
            <IconButton size="small" onClick={() => setShowMeta(v => !v)}>
              {showMeta ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Collapsible meta panel ── */}
      <Collapse in={showMeta && !!activeList}>
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Members */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {activeList?.members?.map(uid => {
              const u = allUsersDB.find(x => x.uid === uid);
              const label = uid === user.uid ? 'Du' : (u?.displayName || u?.email || '?');
              return (
                <Chip
                  key={uid}
                  avatar={<Avatar sx={{ bgcolor: uid === user.uid ? 'primary.main' : 'grey.500', fontSize: '0.7rem', width: 22, height: 22 }}>{label[0]}</Avatar>}
                  label={label}
                  size="small"
                  variant={uid === user.uid ? 'filled' : 'outlined'}
                  color={uid === user.uid ? 'primary' : 'default'}
                />
              );
            })}
          </Box>

          {/* Invite row */}
          {invitableUsers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <PersonAddIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Select value={selectedUserToInvite} onChange={(e) => setSelectedUserToInvite(e.target.value)} size="small" sx={{ flex: 1, fontSize: '0.8rem' }}>
                {invitableUsers.map(u => <MenuItem key={u.uid} value={u.uid}>{u.displayName || u.email}</MenuItem>)}
              </Select>
              <Button variant="contained" size="small" onClick={handleInviteUser} sx={{ whiteSpace: 'nowrap' }}>Einladen</Button>
            </Box>
          )}

          <Button variant="text" color="error" size="small" onClick={handleLeaveList} sx={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}>
            Liste verlassen
          </Button>
        </Box>
      </Collapse>

      {!activeList ? (
        <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <ShoppingCartIcon sx={{ fontSize: 48 }} />
          <Typography>Keine aktive Liste. Erstelle eine neue!</Typography>
        </Box>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragId(e.active.id)}
            onDragEnd={handleDragEnd}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <CategorySection id="daily-container" title="Täglicher Einkauf" items={dailyItems} toggleItem={toggleItem} deleteItem={deleteItem} accent={theme.palette.primary.main} />
              <CategorySection id="general-container" title="Allgemein" items={generalItems} toggleItem={toggleItem} deleteItem={deleteItem} accent={theme.palette.secondary.main} />
            </Box>

            <DragOverlay>
              {activeDragId && (
                <Box sx={{ bgcolor: 'background.paper', boxShadow: 6, borderRadius: 2, px: 1.5, py: 0.75 }}>
                  <SortableItem item={items.find(i => i.id === activeDragId)} />
                </Box>
              )}
            </DragOverlay>
          </DndContext>

          {/* Erledigte */}
          <Box sx={{ mt: 1 }}>
            <Button
              startIcon={showCompleted ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
              onClick={() => setShowCompleted(v => !v)}
              size="small"
              sx={{ color: 'text.disabled', fontSize: '0.72rem', textTransform: 'none', px: 0.5 }}
            >
              {completedItems.length} erledigt {showCompleted ? 'ausblenden' : 'anzeigen'}
            </Button>

            <Collapse in={showCompleted}>
              <Box sx={{ mt: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', opacity: 0.75 }}>
                {completedItems.map((item, i) => (
                  <React.Fragment key={item.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 0.75, gap: 1 }}>
                      <Checkbox checked size="small" onChange={() => toggleItem(item.id, true)} sx={{ p: 0.5, '&.Mui-checked': { color: 'success.main' } }} />
                      <Typography variant="body2" sx={{ flex: 1, textDecoration: 'line-through', color: 'text.disabled', fontSize: '0.85rem' }}>
                        {item.quantity && item.quantity !== '1' && item.unit === 'x' ? `${item.quantity}× ` : ''}
                        {item.quantity && item.unit !== 'x' ? `${item.quantity} ${item.unit} ` : ''}
                        {item.text}
                      </Typography>
                      <IconButton size="small" onClick={() => deleteItem(item.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    {i < completedItems.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                  </React.Fragment>
                ))}
              </Box>
            </Collapse>
          </Box>
        </>
      )}

      {/* ── Floating add bar ── */}
      {activeList && (
        <Paper
          component="form"
          onSubmit={handleAddItem}
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: { xs: 'calc(75px + env(safe-area-inset-bottom))', md: 30 },
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: 'calc(100% - 32px)', sm: 560 },
            maxWidth: 560,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.75,
            zIndex: 1200,
          }}
        >
          {/* Category dot toggle */}
          <Tooltip title={newCategory === 'daily' ? 'Täglicher Einkauf' : 'Allgemein'}>
            <Box
              onClick={() => setNewCategory(c => c === 'daily' ? 'general' : 'daily')}
              sx={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                bgcolor: newCategory === 'daily' ? 'primary.main' : 'secondary.main',
                transition: 'background-color 0.2s',
              }}
            />
          </Tooltip>

          {/* Quantity */}
          <InputBase
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="1"
            sx={{ width: 32, input: { textAlign: 'center', fontSize: '0.85rem' } }}
          />

          {/* Unit */}
          <Select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            variant="standard"
            disableUnderline
            sx={{ width: 44, fontSize: '0.8rem', '.MuiSelect-select': { py: 0.5 } }}
          >
            {UNITS.map(u => <MenuItem key={u} value={u} sx={{ fontSize: '0.85rem' }}>{u}</MenuItem>)}
          </Select>

          <Box sx={{ width: 1, bgcolor: 'divider', height: 20, mx: 0.5, flexShrink: 0 }} />

          {/* Item name */}
          <input
            placeholder="Artikel hinzufügen..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            autoComplete="off"
            style={{ 
              flex: 1, 
              minWidth: 0, 
              fontSize: '0.9rem', 
              width: '100%', 
              background: 'transparent', 
              border: 'none', 
              outline: 'none',
              color: 'inherit',
              padding: '4px 0'
            }}
          />

          {/* Submit */}
          <IconButton 
            type="submit" 
            size="small" 
            color="primary" 
            disabled={!newItemText.trim()} 
            sx={{ 
              bgcolor: newItemText.trim() ? 'primary.main' : 'action.disabledBackground', 
              color: newItemText.trim() ? 'white' : 'action.disabled', 
              '&:hover': { bgcolor: 'primary.dark' }, 
              width: 32, 
              height: 32,
              borderRadius: '50%',
              flexShrink: 0
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Paper>
      )}

      {/* New List Dialog */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Neue Einkaufsliste</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Name" value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateList()} sx={{ mt: 1 }} />
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
