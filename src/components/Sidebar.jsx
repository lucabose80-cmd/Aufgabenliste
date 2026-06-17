import React from 'react';
import { Home, CheckSquare, Calendar, Folder, BarChart2, PlusSquare, Activity, RefreshCw, BookOpen, Flame, Award, Settings, ShoppingCart } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ currentView, setCurrentView, isOpen, toggleSidebar }) => {
  const { forceSync } = useTaskContext();
  const { user } = useAuth();
  
  const menuItems = [
    { id: 'home', label: 'Startseite', icon: <Home size={20} /> },
    { id: 'review', label: 'Rückblick', icon: <Award size={20} /> },
    { id: 'tracker', label: 'Jahres-Tracker', icon: <BarChart2 size={20} /> },
    { id: 'statistics', label: 'Statistiken', icon: <Activity size={20} /> },
    { id: 'reading-speed', label: 'Lesegeschwindigkeit', icon: <BookOpen size={20} /> },
    { id: 'calories', label: 'Kalorienziel', icon: <Flame size={20} /> },
    { id: 'shopping', label: 'Einkaufsliste', icon: <ShoppingCart size={20} /> },
    { id: 'create', label: 'Aufgabe erstellen', icon: <PlusSquare size={20} /> },
    { id: 'categories', label: 'Kategorien', icon: <Folder size={20} /> },
    { id: 'settings', label: 'Einstellungen', icon: <Settings size={20} /> },
  ];

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header">
          <CheckSquare size={24} color="var(--accent-primary)" />
          <span>TaskMaster</span>
        </div>
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentView(item.id);
                if (window.innerWidth <= 768) toggleSidebar();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        
        {user && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                forceSync();
                if (window.innerWidth <= 768) toggleSidebar();
              }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} /> Cloud Sync erzwingen
            </button>
          </div>
        )}
      </div>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="mobile-overlay" 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
