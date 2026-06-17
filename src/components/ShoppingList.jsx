import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ShoppingCart, LogOut, Plus, Trash2, Check, Share2, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ShoppingList = () => {
  const { shoppingListId, updateShoppingListId } = useTaskContext();
  const { user } = useAuth();
  
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Subscribe to items if we have an active list
  useEffect(() => {
    if (!user || !shoppingListId) {
      setItems([]);
      return;
    }

    const itemsRef = collection(db, 'shared_lists', shoppingListId, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(loadedItems);
    }, (err) => {
      console.error("Error loading shared list:", err);
      // Fallback if list doesn't exist or permissions fail
      if (err.code === 'permission-denied') {
        alert("Zugriff auf diese Liste verweigert oder Liste existiert nicht.");
        updateShoppingListId('');
      }
    });

    return () => unsubscribe();
  }, [user, shoppingListId]);

  const generateShortId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateList = async () => {
    if (!user) {
      alert("Bitte logge dich ein, um eine gemeinsame Liste zu erstellen.");
      return;
    }
    const newListId = generateShortId();
    // We create a dummy doc to initialize the list
    await setDoc(doc(db, 'shared_lists', newListId), {
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });
    updateShoppingListId(newListId);
  };

  const handleJoinList = () => {
    if (!joinCode) return;
    if (!user) {
      alert("Bitte logge dich ein, um einer Liste beizutreten.");
      return;
    }
    updateShoppingListId(joinCode.toUpperCase());
    setJoinCode('');
  };

  const handleLeaveList = () => {
    updateShoppingListId('');
    setItems([]);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim() || !user || !shoppingListId) return;

    const itemId = uuidv4();
    await setDoc(doc(db, 'shared_lists', shoppingListId, 'items', itemId), {
      text: newItemText.trim(),
      completed: false,
      createdAt: serverTimestamp(),
      addedBy: user.email
    });
    setNewItemText('');
  };

  const toggleItem = async (id, currentStatus) => {
    if (!user || !shoppingListId) return;
    await updateDoc(doc(db, 'shared_lists', shoppingListId, 'items', id), {
      completed: !currentStatus
    });
  };

  const deleteItem = async (id) => {
    if (!user || !shoppingListId) return;
    await deleteDoc(doc(db, 'shared_lists', shoppingListId, 'items', id));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shoppingListId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!shoppingListId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', textAlign: 'center', padding: '3rem 1rem' }}>
          <ShoppingCart size={48} color="var(--accent-primary)" />
          <h2>Gemeinsame Einkaufsliste</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
            Erstelle eine neue Liste und teile den Code mit jemandem, oder tritt einer bestehenden Liste bei.
          </p>

          <button className="btn-primary" onClick={handleCreateList} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <Plus size={20} /> Neue Liste erstellen
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '300px', margin: '2rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ color: 'var(--text-muted)' }}>ODER</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
            <input 
              type="text" 
              placeholder="Listen-Code (z.B. AB12CD)" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.1rem', textTransform: 'uppercase' }}
            />
            <button onClick={handleJoinList} style={{ padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}>
              Liste beitreten
            </button>
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Code zum Teilen:</span>
              <button 
                onClick={handleCopyCode}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '1px' }}
              >
                {shoppingListId} {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
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
