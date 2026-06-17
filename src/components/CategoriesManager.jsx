import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Trash2, Plus } from 'lucide-react';

const CategoriesManager = () => {
  const { categories, addCategory, deleteCategory } = useTaskContext();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName, newCatColor);
    setNewCatName('');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: cat.color }}></div>
              <span style={{ fontWeight: '500' }}>{cat.name}</span>
            </div>
            {categories.length > 1 && (
              <button className="btn-icon" onClick={() => deleteCategory(cat.id)} style={{ color: 'var(--accent-danger)' }}>
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesManager;
