import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';

const CategoriesManager = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useTaskContext();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

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

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Kategorien verwalten</h3>
      
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)} 
          placeholder="Neue Kategorie..." 
          style={{ flex: 1 }}
        />
        <input 
          type="color" 
          value={newCatColor} 
          onChange={e => setNewCatColor(e.target.value)} 
          style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer' }}
        />
        <button type="submit" className="btn-primary">
          <Plus size={18} /> Hinzufügen
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--border-radius-sm)' }}>
            
            {editingId === cat.id ? (
              // EDIT MODE
              <div style={{ display: 'flex', flex: 1, gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={editColor} 
                  onChange={e => setEditColor(e.target.value)} 
                  style={{ width: '40px', height: '30px', padding: '0', cursor: 'pointer' }}
                />
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  style={{ flex: 1, padding: '0.25rem 0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={saveEditing} style={{ color: 'var(--accent-success)' }} title="Speichern">
                    <Check size={18} />
                  </button>
                  <button className="btn-icon" onClick={cancelEditing} style={{ color: 'var(--text-secondary)' }} title="Abbrechen">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                  <span style={{ fontWeight: '500' }}>{cat.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={() => startEditing(cat)} style={{ color: 'var(--text-secondary)' }} title="Bearbeiten">
                    <Edit2 size={18} />
                  </button>
                  {categories.length > 1 && (
                    <button className="btn-icon" onClick={() => {
                      if(window.confirm('Kategorie wirklich löschen? Alle zugehörigen Aufgaben werden nach "Allgemein" verschoben.')) {
                        deleteCategory(cat.id);
                      }
                    }} style={{ color: 'var(--accent-danger)' }} title="Löschen">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesManager;
