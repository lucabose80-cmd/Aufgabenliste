import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ShoppingCart, LogOut, Plus, Trash2, Check, UserPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ShoppingList = () => {
  const { user } = useAuth();
  
  const [activeList, setActiveList] = useState(null);
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);

  // 1. Listen to shared lists where user is a member
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
        // Assume user is only in one list
        const listDoc = snapshot.docs[0];
        setActiveList({ id: listDoc.id, ...listDoc.data() });
      } else {
        setActiveList(null);
      }
      setIsListLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch all registered users for the dropdown
  useEffect(() => {
    if (!user || !activeList) return;

    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = [];
        usersSnap.forEach(doc => {
          const u = doc.data();
          // Filter out current user and existing members
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

  // 3. Listen to items of the active list
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
    // Remove self from members
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem', alignItems: 'center', textAlign: 'center', marginTop: '3rem' }}>
        <ShoppingCart size={48} color="var(--text-muted)" />
        <h2 style={{ color: 'var(--text-muted)' }}>Gemeinsame Einkaufsliste</h2>
        <p style={{ color: 'var(--text-muted)' }}>Du musst eingeloggt sein, um diese Funktion zu nutzen.</p>
      </div>
    );
  }

  if (isListLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Lade Liste...</div>;
  }

  if (!activeList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', textAlign: 'center', padding: '3rem 1rem' }}>
          <ShoppingCart size={48} color="var(--accent-primary)" />
          <h2>Gemeinsame Einkaufsliste</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
            Du hast aktuell keine Einkaufsliste. Aktiviere deine Liste, um andere Nutzer einzuladen und gemeinsam einzukaufen!
          </p>

          <button className="btn-primary" onClick={handleCreateList} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <Plus size={20} /> Liste aktivieren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ShoppingCart color="var(--accent-primary)" /> Einkaufsliste
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <UserPlus size={16} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Teilnehmer hinzufügen:</span>
              
              {allUsers.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={selectedUserToInvite} 
                    onChange={(e) => setSelectedUserToInvite(e.target.value)}
                    style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  >
                    {allUsers.map(u => (
                      <option key={u.uid} value={u.uid}>{u.email}</option>
                    ))}
                  </select>
                  <button onClick={handleInviteUser} className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}>
                    Einladen
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Alle registrierten Nutzer sind bereits eingeladen.</span>
              )}
            </div>
          </div>

          <button onClick={handleLeaveList} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', background: 'transparent', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <LogOut size={16} /> Verlassen
          </button>
        </div>

        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Artikel hinzufügen..." 
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '1rem' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem' }}>
            <Plus size={20} />
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 'var(--border-radius)', border: '1px dashed var(--border-color)' }}>
            Noch keine Artikel auf der Liste.
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', opacity: item.completed ? 0.6 : 1 }}>
              <button 
                onClick={() => toggleItem(item.id, item.completed)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${item.completed ? 'var(--accent-success)' : 'var(--border-color)'}`,
                  backgroundColor: item.completed ? 'var(--accent-success)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {item.completed && <Check size={14} color="white" />}
              </button>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                  {item.text}
                </span>
                {item.addedBy && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>von {item.addedBy.split('@')[0]}</span>
                )}
              </div>

              <button onClick={() => deleteItem(item.id)} style={{ padding: '0.5rem', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default ShoppingList;
